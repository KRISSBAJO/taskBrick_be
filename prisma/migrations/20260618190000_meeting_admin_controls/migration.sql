ALTER TABLE "MeetingIntegrationSettings"
  ADD COLUMN "publicBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "publicBookingCreatorPermissions" TEXT[] NOT NULL DEFAULT ARRAY['manage:meetings']::TEXT[],
  ADD COLUMN "calendarConnectionPermissions" TEXT[] NOT NULL DEFAULT ARRAY['manage:meetings', 'manage:integrations', 'manage:tenant']::TEXT[],
  ADD COLUMN "whatsappConnectionPermissions" TEXT[] NOT NULL DEFAULT ARRAY['manage:meetings', 'manage:integrations', 'manage:tenant']::TEXT[],
  ADD COLUMN "defaultMeetingVisibility" "Visibility" NOT NULL DEFAULT 'TEAM',
  ADD COLUMN "allowExternalGuests" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requireApprovalForExternalGuests" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN "minBookingNoticeMins" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN "maxMeetingDurationMins" INTEGER NOT NULL DEFAULT 240,
  ADD COLUMN "aiMeetingProcessingEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "policyConfig" JSONB;

CREATE INDEX "MeetingIntegrationSettings_publicBookingEnabled_idx"
  ON "MeetingIntegrationSettings"("publicBookingEnabled");
