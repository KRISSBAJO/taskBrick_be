import { describe, expect, it, jest } from '@jest/globals';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('preserves incoming request ids and mirrors them to the response', () => {
    const middleware = new RequestIdMiddleware();
    const request = {
      header: jest.fn((name: string) => name === 'x-request-id' ? 'incoming-id' : undefined)
    } as never;
    const response = {
      setHeader: jest.fn()
    } as never;
    const next = jest.fn();

    middleware.use(request, response, next);

    expect((request as { requestId?: string }).requestId).toBe('incoming-id');
    expect((response as { setHeader: jest.Mock }).setHeader).toHaveBeenCalledWith('x-request-id', 'incoming-id');
    expect(next).toHaveBeenCalled();
  });
});
