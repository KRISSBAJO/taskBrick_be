import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  MeetingAttendeeStatus,
  MeetingReminderChannel,
  MeetingReminderStatus,
  MeetingStatus,
  Prisma,
  TaskPriority,
  TaskStatus,
  TaskType,
  Visibility
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RealtimeGateway } from '../collaboration/realtime.gateway';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignMeetingActionItemDto,
  CreateMeetingChecklistItemDto,
  CreateMeetingCommentDto,
  CreateMeetingDecisionDto,
  SendMeetingFollowUpDto,
  SyncMeetingRuntimeDto,
  UpdateLiveMeetingNotesDto,
  UpdateMeetingChecklistItemDto,
  UpdateMeetingCommentDto,
  UpdateMeetingDecisionDto,
  UpdateMeetingAttendanceDto
} from './dto/meeting-runtime.dto';
import { MeetingIntegrationsService } from './meeting-integrations.service';

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
  status: true,
  timezone: true
} satisfies Prisma.UserSelect;

const meetingWorkspaceSelect = {
  id: true,
  tenantId: true,
  meetingTypeId: true,
  projectId: true,
  sprintId: true,
  taskId: true,
  teamId: true,
  hostId: true,
  createdById: true,
  title: true,
  description: true,
  status: true,
  visibility: true,
  approvalStatus: true,
  startAt: true,
  endAt: true,
  timezone: true,
  locationMode: true,
  locationName: true,
  meetingUrl: true,
  conferenceProvider: true,
  clientName: true,
  clientEmail: true,
  clientCompany: true,
  liveNotes: true,
  liveNotesVersion: true,
  liveNotesUpdatedAt: true,
  liveNotesUpdatedById: true,
  runtimeState: true,
  agendaLocked: true,
  aiEnabled: true,
  aiSummary: true,
  metadata: true,
  completedAt: true,
  cancelledAt: true,
  cancelledReason: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      key: true,
      name: true,
      status: true,
      workspaceId: true,
      teamId: true
    }
  },
  sprint: {
    select: {
      id: true,
      name: true,
      goal: true,
      startDate: true,
      endDate: true,
      completedAt: true
    }
  },
  task: {
    select: {
      id: true,
      key: true,
      title: true,
      status: true,
      priority: true
    }
  },
  team: {
    select: {
      id: true,
      name: true
    }
  },
  host: {
    select: userSummarySelect
  },
  liveNotesUpdatedBy: {
    select: userSummarySelect
  },
  attendees: {
    select: {
      id: true,
      tenantId: true,
      meetingId: true,
      userId: true,
      email: true,
      name: true,
      role: true,
      status: true,
      isExternal: true,
      responseNote: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: userSummarySelect
      }
    },
    orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }]
  },
  agendaItems: {
    select: {
      id: true,
      tenantId: true,
      meetingId: true,
      ownerId: true,
      title: true,
      notes: true,
      status: true,
      durationMins: true,
      sortOrder: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: userSummarySelect }
    },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]
  },
  reminders: {
    select: {
      id: true,
      tenantId: true,
      meetingId: true,
      attendeeId: true,
      channel: true,
      offsetMinutes: true,
      scheduledFor: true,
      status: true,
      destination: true,
      templateKey: true,
      payload: true,
      error: true,
      sentAt: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: [{ scheduledFor: 'asc' as const }]
  },
  _count: {
    select: {
      attendees: true,
      agendaItems: true,
      reminders: true,
      comments: true,
      decisions: true,
      checklistItems: true,
      activities: true
    }
  }
} satisfies Prisma.MeetingSelect;

const meetingCommentSelect = {
  id: true,
  tenantId: true,
  meetingId: true,
  authorId: true,
  body: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  author: { select: userSummarySelect }
} satisfies Prisma.MeetingCommentSelect;

const meetingDecisionSelect = {
  id: true,
  tenantId: true,
  meetingId: true,
  ownerId: true,
  title: true,
  summary: true,
  impact: true,
  status: true,
  dueAt: true,
  taskId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: userSummarySelect }
} satisfies Prisma.MeetingDecisionSelect;

