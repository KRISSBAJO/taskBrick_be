import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { applyOpenApiResponseContract } from './openapi-response-contract';

interface ApiRoutingOptions {
  apiPrefix: string;
  apiVersion: string;
}

const normalizeServerUrl = (value?: string) => {
  if (!value) return undefined;

  const trimmed = value.trim().replace(/\/$/, '');
  return trimmed.replace(/\/api\/v\d+$/i, '').replace(/\/api$/i, '');
};

export function configureApiRouting(
  app: INestApplication,
  { apiPrefix, apiVersion }: ApiRoutingOptions
) {
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion
  });
}

export function createTaskBricksOpenApiDocument(
  app: INestApplication,
  configService: ConfigService
): OpenAPIObject {
  const port = configService.get<number>('app.port', 4070);
  const publicApiUrl = normalizeServerUrl(configService.get<string>('app.publicApiUrl'));
  const localApiUrl = normalizeServerUrl(`http://localhost:${port}`);
  const servers = Array.from(new Set([localApiUrl, publicApiUrl].filter(Boolean))) as string[];

  let builder = new DocumentBuilder()
    .setTitle('TaskBricks Enterprise API')
    .setDescription('NestJS API for the TaskBricks Enterprise work management platform.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Use the accessToken returned by /api/v1/auth/login or /api/v1/auth/register.'
      },
      'bearer'
    );

  for (const server of servers) {
    builder = builder.addServer(server);
  }

  const document = SwaggerModule.createDocument(app, builder.build(), {
    deepScanRoutes: true,
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`
  });

  return applyOpenApiResponseContract(document);
}
