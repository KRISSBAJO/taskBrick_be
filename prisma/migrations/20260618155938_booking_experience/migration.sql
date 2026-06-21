-- CreateEnum
CREATE TYPE "BookingPageScope" AS ENUM ('TENANT', 'TEAM', 'USER');

-- CreateEnum
CREATE TYPE "BookingRoutingStrategy" AS ENUM ('DIRECT_HOST', 'ROUND_ROBIN', 'LEAST_BUSY', 'PRIORITY', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "BookingFormFieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'DATE', 'SINGLE_SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL');

-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING_APPROVAL', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'RESCHEDULED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingTokenPurpose" AS ENUM ('CANCEL', 'RESCHEDULE');

-- CreateTable
CREATE TABLE "BookingPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingTypeId" TEXT,
    "teamId" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "scope" "BookingPageScope" NOT NULL DEFAULT 'TENANT',
    "routingStrategy" "BookingRoutingStrategy" NOT NULL DEFAULT 'DIRECT_HOST',
    "department" TEXT,
    "durationMins" INTEGER,
    "bufferBeforeMins" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMins" INTEGER NOT NULL DEFAULT 0,
    "minNoticeMins" INTEGER NOT NULL DEFAULT 120,
    "rollingWindowDays" INTEGER NOT NULL DEFAULT 30,
    "dailyLimit" INTEGER,
    "weeklyLimit" INTEGER,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowReschedule" BOOLEAN NOT NULL DEFAULT true,
    "allowCancel" BOOLEAN NOT NULL DEFAULT true,
    "collectCompanyName" BOOLEAN NOT NULL DEFAULT true,
    "locationMode" "MeetingLocationMode" NOT NULL DEFAULT 'ONLINE',
    "locationName" TEXT,
    "meetingUrl" TEXT,
    "conferenceProvider" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "brandColor" TEXT,
    "logoUrl" TEXT,
    "heroImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingFormField" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "BookingFormFieldType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "helpText" TEXT,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "meetingId" TEXT,
    "meetingTypeId" TEXT,
    "teamId" TEXT,
    "hostId" TEXT,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'CONFIRMED',
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT,
    "guestCompany" TEXT,
    "guestTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "intakeResponses" JSONB,
    "routingSnapshot" JSONB,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "locationMode" "MeetingLocationMode" NOT NULL DEFAULT 'ONLINE',
    "locationName" TEXT,
    "meetingUrl" TEXT,
    "conferenceProvider" TEXT,
    "cancelTokenHash" TEXT,
    "rescheduleTokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "rescheduledFromId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingPage_tenantId_isActive_idx" ON "BookingPage"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "BookingPage_tenantId_scope_routingStrategy_idx" ON "BookingPage"("tenantId", "scope", "routingStrategy");

-- CreateIndex
CREATE INDEX "BookingPage_tenantId_meetingTypeId_idx" ON "BookingPage"("tenantId", "meetingTypeId");

-- CreateIndex
CREATE INDEX "BookingPage_tenantId_teamId_idx" ON "BookingPage"("tenantId", "teamId");

-- CreateIndex
CREATE INDEX "BookingPage_tenantId_ownerId_idx" ON "BookingPage"("tenantId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPage_tenantId_path_key" ON "BookingPage"("tenantId", "path");

-- CreateIndex
CREATE INDEX "BookingFormField_tenantId_pageId_isActive_idx" ON "BookingFormField"("tenantId", "pageId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BookingFormField_pageId_fieldKey_key" ON "BookingFormField"("pageId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_meetingId_key" ON "BookingRequest"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_cancelTokenHash_key" ON "BookingRequest"("cancelTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_rescheduleTokenHash_key" ON "BookingRequest"("rescheduleTokenHash");

-- CreateIndex
CREATE INDEX "BookingRequest_tenantId_status_startAt_idx" ON "BookingRequest"("tenantId", "status", "startAt");

-- CreateIndex
CREATE INDEX "BookingRequest_tenantId_guestEmail_idx" ON "BookingRequest"("tenantId", "guestEmail");

-- CreateIndex
CREATE INDEX "BookingRequest_tenantId_hostId_startAt_idx" ON "BookingRequest"("tenantId", "hostId", "startAt");

-- CreateIndex
CREATE INDEX "BookingRequest_tenantId_pageId_createdAt_idx" ON "BookingRequest"("tenantId", "pageId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_rescheduledFromId_idx" ON "BookingRequest"("rescheduledFromId");

-- AddForeignKey
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_meetingTypeId_fkey" FOREIGN KEY ("meetingTypeId") REFERENCES "MeetingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFormField" ADD CONSTRAINT "BookingFormField_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFormField" ADD CONSTRAINT "BookingFormField_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_meetingTypeId_fkey" FOREIGN KEY ("meetingTypeId") REFERENCES "MeetingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
