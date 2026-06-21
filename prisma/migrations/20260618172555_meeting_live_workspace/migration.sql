-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "liveNotes" TEXT,
ADD COLUMN     "liveNotesUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "liveNotesUpdatedById" TEXT,
ADD COLUMN     "liveNotesVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "runtimeState" JSONB;

-- CreateTable
CREATE TABLE "MeetingComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "impact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "taskId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "taskId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingComment_meetingId_createdAt_idx" ON "MeetingComment"("meetingId", "createdAt");

-- CreateIndex
CREATE INDEX "MeetingComment_tenantId_authorId_createdAt_idx" ON "MeetingComment"("tenantId", "authorId", "createdAt");

-- CreateIndex
CREATE INDEX "MeetingDecision_meetingId_status_createdAt_idx" ON "MeetingDecision"("meetingId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MeetingDecision_tenantId_ownerId_dueAt_idx" ON "MeetingDecision"("tenantId", "ownerId", "dueAt");

-- CreateIndex
CREATE INDEX "MeetingDecision_tenantId_taskId_idx" ON "MeetingDecision"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "MeetingChecklistItem_meetingId_isDone_sortOrder_idx" ON "MeetingChecklistItem"("meetingId", "isDone", "sortOrder");

-- CreateIndex
CREATE INDEX "MeetingChecklistItem_tenantId_ownerId_dueAt_idx" ON "MeetingChecklistItem"("tenantId", "ownerId", "dueAt");

-- CreateIndex
CREATE INDEX "MeetingChecklistItem_tenantId_taskId_idx" ON "MeetingChecklistItem"("tenantId", "taskId");

-- CreateIndex
CREATE INDEX "Meeting_tenantId_liveNotesUpdatedAt_idx" ON "Meeting"("tenantId", "liveNotesUpdatedAt");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_liveNotesUpdatedById_fkey" FOREIGN KEY ("liveNotesUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingComment" ADD CONSTRAINT "MeetingComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingComment" ADD CONSTRAINT "MeetingComment_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingComment" ADD CONSTRAINT "MeetingComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingChecklistItem" ADD CONSTRAINT "MeetingChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingChecklistItem" ADD CONSTRAINT "MeetingChecklistItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingChecklistItem" ADD CONSTRAINT "MeetingChecklistItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
