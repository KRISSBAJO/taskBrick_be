import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, TimeEntryStatus, TimesheetStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignUserSkillDto } from './dto/assign-user-skill.dto';
import { CreateResourceAllocationDto } from './dto/create-resource-allocation.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { RejectTimesheetDto } from './dto/reject-timesheet.dto';
import { ResourceAllocationQueryDto } from './dto/resource-allocation-query.dto';
import { ResourceReportQueryDto } from './dto/resource-report-query.dto';
import { SkillQueryDto } from './dto/skill-query.dto';
import { StartTimerDto } from './dto/start-timer.dto';
import { StopTimerDto } from './dto/stop-timer.dto';
import { TimeEntryQueryDto } from './dto/time-entry-query.dto';
import { TimesheetEntriesDto } from './dto/timesheet-entries.dto';
import { TimesheetQueryDto } from './dto/timesheet-query.dto';
import { UpdateResourceAllocationDto } from './dto/update-resource-allocation.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import { UserSkillQueryDto } from './dto/user-skill-query.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const userSummarySelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true
} satisfies Prisma.UserSelect;

const projectSummarySelect = {
  id: true,
  key: true,
  name: true,
  status: true
} satisfies Prisma.ProjectSelect;

const taskSummarySelect = {
  id: true,
  key: true,
  title: true,
  status: true,
  projectId: true
} satisfies Prisma.TaskSelect;

const timeEntrySelect = {
  id: true,
  tenantId: true,
  userId: true,
  projectId: true,
  taskId: true,
  timesheetId: true,
  minutes: true,
  description: true,
  billable: true,
  status: true,
  entryDate: true,
  startedAt: true,
  endedAt: true,
  lockedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSummarySelect },
  project: { select: projectSummarySelect },
  task: { select: taskSummarySelect },
  timesheet: {
    select: {
      id: true,
      status: true,
      periodStart: true,
      periodEnd: true
    }
  }
} satisfies Prisma.TimeEntrySelect;

const timerSelect = {
  id: true,
  tenantId: true,
  userId: true,
  projectId: true,
  taskId: true,
  description: true,
  billable: true,
  startedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSummarySelect },
  project: { select: projectSummarySelect },
  task: { select: taskSummarySelect }
} satisfies Prisma.TimeTimerSelect;

const timesheetSelect = {
  id: true,
  tenantId: true,
  userId: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  notes: true,
  submittedAt: true,
  approvedAt: true,
  rejectedAt: true,
  approverId: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSummarySelect },
  approver: { select: userSummarySelect },
  entries: {
    select: timeEntrySelect,
    orderBy: [{ entryDate: 'asc' as const }, { createdAt: 'asc' as const }]
  }
} satisfies Prisma.TimesheetSelect;

const skillSelect = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  category: true,
  createdById: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true } }
} satisfies Prisma.SkillSelect;

const userSkillSelect = {
  id: true,
  tenantId: true,
  userId: true,
  skillId: true,
  level: true,
  yearsExperience: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSummarySelect },
  skill: { select: skillSelect }
} satisfies Prisma.UserSkillSelect;

const allocationSelect = {
  id: true,
  tenantId: true,
  userId: true,
  projectId: true,
  role: true,
  percent: true,
  billable: true,
  notes: true,
  startDate: true,
  endDate: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSummarySelect },
  project: { select: projectSummarySelect }
} satisfies Prisma.ResourceAllocationSelect;

@Injectable()
export class TimeTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listTimeEntries(user: AuthenticatedUser, query: TimeEntryQueryDto) {
    const targetUserId = query.userId ?? (this.canReadAllTime(user) ? undefined : user.id);
    if (query.userId && query.userId !== user.id) this.assertCanReadAllTime(user);

