ALTER TABLE "Message" ADD COLUMN "parentMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "forwardedFromMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "pinnedById" TEXT;
ALTER TABLE "Message" ADD COLUMN "metadata" JSONB;
ALTER TABLE "Message" ADD COLUMN "pinnedAt" TIMESTAMP(3);

CREATE INDEX "Message_conversationId_parentMessageId_createdAt_idx" ON "Message"("conversationId", "parentMessageId", "createdAt");
CREATE INDEX "Message_conversationId_pinnedAt_idx" ON "Message"("conversationId", "pinnedAt");
