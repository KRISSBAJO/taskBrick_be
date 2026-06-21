import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ObservabilityService } from '../../observability/observability.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  constructor(
    private readonly observabilityService?: ObservabilityService,
    private readonly configService?: ConfigService
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
        ? (exceptionResponse as { message: string | string[] }).message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const payload = {
        level: 'error',
        message: 'http_exception',
        method: request.method,
        path: request.url,
        statusCode: status,
        requestId: request.requestId,
        error: exception instanceof Error ? exception.message : 'Unknown error'
      };
      if (this.configService?.get<string>('observability.logFormat') === 'json') {
        this.logger.error(JSON.stringify(payload), exception instanceof Error ? exception.stack : undefined);
      } else {
        this.logger.error(
          `${request.method} ${request.url} failed with ${status} requestId=${request.requestId ?? 'unknown'}`,
          exception instanceof Error ? exception.stack : undefined
        );
      }
    }

    this.observabilityService?.recordHttpRequest({
      method: request.method,
      path: request.url,
      statusCode: status,
      durationMs: 0,
      requestId: request.requestId
    });

    response.status(status).json({
      statusCode: status,
      message,
      error: exception instanceof HttpException ? exception.name : 'InternalServerError',
      requestId: request.requestId
    });
  }
}
