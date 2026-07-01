-- CreateEnum
CREATE TYPE "QaTestCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "QaTestCaseType" AS ENUM ('FUNCTIONAL', 'REGRESSION', 'SMOKE', 'INTEGRATION', 'PERFORMANCE', 'SECURITY', 'ACCESSIBILITY', 'ACCEPTANCE');

-- CreateEnum
CREATE TYPE "QaTestCaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QaTaskLinkType" AS ENUM ('COVERS', 'REGRESSION', 'ACCEPTANCE', 'BLOCKER');

-- CreateEnum
CREATE TYPE "QaTestPlanStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QaTestRunSource" AS ENUM ('MANUAL', 'AUTOMATION', 'CI', 'API');

-- CreateEnum
CREATE TYPE "QaTestRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QaExecutionStatus" AS ENUM ('UNTESTED', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'FLAKY');

-- CreateEnum
CREATE TYPE "QaEvidenceType" AS ENUM ('SCREENSHOT', 'VIDEO', 'LOG', 'FILE', 'LINK', 'NOTE');

-- AlterTable
ALTER TABLE "Project"
  ADD COLUMN "qaGateEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "qaGateMinimumPassRate" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "QaTestCase" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "createdById" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "QaTestCaseType" NOT NULL DEFAULT 'FUNCTIONAL',
  "priority" "QaTestCasePriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "QaTestCaseStatus" NOT NULL DEFAULT 'ACTIVE',
  "preconditions" TEXT,
  "steps" JSONB,
  "expectedResult" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "automationKey" TEXT,
  "estimateMins" INTEGER,
  "metadata" JSONB,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QaTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaTestCaseTaskLink" (
  "id" TEXT NOT NULL,
  "testCaseId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "linkType" "QaTaskLinkType" NOT NULL DEFAULT 'COVERS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QaTestCaseTaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaTestPlan" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sprintId" TEXT,
  "createdById" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "QaTestPlanStatus" NOT NULL DEFAULT 'PLANNED',
  "releaseName" TEXT,
  "milestone" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QaTestPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaTestPlanItem" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "testCaseId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QaTestPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaTestRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sprintId" TEXT,
  "planId" TEXT,
  "taskId" TEXT,
  "triggeredById" TEXT,
  "name" TEXT NOT NULL,
  "source" "QaTestRunSource" NOT NULL DEFAULT 'MANUAL',
  "status" "QaTestRunStatus" NOT NULL DEFAULT 'QUEUED',
  "provider" TEXT,
  "externalRunId" TEXT,
  "environment" TEXT,
  "buildVersion" TEXT,
  "summary" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QaTestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaTestExecution" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "testRunId" TEXT NOT NULL,
  "testCaseId" TEXT,
  "taskId" TEXT,
  "defectTaskId" TEXT,
  "executedById" TEXT,
  "title" TEXT NOT NULL,
  "status" "QaExecutionStatus" NOT NULL DEFAULT 'UNTESTED',
  "notes" TEXT,
  "actualResult" TEXT,
  "durationMs" INTEGER,
  "failureMessage" TEXT,
  "failureStack" TEXT,
  "evidence" JSONB,
  "executedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QaTestExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QaEvidence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "testCaseId" TEXT,
  "executionId" TEXT,
  "taskId" TEXT,
  "createdById" TEXT,
  "type" "QaEvidenceType" NOT NULL DEFAULT 'NOTE',
  "title" TEXT NOT NULL,
  "url" TEXT,
  "fileAssetId" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QaEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QaTestCase_tenantId_idx" ON "QaTestCase"("tenantId");
