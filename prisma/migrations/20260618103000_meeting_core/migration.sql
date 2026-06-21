CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'ARCHIVED');
CREATE TYPE "MeetingTypeCategory" AS ENUM ('INTERNAL', 'CLIENT', 'SALES', 'SUPPORT', 'SPRINT', 'STANDUP', 'REVIEW', 'INTERVIEW', 'TRAINING', 'CUSTOM');
CREATE TYPE "MeetingLocationMode" AS ENUM ('IN_PERSON', 'ONLINE', 'HYBRID', 'PHONE', 'TBD');
CREATE TYPE "MeetingApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "MeetingAttendeeRole" AS ENUM ('HOST', 'CO_HOST', 'REQUIRED', 'OPTIONAL', 'GUEST', 'OBSERVER');
CREATE TYPE "MeetingAttendeeStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'TENTATIVE', 'ATTENDED', 'NO_SHOW', 'REMOVED');
CREATE TYPE "MeetingAgendaStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'SKIPPED');
CREATE TYPE "MeetingReminderChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'SMS', 'WEBHOOK');
CREATE TYPE "MeetingReminderStatus" AS ENUM ('PENDING', 'SCHEDULED', 'SENT', 'FAILED', 'CANCELLED');
CREATE TYPE "MeetingAvailabilityScope" AS ENUM ('USER', 'TEAM', 'TENANT');

