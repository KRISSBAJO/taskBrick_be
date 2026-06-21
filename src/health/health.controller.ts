import { Controller, Get, Version } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly observabilityService: ObservabilityService
  ) {}

  @Get()
  @Version('1')
  @HealthCheck()
  @ApiOperation({ summary: 'Check API and database health' })
  check() {
    return this.health.check([
      () => this.checkDatabase()
    ]);
  }

  @Get('live')
  @Version('1')
  @ApiOperation({ summary: 'Check process liveness without dependency checks' })
  live() {
    return {
      status: 'ok',
      service: this.configService.get<string>('app.name', 'TaskBricks API'),
      uptimeSeconds: Math.floor(process.uptime())
    };
  }

  @Get('ready')
  @Version('1')
  @ApiOperation({ summary: 'Check API readiness including database and optional Redis' })
  async ready() {
    const database = await this.safeCheck('database', async () => ({
      status: 'up',
      latencyMs: await this.observabilityService.measureDatabaseLatency()
    }));
    const redis = await this.checkRedis();
    const dependencies = { database, redis };
    const status = Object.values(dependencies).some((dependency) => dependency.status === 'down') ? 'error' : 'ok';
    return {
      status,
      dependencies
    };
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      database: {
        status: 'up'
      }
    };
  }

  private async checkRedis() {
    const required = this.configService.get<boolean>('redis.healthRequired', false);
    const url = this.configService.get<string>('redis.url');
    const adapter = this.configService.get<string>('realtime.adapter');
    const explicitlyConfigured = Boolean(url) || adapter === 'redis' || required;

    if (!explicitlyConfigured) {
      return {
        status: 'skipped',
        reason: 'Redis health is optional unless REDIS_URL, SOCKET_ADAPTER=redis, or REDIS_HEALTH_REQUIRED=true is configured'
      };
    }

    const startedAt = performance.now();
    const redis = url
      ? new Redis(url, { lazyConnect: true, connectTimeout: 500, maxRetriesPerRequest: 0, retryStrategy: null })
      : new Redis({
          host: this.configService.get<string>('redis.host', 'localhost'),
          port: this.configService.get<number>('redis.port', 6379),
          password: this.configService.get<string>('redis.password') || undefined,
          tls: this.configService.get<boolean>('redis.tlsEnabled', false) ? {} : undefined,
          lazyConnect: true,
          connectTimeout: 500,
          maxRetriesPerRequest: 0,
          retryStrategy: null
        });

    try {
      await redis.connect();
      await redis.ping();
      return {
        status: 'up',
        latencyMs: Math.round((performance.now() - startedAt) * 100) / 100
      };
    } catch (error) {
      return {
        status: required ? 'down' : 'skipped',
        error: error instanceof Error ? error.message : 'Redis ping failed'
      };
    } finally {
      redis.disconnect();
    }
  }

  private async safeCheck(name: string, check: () => Promise<Record<string, unknown>>) {
    try {
      return await check();
    } catch (error) {
      return {
        status: 'down',
        name,
        error: error instanceof Error ? error.message : 'Dependency check failed'
      };
    }
  }
}
