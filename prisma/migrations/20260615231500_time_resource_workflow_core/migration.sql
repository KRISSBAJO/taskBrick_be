-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Approval core hardening
ALTER TABLE "Approval"
  ADD COLUMN "currentStep" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "decidedAt" TIMESTAMP(3),
  ADD COLUMN "definitionId" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "requestedById" TEXT,
  ADD COLUMN "workflowRunId" TEXT;

ALTER TABLE "ApprovalStep"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "decidedById" TEXT,
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "stepOrder" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "title" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "ApprovalStep"
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;

ALTER TABLE "ApprovalStep"
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- Time/resource planning hardening
ALTER TABLE "TimeEntry"
  ADD COLUMN "endedAt" TIMESTAMP(3),
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "projectId" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "status" "TimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "timesheetId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3),
  ALTER COLUMN "minutes" SET DEFAULT 0;

UPDATE "TimeEntry" AS te
SET "tenantId" = u."tenantId"
FROM "User" AS u
WHERE te."userId" = u."id"
  AND te."tenantId" IS NULL;

UPDATE "TimeEntry" AS te
SET "projectId" = t."projectId"
FROM "Task" AS t
WHERE te."taskId" = t."id"
  AND te."projectId" IS NULL;

UPDATE "TimeEntry"
SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

ALTER TABLE "TimeEntry"
  ALTER COLUMN "tenantId" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE TABLE "TimeTimer" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "taskId" TEXT,
  "description" TEXT,
  "billable" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimeTimer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Timesheet" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "approverId" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Skill"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "category" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Skill"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "Skill"
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "UserSkill"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3),
  ADD COLUMN "yearsExperience" INTEGER;

UPDATE "UserSkill" AS us
SET "tenantId" = u."tenantId"
FROM "User" AS u
WHERE us."userId" = u."id"
  AND us."tenantId" IS NULL;

UPDATE "UserSkill"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "UserSkill"
  ALTER COLUMN "tenantId" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "ResourceAllocation"
  ADD COLUMN "billable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "role" TEXT,
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "ResourceAllocation" AS ra
SET "tenantId" = p."tenantId"
FROM "Project" AS p
WHERE ra."projectId" = p."id"
  AND ra."tenantId" IS NULL;

UPDATE "ResourceAllocation"
SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

ALTER TABLE "ResourceAllocation"
  ALTER COLUMN "tenantId" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- Workflow automation hardening
ALTER TABLE "Workflow"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "config" JSONB,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "eventType" TEXT,
  ADD COLUMN "lastRunAt" TIMESTAMP(3),
  ADD COLUMN "triggerType" TEXT NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "WorkflowNode"
  ADD COLUMN "actionType" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "dependsOn" JSONB,
  ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "key" TEXT,
  ADD COLUMN "onFailure" TEXT,
  ADD COLUMN "retryAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "timeoutSeconds" INTEGER,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "WorkflowNode"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "WorkflowNode"
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "WorkflowRun"
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "entityType" TEXT,
  ADD COLUMN "error" TEXT,
  ADD COLUMN "eventType" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "triggerType" TEXT;

UPDATE "WorkflowRun" AS wr
SET "tenantId" = w."tenantId",
    "entityType" = w."entityType",
    "triggerType" = w."triggerType",
    "eventType" = w."eventType"
FROM "Workflow" AS w
WHERE wr."workflowId" = w."id"
  AND wr."tenantId" IS NULL;

ALTER TABLE "WorkflowRun"
  ALTER COLUMN "tenantId" SET NOT NULL;

CREATE TABLE "WorkflowRunLog" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "nodeId" TEXT,
  "level" TEXT NOT NULL DEFAULT 'INFO',
  "message" TEXT NOT NULL,
  "data" JSONB,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowRunLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalDefinition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "entityType" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalDefinitionStep" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "approverId" TEXT,
  "approverRole" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "escalationHours" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalDefinitionStep_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "TimeEntry_tenantId_entryDate_idx" ON "TimeEntry"("tenantId", "entryDate");
