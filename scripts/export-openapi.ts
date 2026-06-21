import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApiRouting, createTaskBricksOpenApiDocument } from '../src/openapi';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const apiVersion = configService.get<string>('app.apiVersion', '1');

  configureApiRouting(app, { apiPrefix, apiVersion });

  const document = createTaskBricksOpenApiDocument(app, configService);
  const target = join(process.cwd(), 'docs', 'api', 'openapi.json');

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  await app.close();
  console.log(`OpenAPI contract exported: ${target}`);
  console.log(`Versioned paths: ${Object.keys(document.paths).length}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
