-- CreateEnum
CREATE TYPE "AiConversationStatus" AS ENUM ('OPEN', 'ARCHIVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL');

-- CreateEnum
CREATE TYPE "AiRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiActionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DashboardVisibility" AS ENUM ('PRIVATE', 'TEAM', 'TENANT', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportExportStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportExportFormat" AS ENUM ('JSON', 'CSV', 'XLSX', 'PDF');

-- AI tenant controls
CREATE TABLE "AiTenantSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultProvider" TEXT NOT NULL DEFAULT 'local',
    "defaultModel" TEXT NOT NULL DEFAULT 'taskbricks-local',
    "allowedProviders" TEXT[],
    "monthlyTokenLimit" INTEGER,
    "monthlyCostLimit" DECIMAL(65,30),
    "redactSensitiveData" BOOLEAN NOT NULL DEFAULT true,
    "dataRetentionDays" INTEGER,
    "policy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiTenantSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiTenantSettings_tenantId_key" ON "AiTenantSettings"("tenantId");

ALTER TABLE "AiTenantSettings"
  ADD CONSTRAINT "AiTenantSettings_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiAgent"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "guardrails" JSONB,
  ADD COLUMN "knowledgeScope" JSONB,
  ADD COLUMN "maxOutputTokens" INTEGER,
  ADD COLUMN "model" TEXT NOT NULL DEFAULT 'taskbricks-local',
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN "temperature" DOUBLE PRECISION,
  ADD COLUMN "tools" TEXT[],
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'ASSISTANT';

DELETE FROM "AiAgent" a
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t."id" = a."tenantId");

ALTER TABLE "AiAgent"
  ADD CONSTRAINT "AiAgent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiAgent"
  ADD CONSTRAINT "AiAgent_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AiAgent_tenantId_enabled_idx" ON "AiAgent"("tenantId", "enabled");
CREATE INDEX "AiAgent_tenantId_archivedAt_idx" ON "AiAgent"("tenantId", "archivedAt");
CREATE INDEX "AiAgent_tenantId_provider_model_idx" ON "AiAgent"("tenantId", "provider", "model");

-- Conversations and messages
DELETE FROM "AiConversation" c
WHERE NOT EXISTS (SELECT 1 FROM "AiAgent" a WHERE a."id" = c."agentId")
   OR NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = c."userId");

ALTER TABLE "AiConversation"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "contextId" TEXT,
  ADD COLUMN "contextType" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "status" "AiConversationStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "AiConversation" c
SET "tenantId" = a."tenantId",
    "updatedAt" = c."createdAt"
FROM "AiAgent" a
WHERE a."id" = c."agentId";

ALTER TABLE "AiConversation" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AiConversation" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "AiConversation"
  ADD CONSTRAINT "AiConversation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiConversation"
  ADD CONSTRAINT "AiConversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AiConversation_tenantId_userId_status_idx" ON "AiConversation"("tenantId", "userId", "status");
CREATE INDEX "AiConversation_tenantId_contextType_contextId_idx" ON "AiConversation"("tenantId", "contextType", "contextId");
CREATE INDEX "AiConversation_agentId_createdAt_idx" ON "AiConversation"("agentId", "createdAt");

DELETE FROM "AiMessage" m
WHERE NOT EXISTS (SELECT 1 FROM "AiConversation" c WHERE c."id" = m."conversationId");

ALTER TABLE "AiMessage"
  ADD COLUMN "contentJson" JSONB,
  ADD COLUMN "generated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "inputTokens" INTEGER,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "outputTokens" INTEGER,
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "safetyMetadata" JSONB,
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "role_next" "AiMessageRole";

UPDATE "AiMessage" m
SET "tenantId" = c."tenantId",
    "userId" = CASE WHEN UPPER(m."role") = 'USER' THEN c."userId" ELSE NULL END,
    "role_next" = CASE
      WHEN UPPER(m."role") = 'SYSTEM' THEN 'SYSTEM'::"AiMessageRole"
      WHEN UPPER(m."role") = 'ASSISTANT' THEN 'ASSISTANT'::"AiMessageRole"
      WHEN UPPER(m."role") = 'TOOL' THEN 'TOOL'::"AiMessageRole"
      ELSE 'USER'::"AiMessageRole"
    END
FROM "AiConversation" c
WHERE c."id" = m."conversationId";

ALTER TABLE "AiMessage" DROP COLUMN "role";
ALTER TABLE "AiMessage" RENAME COLUMN "role_next" TO "role";
ALTER TABLE "AiMessage" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AiMessage" ALTER COLUMN "role" SET NOT NULL;

ALTER TABLE "AiMessage"
  ADD CONSTRAINT "AiMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiMessage"
  ADD CONSTRAINT "AiMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AiMessage_tenantId_conversationId_createdAt_idx" ON "AiMessage"("tenantId", "conversationId", "createdAt");
CREATE INDEX "AiMessage_tenantId_role_idx" ON "AiMessage"("tenantId", "role");
CREATE INDEX "AiMessage_tenantId_userId_idx" ON "AiMessage"("tenantId", "userId");

CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "agentId" TEXT,
    "conversationId" TEXT,
    "messageId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AiRequestStatus" NOT NULL DEFAULT 'COMPLETED',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(65,30),
    "latencyMs" INTEGER,
    "requestType" TEXT,
    "requestHash" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageLog_tenantId_createdAt_idx" ON "AiUsageLog"("tenantId", "createdAt");
