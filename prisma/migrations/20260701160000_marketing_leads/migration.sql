-- CreateEnum
CREATE TYPE "MarketingLeadType" AS ENUM ('CONTACT', 'DEMO');

-- CreateEnum
CREATE TYPE "MarketingLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "MarketingLead" (
    "id" TEXT NOT NULL,
    "type" "MarketingLeadType" NOT NULL,
    "status" "MarketingLeadStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "teamSize" TEXT,
    "preferredDate" TIMESTAMP(3),
    "preferredTime" TEXT,
    "timezone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'landing',
    "pageUrl" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "mailSent" BOOLEAN NOT NULL DEFAULT false,
    "mailProvider" TEXT,
    "mailError" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingLead_type_status_createdAt_idx" ON "MarketingLead"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MarketingLead_email_idx" ON "MarketingLead"("email");