CREATE INDEX "QaTestCase_projectId_status_idx" ON "QaTestCase"("projectId", "status");
CREATE INDEX "QaTestCase_automationKey_idx" ON "QaTestCase"("automationKey");
CREATE INDEX "QaTestCase_tenantId_archivedAt_idx" ON "QaTestCase"("tenantId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QaTestCaseTaskLink_testCaseId_taskId_linkType_key" ON "QaTestCaseTaskLink"("testCaseId", "taskId", "linkType");
CREATE INDEX "QaTestCaseTaskLink_taskId_idx" ON "QaTestCaseTaskLink"("taskId");

-- CreateIndex
CREATE INDEX "QaTestPlan_tenantId_idx" ON "QaTestPlan"("tenantId");
CREATE INDEX "QaTestPlan_projectId_status_idx" ON "QaTestPlan"("projectId", "status");
CREATE INDEX "QaTestPlan_sprintId_idx" ON "QaTestPlan"("sprintId");
CREATE INDEX "QaTestPlan_tenantId_archivedAt_idx" ON "QaTestPlan"("tenantId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QaTestPlanItem_planId_testCaseId_key" ON "QaTestPlanItem"("planId", "testCaseId");
CREATE INDEX "QaTestPlanItem_testCaseId_idx" ON "QaTestPlanItem"("testCaseId");

-- CreateIndex
CREATE INDEX "QaTestRun_tenantId_idx" ON "QaTestRun"("tenantId");
CREATE INDEX "QaTestRun_projectId_status_idx" ON "QaTestRun"("projectId", "status");
CREATE INDEX "QaTestRun_sprintId_idx" ON "QaTestRun"("sprintId");
CREATE INDEX "QaTestRun_planId_idx" ON "QaTestRun"("planId");
CREATE INDEX "QaTestRun_externalRunId_idx" ON "QaTestRun"("externalRunId");

-- CreateIndex
CREATE INDEX "QaTestExecution_tenantId_idx" ON "QaTestExecution"("tenantId");
CREATE INDEX "QaTestExecution_testRunId_status_idx" ON "QaTestExecution"("testRunId", "status");
CREATE INDEX "QaTestExecution_testCaseId_idx" ON "QaTestExecution"("testCaseId");
CREATE INDEX "QaTestExecution_taskId_status_idx" ON "QaTestExecution"("taskId", "status");
CREATE INDEX "QaTestExecution_defectTaskId_idx" ON "QaTestExecution"("defectTaskId");

-- CreateIndex
CREATE INDEX "QaEvidence_tenantId_idx" ON "QaEvidence"("tenantId");
CREATE INDEX "QaEvidence_testCaseId_idx" ON "QaEvidence"("testCaseId");
CREATE INDEX "QaEvidence_executionId_idx" ON "QaEvidence"("executionId");
CREATE INDEX "QaEvidence_taskId_idx" ON "QaEvidence"("taskId");
CREATE INDEX "QaEvidence_fileAssetId_idx" ON "QaEvidence"("fileAssetId");

-- AddForeignKey
ALTER TABLE "QaTestCase" ADD CONSTRAINT "QaTestCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestCase" ADD CONSTRAINT "QaTestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestCase" ADD CONSTRAINT "QaTestCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaTestCaseTaskLink" ADD CONSTRAINT "QaTestCaseTaskLink_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "QaTestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestCaseTaskLink" ADD CONSTRAINT "QaTestCaseTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaTestPlan" ADD CONSTRAINT "QaTestPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestPlan" ADD CONSTRAINT "QaTestPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestPlan" ADD CONSTRAINT "QaTestPlan_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QaTestPlan" ADD CONSTRAINT "QaTestPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaTestPlanItem" ADD CONSTRAINT "QaTestPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "QaTestPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestPlanItem" ADD CONSTRAINT "QaTestPlanItem_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "QaTestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaTestRun" ADD CONSTRAINT "QaTestRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestRun" ADD CONSTRAINT "QaTestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestRun" ADD CONSTRAINT "QaTestRun_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QaTestRun" ADD CONSTRAINT "QaTestRun_planId_fkey" FOREIGN KEY ("planId") REFERENCES "QaTestPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QaTestRun" ADD CONSTRAINT "QaTestRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QaTestRun" ADD CONSTRAINT "QaTestRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaTestExecution" ADD CONSTRAINT "QaTestExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestExecution" ADD CONSTRAINT "QaTestExecution_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "QaTestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaTestExecution" ADD CONSTRAINT "QaTestExecution_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "QaTestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QaTestExecution" ADD CONSTRAINT "QaTestExecution_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QaTestExecution" ADD CONSTRAINT "QaTestExecution_defectTaskId_fkey" FOREIGN KEY ("defectTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QaTestExecution" ADD CONSTRAINT "QaTestExecution_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaEvidence" ADD CONSTRAINT "QaEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaEvidence" ADD CONSTRAINT "QaEvidence_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "QaTestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaEvidence" ADD CONSTRAINT "QaEvidence_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "QaTestExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QaEvidence" ADD CONSTRAINT "QaEvidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QaEvidence" ADD CONSTRAINT "QaEvidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
