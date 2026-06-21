CREATE TYPE "ProjectStakeholderInfluence" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ProjectDependencyStatus" AS ENUM ('OPEN', 'BLOCKED', 'RESOLVED', 'CANCELLED');
CREATE TYPE "ProjectDecisionStatus" AS ENUM ('PROPOSED', 'DECIDED', 'SUPERSEDED', 'REOPENED');
CREATE TYPE "ProjectChangeRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CANCELLED');

CREATE TABLE "ProjectStakeholder" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "organization" TEXT,
  "role" TEXT,
  "influence" "ProjectStakeholderInfluence" NOT NULL DEFAULT 'MEDIUM',
  "isExternal" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectStakeholder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectDependency" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dependencyType" TEXT,
  "status" "ProjectDependencyStatus" NOT NULL DEFAULT 'OPEN',
  "ownerName" TEXT,
  "ownerEmail" TEXT,
  "dueDate" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "externalUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectDecision" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectDecisionStatus" NOT NULL DEFAULT 'PROPOSED',
  "ownerName" TEXT,
  "ownerEmail" TEXT,
  "decidedAt" TIMESTAMP(3),
  "effectiveAt" TIMESTAMP(3),
  "outcome" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectChangeRequest" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "reason" TEXT,
  "status" "ProjectChangeRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "requestedByName" TEXT,
  "requestedByEmail" TEXT,
  "approvedByName" TEXT,
  "approvedByEmail" TEXT,
  "budgetImpact" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "scheduleImpactDays" INTEGER NOT NULL DEFAULT 0,
  "scopeImpact" TEXT,
  "riskImpact" TEXT,
  "dueDate" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "implementedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectStakeholder_projectId_idx" ON "ProjectStakeholder"("projectId");
CREATE INDEX "ProjectStakeholder_email_idx" ON "ProjectStakeholder"("email");
CREATE INDEX "ProjectDependency_projectId_status_idx" ON "ProjectDependency"("projectId", "status");
CREATE INDEX "ProjectDependency_dueDate_idx" ON "ProjectDependency"("dueDate");
CREATE INDEX "ProjectDecision_projectId_status_idx" ON "ProjectDecision"("projectId", "status");
CREATE INDEX "ProjectDecision_decidedAt_idx" ON "ProjectDecision"("decidedAt");
CREATE INDEX "ProjectChangeRequest_projectId_status_idx" ON "ProjectChangeRequest"("projectId", "status");
CREATE INDEX "ProjectChangeRequest_dueDate_idx" ON "ProjectChangeRequest"("dueDate");

ALTER TABLE "ProjectStakeholder" ADD CONSTRAINT "ProjectStakeholder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDependency" ADD CONSTRAINT "ProjectDependency_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDecision" ADD CONSTRAINT "ProjectDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectChangeRequest" ADD CONSTRAINT "ProjectChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
