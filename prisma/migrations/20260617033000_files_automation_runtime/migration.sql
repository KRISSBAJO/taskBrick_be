-- Universal file registry for task, project, chat, document, workflow, and integration attachments.
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'GENERAL',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'external',
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "visibility" "Visibility" NOT NULL DEFAULT 'TEAM',
    "metadata" JSONB,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FileAsset_tenantId_entityType_entityId_idx" ON "FileAsset"("tenantId", "entityType", "entityId");
CREATE INDEX "FileAsset_tenantId_scope_idx" ON "FileAsset"("tenantId", "scope");
CREATE INDEX "FileAsset_tenantId_deletedAt_idx" ON "FileAsset"("tenantId", "deletedAt");
CREATE INDEX "FileAsset_tenantId_archivedAt_idx" ON "FileAsset"("tenantId", "archivedAt");
CREATE INDEX "FileAsset_uploadedById_idx" ON "FileAsset"("uploadedById");

ALTER TABLE "FileAsset"
  ADD CONSTRAINT "FileAsset_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FileAsset"
  ADD CONSTRAINT "FileAsset_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