CREATE INDEX "AiUsageLog_tenantId_userId_idx" ON "AiUsageLog"("tenantId", "userId");
CREATE INDEX "AiUsageLog_tenantId_provider_model_idx" ON "AiUsageLog"("tenantId", "provider", "model");
CREATE INDEX "AiUsageLog_conversationId_idx" ON "AiUsageLog"("conversationId");

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "AiMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AiAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT,
    "conversationId" TEXT,
    "messageId" TEXT,
    "requestedById" TEXT,
    "type" TEXT NOT NULL,
    "status" "AiActionStatus" NOT NULL DEFAULT 'PENDING',
    "entityType" TEXT,
    "entityId" TEXT,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "idempotencyKey" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiAction_tenantId_idempotencyKey_key" ON "AiAction"("tenantId", "idempotencyKey");
CREATE INDEX "AiAction_tenantId_status_idx" ON "AiAction"("tenantId", "status");
CREATE INDEX "AiAction_tenantId_type_idx" ON "AiAction"("tenantId", "type");
CREATE INDEX "AiAction_conversationId_idx" ON "AiAction"("conversationId");

ALTER TABLE "AiAction"
  ADD CONSTRAINT "AiAction_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiAction"
  ADD CONSTRAINT "AiAction_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiAction"
  ADD CONSTRAINT "AiAction_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiAction"
  ADD CONSTRAINT "AiAction_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "AiMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiAction"
  ADD CONSTRAINT "AiAction_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reporting and dashboards
UPDATE "Dashboard" d
SET "ownerId" = NULL
WHERE "ownerId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = d."ownerId");

ALTER TABLE "Dashboard"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "description" TEXT,
  ADD COLUMN "filters" JSONB,
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "refreshIntervalSeconds" INTEGER,
  ADD COLUMN "visibility" "DashboardVisibility" NOT NULL DEFAULT 'PRIVATE';

DELETE FROM "Dashboard" d
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t."id" = d."tenantId");

ALTER TABLE "Dashboard"
  ADD CONSTRAINT "Dashboard_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Dashboard"
  ADD CONSTRAINT "Dashboard_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Dashboard_tenantId_ownerId_idx" ON "Dashboard"("tenantId", "ownerId");
CREATE INDEX "Dashboard_tenantId_visibility_idx" ON "Dashboard"("tenantId", "visibility");
CREATE INDEX "Dashboard_tenantId_archivedAt_idx" ON "Dashboard"("tenantId", "archivedAt");

DELETE FROM "DashboardWidget" w
WHERE NOT EXISTS (SELECT 1 FROM "Dashboard" d WHERE d."id" = w."dashboardId");

ALTER TABLE "DashboardWidget"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "dataSource" JSONB,
  ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "refreshIntervalSeconds" INTEGER,
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "DashboardWidget" w
SET "tenantId" = d."tenantId",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Dashboard" d
WHERE d."id" = w."dashboardId";

ALTER TABLE "DashboardWidget" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DashboardWidget" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "DashboardWidget"
  ADD CONSTRAINT "DashboardWidget_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DashboardWidget_tenantId_dashboardId_idx" ON "DashboardWidget"("tenantId", "dashboardId");
CREATE INDEX "DashboardWidget_tenantId_type_idx" ON "DashboardWidget"("tenantId", "type");

ALTER TABLE "Report"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "cacheTtlSeconds" INTEGER,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "lastRunAt" TIMESTAMP(3),
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "nextRunAt" TIMESTAMP(3),
  ADD COLUMN "recipients" TEXT[],
  ADD COLUMN "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "timezone" TEXT;

DELETE FROM "Report" r
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t."id" = r."tenantId");

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Report_tenantId_type_idx" ON "Report"("tenantId", "type");
CREATE INDEX "Report_tenantId_status_idx" ON "Report"("tenantId", "status");
CREATE INDEX "Report_tenantId_archivedAt_idx" ON "Report"("tenantId", "archivedAt");
CREATE INDEX "Report_tenantId_nextRunAt_idx" ON "Report"("tenantId", "nextRunAt");

CREATE TABLE "ReportExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportId" TEXT,
    "requestedById" TEXT,
    "type" TEXT NOT NULL,
    "status" "ReportExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "parameters" JSONB,
    "result" JSONB,
    "summary" JSONB,
    "error" TEXT,
    "rowCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "cacheKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportExecution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportExecution_tenantId_type_idx" ON "ReportExecution"("tenantId", "type");
CREATE INDEX "ReportExecution_tenantId_status_idx" ON "ReportExecution"("tenantId", "status");
CREATE INDEX "ReportExecution_reportId_createdAt_idx" ON "ReportExecution"("reportId", "createdAt");
CREATE INDEX "ReportExecution_tenantId_cacheKey_idx" ON "ReportExecution"("tenantId", "cacheKey");

ALTER TABLE "ReportExecution"
  ADD CONSTRAINT "ReportExecution_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportExecution"
  ADD CONSTRAINT "ReportExecution_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportExecution"
  ADD CONSTRAINT "ReportExecution_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportId" TEXT,
    "executionId" TEXT,
    "requestedById" TEXT,
    "format" "ReportExportFormat" NOT NULL,
    "status" "ReportExportStatus" NOT NULL DEFAULT 'QUEUED',
    "fileName" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportExport_tenantId_status_idx" ON "ReportExport"("tenantId", "status");
CREATE INDEX "ReportExport_tenantId_format_idx" ON "ReportExport"("tenantId", "format");
CREATE INDEX "ReportExport_reportId_createdAt_idx" ON "ReportExport"("reportId", "createdAt");

ALTER TABLE "ReportExport"
  ADD CONSTRAINT "ReportExport_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportExport"
  ADD CONSTRAINT "ReportExport_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportExport"
  ADD CONSTRAINT "ReportExport_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "ReportExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportExport"
  ADD CONSTRAINT "ReportExport_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
