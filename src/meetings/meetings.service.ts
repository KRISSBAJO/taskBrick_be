import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  MeetingAgendaStatus,
  MeetingApprovalStatus,
  MeetingAttendeeRole,
  MeetingAttendeeStatus,
  MeetingAvailabilityScope,
  BookingFormFieldType,
  BookingPageScope,
  BookingRequestStatus,
  BookingRoutingStrategy,
  MeetingLocationMode,
  MeetingReminderChannel,
  MeetingReminderStatus,
  MeetingStatus,
  MeetingTypeCategory,
  Prisma,
  Visibility
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RealtimeGateway } from '../collaboration/realtime.gateway';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddMeetingAttendeeDto,
  AvailabilityQueryDto,
  CancelMeetingDto,
  CreateAgendaItemDto,
  CreateAvailabilityWindowDto,
  CreateBlackoutWindowDto,
  CreateMeetingDto,
  CreateMeetingReminderDto,
  CreateMeetingTypeDto,
  MeetingQueryDto,
  MeetingTypeQueryDto,
  UpdateAgendaItemDto,
  UpdateAvailabilityWindowDto,
  UpdateMeetingAttendeeDto,
  UpdateMeetingDto,
  UpdateMeetingReminderDto,
  UpdateMeetingTypeDto
} from './dto/meeting.dto';
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

const meetingTypeSelect = {
  id: true,
  tenantId: true,
  createdById: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  color: true,
  icon: true,
  durationMins: true,
  bufferBeforeMins: true,
  bufferAfterMins: true,
  locationMode: true,
  defaultVisibility: true,
  requiresApproval: true,
  defaultAgenda: true,
  defaultReminderMins: true,
  isActive: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: userSummarySelect
  },
  _count: {
    select: {
      meetings: true
    }
  }
} satisfies Prisma.MeetingTypeSelect;

const attendeeSelect = {
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
} satisfies Prisma.MeetingAttendeeSelect;

const agendaItemSelect = {
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
  owner: {
    select: userSummarySelect
  }
} satisfies Prisma.MeetingAgendaItemSelect;

const reminderSelect = {
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
} satisfies Prisma.MeetingReminderSelect;

const activitySelect = {
  id: true,
  meetingId: true,
  actorId: true,
  action: true,
  oldValue: true,
  newValue: true,
  createdAt: true,
  actor: {
    select: userSummarySelect
  }
} satisfies Prisma.MeetingActivitySelect;

