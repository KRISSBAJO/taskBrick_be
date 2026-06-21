import { describe, expect, it } from '@jest/globals';
import { envValidationSchema } from '../src/config/env.validation';

const productionEnv = {
  NODE_ENV: 'production',
  APP_NAME: 'TaskBricks API',
  PORT: 4070,
  API_PREFIX: 'api',
  API_VERSION: '1',
  PUBLIC_API_URL: 'https://api.taskbricks.com',
  FRONTEND_URL: 'https://app.taskbricks.com',
  TRUST_PROXY: true,
  REQUEST_BODY_LIMIT: '1mb',
  REQUEST_TIMEOUT_MS: 30000,
  SHUTDOWN_TIMEOUT_MS: 10000,
  CORS_ORIGINS: 'https://app.taskbricks.com',
  DATABASE_URL: 'postgresql://taskbricks:taskbricks@db.example.com:5432/taskbricks?schema=public',
  JWT_ACCESS_SECRET: 'prod-access-secret-prod-access-secret-123',
  JWT_REFRESH_SECRET: 'prod-refresh-secret-prod-refresh-secret-123',
  ENCRYPTION_KEY: 'prod-encryption-key-prod-encryption-key-123',
  COOKIE_SECRET: 'prod-cookie-secret-prod-cookie-secret-123',
  SESSION_SECRET: 'prod-session-secret-prod-session-secret-123',
  MAIL_PROVIDER: 'resend',
  MAIL_FROM: 'no-reply@taskbricks.com',
  WEBHOOK_SIGNING_SECRET: 'prod-webhook-secret-prod-webhook-secret-123'
};

describe('envValidationSchema security hardening', () => {
  it('disables Swagger by default in production', () => {
    const { error, value } = envValidationSchema.validate(productionEnv, { abortEarly: false });

    expect(error).toBeUndefined();
    expect(value.SWAGGER_ENABLED).toBe(false);
  });

  it('rejects local placeholder JWT secrets in production', () => {
    const { error } = envValidationSchema.validate(
      {
        ...productionEnv,
        JWT_ACCESS_SECRET: 'local-access-secret-for-taskbricks-development-only'
      },
      { abortEarly: false }
    );

    expect(error).toBeDefined();
    expect(error?.message).toContain('JWT_ACCESS_SECRET');
  });

  it('rejects localhost CORS origins in production', () => {
    const { error } = envValidationSchema.validate(
      {
        ...productionEnv,
        CORS_ORIGINS: 'http://localhost:3000'
      },
      { abortEarly: false }
    );

    expect(error).toBeDefined();
    expect(error?.message).toContain('CORS_ORIGINS');
  });
});
