CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "DocumentFolder"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Document"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "tags" JSONB,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "updatedById" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "DocumentVersion"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "visibility" "Visibility",
  ADD COLUMN "status" "DocumentStatus",
  ADD COLUMN "projectId" TEXT,
  ADD COLUMN "folderId" TEXT,
  ADD COLUMN "tags" JSONB,
  ADD COLUMN "changeNote" TEXT;

ALTER TABLE "Notification"
  ADD COLUMN "templateId" TEXT;

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "provider" TEXT,
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "nextAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentFolder_tenantId_idx" ON "DocumentFolder"("tenantId");
CREATE INDEX "DocumentFolder_tenantId_parentId_idx" ON "DocumentFolder"("tenantId", "parentId");
CREATE INDEX "DocumentFolder_tenantId_archivedAt_idx" ON "DocumentFolder"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "Document_tenantId_slug_key" ON "Document"("tenantId", "slug");
CREATE INDEX "Document_tenantId_idx" ON "Document"("tenantId");
CREATE INDEX "Document_tenantId_projectId_idx" ON "Document"("tenantId", "projectId");
CREATE INDEX "Document_tenantId_folderId_idx" ON "Document"("tenantId", "folderId");
CREATE INDEX "Document_tenantId_status_idx" ON "Document"("tenantId", "status");
CREATE INDEX "Document_tenantId_visibility_idx" ON "Document"("tenantId", "visibility");
CREATE INDEX "Document_tenantId_archivedAt_idx" ON "Document"("tenantId", "archivedAt");

CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");
CREATE INDEX "DocumentVersion_documentId_createdAt_idx" ON "DocumentVersion"("documentId", "createdAt");

CREATE INDEX "Notification_tenantId_userId_readAt_idx" ON "Notification"("tenantId", "userId", "readAt");
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

CREATE UNIQUE INDEX "NotificationTemplate_tenantId_key_channel_key" ON "NotificationTemplate"("tenantId", "key", "channel");
CREATE INDEX "NotificationTemplate_tenantId_idx" ON "NotificationTemplate"("tenantId");
CREATE INDEX "NotificationTemplate_tenantId_isActive_idx" ON "NotificationTemplate"("tenantId", "isActive");

CREATE INDEX "NotificationDelivery_tenantId_status_idx" ON "NotificationDelivery"("tenantId", "status");
CREATE INDEX "NotificationDelivery_tenantId_userId_idx" ON "NotificationDelivery"("tenantId", "userId");
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key" ON "NotificationDelivery"("notificationId", "channel");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
