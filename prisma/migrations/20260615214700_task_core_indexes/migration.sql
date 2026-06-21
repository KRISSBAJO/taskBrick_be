CREATE INDEX "TaskAssignee_userId_idx" ON "TaskAssignee"("userId");

CREATE INDEX "TaskWatcher_userId_idx" ON "TaskWatcher"("userId");

CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");

CREATE INDEX "TaskAttachment_taskId_createdAt_idx" ON "TaskAttachment"("taskId", "createdAt");

CREATE INDEX "TaskChecklist_taskId_idx" ON "TaskChecklist"("taskId");

CREATE INDEX "TaskChecklistItem_checklistId_sortOrder_idx" ON "TaskChecklistItem"("checklistId", "sortOrder");

CREATE INDEX "TaskLabel_labelId_idx" ON "TaskLabel"("labelId");

CREATE INDEX "TaskDependency_toTaskId_idx" ON "TaskDependency"("toTaskId");

CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "TaskActivity"("taskId", "createdAt");

CREATE INDEX "CustomFieldValue_taskId_idx" ON "CustomFieldValue"("taskId");

CREATE UNIQUE INDEX "CustomFieldValue_customFieldId_taskId_key" ON "CustomFieldValue"("customFieldId", "taskId");
