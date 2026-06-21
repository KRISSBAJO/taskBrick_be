-- CreateEnum
CREATE TYPE "MeetingConferenceProvider" AS ENUM ('NONE', 'MANUAL', 'GOOGLE_CALENDAR', 'GOOGLE_MEET', 'MICROSOFT_TEAMS', 'ZOOM', 'CUSTOM_URL');

-- CreateEnum
CREATE TYPE "MeetingReminderJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'DEAD_LETTER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntegrationProvider" ADD VALUE 'WHATSAPP';
ALTER TYPE "IntegrationProvider" ADD VALUE 'EMAIL';
ALTER TYPE "IntegrationProvider" ADD VALUE 'SMS';

-- CreateTable
CREATE TABLE "MeetingIntegrationSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultConferenceProvider" "MeetingConferenceProvider" NOT NULL DEFAULT 'MANUAL',
    "allowedConferenceProviders" "MeetingConferenceProvider"[] DEFAULT ARRAY['MANUAL', 'CUSTOM_URL', 'GOOGLE_CALENDAR', 'GOOGLE_MEET', 'MICROSOFT_TEAMS', 'ZOOM']::"MeetingConferenceProvider"[],
    "defaultReminderChannels" "MeetingReminderChannel"[] DEFAULT ARRAY['IN_APP', 'EMAIL']::"MeetingReminderChannel"[],
    "calendarSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookEventsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovedWhatsappTemplates" BOOLEAN NOT NULL DEFAULT true,
    "manualLinkPolicy" JSONB,
    "providerConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingIntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingReminderJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "reminderId" TEXT,
    "channel" "MeetingReminderChannel" NOT NULL,
    "provider" TEXT,
    "status" "MeetingReminderJobStatus" NOT NULL DEFAULT 'QUEUED',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "destination" TEXT,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "deadLetterAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingReminderJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingIntegrationSettings_tenantId_key" ON "MeetingIntegrationSettings"("tenantId");

-- CreateIndex
CREATE INDEX "MeetingIntegrationSettings_tenantId_webhookEventsEnabled_idx" ON "MeetingIntegrationSettings"("tenantId", "webhookEventsEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingReminderJob_reminderId_key" ON "MeetingReminderJob"("reminderId");

-- CreateIndex
CREATE INDEX "MeetingReminderJob_tenantId_status_nextAttemptAt_idx" ON "MeetingReminderJob"("tenantId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "MeetingReminderJob_tenantId_channel_status_idx" ON "MeetingReminderJob"("tenantId", "channel", "status");

-- CreateIndex
CREATE INDEX "MeetingReminderJob_meetingId_status_idx" ON "MeetingReminderJob"("meetingId", "status");

-- AddForeignKey
ALTER TABLE "MeetingIntegrationSettings" ADD CONSTRAINT "MeetingIntegrationSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReminderJob" ADD CONSTRAINT "MeetingReminderJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReminderJob" ADD CONSTRAINT "MeetingReminderJob_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingReminderJob" ADD CONSTRAINT "MeetingReminderJob_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "MeetingReminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
