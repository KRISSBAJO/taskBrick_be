-- Dynamic board columns: allow status-mapped and freeform workflow columns.
ALTER TABLE "BoardColumn" ALTER COLUMN "status" DROP NOT NULL;

ALTER TABLE "BoardColumn"
  ADD COLUMN "isCollapsed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Task"
  ADD COLUMN "boardColumnId" TEXT;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_boardColumnId_fkey"
  FOREIGN KEY ("boardColumnId")
  REFERENCES "BoardColumn"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "Task_boardColumnId_idx" ON "Task"("boardColumnId");
