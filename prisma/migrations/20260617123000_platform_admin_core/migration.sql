-- Platform/site-admin control plane separated from tenant RBAC.

CREATE TYPE "PlatformAdminLevel" AS ENUM ('OWNER', 'ADMIN', 'SUPPORT', 'AUDITOR');
CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "PlatformAdminLevel" NOT NULL DEFAULT 'ADMIN',
    "status" "PlatformAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "grantedById" TEXT,
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "targetTenantId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAdmin_userId_key" ON "PlatformAdmin"("userId");
CREATE INDEX "PlatformAdmin_status_level_idx" ON "PlatformAdmin"("status", "level");
CREATE INDEX "PlatformAdmin_userId_status_idx" ON "PlatformAdmin"("userId", "status");
CREATE INDEX "PlatformAuditLog_actorId_createdAt_idx" ON "PlatformAuditLog"("actorId", "createdAt");
CREATE INDEX "PlatformAuditLog_targetTenantId_createdAt_idx" ON "PlatformAuditLog"("targetTenantId", "createdAt");
CREATE INDEX "PlatformAuditLog_entityType_entityId_idx" ON "PlatformAuditLog"("entityType", "entityId");
CREATE INDEX "PlatformAuditLog_action_createdAt_idx" ON "PlatformAuditLog"("action", "createdAt");

ALTER TABLE "PlatformAdmin" ADD CONSTRAINT "PlatformAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformAdmin" ADD CONSTRAINT "PlatformAdmin_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformAdmin" ADD CONSTRAINT "PlatformAdmin_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