const meetingChecklistSelect = {
  id: true,
  tenantId: true,
  meetingId: true,
  ownerId: true,
  title: true,
  notes: true,
  isDone: true,
  dueAt: true,
  taskId: true,
  sortOrder: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: userSummarySelect }
} satisfies Prisma.MeetingChecklistItemSelect;

const meetingActivitySelect = {
  id: true,
  meetingId: true,
  actorId: true,
  action: true,
  oldValue: true,
  newValue: true,
  createdAt: true,
  actor: { select: userSummarySelect }
} satisfies Prisma.MeetingActivitySelect;

const taskSummarySelect = {
  id: true,
  tenantId: true,
  projectId: true,
  sprintId: true,
  key: true,
  title: true,
  type: true,
  status: true,
  priority: true,
  dueDate: true,
  storyPoints: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      key: true,
      name: true
    }
  },
  assignees: {
    select: {
      id: true,
      user: { select: userSummarySelect }
    }
  }
} satisfies Prisma.TaskSelect;

const fileSummarySelect = {
  id: true,
  tenantId: true,
  uploadedById: true,
  scope: true,
  entityType: true,
  entityId: true,
  fileName: true,
  fileUrl: true,
  storageKey: true,
  provider: true,
  mimeType: true,
  sizeBytes: true,
  visibility: true,
  metadata: true,
  archivedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: {
    select: userSummarySelect
  }
} satisfies Prisma.FileAssetSelect;

type MeetingWorkspaceRecord = Prisma.MeetingGetPayload<{ select: typeof meetingWorkspaceSelect }>;

