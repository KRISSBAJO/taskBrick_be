import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ObservabilityModule } from '../observability/observability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowQueueService } from './workflow-queue.service';
import { WorkflowRunWorker } from './workflow-run.worker';
import { WorkflowSchedulerService } from './workflow-scheduler.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule, ObservabilityModule, AiModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowQueueService, WorkflowRunWorker, WorkflowSchedulerService],
  exports: [WorkflowsService]
})
export class WorkflowsModule {}
