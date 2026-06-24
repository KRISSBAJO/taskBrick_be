import Joi from 'joi';

const booleanValue = Joi.boolean().truthy('true').falsy('false');
const optionalText = Joi.string().allow('').optional();
const forbiddenProductionSecrets = [
  'replace-with-a-long-random-access-secret',
  'replace-with-a-long-random-refresh-secret',
  'local-access-secret-for-taskbricks-development-only',
  'local-refresh-secret-for-taskbricks-development-only',
  'local-encryption-key-for-development-only',
  'local-cookie-secret-for-development-only',
  'local-session-secret-for-development-only',
  'taskbricks-local-webhook-secret'
];
const requiredInProduction = Joi.when('NODE_ENV', {
  is: 'production',
  then: Joi.string().min(1).required(),
  otherwise: optionalText
});
const secretInProduction = Joi.when('NODE_ENV', {
  is: 'production',
  then: Joi.string().min(32).invalid(...forbiddenProductionSecrets).required(),
  otherwise: Joi.string().allow('').optional()
});
const productionCorsOrigins = Joi.string().custom((value, helpers) => {
  const origins = `${value ?? ''}`.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0) return helpers.error('any.invalid');
  if (origins.some((origin) => origin === '*' || /localhost|127\.0\.0\.1|\[::1\]/i.test(origin))) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'production CORS origins');

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  APP_NAME: Joi.string().default('TaskBricks API'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('1'),
  PUBLIC_API_URL: requiredInProduction,
  FRONTEND_URL: requiredInProduction,
  SWAGGER_ENABLED: Joi.when('NODE_ENV', {
    is: 'production',
    then: booleanValue.default(false),
    otherwise: booleanValue.default(true)
  }),
  TRUST_PROXY: booleanValue.default(false),
  REQUEST_BODY_LIMIT: Joi.string().default('1mb'),
  REQUEST_TIMEOUT_MS: Joi.number().integer().positive().default(30000),
  SHUTDOWN_TIMEOUT_MS: Joi.number().integer().positive().default(10000),
  CORS_ORIGINS: Joi.when('NODE_ENV', {
    is: 'production',
    then: productionCorsOrigins.required(),
    otherwise: Joi.string().allow('').default('http://localhost:5173,http://localhost:3000')
  }),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  DIRECT_DATABASE_URL: optionalText,
  DATABASE_POOL_MAX: Joi.number().integer().positive().default(20),
  DATABASE_STATEMENT_TIMEOUT_MS: Joi.number().integer().positive().default(30000),

  REDIS_URL: optionalText,
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: optionalText,
  REDIS_TLS_ENABLED: booleanValue.default(false),
  REDIS_HEALTH_REQUIRED: booleanValue.default(false),

  JWT_ACCESS_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).invalid(...forbiddenProductionSecrets).required(),
    otherwise: Joi.string().min(32).required()
  }),
  JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).invalid(...forbiddenProductionSecrets).required(),
    otherwise: Joi.string().min(32).required()
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  ENCRYPTION_KEY: secretInProduction,
  COOKIE_SECRET: secretInProduction,
  SESSION_SECRET: secretInProduction,
  COOKIE_DOMAIN: optionalText,
  COOKIE_SECURE: booleanValue.default(false),
  PASSWORD_HASH_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  MAX_LOGIN_ATTEMPTS: Joi.number().integer().positive().default(5),
  ACCOUNT_LOCK_MINUTES: Joi.number().integer().positive().default(15),
  AUTH_EMAIL_VERIFICATION_REQUIRED: booleanValue.default(true),
  AUTH_EMAIL_VERIFICATION_TTL_MINUTES: Joi.number().integer().min(10).max(10080).default(1440),
  AUTH_PASSWORD_RESET_TTL_MINUTES: Joi.number().integer().min(5).max(1440).default(30),
  AUTH_INVITE_TTL_MINUTES: Joi.number().integer().min(10).max(43200).default(10080),
  TWO_FACTOR_ISSUER: Joi.string().default('TaskBricks'),

  RATE_LIMIT_TTL_SECONDS: Joi.number().integer().positive().default(60),
  RATE_LIMIT_MAX: Joi.number().integer().positive().default(300),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().positive().default(20),

  QUEUE_PREFIX: Joi.string().default('taskbricks'),
  QUEUE_CONCURRENCY: Joi.number().integer().positive().default(5),
  JOB_ATTEMPTS: Joi.number().integer().positive().default(3),
  JOB_BACKOFF_MS: Joi.number().integer().positive().default(5000),

  MAIL_PROVIDER: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('smtp', 'resend', 'sendgrid', 'ses').required(),
    otherwise: Joi.string().valid('none', 'smtp', 'resend', 'sendgrid', 'ses').default('none')
  }),
  MAIL_FROM: Joi.when('MAIL_PROVIDER', {
    is: Joi.valid('smtp', 'resend', 'sendgrid', 'ses'),
    then: Joi.string().email().required(),
    otherwise: optionalText
  }),
  SMTP_HOST: Joi.when('MAIL_PROVIDER', {
    is: 'smtp',
    then: Joi.string().required(),
    otherwise: optionalText
  }),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_SECURE: booleanValue.default(false),
  RESEND_API_KEY: optionalText,
  SENDGRID_API_KEY: optionalText,

  STORAGE_DRIVER: Joi.string().valid('local', 's3', 'cloudinary').default('local'),
  MAX_UPLOAD_BYTES: Joi.number().integer().positive().default(10485760),
  LOCAL_UPLOAD_DIR: Joi.string().default('./uploads'),
  S3_REGION: Joi.when('STORAGE_DRIVER', {
    is: 's3',
    then: Joi.string().required(),
    otherwise: optionalText
  }),
  S3_BUCKET: Joi.when('STORAGE_DRIVER', {
    is: 's3',
    then: Joi.string().required(),
    otherwise: optionalText
  }),
  S3_ACCESS_KEY_ID: optionalText,
  S3_SECRET_ACCESS_KEY: optionalText,
  S3_PUBLIC_BASE_URL: optionalText,
  CLOUDINARY_CLOUD_NAME: Joi.when('STORAGE_DRIVER', {
    is: 'cloudinary',
    then: Joi.string().required(),
    otherwise: optionalText
  }),
  CLOUDINARY_API_KEY: optionalText,
  CLOUDINARY_API_SECRET: optionalText,
  CLOUDINARY_UPLOAD_PRESET: optionalText,
  CLOUDINARY_UPLOAD_FOLDER: optionalText,

  REALTIME_ENABLED: booleanValue.default(true),
  SOCKET_CORS_ORIGINS: Joi.string().allow('').default(''),
  SOCKET_ADAPTER: Joi.string().valid('memory', 'redis').default('memory'),
  WEBSOCKET_PATH: Joi.string().default('/socket.io'),

  BILLING_ENABLED: booleanValue.default(false),
  BILLING_PROVIDER: Joi.string().valid('none', 'stripe', 'paystack', 'paypal').default('none'),
  STRIPE_SECRET_KEY: Joi.when('BILLING_PROVIDER', {
    is: 'stripe',
    then: Joi.string().required(),
    otherwise: optionalText
  }),
  STRIPE_WEBHOOK_SECRET: Joi.when('BILLING_PROVIDER', {
    is: 'stripe',
    then: Joi.string().required(),
    otherwise: optionalText
  }),
  STRIPE_PORTAL_RETURN_URL: optionalText,
  PAYSTACK_SECRET_KEY: Joi.when('BILLING_PROVIDER', {
    is: 'paystack',
    then: Joi.string().required(),
    otherwise: optionalText
  }),
  PAYSTACK_PUBLIC_KEY: optionalText,
  PAYSTACK_CALLBACK_URL: optionalText,
  PAYSTACK_PORTAL_URL: optionalText,

  AI_ENABLED: booleanValue.default(false),
  AI_DEFAULT_PROVIDER: Joi.string().valid('local', 'openai', 'anthropic').default('openai'),
  AI_DEFAULT_MODEL: optionalText,
  OPENAI_MODEL: optionalText,
  OPENAI_API_KEY: optionalText,
  ANTHROPIC_API_KEY: optionalText,
  AI_REQUEST_TIMEOUT_MS: Joi.number().integer().positive().default(60000),

  WEBHOOK_SIGNING_SECRET: secretInProduction,
  GITHUB_CLIENT_ID: optionalText,
  GITHUB_CLIENT_SECRET: optionalText,
  GOOGLE_CLIENT_ID: optionalText,
  GOOGLE_CLIENT_SECRET: optionalText,
  MICROSOFT_CLIENT_ID: optionalText,
  MICROSOFT_CLIENT_SECRET: optionalText,
  SLACK_CLIENT_ID: optionalText,
  SLACK_CLIENT_SECRET: optionalText,
  OMOFLOW_BASE_URL: optionalText,
  OMOFLOW_API_KEY: optionalText,
  OMOFLOW_WEBHOOK_SECRET: optionalText,
  OMOFLOW_RUNTIME_SYNC_ENABLED: booleanValue.default(false),
  WHATSAPP_BUSINESS_API_URL: optionalText,
  WHATSAPP_BUSINESS_PHONE_NUMBER_ID: optionalText,
  WHATSAPP_BUSINESS_ACCESS_TOKEN: optionalText,
  WHATSAPP_MEETING_REMINDER_TEMPLATE: Joi.string().default('taskbricks_meeting_reminder'),
  WHATSAPP_MEETING_FOLLOW_UP_TEMPLATE: Joi.string().default('taskbricks_meeting_follow_up'),

  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent').default('debug'),
  LOG_FORMAT: Joi.string().valid('pretty', 'json').default('pretty'),
  SENTRY_DSN: optionalText,
  METRICS_ENABLED: booleanValue.default(false),
  METRICS_PATH: Joi.string().default('/metrics'),
  OTEL_SERVICE_NAME: Joi.string().default('taskbricks-be'),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalText,

  AUDIT_RETENTION_DAYS: Joi.number().integer().positive().default(2555),
  DATA_EXPORT_BUCKET: optionalText,
  IP_ALLOWLIST: Joi.string().allow('').default(''),

  MAINTENANCE_MODE: booleanValue.default(false),
  SIGNUP_ENABLED: booleanValue.default(true),
  INVITATIONS_ENABLED: booleanValue.default(true)
});