@Injectable()
export class MeetingRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly meetingIntegrationsService: MeetingIntegrationsService
  ) {}

  async getWorkspace(user: AuthenticatedUser, meetingId: string) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const [comments, decisions, checklist, files, relatedTasks, activity, reminderJobs] = await Promise.all([
      this.prisma.meetingComment.findMany({
        where: { tenantId: user.tenantId, meetingId },
        select: meetingCommentSelect,
        orderBy: [{ createdAt: 'asc' }]
      }),
      this.prisma.meetingDecision.findMany({
        where: { tenantId: user.tenantId, meetingId },
        select: meetingDecisionSelect,
        orderBy: [{ createdAt: 'desc' }]
      }),
      this.prisma.meetingChecklistItem.findMany({
        where: { tenantId: user.tenantId, meetingId },
        select: meetingChecklistSelect,
        orderBy: [{ isDone: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
      }),
      this.prisma.fileAsset.findMany({
        where: {
          tenantId: user.tenantId,
          entityType: 'MEETING',
          entityId: meetingId,
          archivedAt: null,
          deletedAt: null
        },
        select: fileSummarySelect,
        orderBy: [{ createdAt: 'desc' }],
        take: 100
      }),
      this.relatedTasks(user, meeting),
      this.prisma.meetingActivity.findMany({
        where: { tenantId: user.tenantId, meetingId },
        select: meetingActivitySelect,
        orderBy: [{ createdAt: 'desc' }],
        take: 100
      }),
      this.prisma.meetingReminderJob.findMany({
        where: { tenantId: user.tenantId, meetingId },
        orderBy: [{ createdAt: 'desc' }],
        take: 50
      })
    ]);

    return {
      meeting,
      live: {
        notes: meeting.liveNotes ?? '',
        version: meeting.liveNotesVersion,
        updatedAt: meeting.liveNotesUpdatedAt,
        updatedBy: meeting.liveNotesUpdatedBy,
        runtimeState: this.runtimeState(meeting)
      },
      attendees: meeting.attendees,
      agendaItems: meeting.agendaItems,
      comments,
      decisions,
      checklist,
      files,
      relatedTasks,
      reminders: meeting.reminders,
      reminderJobs,
      activity,
      metrics: this.metrics(meeting, decisions, checklist, relatedTasks, files)
    };
  }

  async updateLiveNotes(user: AuthenticatedUser, meetingId: string, dto: UpdateLiveMeetingNotesDto, meta: RequestMeta) {
    const before = await this.getMeetingForRead(user, meetingId);
    this.assertCanCollaborate(user, before);

    if (dto.version !== undefined && dto.version !== before.liveNotesVersion) {
      throw new ConflictException('Live notes were updated by someone else. Refresh before saving.');
    }

    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        liveNotes: dto.notes,
        liveNotesVersion: { increment: 1 },
        liveNotesUpdatedAt: new Date(),
        liveNotesUpdatedById: user.id,
        runtimeState: this.toJson({
          ...this.runtimeState(before),
          lastNotesCursor: dto.cursor ?? null,
          lastNotesSource: 'taskbricks',
          lastNotesUpdatedAt: new Date().toISOString()
        })
      },
      select: meetingWorkspaceSelect
    });

    await this.recordMeetingAction(user, meetingId, 'meeting.live_notes_update', {
      version: before.liveNotesVersion
    }, {
      version: updated.liveNotesVersion
    }, meta);
    this.emit(user.tenantId, meetingId, 'meeting.live_notes.updated', {
      meetingId,
      notes: updated.liveNotes ?? '',
      version: updated.liveNotesVersion,
      updatedAt: updated.liveNotesUpdatedAt,
      updatedBy: updated.liveNotesUpdatedBy
    });
    return {
      notes: updated.liveNotes ?? '',
      version: updated.liveNotesVersion,
      updatedAt: updated.liveNotesUpdatedAt,
      updatedBy: updated.liveNotesUpdatedBy
    };
  }

  async createComment(user: AuthenticatedUser, meetingId: string, dto: CreateMeetingCommentDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    this.assertCanCollaborate(user, meeting);
    const created = await this.prisma.meetingComment.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        authorId: user.id,
        body: dto.body.trim(),
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: meetingCommentSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.comment_create', undefined, created, meta);
    this.emit(user.tenantId, meetingId, 'meeting.comment.created', { meetingId, comment: created });
    return created;
  }

  async updateComment(user: AuthenticatedUser, meetingId: string, commentId: string, dto: UpdateMeetingCommentDto, meta: RequestMeta) {
    const before = await this.getCommentOrThrow(user.tenantId, meetingId, commentId);
    this.assertOwnerOrManager(user, before.authorId, 'Cannot edit this meeting comment');
    const updated = await this.prisma.meetingComment.update({
      where: { id: commentId },
      data: { body: dto.body.trim() },
      select: meetingCommentSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.comment_update', before, updated, meta);
    this.emit(user.tenantId, meetingId, 'meeting.comment.updated', { meetingId, comment: updated });
    return updated;
  }

  async deleteComment(user: AuthenticatedUser, meetingId: string, commentId: string, meta: RequestMeta) {
    const before = await this.getCommentOrThrow(user.tenantId, meetingId, commentId);
    this.assertOwnerOrManager(user, before.authorId, 'Cannot delete this meeting comment');
    await this.prisma.meetingComment.delete({ where: { id: commentId } });
    await this.recordMeetingAction(user, meetingId, 'meeting.comment_delete', before, { commentId }, meta);
    this.emit(user.tenantId, meetingId, 'meeting.comment.deleted', { meetingId, commentId });
    return { success: true };
  }

  async createDecision(user: AuthenticatedUser, meetingId: string, dto: CreateMeetingDecisionDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    this.assertCanCollaborate(user, meeting);
    if (dto.ownerId) await this.assertUserBelongsToTenant(user.tenantId, dto.ownerId);
    if (dto.taskId) await this.assertTaskBelongsToTenant(user.tenantId, dto.taskId);
    const created = await this.prisma.meetingDecision.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        ownerId: dto.ownerId,
        title: dto.title.trim(),
        summary: dto.summary,
        impact: dto.impact,
        status: dto.status ?? 'OPEN',
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        taskId: dto.taskId,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: meetingDecisionSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.decision_create', undefined, created, meta);
    this.emit(user.tenantId, meetingId, 'meeting.decision.created', { meetingId, decision: created });
    return created;
  }

  async updateDecision(user: AuthenticatedUser, meetingId: string, decisionId: string, dto: UpdateMeetingDecisionDto, meta: RequestMeta) {
    const before = await this.getDecisionOrThrow(user.tenantId, meetingId, decisionId);
    if (dto.ownerId) await this.assertUserBelongsToTenant(user.tenantId, dto.ownerId);
    if (dto.taskId) await this.assertTaskBelongsToTenant(user.tenantId, dto.taskId);
    const updated = await this.prisma.meetingDecision.update({
      where: { id: decisionId },
      data: {
        title: dto.title?.trim(),
        summary: dto.summary,
        impact: dto.impact,
        status: dto.status,
        ownerId: dto.ownerId,
        taskId: dto.taskId,
        dueAt: dto.dueAt === undefined ? undefined : dto.dueAt ? new Date(dto.dueAt) : null,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: meetingDecisionSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.decision_update', before, updated, meta);
    this.emit(user.tenantId, meetingId, 'meeting.decision.updated', { meetingId, decision: updated });
    return updated;
  }

  async deleteDecision(user: AuthenticatedUser, meetingId: string, decisionId: string, meta: RequestMeta) {
    const before = await this.getDecisionOrThrow(user.tenantId, meetingId, decisionId);
    await this.prisma.meetingDecision.delete({ where: { id: decisionId } });
    await this.recordMeetingAction(user, meetingId, 'meeting.decision_delete', before, { decisionId }, meta);
    this.emit(user.tenantId, meetingId, 'meeting.decision.deleted', { meetingId, decisionId });
    return { success: true };
  }

  async createChecklistItem(user: AuthenticatedUser, meetingId: string, dto: CreateMeetingChecklistItemDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    this.assertCanCollaborate(user, meeting);
    if (dto.ownerId) await this.assertUserBelongsToTenant(user.tenantId, dto.ownerId);
    if (dto.taskId) await this.assertTaskBelongsToTenant(user.tenantId, dto.taskId);
    const created = await this.prisma.meetingChecklistItem.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        ownerId: dto.ownerId,
        title: dto.title.trim(),
        notes: dto.notes,
        taskId: dto.taskId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        sortOrder: dto.sortOrder,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: meetingChecklistSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.checklist_create', undefined, created, meta);
    this.emit(user.tenantId, meetingId, 'meeting.checklist.created', { meetingId, item: created });
    return created;
  }

  async updateChecklistItem(user: AuthenticatedUser, meetingId: string, itemId: string, dto: UpdateMeetingChecklistItemDto, meta: RequestMeta) {
    const before = await this.getChecklistItemOrThrow(user.tenantId, meetingId, itemId);
    if (dto.ownerId) await this.assertUserBelongsToTenant(user.tenantId, dto.ownerId);
    if (dto.taskId) await this.assertTaskBelongsToTenant(user.tenantId, dto.taskId);
    const updated = await this.prisma.meetingChecklistItem.update({
      where: { id: itemId },
      data: {
        title: dto.title?.trim(),
        notes: dto.notes,
        isDone: dto.isDone,
        ownerId: dto.ownerId,
        taskId: dto.taskId,
        dueAt: dto.dueAt === undefined ? undefined : dto.dueAt ? new Date(dto.dueAt) : null,
        sortOrder: dto.sortOrder,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: meetingChecklistSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.checklist_update', before, updated, meta);
    this.emit(user.tenantId, meetingId, 'meeting.checklist.updated', { meetingId, item: updated });
    return updated;
  }

  async deleteChecklistItem(user: AuthenticatedUser, meetingId: string, itemId: string, meta: RequestMeta) {
    const before = await this.getChecklistItemOrThrow(user.tenantId, meetingId, itemId);
    await this.prisma.meetingChecklistItem.delete({ where: { id: itemId } });
    await this.recordMeetingAction(user, meetingId, 'meeting.checklist_delete', before, { itemId }, meta);
    this.emit(user.tenantId, meetingId, 'meeting.checklist.deleted', { meetingId, itemId });
    return { success: true };
  }

  async updateAttendance(user: AuthenticatedUser, meetingId: string, attendeeId: string, dto: UpdateMeetingAttendanceDto, meta: RequestMeta) {
    const attendee = await this.prisma.meetingAttendee.findFirst({
      where: { id: attendeeId, tenantId: user.tenantId, meetingId },
      select: {
        id: true,
        userId: true,
        status: true,
        metadata: true
      }
    });
    if (!attendee) throw new NotFoundException('Meeting attendee not found');
    if (!this.canManageMeetings(user) && attendee.userId !== user.id) {
      throw new ForbiddenException('Cannot update attendance for this attendee');
    }

    const metadata = {
      ...this.asObject(attendee.metadata),
      ...dto.metadata,
      attendanceUpdatedAt: new Date().toISOString(),
      attendanceUpdatedById: user.id
    };
    const updated = await this.prisma.meetingAttendee.update({
      where: { id: attendeeId },
      data: {
        status: dto.status,
        responseNote: dto.responseNote,
        metadata: this.toJson(metadata)
      },
      select: meetingWorkspaceSelect.attendees.select
    });

    await this.recordMeetingAction(user, meetingId, 'meeting.attendance_update', attendee, updated, meta);
    this.emit(user.tenantId, meetingId, 'meeting.attendance.updated', { meetingId, attendee: updated });
    return updated;
  }

  async markNoShow(user: AuthenticatedUser, meetingId: string, meta: RequestMeta) {
    this.assertCanManageMeetings(user);
    const before = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.NO_SHOW },
      select: meetingWorkspaceSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.no_show', before, updated, meta);
    await this.meetingIntegrationsService.afterMeetingUpdated(user.tenantId, meetingId);
    this.emit(user.tenantId, meetingId, 'meeting.updated', { meetingId, meeting: updated });
    return updated;
  }

  async assignActionItem(user: AuthenticatedUser, meetingId: string, dto: AssignMeetingActionItemDto, meta: RequestMeta) {
    const meeting = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    this.assertCanManageTasksFromMeeting(user);
    const projectId = dto.projectId ?? meeting.projectId;
    if (!projectId) throw new BadRequestException('A project is required to create a task from a meeting action item');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: user.tenantId },
      select: { id: true, key: true, name: true }
    });
    if (!project) throw new NotFoundException('Project not found');
    if (dto.sprintId) await this.assertSprintBelongsToProject(project.id, dto.sprintId);
    if (dto.assigneeId) await this.assertUserBelongsToTenant(user.tenantId, dto.assigneeId);

    const task = await this.createTask(project, {
      tenantId: user.tenantId,
      projectId: project.id,
      sprintId: dto.sprintId ?? meeting.sprintId ?? undefined,
      reporterId: user.id,
      title: dto.title.trim(),
      description: this.actionDescription(meeting, dto),
      status: TaskStatus.TODO,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      type: dto.type ?? TaskType.TASK,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined
    });

    if (dto.assigneeId) {
      await this.prisma.taskAssignee.create({
        data: { taskId: task.id, userId: dto.assigneeId }
      });
    }

    await this.prisma.$transaction([
      this.prisma.meetingChecklistItem.create({
        data: {
          tenantId: user.tenantId,
          meetingId,
          ownerId: dto.assigneeId,
          title: dto.title.trim(),
          notes: dto.description,
          dueAt: dto.dueDate ? new Date(dto.dueDate) : undefined,
          taskId: task.id,
          metadata: this.toJson({ source: 'meeting_action_assignment', actionItemId: dto.actionItemId ?? null })
        }
      }),
      this.prisma.taskActivity.create({
        data: {
          taskId: task.id,
          actorId: user.id,
          action: 'task.created_from_meeting',
          newValue: this.toJson({ meetingId, actionItemId: dto.actionItemId ?? null })
        }
      })
    ]);

    const updatedSummary = this.markActionItemAssigned(meeting.aiSummary, dto.actionItemId, task.id);
    if (updatedSummary) {
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { aiSummary: this.toJson(updatedSummary) }
      });
    }

    await this.recordMeetingAction(user, meetingId, 'meeting.action_item_assign', undefined, {
      taskId: task.id,
      key: task.key,
      actionItemId: dto.actionItemId ?? null
    }, meta);
    this.emit(user.tenantId, meetingId, 'meeting.action_item.assigned', { meetingId, task });
    return { task, actionItemId: dto.actionItemId ?? null };
  }

  async sendFollowUp(user: AuthenticatedUser, meetingId: string, dto: SendMeetingFollowUpDto, meta: RequestMeta) {
    const meeting = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    this.assertCanManageMeetings(user);
    const channels = dto.channels?.length ? dto.channels : [MeetingReminderChannel.EMAIL];
    const recipients = dto.recipients?.length
      ? dto.recipients
      : meeting.attendees
          .map((attendee) => attendee.email ?? attendee.user?.email)
          .filter((email): email is string => Boolean(email));

    if (recipients.length === 0) {
      throw new BadRequestException('At least one recipient is required for meeting follow-up');
    }

    const created = await this.prisma.meetingReminder.createManyAndReturn({
      data: recipients.flatMap((destination) =>
        channels.map((channel) => ({
          tenantId: user.tenantId,
          meetingId,
          channel,
          offsetMinutes: 0,
          scheduledFor: new Date(),
          destination,
          templateKey: 'meeting_follow_up',
          status: MeetingReminderStatus.PENDING,
          payload: this.toJson({
            subject: dto.subject ?? `Follow-up: ${meeting.title}`,
            body: dto.body,
            includeActionItems: dto.includeActionItems ?? true,
            source: 'live_meeting_workspace'
          })
        }))
      )
    });

    const runtimeState = {
      ...this.runtimeState(meeting),
      followUp: {
        sentAt: new Date().toISOString(),
        sentById: user.id,
        channels,
        recipientCount: recipients.length,
        syncToOmoFlow: dto.syncToOmoFlow ?? false
      }
    };
    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { runtimeState: this.toJson(runtimeState) }
    });

    await this.meetingIntegrationsService.afterMeetingUpdated(user.tenantId, meetingId);
    await this.recordMeetingAction(user, meetingId, 'meeting.follow_up_queue', undefined, {
      reminderCount: created.length,
      channels,
      recipientCount: recipients.length,
      syncToOmoFlow: dto.syncToOmoFlow ?? false
    }, meta);
    this.emit(user.tenantId, meetingId, 'meeting.follow_up.queued', { meetingId, reminders: created });
    return { queued: created.length, reminders: created };
  }

  async syncOmoFlowRuntime(user: AuthenticatedUser, meetingId: string, dto: SyncMeetingRuntimeDto, meta: RequestMeta) {
    const meeting = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    this.assertCanManageMeetings(user);
    const runtimeState = {
      ...this.runtimeState(meeting),
      omoflow: {
        provider: dto.provider ?? 'omoflow',
        status: 'SYNC_REQUESTED',
        lastSyncRequestedAt: new Date().toISOString(),
        requestedById: user.id,
        payload: dto.payload ?? null
      }
    };
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { runtimeState: this.toJson(runtimeState) },
      select: meetingWorkspaceSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.omoflow_sync_request', meeting.runtimeState, runtimeState, meta);
    this.emit(user.tenantId, meetingId, 'meeting.omoflow.sync_requested', { meetingId, runtimeState });
    return { meeting: updated, runtimeState };
  }

  private async relatedTasks(user: AuthenticatedUser, meeting: MeetingWorkspaceRecord) {
    const or: Prisma.TaskWhereInput[] = [];
    if (meeting.taskId) or.push({ id: meeting.taskId });
    if (meeting.projectId) or.push({ projectId: meeting.projectId });
    if (meeting.sprintId) or.push({ sprintId: meeting.sprintId });
    if (or.length === 0) return [];
    return this.prisma.task.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        archivedAt: null,
        OR: or
      },
      select: taskSummarySelect,
      orderBy: [{ updatedAt: 'desc' }],
      take: 25
    });
  }

  private async getMeetingForRead(user: AuthenticatedUser, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: {
        id: meetingId,
        AND: [this.visibleMeetingWhere(user)]
      },
      select: meetingWorkspaceSelect
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  private async getTenantMeetingOrThrow(tenantId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, tenantId },
      select: meetingWorkspaceSelect
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  private visibleMeetingWhere(user: AuthenticatedUser): Prisma.MeetingWhereInput {
    if (this.canManageMeetings(user)) return { tenantId: user.tenantId };
    return {
      tenantId: user.tenantId,
      OR: [
        { visibility: { in: [Visibility.ORGANIZATION, Visibility.PUBLIC] } },
        { hostId: user.id },
        { createdById: user.id },
        { attendees: { some: { userId: user.id, status: { not: MeetingAttendeeStatus.REMOVED } } } }
      ]
    };
  }

  private assertCanCollaborate(user: AuthenticatedUser, meeting: MeetingWorkspaceRecord) {
    if (this.canManageMeetings(user) || meeting.hostId === user.id || meeting.createdById === user.id) return;
    if (meeting.attendees.some((attendee) => attendee.userId === user.id && attendee.status !== MeetingAttendeeStatus.REMOVED)) return;
    throw new ForbiddenException('Cannot collaborate in this meeting');
  }

  private assertCanManageMeetings(user: AuthenticatedUser) {
    if (this.canManageMeetings(user)) return;
    throw new ForbiddenException('Cannot manage meeting runtime');
  }

  private canManageMeetings(user: AuthenticatedUser) {
    return user.permissions.includes('manage:all') || user.permissions.includes('manage:meetings');
  }

  private assertCanManageTasksFromMeeting(user: AuthenticatedUser) {
    if (
      user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:tasks') ||
      user.permissions.includes('manage:projects') ||
      user.permissions.includes('manage:meetings')
    ) {
      return;
    }
    throw new ForbiddenException('Cannot create tasks from meeting action items');
  }

  private assertOwnerOrManager(user: AuthenticatedUser, ownerId: string, message: string) {
    if (this.canManageMeetings(user) || ownerId === user.id) return;
    throw new ForbiddenException(message);
  }

  private async getCommentOrThrow(tenantId: string, meetingId: string, commentId: string) {
    const comment = await this.prisma.meetingComment.findFirst({
      where: { id: commentId, tenantId, meetingId },
      select: meetingCommentSelect
    });
    if (!comment) throw new NotFoundException('Meeting comment not found');
    return comment;
  }

  private async getDecisionOrThrow(tenantId: string, meetingId: string, decisionId: string) {
    const decision = await this.prisma.meetingDecision.findFirst({
      where: { id: decisionId, tenantId, meetingId },
      select: meetingDecisionSelect
    });
    if (!decision) throw new NotFoundException('Meeting decision not found');
    return decision;
  }

  private async getChecklistItemOrThrow(tenantId: string, meetingId: string, itemId: string) {
    const item = await this.prisma.meetingChecklistItem.findFirst({
      where: { id: itemId, tenantId, meetingId },
      select: meetingChecklistSelect
    });
    if (!item) throw new NotFoundException('Meeting checklist item not found');
    return item;
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const exists = await this.prisma.user.count({ where: { id: userId, tenantId } });
    if (!exists) throw new NotFoundException('User not found');
  }

  private async assertTaskBelongsToTenant(tenantId: string, taskId: string) {
    const exists = await this.prisma.task.count({ where: { id: taskId, tenantId, deletedAt: null } });
    if (!exists) throw new NotFoundException('Task not found');
  }

  private async assertSprintBelongsToProject(projectId: string, sprintId: string) {
    const exists = await this.prisma.sprint.count({ where: { id: sprintId, projectId } });
    if (!exists) throw new BadRequestException('Sprint does not belong to the target project');
  }

  private async createTask(project: { id: string; key: string }, data: Omit<Prisma.TaskUncheckedCreateInput, 'key'>) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const count = await this.prisma.task.count({ where: { projectId: project.id } });
      const key = `${project.key.toUpperCase()}-${count + attempt + 1}`;
      try {
        return await this.prisma.task.create({
          data: { ...data, key },
          select: taskSummarySelect
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) throw error;
      }
    }
    throw new ConflictException('Could not generate a unique task key');
  }

  private isUniqueConstraintError(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
  }

  private actionDescription(meeting: MeetingWorkspaceRecord, dto: AssignMeetingActionItemDto) {
    return [
      dto.description,
      '',
      `Created from meeting: ${meeting.title}`,
      `Meeting ID: ${meeting.id}`,
      meeting.project ? `Project: ${meeting.project.key} - ${meeting.project.name}` : undefined,
      meeting.sprint ? `Sprint: ${meeting.sprint.name}` : undefined
    ].filter(Boolean).join('\n');
  }

  private markActionItemAssigned(aiSummary: Prisma.JsonValue | null, actionItemId: string | undefined, taskId: string) {
    if (!actionItemId || !aiSummary || typeof aiSummary !== 'object' || Array.isArray(aiSummary)) return null;
    const state = this.asObject(aiSummary);
    const actionItems = Array.isArray(state.actionItems) ? state.actionItems : [];
    const nextItems = actionItems.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const record = item as Record<string, unknown>;
      return record.id === actionItemId ? { ...record, status: 'ASSIGNED', taskId } : record;
    });
    return { ...state, actionItems: nextItems };
  }

  private metrics(
    meeting: MeetingWorkspaceRecord,
    decisions: Array<{ status: string }>,
    checklist: Array<{ isDone: boolean }>,
    relatedTasks: Array<{ status: TaskStatus }>,
    files: unknown[]
  ) {
    const present = meeting.attendees.filter((attendee) => attendee.status === MeetingAttendeeStatus.ATTENDED).length;
    const absent = meeting.attendees.filter((attendee) => attendee.status === MeetingAttendeeStatus.NO_SHOW).length;
    const doneChecklist = checklist.filter((item) => item.isDone).length;
    const doneTasks = relatedTasks.filter((task) => task.status === TaskStatus.DONE).length;
    return {
      attendees: meeting.attendees.length,
      present,
      absent,
      agendaItems: meeting.agendaItems.length,
      decisions: decisions.length,
      openDecisions: decisions.filter((decision) => decision.status === 'OPEN').length,
      checklist: checklist.length,
      checklistDone: doneChecklist,
      checklistProgress: checklist.length ? Math.round((doneChecklist / checklist.length) * 100) : 0,
      relatedTasks: relatedTasks.length,
      completedRelatedTasks: doneTasks,
      files: files.length,
      reminders: meeting.reminders.length
    };
  }

  private runtimeState(meeting: Pick<MeetingWorkspaceRecord, 'runtimeState'>) {
    return this.asObject(meeting.runtimeState);
  }

  private asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private async recordMeetingAction(
    user: AuthenticatedUser,
    meetingId: string,
    action: string,
    oldValue: unknown,
    newValue: unknown,
    meta: RequestMeta
  ) {
    await this.prisma.meetingActivity.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        actorId: user.id,
        action,
        oldValue: oldValue === undefined ? undefined : this.toJson(oldValue),
        newValue: newValue === undefined ? undefined : this.toJson(newValue)
      }
    });
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType: 'Meeting',
      entityId: meetingId,
      oldValue: oldValue === undefined ? undefined : this.toJson(oldValue),
      newValue: newValue === undefined ? undefined : this.toJson(newValue),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }

  private emit(tenantId: string, meetingId: string, event: string, payload: Record<string, unknown>) {
    void this.realtimeGateway.emitMeetingUpdated(tenantId, meetingId, event, payload);
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    if (value === null) {
      return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
    }
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new BadRequestException('Value must be JSON serializable');
    }
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  }
}
