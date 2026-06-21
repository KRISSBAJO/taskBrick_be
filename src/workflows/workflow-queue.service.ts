import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { RedisOptions } from 'ioredis';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ObservabilityService } from '../observability/observability.service';

export interface WorkflowRunJob {
  runId: string;
  user: AuthenticatedUser;
  meta: {
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  requestedAt: string;
  reason: 'manual' | 'event' | 'retry' | 'schedule';
}

@Injectable()
export class WorkflowQueueService implements OnModuleDestroy {
  readonly queueName = 'workflow-runs';
  private readonly logger = new Logger(WorkflowQueueService.name);
  private queue?: Queue<WorkflowRunJob>;

  constructor(
    private readonly configService: ConfigService,
    private readonly observabilityService: ObservabilityService
  ) {}

  enabled() {
    return Boolean(
      this.configService.get<string>('redis.url') ||
        this.configService.get<boolean>('redis.healthRequired', false) ||
        this.configService.get<string>('realtime.adapter') === 'redis'
    );
  }

  async enqueueRun(job: WorkflowRunJob) {
    if (!this.enabled()) return false;
    try {
      const queue = this.getQueue();
      await queue.add('execute', job, {
        attempts: this.configService.get<number>('queue.attempts', 3),
        backoff: {
          type: 'exponential',
          delay: this.configService.get<number>('queue.backoffMs', 5000)
        },
        removeOnComplete: { age: 24 * 60 * 60, count: 500 },
        removeOnFail: false
      });
      this.observabilityService.recordJob(this.queueName, 'queued');
      return true;
    } catch (error) {
      this.logger.warn(
        `Workflow queue unavailable; falling back to inline execution: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
      return false;
    }
  }

  createWorker(processor: (job: Job<WorkflowRunJob>) => Promise<void>) {
    if (!this.enabled()) return undefined;
    return new Worker<WorkflowRunJob>(
      this.queueName,
      async (job) => {
        this.observabilityService.recordJob(this.queueName, 'running');
        try {
          await processor(job);
          this.observabilityService.recordJob(this.queueName, 'completed');
        } catch (error) {
          this.observabilityService.recordJob(this.queueName, 'failed');
          throw error;
        }
      },
      {
        connection: this.redisOptions(true),
        prefix: this.configService.get<string>('queue.prefix', 'taskbricks'),
        concurrency: this.configService.get<number>('queue.concurrency', 5)
      }
    );
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  private getQueue() {
    if (!this.queue) {
      this.queue = new Queue<WorkflowRunJob>(this.queueName, {
        connection: this.redisOptions(false),
        prefix: this.configService.get<string>('queue.prefix', 'taskbricks')
      });
    }
    return this.queue;
  }

  private redisOptions(worker: boolean): RedisOptions {
    const url = this.configService.get<string>('redis.url');
    const base: RedisOptions = {
      maxRetriesPerRequest: worker ? null : 1,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      lazyConnect: true
    };
    if (url) {
      const parsed = new URL(url);
      return {
        ...base,
        host: parsed.hostname,
        port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        tls: parsed.protocol === 'rediss:' || this.configService.get<boolean>('redis.tlsEnabled', false)
          ? {}
          : undefined
      };
    }
    return {
      ...base,
      host: this.configService.get<string>('redis.host', 'localhost'),
      port: this.configService.get<number>('redis.port', 6379),
      password: this.configService.get<string>('redis.password') || undefined,
      tls: this.configService.get<boolean>('redis.tlsEnabled', false) ? {} : undefined
    };
  }
}
