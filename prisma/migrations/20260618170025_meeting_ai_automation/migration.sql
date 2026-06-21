-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "clientCompany" TEXT,
ADD COLUMN     "clientEmail" TEXT,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "sprintId" TEXT;

-- CreateIndex
CREATE INDEX "Meeting_tenantId_sprintId_startAt_idx" ON "Meeting"("tenantId", "sprintId", "startAt");

-- CreateIndex
CREATE INDEX "Meeting_tenantId_clientEmail_idx" ON "Meeting"("tenantId", "clientEmail");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
