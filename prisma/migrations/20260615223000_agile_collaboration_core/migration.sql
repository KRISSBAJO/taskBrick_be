CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardColumn" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "wipLimit" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardColumn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SprintRetrospective" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "authorId" TEXT,
    "wentWell" TEXT,
    "improve" TEXT,
    "actionItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SprintRetrospective_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReadReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReadReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Board_projectId_name_key" ON "Board"("projectId", "name");
CREATE INDEX "Board_tenantId_idx" ON "Board"("tenantId");
CREATE INDEX "Board_projectId_idx" ON "Board"("projectId");
CREATE INDEX "Board_projectId_isDefault_idx" ON "Board"("projectId", "isDefault");

CREATE UNIQUE INDEX "BoardColumn_boardId_status_key" ON "BoardColumn"("boardId", "status");
CREATE INDEX "BoardColumn_boardId_sortOrder_idx" ON "BoardColumn"("boardId", "sortOrder");

CREATE INDEX "Sprint_projectId_idx" ON "Sprint"("projectId");
CREATE INDEX "Sprint_projectId_completedAt_idx" ON "Sprint"("projectId", "completedAt");
CREATE INDEX "SprintRetrospective_sprintId_idx" ON "SprintRetrospective"("sprintId");

CREATE INDEX "Conversation_tenantId_idx" ON "Conversation"("tenantId");
CREATE INDEX "Conversation_tenantId_createdAt_idx" ON "Conversation"("tenantId", "createdAt");
CREATE INDEX "ConversationMember_userId_idx" ON "ConversationMember"("userId");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "MessageReaction_userId_idx" ON "MessageReaction"("userId");

CREATE UNIQUE INDEX "MessageReadReceipt_messageId_userId_key" ON "MessageReadReceipt"("messageId", "userId");
CREATE INDEX "MessageReadReceipt_userId_idx" ON "MessageReadReceipt"("userId");

ALTER TABLE "Board" ADD CONSTRAINT "Board_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardColumn" ADD CONSTRAINT "BoardColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SprintRetrospective" ADD CONSTRAINT "SprintRetrospective_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
