const toNumber = (value: string | undefined, fallback: number) =>
  Number.parseInt(value ?? `${fallback}`, 10);

const toBoolean = (value: string | undefined, fallback = false) => {
  if (value === undefined || value === '') {
    return fallback;
  }

  return value === 'true';
};

const toList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'TaskBricks API',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: toNumber(process.env.PORT, 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    apiVersion: process.env.API_VERSION ?? '1',
    publicApiUrl: process.env.PUBLIC_API_URL,
    frontendUrl: process.env.FRONTEND_URL,
    swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
    trustProxy: toBoolean(process.env.TRUST_PROXY),
    requestBodyLimit: process.env.REQUEST_BODY_LIMIT ?? '1mb',
    requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 30000),
    shutdownTimeoutMs: toNumber(process.env.SHUTDOWN_TIMEOUT_MS, 10000),
    corsOrigins: toList(process.env.CORS_ORIGINS)
  },
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_DATABASE_URL,
    poolMax: toNumber(process.env.DATABASE_POOL_MAX, 20),
    statementTimeoutMs: toNumber(process.env.DATABASE_STATEMENT_TIMEOUT_MS, 30000)
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    tlsEnabled: toBoolean(process.env.REDIS_TLS_ENABLED),
    healthRequired: toBoolean(process.env.REDIS_HEALTH_REQUIRED)
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
    cookieSecret: process.env.COOKIE_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    cookieDomain: process.env.COOKIE_DOMAIN,
    cookieSecure: toBoolean(process.env.COOKIE_SECURE),
    passwordHashRounds: toNumber(process.env.PASSWORD_HASH_ROUNDS, 12),
    maxLoginAttempts: toNumber(process.env.MAX_LOGIN_ATTEMPTS, 5),
    accountLockMinutes: toNumber(process.env.ACCOUNT_LOCK_MINUTES, 15),
    emailVerificationRequired: toBoolean(process.env.AUTH_EMAIL_VERIFICATION_REQUIRED, true),
    emailVerificationTtlMinutes: toNumber(process.env.AUTH_EMAIL_VERIFICATION_TTL_MINUTES, 1440),
    passwordResetTtlMinutes: toNumber(process.env.AUTH_PASSWORD_RESET_TTL_MINUTES, 30),
    inviteTtlMinutes: toNumber(process.env.AUTH_INVITE_TTL_MINUTES, 10080),
    twoFactorIssuer: process.env.TWO_FACTOR_ISSUER ?? 'TaskBricks'
  },
  rateLimit: {
    ttlSeconds: toNumber(process.env.RATE_LIMIT_TTL_SECONDS, 60),
    max: toNumber(process.env.RATE_LIMIT_MAX, 300),
    authMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20)
  },
  queue: {
    prefix: process.env.QUEUE_PREFIX ?? 'taskbricks',
    concurrency: toNumber(process.env.QUEUE_CONCURRENCY, 5),
    attempts: toNumber(process.env.JOB_ATTEMPTS, 3),
    backoffMs: toNumber(process.env.JOB_BACKOFF_MS, 5000)
  },
  mail: {
    provider: process.env.MAIL_PROVIDER ?? 'none',
    from: process.env.MAIL_FROM,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: toNumber(process.env.SMTP_PORT, 587),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpSecure: toBoolean(process.env.SMTP_SECURE),
    resendApiKey: process.env.RESEND_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY
  },
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    maxUploadBytes: toNumber(process.env.MAX_UPLOAD_BYTES, 10485760),
    localUploadDir: process.env.LOCAL_UPLOAD_DIR ?? './uploads',
    s3Region: process.env.S3_REGION,
    s3Bucket: process.env.S3_BUCKET,
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
    cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
    cloudinaryUploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER
  },
  realtime: {
    enabled: toBoolean(process.env.REALTIME_ENABLED, true),
    corsOrigins: toList(process.env.SOCKET_CORS_ORIGINS),
    adapter: process.env.SOCKET_ADAPTER ?? 'memory',
    path: process.env.WEBSOCKET_PATH ?? '/socket.io'
  },
  billing: {
    enabled: toBoolean(process.env.BILLING_ENABLED),
    provider: process.env.BILLING_PROVIDER ?? 'none',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripePortalReturnUrl: process.env.STRIPE_PORTAL_RETURN_URL,
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
    paystackCallbackUrl: process.env.PAYSTACK_CALLBACK_URL,
    paystackPortalUrl: process.env.PAYSTACK_PORTAL_URL
  },
  ai: {
    enabled: toBoolean(process.env.AI_ENABLED),
    defaultProvider: process.env.AI_DEFAULT_PROVIDER ?? 'openai',
    openAiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    requestTimeoutMs: toNumber(process.env.AI_REQUEST_TIMEOUT_MS, 60000)
  },
  integrations: {
    webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID,
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    slackClientId: process.env.SLACK_CLIENT_ID,
    slackClientSecret: process.env.SLACK_CLIENT_SECRET,
    omoflowBaseUrl: process.env.OMOFLOW_BASE_URL,
    omoflowApiKey: process.env.OMOFLOW_API_KEY,
    omoflowWebhookSecret: process.env.OMOFLOW_WEBHOOK_SECRET,
    omoflowRuntimeSyncEnabled: toBoolean(process.env.OMOFLOW_RUNTIME_SYNC_ENABLED),
    whatsappBusinessApiUrl: process.env.WHATSAPP_BUSINESS_API_URL,
    whatsappBusinessPhoneNumberId: process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID,
    whatsappBusinessAccessToken: process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN,
    whatsappMeetingReminderTemplate: process.env.WHATSAPP_MEETING_REMINDER_TEMPLATE ?? 'taskbricks_meeting_reminder',
    whatsappMeetingFollowUpTemplate: process.env.WHATSAPP_MEETING_FOLLOW_UP_TEMPLATE ?? 'taskbricks_meeting_follow_up'
  },
  observability: {
    logLevel: process.env.LOG_LEVEL ?? 'debug',
    logFormat: process.env.LOG_FORMAT ?? 'pretty',
    sentryDsn: process.env.SENTRY_DSN,
    metricsEnabled: toBoolean(process.env.METRICS_ENABLED),
    metricsPath: process.env.METRICS_PATH ?? '/metrics',
    otelServiceName: process.env.OTEL_SERVICE_NAME ?? 'taskbricks-be',
    otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  },
  compliance: {
    auditRetentionDays: toNumber(process.env.AUDIT_RETENTION_DAYS, 2555),
    dataExportBucket: process.env.DATA_EXPORT_BUCKET,
    ipAllowlist: toList(process.env.IP_ALLOWLIST)
  },
  features: {
    maintenanceMode: toBoolean(process.env.MAINTENANCE_MODE),
    signupEnabled: toBoolean(process.env.SIGNUP_ENABLED, true),
    invitationsEnabled: toBoolean(process.env.INVITATIONS_ENABLED, true)
  }
});
