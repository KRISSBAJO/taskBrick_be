import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface HttpMetricInput {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId?: string;
  userId?: string;
  tenantId?: string;
}

interface CircuitState {
  failures: number;
  openedUntil?: number;
  lastFailureAt?: number;
}

@Injectable()
export class ObservabilityService {
  private readonly startedAt = new Date();
  private readonly httpRequests = new Map<string, number>();
  private readonly httpErrors = new Map<string, number>();
  private readonly latencyBuckets = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
  private readonly latency = new Map<string, number[]>();
  private readonly recentRequests: HttpMetricInput[] = [];
  private readonly jobMetrics = new Map<string, { queued: number; running: number; completed: number; failed: number }>();
  private readonly providerCircuits = new Map<string, CircuitState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  recordHttpRequest(input: HttpMetricInput) {
    const routeKey = `${input.method.toUpperCase()} ${this.normalizePath(input.path)}`;
    this.increment(this.httpRequests, `${routeKey} ${input.statusCode}`);
    if (input.statusCode >= 500) this.increment(this.httpErrors, routeKey);
    const buckets = this.latency.get(routeKey) ?? Array.from({ length: this.latencyBuckets.length + 1 }, () => 0);
    const index = this.latencyBuckets.findIndex((bucket) => input.durationMs <= bucket);
    buckets[index === -1 ? this.latencyBuckets.length : index] += 1;
    this.latency.set(routeKey, buckets);
    this.recentRequests.push(input);
    if (this.recentRequests.length > 100) this.recentRequests.shift();
  }

  recordJob(queueName: string, state: 'queued' | 'running' | 'completed' | 'failed') {
    const current = this.jobMetrics.get(queueName) ?? { queued: 0, running: 0, completed: 0, failed: 0 };
    current[state] += 1;
    this.jobMetrics.set(queueName, current);
  }

  async measureDatabaseLatency() {
    const startedAt = performance.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return Math.round((performance.now() - startedAt) * 100) / 100;
  }

  metricsJson(): Record<string, unknown> {
    return {
      service: this.configService.get<string>('app.name', 'TaskBricks API'),
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      startedAt: this.startedAt,
      http: {
        requests: Object.fromEntries(this.httpRequests),
        errors: Object.fromEntries(this.httpErrors),
        latencyBucketsMs: this.latencyBuckets,
        latency: Object.fromEntries(this.latency)
      },
      jobs: Object.fromEntries(this.jobMetrics),
      circuits: Object.fromEntries(
        [...this.providerCircuits.entries()].map(([name, state]) => [
          name,
          {
            failures: state.failures,
            open: Boolean(state.openedUntil && state.openedUntil > Date.now()),
            openedUntil: state.openedUntil ? new Date(state.openedUntil) : null,
            lastFailureAt: state.lastFailureAt ? new Date(state.lastFailureAt) : null
          }
        ])
      ),
      recentRequests: this.recentRequests.slice(-20)
    };
  }

  prometheusMetrics() {
    const lines = [
      '# HELP taskbricks_uptime_seconds API process uptime in seconds.',
      '# TYPE taskbricks_uptime_seconds gauge',
      `taskbricks_uptime_seconds ${Math.floor((Date.now() - this.startedAt.getTime()) / 1000)}`,
      '# HELP taskbricks_http_requests_total HTTP requests by method, route, and status.',
      '# TYPE taskbricks_http_requests_total counter'
    ];
    for (const [key, count] of this.httpRequests.entries()) {
      const { method, route, status } = this.parseRequestKey(key);
      lines.push(`taskbricks_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    }
    lines.push('# HELP taskbricks_http_errors_total HTTP 5xx responses by method and route.');
    lines.push('# TYPE taskbricks_http_errors_total counter');
    for (const [key, count] of this.httpErrors.entries()) {
      const [method, ...routeParts] = key.split(' ');
      lines.push(`taskbricks_http_errors_total{method="${method}",route="${routeParts.join(' ')}"} ${count}`);
    }
    lines.push('# HELP taskbricks_http_request_duration_ms_bucket HTTP request latency buckets.');
    lines.push('# TYPE taskbricks_http_request_duration_ms_bucket histogram');
    for (const [routeKey, buckets] of this.latency.entries()) {
      const [method, ...routeParts] = routeKey.split(' ');
      const route = routeParts.join(' ');
      let cumulative = 0;
      for (let i = 0; i < buckets.length; i += 1) {
        cumulative += buckets[i];
        const le = i < this.latencyBuckets.length ? `${this.latencyBuckets[i]}` : '+Inf';
        lines.push(`taskbricks_http_request_duration_ms_bucket{method="${method}",route="${route}",le="${le}"} ${cumulative}`);
      }
    }
    lines.push('# HELP taskbricks_jobs_total Job lifecycle observations by queue and state.');
    lines.push('# TYPE taskbricks_jobs_total counter');
    for (const [queue, states] of this.jobMetrics.entries()) {
      for (const [state, count] of Object.entries(states)) {
        lines.push(`taskbricks_jobs_total{queue="${queue}",state="${state}"} ${count}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }

  async withRetry<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: { attempts?: number; backoffMs?: number; circuitKey?: string; circuitThreshold?: number; circuitCooldownMs?: number } = {}
  ) {
    const attempts = options.attempts ?? this.configService.get<number>('queue.attempts', 3);
    const backoffMs = options.backoffMs ?? this.configService.get<number>('queue.backoffMs', 5000);
    const circuitKey = options.circuitKey ?? operationName;
    this.assertCircuitClosed(circuitKey);
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await operation();
        this.closeCircuit(circuitKey);
        return result;
      } catch (error) {
        lastError = error;
        this.recordCircuitFailure(circuitKey, options.circuitThreshold ?? 5, options.circuitCooldownMs ?? 60_000);
        if (attempt < attempts) await this.delay(backoffMs * attempt);
      }
    }
    throw lastError;
  }

  private assertCircuitClosed(circuitKey: string) {
    const state = this.providerCircuits.get(circuitKey);
    if (state?.openedUntil && state.openedUntil > Date.now()) {
      throw new Error(`Circuit is open for ${circuitKey}`);
    }
  }

  private closeCircuit(circuitKey: string) {
    this.providerCircuits.delete(circuitKey);
  }

  private recordCircuitFailure(circuitKey: string, threshold: number, cooldownMs: number) {
    const current = this.providerCircuits.get(circuitKey) ?? { failures: 0 };
    current.failures += 1;
    current.lastFailureAt = Date.now();
    if (current.failures >= threshold) current.openedUntil = Date.now() + cooldownMs;
    this.providerCircuits.set(circuitKey, current);
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private increment(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  private normalizePath(path: string) {
    return path.split('?')[0].replace(/[a-z0-9]{20,}/gi, ':id');
  }

  private parseRequestKey(key: string) {
    const parts = key.split(' ');
    return {
      method: parts[0],
      route: parts.slice(1, -1).join(' '),
      status: parts.at(-1) ?? 'unknown'
    };
  }
}
