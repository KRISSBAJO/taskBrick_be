import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { WorkflowQueueService, WorkflowRunJob } from './workflow-queue.service';
import { WorkflowsService } from './workflows.service';

@Injectable()
export class WorkflowRunWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowRunWorker.name);
  private worker?: Worker<WorkflowRunJob>;

  constructor(
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly workflowsService: WorkflowsService
  ) {}

  onModuleInit() {
    this.worker = this.workflowQueueService.createWorker(async (job) => {
      await this.workflowsService.executeQueuedRun(job.data);
    });
    if (this.worker) {
      this.worker.on('failed', (job, error) => {
        this.logger.error(
          `Workflow queue job failed runId=${job?.data.runId ?? 'unknown'}`,
          error instanceof Error ? error.stack : undefined
        );
      });
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
