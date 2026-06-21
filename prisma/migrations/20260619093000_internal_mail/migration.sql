CREATE TYPE "InternalMailFolder" AS ENUM ('INBOX', 'SENT', 'DRAFTS', 'ARCHIVE', 'DELETED', 'JUNK', 'SNOOZED');
CREATE TYPE "InternalMailPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "InternalMailRecipientKind" AS ENUM ('TO', 'CC', 'BCC');

CREATE TABLE "InternalMailThread" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "priority" "InternalMailPriority" NOT NULL DEFAULT 'NORMAL',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternalMailThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalMailMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyText" TEXT NOT NULL,
  "bodyHtml" TEXT,
  "priority" "InternalMailPriority" NOT NULL DEFAULT 'NORMAL',
  "attachments" JSONB,
  "isDraft" BOOLEAN NOT NULL DEFAULT false,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternalMailMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalMailParticipant" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "folder" "InternalMailFolder" NOT NULL DEFAULT 'INBOX',
  "readAt" TIMESTAMP(3),
  "starredAt" TIMESTAMP(3),
  "flaggedAt" TIMESTAMP(3),
  "pinnedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "snoozedUntil" TIMESTAMP(3),
  "lastReadMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternalMailParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalMailRecipient" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "InternalMailRecipientKind" NOT NULL DEFAULT 'TO',
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalMailRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalMailThread_tenantId_lastMessageAt_idx" ON "InternalMailThread"("tenantId", "lastMessageAt");
CREATE INDEX "InternalMailThread_tenantId_createdById_idx" ON "InternalMailThread"("tenantId", "createdById");

CREATE INDEX "InternalMailMessage_tenantId_threadId_createdAt_idx" ON "InternalMailMessage"("tenantId", "threadId", "createdAt");
CREATE INDEX "InternalMailMessage_tenantId_senderId_createdAt_idx" ON "InternalMailMessage"("tenantId", "senderId", "createdAt");
CREATE INDEX "InternalMailMessage_tenantId_isDraft_idx" ON "InternalMailMessage"("tenantId", "isDraft");

CREATE UNIQUE INDEX "InternalMailParticipant_threadId_userId_key" ON "InternalMailParticipant"("threadId", "userId");
CREATE INDEX "InternalMailParticipant_tenantId_userId_folder_updatedAt_idx" ON "InternalMailParticipant"("tenantId", "userId", "folder", "updatedAt");
CREATE INDEX "InternalMailParticipant_tenantId_userId_readAt_idx" ON "InternalMailParticipant"("tenantId", "userId", "readAt");
CREATE INDEX "InternalMailParticipant_tenantId_userId_starredAt_idx" ON "InternalMailParticipant"("tenantId", "userId", "starredAt");
CREATE INDEX "InternalMailParticipant_tenantId_userId_flaggedAt_idx" ON "InternalMailParticipant"("tenantId", "userId", "flaggedAt");
CREATE INDEX "InternalMailParticipant_tenantId_userId_snoozedUntil_idx" ON "InternalMailParticipant"("tenantId", "userId", "snoozedUntil");

CREATE UNIQUE INDEX "InternalMailRecipient_messageId_userId_kind_key" ON "InternalMailRecipient"("messageId", "userId", "kind");
CREATE INDEX "InternalMailRecipient_tenantId_userId_kind_idx" ON "InternalMailRecipient"("tenantId", "userId", "kind");
CREATE INDEX "InternalMailRecipient_tenantId_messageId_idx" ON "InternalMailRecipient"("tenantId", "messageId");

ALTER TABLE "InternalMailThread"
  ADD CONSTRAINT "InternalMailThread_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailThread"
  ADD CONSTRAINT "InternalMailThread_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailMessage"
  ADD CONSTRAINT "InternalMailMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailMessage"
  ADD CONSTRAINT "InternalMailMessage_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "InternalMailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailMessage"
  ADD CONSTRAINT "InternalMailMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailParticipant"
  ADD CONSTRAINT "InternalMailParticipant_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailParticipant"
  ADD CONSTRAINT "InternalMailParticipant_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "InternalMailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailParticipant"
  ADD CONSTRAINT "InternalMailParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailRecipient"
  ADD CONSTRAINT "InternalMailRecipient_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailRecipient"
  ADD CONSTRAINT "InternalMailRecipient_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "InternalMailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailRecipient"
  ADD CONSTRAINT "InternalMailRecipient_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
