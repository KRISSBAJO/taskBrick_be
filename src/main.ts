import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ObservabilityService } from './observability/observability.service';
import { configureApiRouting, createTaskBricksOpenApiDocument } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false
  });

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const apiVersion = configService.get<string>('app.apiVersion', '1');
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);
  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled', true);
  const requestBodyLimit = configService.get<string>('app.requestBodyLimit', '1mb');
  const requestTimeoutMs = configService.get<number>('app.requestTimeoutMs', 30000);

  if (nodeEnv === 'production' && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be configured in production');
  }

  const rawBodySaver = (req: Request & { rawBody?: Buffer }, _res: Response, buffer: Buffer) => {
    if (buffer?.length) req.rawBody = Buffer.from(buffer);
  };

  app.use((request: Request, response: Response, next: NextFunction) => {
    request.setTimeout(requestTimeoutMs);
    response.setTimeout(requestTimeoutMs);
    next();
  });
  app.use(json({ limit: requestBodyLimit, verify: rawBodySaver }));
  app.use(urlencoded({ limit: requestBodyLimit, extended: true, verify: rawBodySaver }));

  configureApiRouting(app, { apiPrefix, apiVersion });
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : nodeEnv === 'production' ? false : true,
    credentials: true
  });
  app.use(helmet());
  app.use(compression());
  const requestIdMiddleware = new RequestIdMiddleware();
  app.use((req, res, next) => requestIdMiddleware.use(req, res, next));
  app.useGlobalFilters(new HttpExceptionFilter(app.get(ObservabilityService), configService));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  if (swaggerEnabled) {
    const document = createTaskBricksOpenApiDocument(app, configService);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      jsonDocumentUrl: `${apiPrefix}/docs-json`,
      customSiteTitle: 'TaskBricks Enterprise API Docs',
      swaggerOptions: {
        displayRequestDuration: true,
        filter: true,
        persistAuthorization: true
      }
    });
  }

  app.enableShutdownHooks(['SIGINT', 'SIGTERM']);

  await app.listen(port);
}

void bootstrap();