    const where: Prisma.TimeEntryWhereInput = {
      tenantId: user.tenantId,
      userId: targetUserId,
      projectId: query.projectId,
      taskId: query.taskId,
      timesheetId: query.timesheetId,
      status: query.status,
      billable: query.billable,
      entryDate: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { task: { title: { contains: query.search, mode: 'insensitive' } } },
              { project: { name: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.timeEntry.findMany({
        where,
        select: timeEntrySelect,
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.timeEntry.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createTimeEntry(user: AuthenticatedUser, dto: CreateTimeEntryDto, meta: RequestMeta) {
    const targetUserId = dto.userId ?? user.id;
    this.assertCanWriteForUser(user, targetUserId);
    await this.assertUserBelongsToTenant(user.tenantId, targetUserId);
    const targets = await this.resolveTimeTargets(user.tenantId, dto.projectId, dto.taskId);
    this.assertTimerRange(dto.startedAt, dto.endedAt);

    const created = await this.prisma.timeEntry.create({
      data: {
        tenantId: user.tenantId,
        userId: targetUserId,
        projectId: targets.projectId,
        taskId: dto.taskId,
        minutes: dto.minutes,
        description: dto.description,
        billable: dto.billable ?? false,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined
      },
      select: timeEntrySelect
    });

    await this.syncTaskActualMinutes(user.tenantId, created.taskId);
    await this.recordAudit(user, 'time_entry.create', 'TimeEntry', created.id, undefined, {
      userId: targetUserId,
      projectId: created.projectId,
      taskId: created.taskId,
      minutes: created.minutes,
      billable: created.billable
    }, meta);

    return created;
  }

  async getTimeEntry(user: AuthenticatedUser, entryId: string) {
    const entry = await this.getTimeEntryOrThrow(user.tenantId, entryId);
    this.assertCanReadEntry(user, entry.userId);
    return entry;
  }

  async updateTimeEntry(
    user: AuthenticatedUser,
    entryId: string,
    dto: UpdateTimeEntryDto,
    meta: RequestMeta
  ) {
    const before = await this.getTimeEntryOrThrow(user.tenantId, entryId);
    this.assertCanWriteForUser(user, before.userId);
    this.assertEntryEditable(before);
    const targets = await this.resolveTimeTargets(user.tenantId, dto.projectId ?? before.projectId ?? undefined, dto.taskId ?? before.taskId ?? undefined);
    this.assertTimerRange(dto.startedAt, dto.endedAt);

    const updated = await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        projectId: targets.projectId,
        taskId: dto.taskId,
        minutes: dto.minutes,
        description: dto.description,
        billable: dto.billable,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        status: before.status === TimeEntryStatus.REJECTED ? TimeEntryStatus.DRAFT : undefined
      },
      select: timeEntrySelect
    });

    await Promise.all([
      this.syncTaskActualMinutes(user.tenantId, before.taskId),
      this.syncTaskActualMinutes(user.tenantId, updated.taskId)
    ]);
    await this.recordAudit(user, 'time_entry.update', 'TimeEntry', entryId, {
      minutes: before.minutes,
      billable: before.billable,
      taskId: before.taskId
    }, {
      minutes: updated.minutes,
      billable: updated.billable,
      taskId: updated.taskId
    }, meta);

    return updated;
  }

  async deleteTimeEntry(user: AuthenticatedUser, entryId: string, meta: RequestMeta) {
    const before = await this.getTimeEntryOrThrow(user.tenantId, entryId);
    this.assertCanWriteForUser(user, before.userId);
    this.assertEntryEditable(before);

    await this.prisma.timeEntry.delete({ where: { id: entryId } });
    await this.syncTaskActualMinutes(user.tenantId, before.taskId);
    await this.recordAudit(user, 'time_entry.delete', 'TimeEntry', entryId, {
      userId: before.userId,
      taskId: before.taskId,
      minutes: before.minutes
    }, undefined, meta);

    return { success: true };
  }

  async getCurrentTimer(user: AuthenticatedUser) {
    return this.prisma.timeTimer.findUnique({
      where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
      select: timerSelect
    });
  }

  async startTimer(user: AuthenticatedUser, dto: StartTimerDto, meta: RequestMeta) {
    const existing = await this.getCurrentTimer(user);
    if (existing) throw new ConflictException('A timer is already running');
    const targets = await this.resolveTimeTargets(user.tenantId, dto.projectId, dto.taskId);
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    if (startedAt.getTime() > Date.now() + 60_000) throw new BadRequestException('Timer cannot start in the future');

    const timer = await this.prisma.timeTimer.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        projectId: targets.projectId,
        taskId: dto.taskId,
        description: dto.description,
        billable: dto.billable ?? false,
        startedAt
      },
      select: timerSelect
    });

    await this.recordAudit(user, 'time_timer.start', 'TimeTimer', timer.id, undefined, {
      projectId: timer.projectId,
      taskId: timer.taskId,
      startedAt: timer.startedAt
    }, meta);

