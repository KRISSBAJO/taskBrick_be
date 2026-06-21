-- CreateEnum
CREATE TYPE "ComplianceJobType" AS ENUM ('DATA_EXPORT', 'DATA_DELETION', 'RETENTION_PURGE');

-- CreateEnum
CREATE TYPE "ComplianceJobStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityEventStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- Align existing Prisma @updatedAt columns with the desired Prisma schema.
ALTER TABLE "AiAction" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "AiTenantSettings" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ReportExecution" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ReportExport" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "SecurityPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enforceIpAllowlist" BOOLEAN NOT NULL DEFAULT false,
    "ipAllowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionTtlMinutes" INTEGER NOT NULL DEFAULT 10080,
    "maxSessionsPerUser" INTEGER,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 12,
    "passwordRequireUpper" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireLower" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireNumber" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireSymbol" BOOLEAN NOT NULL DEFAULT true,
    "passwordHistoryCount" INTEGER NOT NULL DEFAULT 0,
    "mfaRequired" BOOLEAN NOT NULL DEFAULT false,
    "auditRetentionDays" INTEGER NOT NULL DEFAULT 2555,
    "dataRetentionDays" INTEGER,
    "maxUploadBytes" INTEGER,
    "allowedUploadMimeTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'INFO',
    "status" "SecurityEventStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "type" "ComplianceJobType" NOT NULL,
    "status" "ComplianceJobStatus" NOT NULL DEFAULT 'REQUESTED',
    "subjectType" TEXT,
    "subjectId" TEXT,
    "reason" TEXT,
    "parameters" JSONB,
    "result" JSONB,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "error" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecurityPolicy_tenantId_key" ON "SecurityPolicy"("tenantId");
CREATE INDEX "SecurityPolicy_tenantId_enforceIpAllowlist_idx" ON "SecurityPolicy"("tenantId", "enforceIpAllowlist");
CREATE INDEX "SecurityEvent_tenantId_createdAt_idx" ON "SecurityEvent"("tenantId", "createdAt");
CREATE INDEX "SecurityEvent_tenantId_severity_status_idx" ON "SecurityEvent"("tenantId", "severity", "status");
CREATE INDEX "SecurityEvent_tenantId_type_idx" ON "SecurityEvent"("tenantId", "type");
CREATE INDEX "SecurityEvent_subjectType_subjectId_idx" ON "SecurityEvent"("subjectType", "subjectId");
CREATE INDEX "ComplianceJob_tenantId_type_status_idx" ON "ComplianceJob"("tenantId", "type", "status");
CREATE INDEX "ComplianceJob_tenantId_requestedAt_idx" ON "ComplianceJob"("tenantId", "requestedAt");
CREATE INDEX "ComplianceJob_subjectType_subjectId_idx" ON "ComplianceJob"("subjectType", "subjectId");
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_tenantId_status_idx" ON "ApiKey"("tenantId", "status");
CREATE INDEX "ApiKey_tenantId_prefix_idx" ON "ApiKey"("tenantId", "prefix");
CREATE INDEX "ApiKey_tenantId_createdById_idx" ON "ApiKey"("tenantId", "createdById");

-- AddForeignKey
ALTER TABLE "SecurityPolicy" ADD CONSTRAINT "SecurityPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceJob" ADD CONSTRAINT "ComplianceJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceJob" ADD CONSTRAINT "ComplianceJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceJob" ADD CONSTRAINT "ComplianceJob_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
