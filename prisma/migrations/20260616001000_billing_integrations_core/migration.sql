-- CreateEnum
CREATE TYPE "BillingEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "UsageRecordSource" AS ENUM ('SYSTEM', 'API', 'WEBHOOK', 'MANUAL');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR', 'REVOKED');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'CANCELLED');

-- Keep previous schema additions aligned with Prisma @updatedAt semantics.
ALTER TABLE "DocumentFolder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Billing catalog hardening
ALTER TABLE "Plan"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "providerPriceId" TEXT,
  ADD COLUMN "seatLimit" INTEGER,
  ADD COLUMN "trialDays" INTEGER,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Plan"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "Plan" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "Feature"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "defaultLimit" INTEGER,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "metered" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "unit" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Feature"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "Feature" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "PlanFeature"
  ADD COLUMN "config" JSONB,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "PlanFeature"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "PlanFeature" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "Subscription"
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canceledAt" TIMESTAMP(3),
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "providerCustomerId" TEXT,
  ADD COLUMN "providerSubscriptionId" TEXT,
  ADD COLUMN "seatCount" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Invoice"
  ADD COLUMN "hostedInvoiceUrl" TEXT,
  ADD COLUMN "invoicePdfUrl" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "number" TEXT,
  ADD COLUMN "periodEnd" TIMESTAMP(3),
  ADD COLUMN "periodStart" TIMESTAMP(3),
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "providerInvoiceId" TEXT,
  ADD COLUMN "subtotal" DECIMAL(65,30),
  ADD COLUMN "tax" DECIMAL(65,30),
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "total" DECIMAL(65,30),
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Invoice" AS i
SET "tenantId" = s."tenantId",
    "subtotal" = COALESCE(i."subtotal", i."amount"),
    "total" = COALESCE(i."total", i."amount")
FROM "Subscription" AS s
WHERE i."subscriptionId" = s."id";

UPDATE "Invoice"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "Invoice" ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE TABLE "UsageRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "featureId" TEXT,
  "featureKey" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT,
  "source" "UsageRecordSource" NOT NULL DEFAULT 'API',
  "idempotencyKey" TEXT,
  "metadata" JSONB,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "BillingEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "payload" JSONB,
  "processedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- Integration hardening
ALTER TABLE "Integration"
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "encryptedSecrets" JSONB,
  ADD COLUMN "externalAccountId" TEXT,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "scopes" TEXT[],
  ADD COLUMN "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "IntegrationLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'INFO',
  "eventType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Webhook"
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "failureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastDeliveryAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "name" TEXT,
  ADD COLUMN "signingAlgorithm" TEXT NOT NULL DEFAULT 'hmac-sha256',
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Webhook"
SET "name" = COALESCE("name", "url"),
    "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "name" IS NULL OR "updatedAt" IS NULL;

ALTER TABLE "Webhook"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE TABLE "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "responseStatus" INTEGER,
  "responseBody" TEXT,
  "requestHeaders" JSONB,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Plan_isActive_archivedAt_idx" ON "Plan"("isActive", "archivedAt");
CREATE INDEX "Plan_providerPriceId_idx" ON "Plan"("providerPriceId");
CREATE INDEX "Feature_category_idx" ON "Feature"("category");
CREATE INDEX "Feature_isActive_idx" ON "Feature"("isActive");
CREATE INDEX "PlanFeature_featureId_idx" ON "PlanFeature"("featureId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_provider_providerCustomerId_idx" ON "Subscription"("provider", "providerCustomerId");
CREATE INDEX "Subscription_provider_providerSubscriptionId_idx" ON "Subscription"("provider", "providerSubscriptionId");
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");
CREATE INDEX "Invoice_subscriptionId_createdAt_idx" ON "Invoice"("subscriptionId", "createdAt");
CREATE UNIQUE INDEX "Invoice_provider_providerInvoiceId_key" ON "Invoice"("provider", "providerInvoiceId");
CREATE INDEX "UsageRecord_tenantId_featureKey_periodStart_periodEnd_idx" ON "UsageRecord"("tenantId", "featureKey", "periodStart", "periodEnd");
CREATE INDEX "UsageRecord_subscriptionId_idx" ON "UsageRecord"("subscriptionId");
CREATE UNIQUE INDEX "UsageRecord_tenantId_featureKey_idempotencyKey_key" ON "UsageRecord"("tenantId", "featureKey", "idempotencyKey");
CREATE INDEX "BillingEvent_tenantId_status_idx" ON "BillingEvent"("tenantId", "status");
CREATE INDEX "BillingEvent_provider_type_idx" ON "BillingEvent"("provider", "type");
CREATE UNIQUE INDEX "BillingEvent_provider_eventId_key" ON "BillingEvent"("provider", "eventId");
CREATE INDEX "Integration_tenantId_provider_idx" ON "Integration"("tenantId", "provider");
CREATE INDEX "Integration_tenantId_status_idx" ON "Integration"("tenantId", "status");
CREATE UNIQUE INDEX "Integration_tenantId_provider_name_key" ON "Integration"("tenantId", "provider", "name");
CREATE INDEX "IntegrationLog_tenantId_integrationId_createdAt_idx" ON "IntegrationLog"("tenantId", "integrationId", "createdAt");
CREATE INDEX "IntegrationLog_tenantId_eventType_idx" ON "IntegrationLog"("tenantId", "eventType");
CREATE INDEX "Webhook_tenantId_enabled_idx" ON "Webhook"("tenantId", "enabled");
CREATE INDEX "Webhook_tenantId_createdAt_idx" ON "Webhook"("tenantId", "createdAt");
CREATE INDEX "WebhookDelivery_tenantId_status_idx" ON "WebhookDelivery"("tenantId", "status");
CREATE INDEX "WebhookDelivery_tenantId_eventType_idx" ON "WebhookDelivery"("tenantId", "eventType");
CREATE INDEX "WebhookDelivery_webhookId_createdAt_idx" ON "WebhookDelivery"("webhookId", "createdAt");

-- Foreign keys
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
