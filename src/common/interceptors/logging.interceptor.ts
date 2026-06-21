import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { ObservabilityService } from '../../observability/observability.service';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly observabilityService: ObservabilityService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string; user?: AuthenticatedUser }>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startedAt;
        this.recordAndLog(request, response.statusCode, duration);
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startedAt;
        const statusCode = typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : 500;
        this.recordAndLog(request, statusCode, duration, error);
        return throwError(() => error);
      })
    );
  }

  private recordAndLog(
    request: Request & { requestId?: string; user?: AuthenticatedUser },
    statusCode: number,
    durationMs: number,
    error?: unknown
  ) {
    const path = request.originalUrl ?? request.url;
    this.observabilityService.recordHttpRequest({
      method: request.method,
      path,
      statusCode,
      durationMs,
      requestId: request.requestId,
      userId: request.user?.id,
      tenantId: request.user?.tenantId
    });

    const payload = {
      level: statusCode >= 500 ? 'error' : 'info',
      message: 'http_request',
      method: request.method,
      path,
      statusCode,
      durationMs,
      requestId: request.requestId ?? 'unknown',
      userId: request.user?.id,
      tenantId: request.user?.tenantId,
      error: error instanceof Error ? error.message : undefined
    };

    if (this.configService.get<string>('observability.logFormat') === 'json') {
      this.logger.log(JSON.stringify(payload));
      return;
    }

    this.logger.log(
      `${request.method} ${path} ${statusCode} ${durationMs}ms requestId=${payload.requestId} tenantId=${payload.tenantId ?? '-'} userId=${payload.userId ?? '-'}`
    );
  }
}