CREATE INDEX "TimeEntry_tenantId_userId_entryDate_idx" ON "TimeEntry"("tenantId", "userId", "entryDate");
CREATE INDEX "TimeEntry_tenantId_projectId_entryDate_idx" ON "TimeEntry"("tenantId", "projectId", "entryDate");
CREATE INDEX "TimeEntry_tenantId_taskId_idx" ON "TimeEntry"("tenantId", "taskId");
CREATE INDEX "TimeEntry_timesheetId_idx" ON "TimeEntry"("timesheetId");
CREATE INDEX "TimeTimer_tenantId_startedAt_idx" ON "TimeTimer"("tenantId", "startedAt");
CREATE UNIQUE INDEX "TimeTimer_tenantId_userId_key" ON "TimeTimer"("tenantId", "userId");
CREATE INDEX "Timesheet_tenantId_status_idx" ON "Timesheet"("tenantId", "status");
CREATE INDEX "Timesheet_tenantId_userId_periodStart_idx" ON "Timesheet"("tenantId", "userId", "periodStart");
CREATE UNIQUE INDEX "Timesheet_tenantId_userId_periodStart_periodEnd_key" ON "Timesheet"("tenantId", "userId", "periodStart", "periodEnd");
CREATE INDEX "Skill_tenantId_archivedAt_idx" ON "Skill"("tenantId", "archivedAt");
CREATE INDEX "UserSkill_tenantId_userId_idx" ON "UserSkill"("tenantId", "userId");
CREATE INDEX "UserSkill_tenantId_skillId_idx" ON "UserSkill"("tenantId", "skillId");
CREATE INDEX "ResourceAllocation_tenantId_userId_startDate_idx" ON "ResourceAllocation"("tenantId", "userId", "startDate");
CREATE INDEX "ResourceAllocation_tenantId_projectId_startDate_idx" ON "ResourceAllocation"("tenantId", "projectId", "startDate");
CREATE INDEX "ResourceAllocation_tenantId_startDate_endDate_idx" ON "ResourceAllocation"("tenantId", "startDate", "endDate");
CREATE INDEX "Workflow_tenantId_entityType_eventType_idx" ON "Workflow"("tenantId", "entityType", "eventType");
CREATE INDEX "Workflow_tenantId_isActive_archivedAt_idx" ON "Workflow"("tenantId", "isActive", "archivedAt");
CREATE INDEX "WorkflowNode_workflowId_sortOrder_idx" ON "WorkflowNode"("workflowId", "sortOrder");
CREATE INDEX "WorkflowRun_tenantId_status_createdAt_idx" ON "WorkflowRun"("tenantId", "status", "createdAt");
CREATE INDEX "WorkflowRun_tenantId_entityType_entityId_idx" ON "WorkflowRun"("tenantId", "entityType", "entityId");
CREATE UNIQUE INDEX "WorkflowRun_workflowId_idempotencyKey_key" ON "WorkflowRun"("workflowId", "idempotencyKey");
CREATE INDEX "WorkflowRunLog_runId_createdAt_idx" ON "WorkflowRunLog"("runId", "createdAt");
CREATE INDEX "WorkflowRunLog_nodeId_idx" ON "WorkflowRunLog"("nodeId");
CREATE UNIQUE INDEX "ApprovalDefinition_tenantId_name_key" ON "ApprovalDefinition"("tenantId", "name");
CREATE INDEX "ApprovalDefinition_tenantId_entityType_isActive_idx" ON "ApprovalDefinition"("tenantId", "entityType", "isActive");
CREATE UNIQUE INDEX "ApprovalDefinitionStep_definitionId_stepOrder_key" ON "ApprovalDefinitionStep"("definitionId", "stepOrder");
CREATE INDEX "Approval_tenantId_status_createdAt_idx" ON "Approval"("tenantId", "status", "createdAt");
CREATE INDEX "Approval_tenantId_entityType_entityId_idx" ON "Approval"("tenantId", "entityType", "entityId");
CREATE INDEX "Approval_workflowRunId_idx" ON "Approval"("workflowRunId");
CREATE INDEX "ApprovalStep_approverId_status_idx" ON "ApprovalStep"("approverId", "status");
CREATE INDEX "ApprovalStep_approvalId_stepOrder_idx" ON "ApprovalStep"("approvalId", "stepOrder");

-- Foreign keys
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeTimer" ADD CONSTRAINT "TimeTimer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeTimer" ADD CONSTRAINT "TimeTimer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeTimer" ADD CONSTRAINT "TimeTimer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowRunLog" ADD CONSTRAINT "WorkflowRunLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowRunLog" ADD CONSTRAINT "WorkflowRunLog_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "WorkflowNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalDefinitionStep" ADD CONSTRAINT "ApprovalDefinitionStep_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ApprovalDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