const meetingSelect = {
  id: true,
  tenantId: true,
  meetingTypeId: true,
  projectId: true,
  sprintId: true,
  taskId: true,
  teamId: true,
  hostId: true,
  createdById: true,
  approvedById: true,
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
  externalCalendarId: true,
  externalConferenceId: true,
  recurrenceRule: true,
  agendaLocked: true,
  aiEnabled: true,
  aiSummary: true,
  metadata: true,
  approvedAt: true,
  cancelledAt: true,
  cancelledReason: true,
  completedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  meetingType: {
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      color: true,
      durationMins: true,
      requiresApproval: true
    }
  },
  project: {
    select: {
      id: true,
      key: true,
      name: true,
      status: true
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
  createdBy: {
    select: userSummarySelect
  },
  approvedBy: {
    select: userSummarySelect
  },
  attendees: {
    select: attendeeSelect,
    orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }]
  },
  agendaItems: {
    select: agendaItemSelect,
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]
  },
  reminders: {
    select: reminderSelect,
    orderBy: [{ scheduledFor: 'asc' as const }]
  },
  _count: {
    select: {
      attendees: true,
      agendaItems: true,
      reminders: true,
      activities: true
    }
  }
} satisfies Prisma.MeetingSelect;

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly meetingIntegrationsService: MeetingIntegrationsService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  taxonomy() {
    return {
      statuses: Object.values(MeetingStatus),
      typeCategories: Object.values(MeetingTypeCategory),
      locationModes: Object.values(MeetingLocationMode),
      approvalStatuses: Object.values(MeetingApprovalStatus),
      attendeeRoles: Object.values(MeetingAttendeeRole),
      attendeeStatuses: Object.values(MeetingAttendeeStatus),
      agendaStatuses: Object.values(MeetingAgendaStatus),
      reminderChannels: Object.values(MeetingReminderChannel),
      reminderStatuses: Object.values(MeetingReminderStatus),
      availabilityScopes: Object.values(MeetingAvailabilityScope),
      bookingPageScopes: Object.values(BookingPageScope),
      bookingRoutingStrategies: Object.values(BookingRoutingStrategy),
      bookingFormFieldTypes: Object.values(BookingFormFieldType),
      bookingRequestStatuses: Object.values(BookingRequestStatus),
      visibility: Object.values(Visibility)
    };
  }

  async listMeetingTypes(user: AuthenticatedUser, query: MeetingTypeQueryDto) {
    const where: Prisma.MeetingTypeWhereInput = {
      tenantId: user.tenantId,
      category: query.category,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.meetingType.findMany({
        where,
        select: meetingTypeSelect,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.meetingType.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createMeetingType(user: AuthenticatedUser, dto: CreateMeetingTypeDto, meta: RequestMeta) {
    const slug = this.slugify(dto.slug || dto.name);
    await this.assertMeetingTypeSlugAvailable(user.tenantId, slug);

    const created = await this.prisma.meetingType.create({
      data: {
        tenantId: user.tenantId,
        createdById: user.id,
        name: dto.name.trim(),
        slug,
        description: dto.description,
        category: dto.category,
        color: dto.color,
        icon: dto.icon,
        durationMins: dto.durationMins,
        bufferBeforeMins: dto.bufferBeforeMins,
        bufferAfterMins: dto.bufferAfterMins,
        locationMode: dto.locationMode,
        defaultVisibility: dto.defaultVisibility,
        requiresApproval: dto.requiresApproval,
        defaultAgenda: dto.defaultAgenda ? this.toJsonValue(dto.defaultAgenda) : undefined,
        defaultReminderMins: dto.defaultReminderMins,
        isActive: dto.isActive
      },
      select: meetingTypeSelect
    });

    await this.recordTenantAudit(user, 'meeting_type.create', 'MeetingType', created.id, undefined, created, meta);
    return created;
  }

  async updateMeetingType(user: AuthenticatedUser, typeId: string, dto: UpdateMeetingTypeDto, meta: RequestMeta) {
    const before = await this.getMeetingTypeOrThrow(user.tenantId, typeId);
    const nextSlug = dto.slug ? this.slugify(dto.slug) : undefined;
    if (nextSlug && nextSlug !== before.slug) {
      await this.assertMeetingTypeSlugAvailable(user.tenantId, nextSlug);
    }

    const updated = await this.prisma.meetingType.update({
      where: { id: typeId },
      data: {
        name: dto.name?.trim(),
        slug: nextSlug,
        description: dto.description,
        category: dto.category,
        color: dto.color,
        icon: dto.icon,
        durationMins: dto.durationMins,
        bufferBeforeMins: dto.bufferBeforeMins,
        bufferAfterMins: dto.bufferAfterMins,
        locationMode: dto.locationMode,
        defaultVisibility: dto.defaultVisibility,
        requiresApproval: dto.requiresApproval,
        defaultAgenda: dto.defaultAgenda ? this.toJsonValue(dto.defaultAgenda) : undefined,
        defaultReminderMins: dto.defaultReminderMins,
        isActive: dto.isActive
      },
      select: meetingTypeSelect
    });

    await this.recordTenantAudit(user, 'meeting_type.update', 'MeetingType', typeId, before, updated, meta);
    return updated;
  }

  async listMeetings(user: AuthenticatedUser, query: MeetingQueryDto) {
    const where: Prisma.MeetingWhereInput = {
      AND: [
        this.visibleMeetingWhere(user),
        {
          projectId: query.projectId,
          taskId: query.taskId,
          teamId: query.teamId,
          hostId: query.hostId,
          meetingTypeId: query.meetingTypeId,
          status: query.status,
          archivedAt: query.includeArchived ? undefined : null,
          ...(query.from || query.to
            ? {
                startAt: {
                  gte: query.from ? new Date(query.from) : undefined,
                  lte: query.to ? new Date(query.to) : undefined
                }
              }
            : {}),
          ...(query.search
            ? {
                OR: [
                  { title: { contains: query.search, mode: 'insensitive' } },
                  { description: { contains: query.search, mode: 'insensitive' } },
                  { locationName: { contains: query.search, mode: 'insensitive' } }
                ]
              }
            : {})
        }
      ]
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.meeting.findMany({
        where,
        select: meetingSelect,
        orderBy: [{ startAt: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.meeting.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async getMeeting(user: AuthenticatedUser, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, AND: [this.visibleMeetingWhere(user)] },
      select: meetingSelect
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  async createMeeting(user: AuthenticatedUser, dto: CreateMeetingDto, meta: RequestMeta) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidMeetingWindow(startAt, endAt);

    const meetingType = dto.meetingTypeId
      ? await this.getMeetingTypeOrThrow(user.tenantId, dto.meetingTypeId)
      : null;
    const hostId = dto.hostId ?? user.id;
    await this.assertUserBelongsToTenant(user.tenantId, hostId);
    await this.assertLinkedRecords(user.tenantId, dto);

    const attendeeIds = this.uniqueStrings([...(dto.attendeeIds ?? []), hostId]);
    await Promise.all(attendeeIds.map((id) => this.assertUserBelongsToTenant(user.tenantId, id)));

    if (!dto.allowConflicts) {
      await this.assertNoConflicts(user.tenantId, startAt, endAt, this.uniqueStrings(attendeeIds), undefined);
    }

    const agendaTitles = this.resolveAgendaItems(dto, meetingType?.defaultAgenda);
    const reminderOffsets = dto.reminderOffsets ?? meetingType?.defaultReminderMins ?? [1440, 60];
    const approvalStatus = meetingType?.requiresApproval ? MeetingApprovalStatus.PENDING : MeetingApprovalStatus.NOT_REQUIRED;

    const created = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: {
          tenantId: user.tenantId,
          meetingTypeId: dto.meetingTypeId,
          projectId: dto.projectId,
          sprintId: dto.sprintId,
          taskId: dto.taskId,
          teamId: dto.teamId,
          hostId,
          createdById: user.id,
          title: dto.title.trim(),
          description: dto.description,
          visibility: dto.visibility ?? meetingType?.defaultVisibility ?? Visibility.TEAM,
          approvalStatus,
          startAt,
          endAt,
          timezone: dto.timezone ?? 'UTC',
          locationMode: dto.locationMode ?? meetingType?.locationMode ?? MeetingLocationMode.ONLINE,
          locationName: dto.locationName,
          meetingUrl: dto.meetingUrl,
          conferenceProvider: dto.conferenceProvider,
          clientName: dto.clientName,
          clientEmail: dto.clientEmail?.toLowerCase(),
          clientCompany: dto.clientCompany,
          recurrenceRule: dto.recurrenceRule,
          aiEnabled: dto.aiEnabled ?? true,
          metadata: dto.metadata ? this.toJsonValue(dto.metadata) : undefined
        }
      });

      await tx.meetingAttendee.createMany({
        data: [
          ...attendeeIds.map((attendeeId) => ({
            tenantId: user.tenantId,
            meetingId: meeting.id,
            userId: attendeeId,
            role: attendeeId === hostId ? MeetingAttendeeRole.HOST : MeetingAttendeeRole.REQUIRED,
            status: MeetingAttendeeStatus.INVITED
          })),
          ...(dto.externalAttendees ?? []).map((attendee) => ({
            tenantId: user.tenantId,
            meetingId: meeting.id,
            email: attendee.email.toLowerCase(),
            name: attendee.name,
            role: attendee.role ?? MeetingAttendeeRole.GUEST,
            status: MeetingAttendeeStatus.INVITED,
            isExternal: true
          }))
        ],
        skipDuplicates: true
      });

      if (agendaTitles.length > 0) {
        await tx.meetingAgendaItem.createMany({
          data: agendaTitles.map((item, index) => ({
            tenantId: user.tenantId,
            meetingId: meeting.id,
            title: item.title,
            notes: item.notes,
            durationMins: item.durationMins,
            sortOrder: item.sortOrder ?? index
          }))
        });
      }

      if (reminderOffsets.length > 0) {
        await tx.meetingReminder.createMany({
          data: this.uniqueNumbers(reminderOffsets).map((offset) => ({
            tenantId: user.tenantId,
            meetingId: meeting.id,
            channel: MeetingReminderChannel.IN_APP,
            offsetMinutes: offset,
            scheduledFor: this.reminderTime(startAt, offset),
            status: MeetingReminderStatus.PENDING
          }))
        });
      }

      await tx.meetingActivity.create({
        data: {
          tenantId: user.tenantId,
          meetingId: meeting.id,
          actorId: user.id,
          action: 'meeting.create',
          newValue: this.toJsonValue({ title: meeting.title, startAt, endAt, hostId })
        }
      });

      return tx.meeting.findUniqueOrThrow({ where: { id: meeting.id }, select: meetingSelect });
    });

    await this.recordTenantAudit(user, 'meeting.create', 'Meeting', created.id, undefined, created, meta);
    await this.meetingIntegrationsService.afterMeetingCreated(user.tenantId, created.id);
    this.emitMeeting(user.tenantId, created.id, 'meeting.created', { meetingId: created.id, meeting: created });
    return created;
  }

  async updateMeeting(user: AuthenticatedUser, meetingId: string, dto: UpdateMeetingDto, meta: RequestMeta) {
    const before = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    const nextStartAt = dto.startAt ? new Date(dto.startAt) : before.startAt;
    const nextEndAt = dto.endAt ? new Date(dto.endAt) : before.endAt;
    this.assertValidMeetingWindow(nextStartAt, nextEndAt);

    if (dto.meetingTypeId) await this.getMeetingTypeOrThrow(user.tenantId, dto.meetingTypeId);
    if (dto.hostId) await this.assertUserBelongsToTenant(user.tenantId, dto.hostId);
    await this.assertLinkedRecords(user.tenantId, dto);

    const participantIds = await this.participantIdsForMeeting(user.tenantId, meetingId, dto.hostId ?? before.hostId ?? undefined);
    if ((dto.startAt || dto.endAt || dto.hostId) && !dto.allowConflicts) {
      await this.assertNoConflicts(user.tenantId, nextStartAt, nextEndAt, participantIds, meetingId);
    }

    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        meetingTypeId: dto.meetingTypeId,
        projectId: dto.projectId,
        sprintId: dto.sprintId,
        taskId: dto.taskId,
        teamId: dto.teamId,
        hostId: dto.hostId,
        title: dto.title?.trim(),
        description: dto.description,
        status: dto.status,
        visibility: dto.visibility,
        approvalStatus: dto.approvalStatus,
        startAt: dto.startAt ? nextStartAt : undefined,
        endAt: dto.endAt ? nextEndAt : undefined,
        timezone: dto.timezone,
        locationMode: dto.locationMode,
        locationName: dto.locationName,
        meetingUrl: dto.meetingUrl,
        conferenceProvider: dto.conferenceProvider,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail === undefined ? undefined : dto.clientEmail?.toLowerCase() ?? null,
        clientCompany: dto.clientCompany,
        recurrenceRule: dto.recurrenceRule,
        aiEnabled: dto.aiEnabled,
        metadata: dto.metadata ? this.toJsonValue(dto.metadata) : undefined
      },
      select: meetingSelect
    });

    await this.recordMeetingAction(user, meetingId, 'meeting.update', before, updated, meta);
    await this.meetingIntegrationsService.afterMeetingUpdated(user.tenantId, meetingId);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.updated', { meetingId, meeting: updated });
    return updated;
  }

  async cancelMeeting(user: AuthenticatedUser, meetingId: string, dto: CancelMeetingDto, meta: RequestMeta) {
    const before = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledReason: dto.reason,
        reminders: {
          updateMany: {
            where: { status: { in: [MeetingReminderStatus.PENDING, MeetingReminderStatus.SCHEDULED] } },
            data: { status: MeetingReminderStatus.CANCELLED }
          }
        }
      },
      select: meetingSelect
    });

    await this.recordMeetingAction(user, meetingId, 'meeting.cancel', before, updated, meta);
    await this.meetingIntegrationsService.afterMeetingCancelled(user.tenantId, meetingId);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.updated', { meetingId, meeting: updated });
    return updated;
  }

  async startMeeting(user: AuthenticatedUser, meetingId: string, meta: RequestMeta) {
    const before = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.LIVE
      },
      select: meetingSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.start', before, updated, meta);
    await this.meetingIntegrationsService.afterMeetingStarted(user.tenantId, meetingId);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.updated', { meetingId, meeting: updated });
    return updated;
  }

  async completeMeeting(user: AuthenticatedUser, meetingId: string, meta: RequestMeta) {
    const before = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.COMPLETED,
        completedAt: new Date()
      },
      select: meetingSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.complete', before, updated, meta);
    await this.meetingIntegrationsService.afterMeetingCompleted(user.tenantId, meetingId);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.updated', { meetingId, meeting: updated });
    return updated;
  }

  async archiveMeeting(user: AuthenticatedUser, meetingId: string, meta: RequestMeta) {
    const before = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.ARCHIVED, archivedAt: new Date() },
      select: meetingSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.archive', before, updated, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.updated', { meetingId, meeting: updated });
    return updated;
  }

  async restoreMeeting(user: AuthenticatedUser, meetingId: string, meta: RequestMeta) {
    const before = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.SCHEDULED, archivedAt: null },
      select: meetingSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.restore', before, updated, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.updated', { meetingId, meeting: updated });
    return updated;
  }

  async checkConflicts(user: AuthenticatedUser, query: { startAt: string; endAt: string; hostId?: string; attendeeIds?: string }) {
    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);
    this.assertValidMeetingWindow(startAt, endAt);
    const participantIds = this.uniqueStrings([
      query.hostId ?? user.id,
      ...(query.attendeeIds ? query.attendeeIds.split(',').map((id) => id.trim()) : [])
    ]);
    await Promise.all(participantIds.map((id) => this.assertUserBelongsToTenant(user.tenantId, id)));
    return {
      participantIds,
      conflicts: await this.findConflicts(user.tenantId, startAt, endAt, participantIds)
    };
  }

  async listAttendees(user: AuthenticatedUser, meetingId: string) {
    await this.getMeeting(user, meetingId);
    return this.prisma.meetingAttendee.findMany({
      where: { tenantId: user.tenantId, meetingId },
      select: attendeeSelect,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
    });
  }

  async addAttendee(user: AuthenticatedUser, meetingId: string, dto: AddMeetingAttendeeDto, meta: RequestMeta) {
    await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    if (dto.userId) await this.assertUserBelongsToTenant(user.tenantId, dto.userId);

    const created = await this.prisma.meetingAttendee.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        userId: dto.userId,
        email: dto.email?.toLowerCase(),
        name: dto.name,
        role: dto.role ?? (dto.email ? MeetingAttendeeRole.GUEST : MeetingAttendeeRole.REQUIRED),
        isExternal: Boolean(dto.email && !dto.userId)
      },
      select: attendeeSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.attendee_add', undefined, created, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.attendee.created', { meetingId, attendee: created });
    return created;
  }

  async updateAttendee(user: AuthenticatedUser, meetingId: string, attendeeId: string, dto: UpdateMeetingAttendeeDto, meta: RequestMeta) {
    const before = await this.getAttendeeOrThrow(user.tenantId, meetingId, attendeeId);
    const updated = await this.prisma.meetingAttendee.update({
      where: { id: attendeeId },
      data: {
        role: dto.role,
        status: dto.status,
        responseNote: dto.responseNote
      },
      select: attendeeSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.attendee_update', before, updated, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.attendee.updated', { meetingId, attendee: updated });
    return updated;
  }

  async removeAttendee(user: AuthenticatedUser, meetingId: string, attendeeId: string, meta: RequestMeta) {
    const before = await this.getAttendeeOrThrow(user.tenantId, meetingId, attendeeId);
    await this.prisma.meetingAttendee.update({
      where: { id: attendeeId },
      data: { status: MeetingAttendeeStatus.REMOVED }
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.attendee_remove', before, { attendeeId }, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.attendee.removed', { meetingId, attendeeId });
    return { success: true };
  }

  async createAgendaItem(user: AuthenticatedUser, meetingId: string, dto: CreateAgendaItemDto, meta: RequestMeta) {
    await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    const created = await this.prisma.meetingAgendaItem.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        ownerId: user.id,
        title: dto.title,
        notes: dto.notes,
        durationMins: dto.durationMins,
        sortOrder: dto.sortOrder
      },
      select: agendaItemSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.agenda_add', undefined, created, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.agenda.created', { meetingId, item: created });
    return created;
  }

  async updateAgendaItem(user: AuthenticatedUser, meetingId: string, itemId: string, dto: UpdateAgendaItemDto, meta: RequestMeta) {
    const before = await this.getAgendaItemOrThrow(user.tenantId, meetingId, itemId);
    const updated = await this.prisma.meetingAgendaItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        notes: dto.notes,
        status: dto.status,
        durationMins: dto.durationMins,
        sortOrder: dto.sortOrder
      },
      select: agendaItemSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.agenda_update', before, updated, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.agenda.updated', { meetingId, item: updated });
    return updated;
  }

  async deleteAgendaItem(user: AuthenticatedUser, meetingId: string, itemId: string, meta: RequestMeta) {
    const before = await this.getAgendaItemOrThrow(user.tenantId, meetingId, itemId);
    await this.prisma.meetingAgendaItem.delete({ where: { id: itemId } });
    await this.recordMeetingAction(user, meetingId, 'meeting.agenda_delete', before, { itemId }, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.agenda.deleted', { meetingId, itemId });
    return { success: true };
  }

  async createReminder(user: AuthenticatedUser, meetingId: string, dto: CreateMeetingReminderDto, meta: RequestMeta) {
    const meeting = await this.getTenantMeetingOrThrow(user.tenantId, meetingId);
    if (dto.attendeeId) await this.getAttendeeOrThrow(user.tenantId, meetingId, dto.attendeeId);
    const created = await this.prisma.meetingReminder.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        attendeeId: dto.attendeeId,
        channel: dto.channel,
        offsetMinutes: dto.offsetMinutes,
        scheduledFor: this.reminderTime(meeting.startAt, dto.offsetMinutes),
        destination: dto.destination,
        templateKey: dto.templateKey
      },
      select: reminderSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.reminder_add', undefined, created, meta);
    await this.meetingIntegrationsService.afterMeetingUpdated(user.tenantId, meetingId);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.reminder.created', { meetingId, reminder: created });
    return created;
  }

  async updateReminder(user: AuthenticatedUser, meetingId: string, reminderId: string, dto: UpdateMeetingReminderDto, meta: RequestMeta) {
    const before = await this.getReminderOrThrow(user.tenantId, meetingId, reminderId);
    const updated = await this.prisma.meetingReminder.update({
      where: { id: reminderId },
      data: {
        status: dto.status,
        error: dto.error
      },
      select: reminderSelect
    });
    await this.recordMeetingAction(user, meetingId, 'meeting.reminder_update', before, updated, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.reminder.updated', { meetingId, reminder: updated });
    return updated;
  }

  async deleteReminder(user: AuthenticatedUser, meetingId: string, reminderId: string, meta: RequestMeta) {
    const before = await this.getReminderOrThrow(user.tenantId, meetingId, reminderId);
    await this.prisma.meetingReminder.delete({ where: { id: reminderId } });
    await this.recordMeetingAction(user, meetingId, 'meeting.reminder_delete', before, { reminderId }, meta);
    this.emitMeeting(user.tenantId, meetingId, 'meeting.reminder.deleted', { meetingId, reminderId });
    return { success: true };
  }

  async listActivity(user: AuthenticatedUser, meetingId: string) {
    await this.getMeeting(user, meetingId);
    return this.prisma.meetingActivity.findMany({
      where: { tenantId: user.tenantId, meetingId },
      select: activitySelect,
      orderBy: [{ createdAt: 'desc' }],
      take: 100
    });
  }

  async listAvailability(user: AuthenticatedUser, query: AvailabilityQueryDto) {
    const where = {
      tenantId: user.tenantId,
      ownerId: query.ownerId,
      teamId: query.teamId,
      scope: query.scope
    };
    const [windows, blackouts] = await this.prisma.$transaction([
      this.prisma.meetingAvailabilityWindow.findMany({
        where,
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      }),
      this.prisma.meetingBlackoutWindow.findMany({
        where: {
          tenantId: user.tenantId,
          ownerId: query.ownerId,
          teamId: query.teamId,
          endAt: { gte: new Date() }
        },
        orderBy: [{ startAt: 'asc' }],
        take: 100
      })
    ]);
    return { windows, blackouts };
  }

  async createAvailabilityWindow(user: AuthenticatedUser, dto: CreateAvailabilityWindowDto, meta: RequestMeta) {
    this.assertTimeString(dto.startTime, 'startTime');
    this.assertTimeString(dto.endTime, 'endTime');
    if (dto.ownerId) await this.assertUserBelongsToTenant(user.tenantId, dto.ownerId);
    if (dto.teamId) await this.assertTeamBelongsToTenant(user.tenantId, dto.teamId);
    const created = await this.prisma.meetingAvailabilityWindow.create({
      data: {
        tenantId: user.tenantId,
        ownerId: dto.ownerId ?? user.id,
        teamId: dto.teamId,
        scope: dto.scope ?? (dto.teamId ? MeetingAvailabilityScope.TEAM : MeetingAvailabilityScope.USER),
        label: dto.label,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timezone: dto.timezone ?? 'UTC',
        capacity: dto.capacity
      }
    });
    await this.recordTenantAudit(user, 'meeting.availability_create', 'MeetingAvailabilityWindow', created.id, undefined, created, meta);
    return created;
  }

  async updateAvailabilityWindow(user: AuthenticatedUser, windowId: string, dto: UpdateAvailabilityWindowDto, meta: RequestMeta) {
    const before = await this.getAvailabilityWindowOrThrow(user.tenantId, windowId);
    if (dto.startTime) this.assertTimeString(dto.startTime, 'startTime');
    if (dto.endTime) this.assertTimeString(dto.endTime, 'endTime');
    if (dto.ownerId) await this.assertUserBelongsToTenant(user.tenantId, dto.ownerId);
    if (dto.teamId) await this.assertTeamBelongsToTenant(user.tenantId, dto.teamId);
    const updated = await this.prisma.meetingAvailabilityWindow.update({
      where: { id: windowId },
      data: {
        ownerId: dto.ownerId,
        teamId: dto.teamId,
        scope: dto.scope,
        label: dto.label,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timezone: dto.timezone,
        capacity: dto.capacity,
        isActive: dto.isActive
      }
    });
    await this.recordTenantAudit(user, 'meeting.availability_update', 'MeetingAvailabilityWindow', windowId, before, updated, meta);
    return updated;
  }

  async deleteAvailabilityWindow(user: AuthenticatedUser, windowId: string, meta: RequestMeta) {
    const before = await this.getAvailabilityWindowOrThrow(user.tenantId, windowId);
    await this.prisma.meetingAvailabilityWindow.delete({ where: { id: windowId } });
    await this.recordTenantAudit(user, 'meeting.availability_delete', 'MeetingAvailabilityWindow', windowId, before, undefined, meta);
    return { success: true };
  }

  async createBlackoutWindow(user: AuthenticatedUser, dto: CreateBlackoutWindowDto, meta: RequestMeta) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidMeetingWindow(startAt, endAt);
    if (dto.ownerId) await this.assertUserBelongsToTenant(user.tenantId, dto.ownerId);
    if (dto.teamId) await this.assertTeamBelongsToTenant(user.tenantId, dto.teamId);
    const created = await this.prisma.meetingBlackoutWindow.create({
      data: {
        tenantId: user.tenantId,
        ownerId: dto.ownerId ?? user.id,
        teamId: dto.teamId,
        title: dto.title,
        reason: dto.reason,
        startAt,
        endAt,
        timezone: dto.timezone ?? 'UTC'
      }
    });
    await this.recordTenantAudit(user, 'meeting.blackout_create', 'MeetingBlackoutWindow', created.id, undefined, created, meta);
    return created;
  }

  async deleteBlackoutWindow(user: AuthenticatedUser, blackoutId: string, meta: RequestMeta) {
    const before = await this.prisma.meetingBlackoutWindow.findFirst({
      where: { id: blackoutId, tenantId: user.tenantId }
    });
    if (!before) throw new NotFoundException('Blackout window not found');
    await this.prisma.meetingBlackoutWindow.delete({ where: { id: blackoutId } });
    await this.recordTenantAudit(user, 'meeting.blackout_delete', 'MeetingBlackoutWindow', blackoutId, before, undefined, meta);
    return { success: true };
  }

  private visibleMeetingWhere(user: AuthenticatedUser): Prisma.MeetingWhereInput {
    if (this.canManageMeetings(user)) {
      return { tenantId: user.tenantId };
    }
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

  private canManageMeetings(user: AuthenticatedUser) {
    return user.permissions.includes('manage:all') || user.permissions.includes('manage:meetings');
  }

  private async getTenantMeetingOrThrow(tenantId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id: meetingId, tenantId }, select: meetingSelect });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  private async getMeetingTypeOrThrow(tenantId: string, typeId: string) {
    const type = await this.prisma.meetingType.findFirst({ where: { id: typeId, tenantId }, select: meetingTypeSelect });
    if (!type) throw new NotFoundException('Meeting type not found');
    return type;
  }

  private async assertMeetingTypeSlugAvailable(tenantId: string, slug: string) {
    const existing = await this.prisma.meetingType.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
    if (existing) throw new ConflictException('Meeting type slug already exists in this tenant');
  }

  private async assertLinkedRecords(
    tenantId: string,
    dto: { projectId?: string | null; sprintId?: string | null; taskId?: string | null; teamId?: string | null }
  ) {
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, tenantId }, select: { id: true } });
      if (!project) throw new NotFoundException('Project not found');
    }
    if (dto.sprintId) {
      const sprint = await this.prisma.sprint.findFirst({
        where: { id: dto.sprintId, project: { tenantId } },
        select: { id: true, projectId: true }
      });
      if (!sprint) throw new NotFoundException('Sprint not found');
      if (dto.projectId && sprint.projectId !== dto.projectId) {
        throw new BadRequestException('Sprint does not belong to the supplied project');
      }
    }
    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: dto.taskId, tenantId },
        select: { id: true, projectId: true, sprintId: true }
      });
      if (!task) throw new NotFoundException('Task not found');
      if (dto.projectId && task.projectId !== dto.projectId) {
        throw new BadRequestException('Task does not belong to the supplied project');
      }
      if (dto.sprintId && task.sprintId && task.sprintId !== dto.sprintId) {
        throw new BadRequestException('Task does not belong to the supplied sprint');
      }
    }
    if (dto.teamId) {
      await this.assertTeamBelongsToTenant(tenantId, dto.teamId);
    }
  }

  private async assertTeamBelongsToTenant(tenantId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, tenantId }, select: { id: true } });
    if (!team) throw new NotFoundException('Team not found');
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const member = await this.prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } });
    if (!member) throw new NotFoundException('User not found');
  }

  private async assertNoConflicts(tenantId: string, startAt: Date, endAt: Date, participantIds: string[], excludeMeetingId?: string) {
    const conflicts = await this.findConflicts(tenantId, startAt, endAt, participantIds, excludeMeetingId);
    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'One or more attendees already have a meeting in this time window',
        conflicts
      });
    }
  }

  private async findConflicts(tenantId: string, startAt: Date, endAt: Date, participantIds: string[], excludeMeetingId?: string) {
    if (participantIds.length === 0) return [];
    return this.prisma.meeting.findMany({
      where: {
        tenantId,
        id: excludeMeetingId ? { not: excludeMeetingId } : undefined,
        archivedAt: null,
        status: { notIn: [MeetingStatus.CANCELLED, MeetingStatus.ARCHIVED] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        OR: [
          { hostId: { in: participantIds } },
          { attendees: { some: { userId: { in: participantIds }, status: { not: MeetingAttendeeStatus.REMOVED } } } }
        ]
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        hostId: true,
        attendees: {
          where: { userId: { in: participantIds } },
          select: { userId: true, role: true, status: true }
        }
      },
      orderBy: [{ startAt: 'asc' }],
      take: 25
    });
  }

  private async participantIdsForMeeting(tenantId: string, meetingId: string, hostId?: string) {
    const attendees = await this.prisma.meetingAttendee.findMany({
      where: { tenantId, meetingId, userId: { not: null }, status: { not: MeetingAttendeeStatus.REMOVED } },
      select: { userId: true }
    });
    return this.uniqueStrings([hostId, ...attendees.map((attendee) => attendee.userId ?? undefined)]);
  }

  private async getAttendeeOrThrow(tenantId: string, meetingId: string, attendeeId: string) {
    const attendee = await this.prisma.meetingAttendee.findFirst({
      where: { id: attendeeId, tenantId, meetingId },
      select: attendeeSelect
    });
    if (!attendee) throw new NotFoundException('Meeting attendee not found');
    return attendee;
  }

  private async getAgendaItemOrThrow(tenantId: string, meetingId: string, itemId: string) {
    const item = await this.prisma.meetingAgendaItem.findFirst({
      where: { id: itemId, tenantId, meetingId },
      select: agendaItemSelect
    });
    if (!item) throw new NotFoundException('Agenda item not found');
    return item;
  }

  private async getReminderOrThrow(tenantId: string, meetingId: string, reminderId: string) {
    const reminder = await this.prisma.meetingReminder.findFirst({
      where: { id: reminderId, tenantId, meetingId },
      select: reminderSelect
    });
    if (!reminder) throw new NotFoundException('Reminder not found');
    return reminder;
  }

  private async getAvailabilityWindowOrThrow(tenantId: string, windowId: string) {
    const window = await this.prisma.meetingAvailabilityWindow.findFirst({ where: { id: windowId, tenantId } });
    if (!window) throw new NotFoundException('Availability window not found');
    return window;
  }

  private resolveAgendaItems(dto: CreateMeetingDto, defaultAgenda: Prisma.JsonValue | null | undefined) {
    if (dto.agendaItems?.length) return dto.agendaItems;
    if (Array.isArray(defaultAgenda)) {
      return defaultAgenda
        .filter((item): item is string => typeof item === 'string')
        .map((title, index) => ({ title, sortOrder: index }));
    }
    return [];
  }

  private assertValidMeetingWindow(startAt: Date, endAt: Date) {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Meeting start and end times must be valid dates');
    }
    if (endAt <= startAt) {
      throw new BadRequestException('Meeting end time must be after start time');
    }
  }

  private assertTimeString(value: string, field: string) {
    if (!/^\d{2}:\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must be in HH:mm format`);
    }
  }

  private reminderTime(startAt: Date, offsetMinutes: number) {
    return new Date(startAt.getTime() - offsetMinutes * 60_000);
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) throw new BadRequestException('Slug must contain at least one letter or number');
    return slug.slice(0, 120);
  }

  private uniqueStrings(values: Array<string | null | undefined>) {
    return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
  }

  private uniqueNumbers(values: number[]) {
    return [...new Set(values.filter((value) => Number.isInteger(value) && value >= 0))].sort((a, b) => b - a);
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
        oldValue: oldValue === undefined ? undefined : this.toJsonValue(oldValue),
        newValue: newValue === undefined ? undefined : this.toJsonValue(newValue)
      }
    });
    await this.recordTenantAudit(user, action, 'Meeting', meetingId, oldValue, newValue, meta);
  }

  private async recordTenantAudit(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: unknown,
    newValue: unknown,
    meta: RequestMeta
  ) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType,
      entityId,
      oldValue: oldValue === undefined ? undefined : this.toJsonValue(oldValue),
      newValue: newValue === undefined ? undefined : this.toJsonValue(newValue),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }

  private emitMeeting(tenantId: string, meetingId: string, event: string, payload: Record<string, unknown>) {
    this.realtimeGateway.emitMeetingUpdated(tenantId, meetingId, event, payload);
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null) {
      return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
    }
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new BadRequestException('Value must be JSON serializable');
    }
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  }

  private paginate<T>(data: T[], total: number, query: { page: number; limit: number }) {
    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }
}
