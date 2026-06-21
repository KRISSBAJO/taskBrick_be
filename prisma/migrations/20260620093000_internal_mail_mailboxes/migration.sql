CREATE TYPE "InternalMailboxType" AS ENUM ('USER', 'SHARED', 'TEAM', 'SYSTEM');

CREATE TYPE "InternalMailboxStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

CREATE TYPE "InternalMailboxMemberRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');

CREATE TABLE "InternalMailbox" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "teamId" TEXT,
  "type" "InternalMailboxType" NOT NULL DEFAULT 'USER',
  "status" "InternalMailboxStatus" NOT NULL DEFAULT 'ACTIVE',
  "displayName" TEXT NOT NULL,
  "localPart" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "description" TEXT,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternalMailbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalMailboxAlias" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "localPart" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "status" "InternalMailboxStatus" NOT NULL DEFAULT 'ACTIVE',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternalMailboxAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalMailboxMember" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "mailboxId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "InternalMailboxMemberRole" NOT NULL DEFAULT 'MEMBER',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternalMailboxMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InternalMailbox_userId_key" ON "InternalMailbox"("userId");
CREATE UNIQUE INDEX "InternalMailbox_tenantId_localPart_key" ON "InternalMailbox"("tenantId", "localPart");
CREATE UNIQUE INDEX "InternalMailbox_tenantId_address_key" ON "InternalMailbox"("tenantId", "address");
CREATE INDEX "InternalMailbox_tenantId_status_type_idx" ON "InternalMailbox"("tenantId", "status", "type");
CREATE INDEX "InternalMailbox_tenantId_userId_idx" ON "InternalMailbox"("tenantId", "userId");
CREATE INDEX "InternalMailbox_tenantId_teamId_idx" ON "InternalMailbox"("tenantId", "teamId");

CREATE UNIQUE INDEX "InternalMailboxAlias_tenantId_localPart_key" ON "InternalMailboxAlias"("tenantId", "localPart");
CREATE UNIQUE INDEX "InternalMailboxAlias_tenantId_address_key" ON "InternalMailboxAlias"("tenantId", "address");
CREATE INDEX "InternalMailboxAlias_tenantId_mailboxId_idx" ON "InternalMailboxAlias"("tenantId", "mailboxId");
CREATE INDEX "InternalMailboxAlias_tenantId_status_idx" ON "InternalMailboxAlias"("tenantId", "status");

CREATE UNIQUE INDEX "InternalMailboxMember_mailboxId_userId_key" ON "InternalMailboxMember"("mailboxId", "userId");
CREATE INDEX "InternalMailboxMember_tenantId_userId_idx" ON "InternalMailboxMember"("tenantId", "userId");
CREATE INDEX "InternalMailboxMember_tenantId_mailboxId_idx" ON "InternalMailboxMember"("tenantId", "mailboxId");

ALTER TABLE "InternalMailbox"
  ADD CONSTRAINT "InternalMailbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailbox"
  ADD CONSTRAINT "InternalMailbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalMailbox"
  ADD CONSTRAINT "InternalMailbox_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InternalMailboxAlias"
  ADD CONSTRAINT "InternalMailboxAlias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailboxAlias"
  ADD CONSTRAINT "InternalMailboxAlias_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "InternalMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailboxMember"
  ADD CONSTRAINT "InternalMailboxMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailboxMember"
  ADD CONSTRAINT "InternalMailboxMember_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "InternalMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternalMailboxMember"
  ADD CONSTRAINT "InternalMailboxMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