    return timer;
  }

  async updateCurrentTimer(user: AuthenticatedUser, dto: StartTimerDto, meta: RequestMeta) {
    const before = await this.getCurrentTimer(user);
    if (!before) throw new NotFoundException('No timer is running');
    const targets = await this.resolveTimeTargets(user.tenantId, dto.projectId ?? before.projectId ?? undefined, dto.taskId ?? before.taskId ?? undefined);

    const updated = await this.prisma.timeTimer.update({
      where: { id: before.id },
      data: {
        projectId: targets.projectId,
        taskId: dto.taskId,
        description: dto.description,
        billable: dto.billable,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined
      },
      select: timerSelect
    });

    await this.recordAudit(user, 'time_timer.update', 'TimeTimer', updated.id, {
      projectId: before.projectId,
      taskId: before.taskId
    }, {
      projectId: updated.projectId,
      taskId: updated.taskId
    }, meta);

    return updated;
  }

  async stopTimer(user: AuthenticatedUser, dto: StopTimerDto, meta: RequestMeta) {
    const timer = await this.getCurrentTimer(user);
    if (!timer) throw new NotFoundException('No timer is running');
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : new Date();
    if (endedAt <= timer.startedAt) throw new BadRequestException('Timer end must be after start');
    const minutes = Math.max(1, Math.ceil((endedAt.getTime() - timer.startedAt.getTime()) / 60_000));

    const entry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timeEntry.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          projectId: timer.projectId,
          taskId: timer.taskId,
          minutes,
          description: dto.description ?? timer.description,
          billable: dto.billable ?? timer.billable,
          entryDate: timer.startedAt,
          startedAt: timer.startedAt,
          endedAt
        },
        select: timeEntrySelect
      });
      await tx.timeTimer.delete({ where: { id: timer.id } });
      return created;
    });

    await this.syncTaskActualMinutes(user.tenantId, entry.taskId);
    await this.recordAudit(user, 'time_timer.stop', 'TimeEntry', entry.id, {
      timerId: timer.id,
      startedAt: timer.startedAt
    }, {
      minutes: entry.minutes,
      endedAt
    }, meta);

    return entry;
  }

  async discardTimer(user: AuthenticatedUser, meta: RequestMeta) {
    const timer = await this.getCurrentTimer(user);
    if (!timer) throw new NotFoundException('No timer is running');
    await this.prisma.timeTimer.delete({ where: { id: timer.id } });
    await this.recordAudit(user, 'time_timer.discard', 'TimeTimer', timer.id, {
      projectId: timer.projectId,
      taskId: timer.taskId,
      startedAt: timer.startedAt
    }, undefined, meta);
    return { success: true };
  }

  async listTimesheets(user: AuthenticatedUser, query: TimesheetQueryDto) {
    const targetUserId = query.userId ?? (this.canReadAllTime(user) ? undefined : user.id);
    if (query.userId && query.userId !== user.id) this.assertCanReadAllTime(user);
    const where: Prisma.TimesheetWhereInput = {
      tenantId: user.tenantId,
      userId: targetUserId,
      status: query.status,
      periodStart: this.dateFilter(query.from, undefined),
      periodEnd: this.dateFilter(undefined, query.to)
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.timesheet.findMany({
        where,
        select: timesheetSelect,
        orderBy: [{ periodStart: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.timesheet.count({ where })
    ]);

    return this.paginate(data.map((sheet) => this.withTimesheetTotals(sheet)), total, query);
  }

  async createTimesheet(user: AuthenticatedUser, dto: CreateTimesheetDto, meta: RequestMeta) {
    const targetUserId = dto.userId ?? user.id;
    this.assertCanWriteForUser(user, targetUserId);
    await this.assertUserBelongsToTenant(user.tenantId, targetUserId);
    const { start, end } = this.validatePeriod(dto.periodStart, dto.periodEnd);

    const sheet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timesheet.create({
        data: {
          tenantId: user.tenantId,
          userId: targetUserId,
          periodStart: start,
          periodEnd: end,
          notes: dto.notes
        },
        select: { id: true }
      });

      if (dto.includeDraftEntries !== false) {
        await tx.timeEntry.updateMany({
          where: {
            tenantId: user.tenantId,
            userId: targetUserId,
            timesheetId: null,
            status: { in: [TimeEntryStatus.DRAFT, TimeEntryStatus.REJECTED] },
            entryDate: { gte: start, lte: end }
          },
          data: {
            timesheetId: created.id,
            status: TimeEntryStatus.DRAFT,
            lockedAt: null
          }
        });
      }

      return created;
    });

    await this.recordAudit(user, 'timesheet.create', 'Timesheet', sheet.id, undefined, {
      userId: targetUserId,
      periodStart: start,
      periodEnd: end
    }, meta);

    return this.getTimesheet(user, sheet.id);
  }

  async getTimesheet(user: AuthenticatedUser, timesheetId: string) {
    const sheet = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    this.assertCanReadEntry(user, sheet.userId);
    return this.withTimesheetTotals(sheet);
  }

  async updateTimesheet(user: AuthenticatedUser, timesheetId: string, dto: UpdateTimesheetDto, meta: RequestMeta) {
    const before = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    this.assertCanWriteForUser(user, before.userId);
    this.assertTimesheetEditable(before.status);

    const start = dto.periodStart ? new Date(dto.periodStart) : before.periodStart;
    const end = dto.periodEnd ? new Date(dto.periodEnd) : before.periodEnd;
    this.validateDateRange(start, end);

    const updated = await this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        periodStart: dto.periodStart ? start : undefined,
        periodEnd: dto.periodEnd ? end : undefined,
        notes: dto.notes
      },
      select: timesheetSelect
    });

    await this.recordAudit(user, 'timesheet.update', 'Timesheet', timesheetId, {
      periodStart: before.periodStart,
      periodEnd: before.periodEnd,
      status: before.status
    }, {
      periodStart: updated.periodStart,
      periodEnd: updated.periodEnd,
      status: updated.status
    }, meta);

    return this.withTimesheetTotals(updated);
  }

  async addTimesheetEntries(user: AuthenticatedUser, timesheetId: string, dto: TimesheetEntriesDto, meta: RequestMeta) {
    const sheet = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    this.assertCanWriteForUser(user, sheet.userId);
    this.assertTimesheetEditable(sheet.status);
    const entries = await this.prisma.timeEntry.findMany({
      where: { id: { in: dto.entryIds }, tenantId: user.tenantId },
      select: { id: true, userId: true, status: true, entryDate: true, timesheetId: true }
    });

    if (entries.length !== new Set(dto.entryIds).size) throw new BadRequestException('One or more entries were not found');
    for (const entry of entries) {
      if (entry.userId !== sheet.userId) throw new BadRequestException('All entries must belong to the timesheet user');
      if (entry.timesheetId && entry.timesheetId !== sheet.id) throw new ConflictException('Entry is already attached to another timesheet');
      if (!([TimeEntryStatus.DRAFT, TimeEntryStatus.REJECTED] as TimeEntryStatus[]).includes(entry.status)) {
        throw new BadRequestException('Only draft or rejected entries can be attached');
      }
      if (entry.entryDate < sheet.periodStart || entry.entryDate > sheet.periodEnd) throw new BadRequestException('Entry is outside the timesheet period');
    }

    await this.prisma.timeEntry.updateMany({
      where: { id: { in: dto.entryIds }, tenantId: user.tenantId },
      data: { timesheetId, status: TimeEntryStatus.DRAFT, lockedAt: null }
    });
    await this.recordAudit(user, 'timesheet.entries_add', 'Timesheet', timesheetId, undefined, {
      entryIds: dto.entryIds
    }, meta);
    return this.getTimesheet(user, timesheetId);
  }

  async removeTimesheetEntry(user: AuthenticatedUser, timesheetId: string, entryId: string, meta: RequestMeta) {
    const sheet = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    this.assertCanWriteForUser(user, sheet.userId);
    this.assertTimesheetEditable(sheet.status);
    const entry = await this.getTimeEntryOrThrow(user.tenantId, entryId);
    if (entry.timesheetId !== timesheetId) throw new BadRequestException('Entry is not attached to this timesheet');

    await this.prisma.timeEntry.update({
      where: { id: entryId },
      data: { timesheetId: null, status: TimeEntryStatus.DRAFT, lockedAt: null }
    });
    await this.recordAudit(user, 'timesheet.entry_remove', 'Timesheet', timesheetId, {
      entryId
    }, undefined, meta);
    return this.getTimesheet(user, timesheetId);
  }

  async submitTimesheet(user: AuthenticatedUser, timesheetId: string, meta: RequestMeta) {
    const sheet = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    this.assertCanWriteForUser(user, sheet.userId);
    if (!([TimesheetStatus.DRAFT, TimesheetStatus.REJECTED] as TimesheetStatus[]).includes(sheet.status)) {
      throw new BadRequestException('Only draft or rejected timesheets can be submitted');
    }
    if (sheet.entries.length === 0) throw new BadRequestException('Timesheet has no time entries');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          status: TimesheetStatus.SUBMITTED,
          submittedAt: now,
          rejectedAt: null,
          rejectionReason: null
        }
      }),
      this.prisma.timeEntry.updateMany({
        where: { timesheetId, tenantId: user.tenantId },
        data: { status: TimeEntryStatus.SUBMITTED, lockedAt: now }
      })
    ]);

    await this.recordAudit(user, 'timesheet.submit', 'Timesheet', timesheetId, {
      status: sheet.status
    }, {
      status: TimesheetStatus.SUBMITTED
    }, meta);
    return this.getTimesheet(user, timesheetId);
  }

  async approveTimesheet(user: AuthenticatedUser, timesheetId: string, meta: RequestMeta) {
    this.assertCanApproveTime(user);
    const sheet = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    if (sheet.status !== TimesheetStatus.SUBMITTED) throw new BadRequestException('Only submitted timesheets can be approved');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          status: TimesheetStatus.APPROVED,
          approverId: user.id,
          approvedAt: now,
          rejectedAt: null,
          rejectionReason: null
        }
      }),
      this.prisma.timeEntry.updateMany({
        where: { timesheetId, tenantId: user.tenantId },
        data: { status: TimeEntryStatus.APPROVED, lockedAt: now }
      })
    ]);
    await this.recordAudit(user, 'timesheet.approve', 'Timesheet', timesheetId, {
      status: sheet.status
    }, {
      status: TimesheetStatus.APPROVED,
      approverId: user.id
    }, meta);
    return this.getTimesheet(user, timesheetId);
  }

  async rejectTimesheet(user: AuthenticatedUser, timesheetId: string, dto: RejectTimesheetDto, meta: RequestMeta) {
    this.assertCanApproveTime(user);
    const sheet = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    if (sheet.status !== TimesheetStatus.SUBMITTED) throw new BadRequestException('Only submitted timesheets can be rejected');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          status: TimesheetStatus.REJECTED,
          approverId: user.id,
          rejectedAt: now,
          rejectionReason: dto.reason
        }
      }),
      this.prisma.timeEntry.updateMany({
        where: { timesheetId, tenantId: user.tenantId },
        data: { status: TimeEntryStatus.REJECTED, lockedAt: null }
      })
    ]);
    await this.recordAudit(user, 'timesheet.reject', 'Timesheet', timesheetId, {
      status: sheet.status
    }, {
      status: TimesheetStatus.REJECTED,
      reason: dto.reason
    }, meta);
    return this.getTimesheet(user, timesheetId);
  }

  async reopenTimesheet(user: AuthenticatedUser, timesheetId: string, meta: RequestMeta) {
    const sheet = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    if (sheet.userId !== user.id) this.assertCanApproveTime(user);
    if (!([TimesheetStatus.REJECTED, TimesheetStatus.SUBMITTED, TimesheetStatus.APPROVED] as TimesheetStatus[]).includes(sheet.status)) {
      throw new BadRequestException('Timesheet does not need reopening');
    }
    if (sheet.status === TimesheetStatus.APPROVED) this.assertCanApproveTime(user);

    await this.prisma.$transaction([
      this.prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          status: TimesheetStatus.DRAFT,
          submittedAt: null,
          approvedAt: null,
          rejectedAt: null,
          rejectionReason: null
        }
      }),
      this.prisma.timeEntry.updateMany({
        where: { timesheetId, tenantId: user.tenantId },
        data: { status: TimeEntryStatus.DRAFT, lockedAt: null }
      })
    ]);
    await this.recordAudit(user, 'timesheet.reopen', 'Timesheet', timesheetId, {
      status: sheet.status
    }, {
      status: TimesheetStatus.DRAFT
    }, meta);
    return this.getTimesheet(user, timesheetId);
  }

  async cancelTimesheet(user: AuthenticatedUser, timesheetId: string, meta: RequestMeta) {
    const sheet = await this.getTimesheetOrThrow(user.tenantId, timesheetId);
    this.assertCanWriteForUser(user, sheet.userId);
    if (sheet.status === TimesheetStatus.APPROVED) this.assertCanApproveTime(user);
    await this.prisma.$transaction([
      this.prisma.timesheet.update({
        where: { id: timesheetId },
        data: { status: TimesheetStatus.CANCELLED }
      }),
      this.prisma.timeEntry.updateMany({
        where: { timesheetId, tenantId: user.tenantId, status: { not: TimeEntryStatus.APPROVED } },
        data: { timesheetId: null, status: TimeEntryStatus.DRAFT, lockedAt: null }
      })
    ]);
    await this.recordAudit(user, 'timesheet.cancel', 'Timesheet', timesheetId, {
      status: sheet.status
    }, {
      status: TimesheetStatus.CANCELLED
    }, meta);
    return this.getTimesheet(user, timesheetId);
  }

  async listSkills(user: AuthenticatedUser, query: SkillQueryDto) {
    const where: Prisma.SkillWhereInput = {
      tenantId: user.tenantId,
      category: query.category,
      archivedAt: query.includeArchived ? undefined : null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.skill.findMany({
        where,
        select: skillSelect,
        orderBy: [{ name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.skill.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createSkill(user: AuthenticatedUser, dto: CreateSkillDto, meta: RequestMeta) {
    const name = this.normalizeName(dto.name);
    const skill = await this.prisma.skill.create({
      data: {
        tenantId: user.tenantId,
        name,
        description: dto.description,
        category: dto.category,
        createdById: user.id
      },
      select: skillSelect
    });
    await this.recordAudit(user, 'skill.create', 'Skill', skill.id, undefined, {
      name: skill.name,
      category: skill.category
    }, meta);
    return skill;
  }

  async getSkill(user: AuthenticatedUser, skillId: string) {
    return this.getSkillOrThrow(user.tenantId, skillId);
  }

  async updateSkill(user: AuthenticatedUser, skillId: string, dto: UpdateSkillDto, meta: RequestMeta) {
    const before = await this.getSkillOrThrow(user.tenantId, skillId);
    const updated = await this.prisma.skill.update({
      where: { id: skillId },
      data: {
        name: dto.name ? this.normalizeName(dto.name) : undefined,
        description: dto.description,
        category: dto.category
      },
      select: skillSelect
    });
    await this.recordAudit(user, 'skill.update', 'Skill', skillId, {
      name: before.name,
      category: before.category
    }, {
      name: updated.name,
      category: updated.category
    }, meta);
    return updated;
  }

  async archiveSkill(user: AuthenticatedUser, skillId: string, meta: RequestMeta) {
    const before = await this.getSkillOrThrow(user.tenantId, skillId);
    const updated = await this.prisma.skill.update({
      where: { id: skillId },
      data: { archivedAt: new Date() },
      select: skillSelect
    });
    await this.recordAudit(user, 'skill.archive', 'Skill', skillId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async restoreSkill(user: AuthenticatedUser, skillId: string, meta: RequestMeta) {
    const before = await this.getSkillOrThrow(user.tenantId, skillId);
    const updated = await this.prisma.skill.update({
      where: { id: skillId },
      data: { archivedAt: null },
      select: skillSelect
    });
    await this.recordAudit(user, 'skill.restore', 'Skill', skillId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async deleteSkill(user: AuthenticatedUser, skillId: string, meta: RequestMeta) {
    const skill = await this.getSkillOrThrow(user.tenantId, skillId);
    if (skill._count.users > 0) throw new BadRequestException('Archive skills that are assigned to users');
    await this.prisma.skill.delete({ where: { id: skillId } });
    await this.recordAudit(user, 'skill.delete', 'Skill', skillId, {
      name: skill.name
    }, undefined, meta);
    return { success: true };
  }

  async listUserSkills(user: AuthenticatedUser, query: UserSkillQueryDto) {
    const targetUserId = query.userId ?? (this.canReadAllTime(user) ? undefined : user.id);
    if (query.userId && query.userId !== user.id) this.assertCanReadAllTime(user);
    const where: Prisma.UserSkillWhereInput = {
      tenantId: user.tenantId,
      userId: targetUserId,
      skillId: query.skillId,
      ...(query.search ? { skill: { name: { contains: query.search, mode: 'insensitive' } } } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.userSkill.findMany({
        where,
        select: userSkillSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.userSkill.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async assignUserSkill(user: AuthenticatedUser, dto: AssignUserSkillDto, meta: RequestMeta) {
    this.assertCanManagePeoplePlanning(user);
    await this.assertUserBelongsToTenant(user.tenantId, dto.userId);
    await this.getSkillOrThrow(user.tenantId, dto.skillId);
    const userSkill = await this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId: dto.userId, skillId: dto.skillId } },
      update: {
        tenantId: user.tenantId,
        level: dto.level,
        yearsExperience: dto.yearsExperience,
        notes: dto.notes
      },
      create: {
        tenantId: user.tenantId,
        userId: dto.userId,
        skillId: dto.skillId,
        level: dto.level,
        yearsExperience: dto.yearsExperience,
        notes: dto.notes
      },
      select: userSkillSelect
    });
    await this.recordAudit(user, 'user_skill.assign', 'UserSkill', userSkill.id, undefined, {
      userId: dto.userId,
      skillId: dto.skillId,
      level: dto.level
    }, meta);
    return userSkill;
  }

  async updateUserSkill(user: AuthenticatedUser, userSkillId: string, dto: UpdateUserSkillDto, meta: RequestMeta) {
    this.assertCanManagePeoplePlanning(user);
    const before = await this.getUserSkillOrThrow(user.tenantId, userSkillId);
    const updated = await this.prisma.userSkill.update({
      where: { id: userSkillId },
      data: {
        level: dto.level,
        yearsExperience: dto.yearsExperience,
        notes: dto.notes
      },
      select: userSkillSelect
    });
    await this.recordAudit(user, 'user_skill.update', 'UserSkill', userSkillId, {
      level: before.level
    }, {
      level: updated.level
    }, meta);
    return updated;
  }

  async deleteUserSkill(user: AuthenticatedUser, userSkillId: string, meta: RequestMeta) {
    this.assertCanManagePeoplePlanning(user);
    const before = await this.getUserSkillOrThrow(user.tenantId, userSkillId);
    await this.prisma.userSkill.delete({ where: { id: userSkillId } });
    await this.recordAudit(user, 'user_skill.delete', 'UserSkill', userSkillId, {
      userId: before.userId,
      skillId: before.skillId
    }, undefined, meta);
    return { success: true };
  }

  async listAllocations(user: AuthenticatedUser, query: ResourceAllocationQueryDto) {
    const where: Prisma.ResourceAllocationWhereInput = {
      tenantId: user.tenantId,
      userId: query.userId,
      projectId: query.projectId,
      ...this.overlapWhere(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { role: { contains: query.search, mode: 'insensitive' } },
              { project: { name: { contains: query.search, mode: 'insensitive' } } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.resourceAllocation.findMany({
        where,
        select: allocationSelect,
        orderBy: [{ startDate: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.resourceAllocation.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createAllocation(user: AuthenticatedUser, dto: CreateResourceAllocationDto, meta: RequestMeta) {
    this.assertCanManagePeoplePlanning(user);
    await this.assertUserBelongsToTenant(user.tenantId, dto.userId);
    await this.assertProjectBelongsToTenant(user.tenantId, dto.projectId);
    const { start, end } = this.validateOptionalEnd(dto.startDate, dto.endDate);
    await this.assertAllocationCapacity(user.tenantId, dto.userId, dto.percent, start, end);

    const allocation = await this.prisma.resourceAllocation.create({
      data: {
        tenantId: user.tenantId,
        userId: dto.userId,
        projectId: dto.projectId,
        role: dto.role,
        percent: dto.percent,
        billable: dto.billable ?? true,
        notes: dto.notes,
        startDate: start,
        endDate: end,
        createdById: user.id
      },
      select: allocationSelect
    });
    await this.recordAudit(user, 'resource_allocation.create', 'ResourceAllocation', allocation.id, undefined, {
      userId: dto.userId,
      projectId: dto.projectId,
      percent: dto.percent
    }, meta);
    return allocation;
  }

  async getAllocation(user: AuthenticatedUser, allocationId: string) {
    return this.getAllocationOrThrow(user.tenantId, allocationId);
  }

  async updateAllocation(
    user: AuthenticatedUser,
    allocationId: string,
    dto: UpdateResourceAllocationDto,
    meta: RequestMeta
  ) {
    this.assertCanManagePeoplePlanning(user);
    const before = await this.getAllocationOrThrow(user.tenantId, allocationId);
    const projectId = dto.projectId ?? before.projectId;
    await this.assertProjectBelongsToTenant(user.tenantId, projectId);
    const start = dto.startDate ? new Date(dto.startDate) : before.startDate;
    const end = dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : before.endDate;
    this.validateDateRange(start, end);
    await this.assertAllocationCapacity(
      user.tenantId,
      before.userId,
      dto.percent ?? before.percent,
      start,
      end,
      allocationId
    );

    const updated = await this.prisma.resourceAllocation.update({
      where: { id: allocationId },
      data: {
        projectId,
        role: dto.role,
        percent: dto.percent,
        billable: dto.billable,
        notes: dto.notes,
        startDate: dto.startDate ? start : undefined,
        endDate: dto.endDate !== undefined ? end : undefined
      },
      select: allocationSelect
    });
    await this.recordAudit(user, 'resource_allocation.update', 'ResourceAllocation', allocationId, {
      projectId: before.projectId,
      percent: before.percent,
      startDate: before.startDate,
      endDate: before.endDate
    }, {
      projectId: updated.projectId,
      percent: updated.percent,
      startDate: updated.startDate,
      endDate: updated.endDate
    }, meta);
    return updated;
  }

  async deleteAllocation(user: AuthenticatedUser, allocationId: string, meta: RequestMeta) {
    this.assertCanManagePeoplePlanning(user);
    const before = await this.getAllocationOrThrow(user.tenantId, allocationId);
    await this.prisma.resourceAllocation.delete({ where: { id: allocationId } });
    await this.recordAudit(user, 'resource_allocation.delete', 'ResourceAllocation', allocationId, {
      userId: before.userId,
      projectId: before.projectId,
      percent: before.percent
    }, undefined, meta);
    return { success: true };
  }

  async capacityReport(user: AuthenticatedUser, query: ResourceReportQueryDto) {
    this.assertCanReadAllTime(user);
    const { start, end } = this.validatePeriod(query.from, query.to);
    const users = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        id: query.userId,
        status: { not: 'DEACTIVATED' }
      },
      select: userSummarySelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
    });
    const allocations = await this.prisma.resourceAllocation.findMany({
      where: {
        tenantId: user.tenantId,
        userId: query.userId,
        projectId: query.projectId,
        ...this.overlapWhere(query.from, query.to)
      },
      select: allocationSelect
    });
    const businessDays = this.businessDays(start, end);
    const fullCapacityMinutes = businessDays * 8 * 60;
    return {
      from: start,
      to: end,
      businessDays,
      fullCapacityMinutes,
      data: users.map((resource) => {
        const resourceAllocations = allocations.filter((allocation) => allocation.userId === resource.id);
        const allocatedPercent = Math.min(100, resourceAllocations.reduce((sum, allocation) => sum + allocation.percent, 0));
        return {
          user: resource,
          allocatedPercent,
          availablePercent: Math.max(0, 100 - allocatedPercent),
          plannedMinutes: Math.round((fullCapacityMinutes * allocatedPercent) / 100),
          availableMinutes: Math.round((fullCapacityMinutes * Math.max(0, 100 - allocatedPercent)) / 100),
          allocations: resourceAllocations
        };
      })
    };
  }

  async utilizationReport(user: AuthenticatedUser, query: ResourceReportQueryDto) {
    this.assertCanReadAllTime(user);
    const { start, end } = this.validatePeriod(query.from, query.to);
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        tenantId: user.tenantId,
        userId: query.userId,
        projectId: query.projectId,
        entryDate: { gte: start, lte: end },
        status: { not: TimeEntryStatus.REJECTED }
      },
      select: timeEntrySelect,
      orderBy: [{ entryDate: 'asc' }]
    });
    const byUser = new Map<string, { user: unknown; total: number; billable: number; nonBillable: number; projects: Map<string, { project: unknown; minutes: number }> }>();
    for (const entry of entries) {
      const current = byUser.get(entry.userId) ?? {
        user: entry.user,
        total: 0,
        billable: 0,
        nonBillable: 0,
        projects: new Map<string, { project: unknown; minutes: number }>()
      };
      current.total += entry.minutes;
      if (entry.billable) current.billable += entry.minutes;
      else current.nonBillable += entry.minutes;
      if (entry.projectId) {
        const project = current.projects.get(entry.projectId) ?? { project: entry.project, minutes: 0 };
        project.minutes += entry.minutes;
        current.projects.set(entry.projectId, project);
      }
      byUser.set(entry.userId, current);
    }
    const capacity = await this.capacityReport(user, query);
    const capacityByUser = new Map(capacity.data.map((item) => [item.user.id, item]));
    return {
      from: start,
      to: end,
      data: Array.from(byUser.values()).map((item) => {
        const userId = (item.user as { id: string }).id;
        const capacityItem = capacityByUser.get(userId);
        const capacityMinutes = capacityItem?.plannedMinutes ?? 0;
        return {
          user: item.user,
          totalMinutes: item.total,
          billableMinutes: item.billable,
          nonBillableMinutes: item.nonBillable,
          billableRatio: item.total ? Number((item.billable / item.total).toFixed(4)) : 0,
          utilizationRatio: capacityMinutes ? Number((item.total / capacityMinutes).toFixed(4)) : null,
          capacityMinutes,
          projects: Array.from(item.projects.values())
        };
      })
    };
  }

  async availabilityReport(user: AuthenticatedUser, query: ResourceReportQueryDto) {
    return this.capacityReport(user, query);
  }

  private async getTimeEntryOrThrow(tenantId: string, entryId: string) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, tenantId },
      select: timeEntrySelect
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    return entry;
  }

  private async getTimesheetOrThrow(tenantId: string, timesheetId: string) {
    const sheet = await this.prisma.timesheet.findFirst({
      where: { id: timesheetId, tenantId },
      select: timesheetSelect
    });
    if (!sheet) throw new NotFoundException('Timesheet not found');
    return sheet;
  }

  private async getSkillOrThrow(tenantId: string, skillId: string) {
    const skill = await this.prisma.skill.findFirst({
      where: { id: skillId, tenantId },
      select: skillSelect
    });
    if (!skill) throw new NotFoundException('Skill not found');
    return skill;
  }

  private async getUserSkillOrThrow(tenantId: string, userSkillId: string) {
    const userSkill = await this.prisma.userSkill.findFirst({
      where: { id: userSkillId, tenantId },
      select: userSkillSelect
    });
    if (!userSkill) throw new NotFoundException('User skill not found');
    return userSkill;
  }

  private async getAllocationOrThrow(tenantId: string, allocationId: string) {
    const allocation = await this.prisma.resourceAllocation.findFirst({
      where: { id: allocationId, tenantId },
      select: allocationSelect
    });
    if (!allocation) throw new NotFoundException('Resource allocation not found');
    return allocation;
  }

  private async resolveTimeTargets(tenantId: string, projectId?: string | null, taskId?: string | null) {
    let resolvedProjectId = projectId ?? null;
    if (taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: taskId, tenantId },
        select: { id: true, projectId: true }
      });
      if (!task) throw new NotFoundException('Task not found');
      if (resolvedProjectId && resolvedProjectId !== task.projectId) {
        throw new BadRequestException('Task does not belong to the supplied project');
      }
      resolvedProjectId = task.projectId;
    }
    if (resolvedProjectId) await this.assertProjectBelongsToTenant(tenantId, resolvedProjectId);
    return { projectId: resolvedProjectId };
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const count = await this.prisma.user.count({ where: { id: userId, tenantId } });
    if (count === 0) throw new NotFoundException('User not found');
  }

  private async assertProjectBelongsToTenant(tenantId: string, projectId: string) {
    const count = await this.prisma.project.count({ where: { id: projectId, tenantId } });
    if (count === 0) throw new NotFoundException('Project not found');
  }

  private async assertAllocationCapacity(
    tenantId: string,
    userId: string,
    percent: number,
    startDate: Date,
    endDate?: Date | null,
    excludedAllocationId?: string
  ) {
    const overlaps = await this.prisma.resourceAllocation.findMany({
      where: {
        tenantId,
        userId,
        id: excludedAllocationId ? { not: excludedAllocationId } : undefined,
        startDate: { lte: endDate ?? new Date('9999-12-31T00:00:00.000Z') },
        OR: [{ endDate: null }, { endDate: { gte: startDate } }]
      },
      select: { percent: true }
    });
    const total = overlaps.reduce((sum, allocation) => sum + allocation.percent, percent);
    if (total > 100) throw new BadRequestException(`Allocation would exceed 100% capacity (${total}%)`);
  }

  private assertEntryEditable(entry: { status: TimeEntryStatus; timesheet?: { status: TimesheetStatus } | null }) {
    if (([TimeEntryStatus.APPROVED, TimeEntryStatus.LOCKED] as TimeEntryStatus[]).includes(entry.status)) {
      throw new BadRequestException('Approved or locked time entries cannot be edited');
    }
    if (entry.timesheet && ([TimesheetStatus.SUBMITTED, TimesheetStatus.APPROVED, TimesheetStatus.CANCELLED] as TimesheetStatus[]).includes(entry.timesheet.status)) {
      throw new BadRequestException('Time entry is locked by its timesheet status');
    }
  }

  private assertTimesheetEditable(status: TimesheetStatus) {
    if (!([TimesheetStatus.DRAFT, TimesheetStatus.REJECTED] as TimesheetStatus[]).includes(status)) {
      throw new BadRequestException('Timesheet is locked by its status');
    }
  }

  private assertCanReadEntry(user: AuthenticatedUser, ownerId: string) {
    if (ownerId === user.id || this.canReadAllTime(user)) return;
    throw new ForbiddenException('Cannot read another user time data');
  }

  private assertCanWriteForUser(user: AuthenticatedUser, targetUserId: string) {
    if (targetUserId === user.id || this.canManageTime(user)) return;
    throw new ForbiddenException('Cannot write time data for another user');
  }

  private assertCanReadAllTime(user: AuthenticatedUser) {
    if (this.canReadAllTime(user)) return;
    throw new ForbiddenException('Cannot read all time data');
  }

  private assertCanApproveTime(user: AuthenticatedUser) {
    if (this.canManageTime(user)) return;
    throw new ForbiddenException('Cannot approve timesheets');
  }

  private assertCanManagePeoplePlanning(user: AuthenticatedUser) {
    if (this.canManageTime(user)) return;
    throw new ForbiddenException('Cannot manage resource planning');
  }

  private canManageTime(user: AuthenticatedUser) {
    return user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:projects') ||
      user.permissions.includes('manage:reports');
  }

  private canReadAllTime(user: AuthenticatedUser) {
    return this.canManageTime(user) || user.permissions.includes('read:reports');
  }

  private assertTimerRange(startedAt?: string, endedAt?: string) {
    if (startedAt && endedAt && new Date(endedAt) <= new Date(startedAt)) {
      throw new BadRequestException('End time must be after start time');
    }
  }

  private validatePeriod(from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);
    this.validateDateRange(start, end);
    return { start, end };
  }

  private validateOptionalEnd(from: string, to?: string | null) {
    const start = new Date(from);
    const end = to ? new Date(to) : null;
    this.validateDateRange(start, end);
    return { start, end };
  }

  private validateDateRange(start: Date, end?: Date | null) {
    if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
      throw new BadRequestException('Invalid date range');
    }
    if (end && end < start) throw new BadRequestException('End date must be after start date');
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private overlapWhere(from?: string, to?: string): Prisma.ResourceAllocationWhereInput {
    if (!from && !to) return {};
    const start = from ? new Date(from) : new Date('1970-01-01T00:00:00.000Z');
    const end = to ? new Date(to) : new Date('9999-12-31T00:00:00.000Z');
    return {
      startDate: { lte: end },
      OR: [{ endDate: null }, { endDate: { gte: start } }]
    };
  }

  private withTimesheetTotals<T extends { entries: Array<{ minutes: number; billable: boolean; status: TimeEntryStatus }> }>(sheet: T) {
    const totalMinutes = sheet.entries.reduce((sum, entry) => sum + entry.minutes, 0);
    const billableMinutes = sheet.entries.filter((entry) => entry.billable).reduce((sum, entry) => sum + entry.minutes, 0);
    return {
      ...sheet,
      totals: {
        entries: sheet.entries.length,
        totalMinutes,
        billableMinutes,
        nonBillableMinutes: totalMinutes - billableMinutes,
        approvedMinutes: sheet.entries
          .filter((entry) => entry.status === TimeEntryStatus.APPROVED)
          .reduce((sum, entry) => sum + entry.minutes, 0)
      }
    };
  }

  private async syncTaskActualMinutes(tenantId: string, taskId?: string | null) {
    if (!taskId) return;
    const result = await this.prisma.timeEntry.aggregate({
      where: {
        tenantId,
        taskId,
        status: { not: TimeEntryStatus.REJECTED }
      },
      _sum: { minutes: true }
    });
    await this.prisma.task.update({
      where: { id: taskId },
      data: { actualMins: result._sum.minutes ?? 0 }
    });
  }

  private normalizeName(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private businessDays(start: Date, end: Date) {
    let days = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cursor <= last) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) days += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  private paginate<T>(data: T[], total: number, query: PaginationQueryDto) {
    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  private async recordAudit(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: Prisma.InputJsonValue | undefined,
    newValue: Prisma.InputJsonValue | undefined,
    meta: RequestMeta
  ) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }
}
