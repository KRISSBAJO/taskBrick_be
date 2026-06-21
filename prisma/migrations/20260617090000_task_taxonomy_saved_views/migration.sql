ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'APPROVAL';

ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Task_tenantId_archivedAt_idx" ON "Task"("tenantId", "archivedAt");
CREATE INDEX IF NOT EXISTS "Task_tenantId_deletedAt_idx" ON "Task"("tenantId", "deletedAt");

ALTER TABLE "CustomField"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT,
  ADD COLUMN IF NOT EXISTS "projectId" TEXT,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomField_tenantId_fkey'
  ) THEN
    ALTER TABLE "CustomField"
      ADD CONSTRAINT "CustomField_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomField_workspaceId_fkey'
  ) THEN
    ALTER TABLE "CustomField"
      ADD CONSTRAINT "CustomField_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomField_projectId_fkey'
  ) THEN
    ALTER TABLE "CustomField"
      ADD CONSTRAINT "CustomField_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CustomField_tenantId_workspaceId_entityType_idx" ON "CustomField"("tenantId", "workspaceId", "entityType");
CREATE INDEX IF NOT EXISTS "CustomField_tenantId_projectId_entityType_idx" ON "CustomField"("tenantId", "projectId", "entityType");
CREATE INDEX IF NOT EXISTS "CustomField_tenantId_archivedAt_idx" ON "CustomField"("tenantId", "archivedAt");

CREATE TABLE IF NOT EXISTS "TaskSavedView" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
  "filters" JSONB NOT NULL,
  "columns" JSONB,
  "sortBy" TEXT,
  "sortDirection" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskSavedView_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskSavedView_tenantId_fkey'
  ) THEN
    ALTER TABLE "TaskSavedView"
      ADD CONSTRAINT "TaskSavedView_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskSavedView_ownerId_fkey'
  ) THEN
    ALTER TABLE "TaskSavedView"
      ADD CONSTRAINT "TaskSavedView_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskSavedView_projectId_fkey'
  ) THEN
    ALTER TABLE "TaskSavedView"
      ADD CONSTRAINT "TaskSavedView_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TaskSavedView_tenantId_ownerId_idx" ON "TaskSavedView"("tenantId", "ownerId");
CREATE INDEX IF NOT EXISTS "TaskSavedView_tenantId_projectId_idx" ON "TaskSavedView"("tenantId", "projectId");
CREATE INDEX IF NOT EXISTS "TaskSavedView_tenantId_visibility_idx" ON "TaskSavedView"("tenantId", "visibility");
