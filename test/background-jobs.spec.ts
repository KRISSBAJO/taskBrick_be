import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { WorkflowSchedulerService } from '../src/workflows/workflow-scheduler.service';
import { MeetingIntegrationsService } from '../src/meetings/meeting-integrations.service';

const original = process.env.BACKGROUND_JOBS_ENABLED;
afterEach(() => {
  if (original === undefined) delete process.env.BACKGROUND_JOBS_ENABLED;
  else process.env.BACKGROUND_JOBS_ENABLED = original;
});
describe('idle environment schedulers', () => {
  it.each(['false', 'true', undefined])('respects background jobs flag %s', async (flag) => {
    if (flag === undefined) delete process.env.BACKGROUND_JOBS_ENABLED;
    else process.env.BACKGROUND_JOBS_ENABLED = flag;
    const workflows = { enqueueDueScheduledWorkflows: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };
    const reminders = { processDueReminderJobs: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };
    await new WorkflowSchedulerService(workflows as never).enqueueDueSchedules();
    await MeetingIntegrationsService.prototype.scheduledReminderWorker.call(reminders as never);
    expect(workflows.enqueueDueScheduledWorkflows).toHaveBeenCalledTimes(flag === 'false' ? 0 : 1);
    expect(reminders.processDueReminderJobs).toHaveBeenCalledTimes(flag === 'false' ? 0 : 1);
  });
});