CREATE TABLE "MeetingType" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdById" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "category" "MeetingTypeCategory" NOT NULL DEFAULT 'CUSTOM',
  "color" TEXT DEFAULT '#ffd400',
  "icon" TEXT,
  "durationMins" INTEGER NOT NULL DEFAULT 30,
  "bufferBeforeMins" INTEGER NOT NULL DEFAULT 0,
  "bufferAfterMins" INTEGER NOT NULL DEFAULT 0,
  "locationMode" "MeetingLocationMode" NOT NULL DEFAULT 'ONLINE',
  "defaultVisibility" "Visibility" NOT NULL DEFAULT 'TEAM',
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "defaultAgenda" JSONB,
  "defaultReminderMins" INTEGER[] NOT NULL DEFAULT ARRAY[1440, 60]::INTEGER[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Meeting" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meetingTypeId" TEXT,
  "projectId" TEXT,
  "taskId" TEXT,
  "teamId" TEXT,
  "hostId" TEXT,
  "createdById" TEXT,
  "approvedById" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "visibility" "Visibility" NOT NULL DEFAULT 'TEAM',
  "approvalStatus" "MeetingApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "locationMode" "MeetingLocationMode" NOT NULL DEFAULT 'ONLINE',
  "locationName" TEXT,
  "meetingUrl" TEXT,
  "conferenceProvider" TEXT,
  "externalCalendarId" TEXT,
  "externalConferenceId" TEXT,
  "recurrenceRule" TEXT,
  "agendaLocked" BOOLEAN NOT NULL DEFAULT false,
  "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
  "aiSummary" JSONB,
  "metadata" JSONB,
  "approvedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancelledReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingAttendee" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "name" TEXT,
  "role" "MeetingAttendeeRole" NOT NULL DEFAULT 'REQUIRED',
  "status" "MeetingAttendeeStatus" NOT NULL DEFAULT 'INVITED',
  "isExternal" BOOLEAN NOT NULL DEFAULT false,
  "responseNote" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingAgendaItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "ownerId" TEXT,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "status" "MeetingAgendaStatus" NOT NULL DEFAULT 'OPEN',
  "durationMins" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingAgendaItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingReminder" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "attendeeId" TEXT,
  "channel" "MeetingReminderChannel" NOT NULL,
  "offsetMinutes" INTEGER NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" "MeetingReminderStatus" NOT NULL DEFAULT 'PENDING',
  "destination" TEXT,
  "templateKey" TEXT,
  "payload" JSONB,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingAvailabilityWindow" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerId" TEXT,
  "teamId" TEXT,
  "scope" "MeetingAvailabilityScope" NOT NULL DEFAULT 'USER',
  "label" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "bufferBeforeMins" INTEGER NOT NULL DEFAULT 0,
  "bufferAfterMins" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingAvailabilityWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingBlackoutWindow" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ownerId" TEXT,
  "teamId" TEXT,
  "title" TEXT NOT NULL,
  "reason" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingBlackoutWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingActivity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetingActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeetingType_tenantId_slug_key" ON "MeetingType"("tenantId", "slug");
CREATE INDEX "MeetingType_tenantId_category_isActive_idx" ON "MeetingType"("tenantId", "category", "isActive");
CREATE INDEX "Meeting_tenantId_startAt_idx" ON "Meeting"("tenantId", "startAt");
CREATE INDEX "Meeting_tenantId_status_startAt_idx" ON "Meeting"("tenantId", "status", "startAt");
CREATE INDEX "Meeting_tenantId_hostId_startAt_idx" ON "Meeting"("tenantId", "hostId", "startAt");
CREATE INDEX "Meeting_tenantId_projectId_startAt_idx" ON "Meeting"("tenantId", "projectId", "startAt");
CREATE INDEX "Meeting_tenantId_archivedAt_idx" ON "Meeting"("tenantId", "archivedAt");
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_userId_key" ON "MeetingAttendee"("meetingId", "userId");
CREATE INDEX "MeetingAttendee_tenantId_userId_idx" ON "MeetingAttendee"("tenantId", "userId");
CREATE INDEX "MeetingAttendee_tenantId_email_idx" ON "MeetingAttendee"("tenantId", "email");
CREATE INDEX "MeetingAttendee_meetingId_role_idx" ON "MeetingAttendee"("meetingId", "role");
CREATE INDEX "MeetingAgendaItem_meetingId_sortOrder_idx" ON "MeetingAgendaItem"("meetingId", "sortOrder");
CREATE INDEX "MeetingAgendaItem_tenantId_ownerId_idx" ON "MeetingAgendaItem"("tenantId", "ownerId");
CREATE INDEX "MeetingReminder_tenantId_status_scheduledFor_idx" ON "MeetingReminder"("tenantId", "status", "scheduledFor");
CREATE INDEX "MeetingReminder_meetingId_channel_idx" ON "MeetingReminder"("meetingId", "channel");
CREATE INDEX "MeetingAvailabilityWindow_tenantId_scope_isActive_idx" ON "MeetingAvailabilityWindow"("tenantId", "scope", "isActive");
CREATE INDEX "MeetingAvailabilityWindow_tenantId_ownerId_dayOfWeek_idx" ON "MeetingAvailabilityWindow"("tenantId", "ownerId", "dayOfWeek");
CREATE INDEX "MeetingAvailabilityWindow_tenantId_teamId_dayOfWeek_idx" ON "MeetingAvailabilityWindow"("tenantId", "teamId", "dayOfWeek");
CREATE INDEX "MeetingBlackoutWindow_tenantId_startAt_endAt_idx" ON "MeetingBlackoutWindow"("tenantId", "startAt", "endAt");
CREATE INDEX "MeetingBlackoutWindow_tenantId_ownerId_startAt_idx" ON "MeetingBlackoutWindow"("tenantId", "ownerId", "startAt");
CREATE INDEX "MeetingBlackoutWindow_tenantId_teamId_startAt_idx" ON "MeetingBlackoutWindow"("tenantId", "teamId", "startAt");
CREATE INDEX "MeetingActivity_meetingId_createdAt_idx" ON "MeetingActivity"("meetingId", "createdAt");
CREATE INDEX "MeetingActivity_tenantId_action_createdAt_idx" ON "MeetingActivity"("tenantId", "action", "createdAt");

ALTER TABLE "MeetingType" ADD CONSTRAINT "MeetingType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingType" ADD CONSTRAINT "MeetingType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_meetingTypeId_fkey" FOREIGN KEY ("meetingTypeId") REFERENCES "MeetingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAgendaItem" ADD CONSTRAINT "MeetingAgendaItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeetingReminder" ADD CONSTRAINT "MeetingReminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingReminder" ADD CONSTRAINT "MeetingReminder_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingReminder" ADD CONSTRAINT "MeetingReminder_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "MeetingAttendee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeetingAvailabilityWindow" ADD CONSTRAINT "MeetingAvailabilityWindow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAvailabilityWindow" ADD CONSTRAINT "MeetingAvailabilityWindow_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingAvailabilityWindow" ADD CONSTRAINT "MeetingAvailabilityWindow_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingBlackoutWindow" ADD CONSTRAINT "MeetingBlackoutWindow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingBlackoutWindow" ADD CONSTRAINT "MeetingBlackoutWindow_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingBlackoutWindow" ADD CONSTRAINT "MeetingBlackoutWindow_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingActivity" ADD CONSTRAINT "MeetingActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingActivity" ADD CONSTRAINT "MeetingActivity_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingActivity" ADD CONSTRAINT "MeetingActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
