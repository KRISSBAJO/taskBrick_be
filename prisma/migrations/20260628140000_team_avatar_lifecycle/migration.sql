ALTER TABLE "Team"
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "avatarPublicId" TEXT,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "updatedById" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT;

CREATE INDEX "Team_tenantId_deletedAt_idx" ON "Team"("tenantId", "deletedAt");
CREATE INDEX "Team_tenantId_createdById_idx" ON "Team"("tenantId", "createdById");
