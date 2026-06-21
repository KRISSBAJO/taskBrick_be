import { describe, expect, it, jest } from '@jest/globals';
import { ObservabilityService } from '../src/observability/observability.service';

const configService = {
  get: jest.fn((key: string, fallback?: unknown) => {
    const values: Record<string, unknown> = {
      'app.name': 'TaskBricks API',
      'app.nodeEnv': 'test',
      'queue.attempts': 2,
      'queue.backoffMs': 1
    };
    return values[key] ?? fallback;
  })
};

const prisma = {
  $queryRaw: jest.fn()
};

describe('ObservabilityService', () => {
  it('records HTTP metrics in JSON and Prometheus formats', () => {
    const service = new ObservabilityService(prisma as never, configService as never);

    service.recordHttpRequest({
      method: 'GET',
      path: '/api/v1/projects/abcdefghijklmnopqrstuv',
      statusCode: 200,
      durationMs: 42,
      requestId: 'req-1',
      tenantId: 'tenant-1',
      userId: 'user-1'
    });

    const json = service.metricsJson() as {
      http: { requests: Record<string, number> };
    };
    expect(json.http.requests['GET /api/v1/projects/:id 200']).toBe(1);
    expect(service.prometheusMetrics()).toContain('taskbricks_http_requests_total');
  });

  it('retries transient failures and then succeeds', async () => {
    const service = new ObservabilityService(prisma as never, configService as never);
    const operation = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce('ok');

    await expect(service.withRetry('provider-call', operation, { attempts: 2, backoffMs: 1 })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
