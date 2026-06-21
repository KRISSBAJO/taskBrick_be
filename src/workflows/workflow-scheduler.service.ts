import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowsService } from './workflows.service';

@Injectable()
export class WorkflowSchedulerService {
  private readonly logger = new Logger(WorkflowSchedulerService.name);

  constructor(private readonly workflowsService: WorkflowsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueDueSchedules() {
    try {
      await this.workflowsService.enqueueDueScheduledWorkflows({
        ipAddress: null,
        userAgent: 'TaskBricks Workflow Scheduler'
      });
    } catch (error) {
      this.logger.error(
        'Scheduled workflow scan failed',
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}
