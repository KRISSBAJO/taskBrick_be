import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  IntegrationProvider,
  IntegrationStatus,
  MeetingReminderJobStatus,
  MeetingStatus,
  Prisma
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  MeetingAdminLogQueryDto,
  MeetingAdminRangeQueryDto,
  UpdateMeetingPolicyDto
} from './dto/meeting-admin.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const meetingPolicySelect = {
  id: true,
  tenantId: true,
  publicBookingEnabled: true,
  publicBookingCreatorPermissions: true,
  calendarConnectionPermissions: true,
  whatsappConnectionPermissions: true,
  defaultMeetingVisibility: true,
  allowExternalGuests: true,
  requireApprovalForExternalGuests: true,
  maxAdvanceBookingDays: true,
  minBookingNoticeMins: true,
  maxMeetingDurationMins: true,
  aiMeetingProcessingEnabled: true,
  policyConfig: true,
  updatedAt: true
} satisfies Prisma.MeetingIntegrationSettingsSelect;

@Injectable()
export class MeetingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async overview(user: AuthenticatedUser, query: MeetingAdminRangeQueryDto) {
    const [policy, analytics, integrationHealth, reminderDelivery, aiUsage, auditTrail] = await Promise.all([
      this.getPolicy(user),
      this.analytics(user, query),
      this.integrationHealth(user),
      this.reminderDelivery(user, query),
      this.aiUsage(user, query),
      this.auditTrail(user, { page: 1, limit: 8, from: query.from, to: query.to })
    ]);

    return {
      policy,
      permissions: this.permissionMatrix(user, policy),
      analytics,
      integrationHealth,
      reminderDelivery,
      aiUsage,
      recentAudit: auditTrail.data
    };
  }

  async getPolicy(user: AuthenticatedUser) {
    return this.ensurePolicy(user.tenantId);
  }

  async updatePolicy(user: AuthenticatedUser, dto: UpdateMeetingPolicyDto, meta: RequestMeta) {
    this.assertCanManageMeetingPolicy(user);
    const before = await this.ensurePolicy(user.tenantId);
    if (dto.minBookingNoticeMins !== undefined && dto.maxAdvanceBookingDays !== undefined) {
      const maxAdvanceMins = dto.maxAdvanceBookingDays * 24 * 60;
      if (dto.minBookingNoticeMins >= maxAdvanceMins) {
        throw new BadRequestException('Minimum notice must be less than the maximum advance booking window');
      }
    }

    const updated = await this.prisma.meetingIntegrationSettings.update({
      where: { tenantId: user.tenantId },
      data: {
        publicBookingEnabled: dto.publicBookingEnabled,
        publicBookingCreatorPermissions: dto.publicBookingCreatorPermissions
          ? this.uniquePermissions(dto.publicBookingCreatorPermissions)
          : undefined,
        calendarConnectionPermissions: dto.calendarConnectionPermissions
          ? this.uniquePermissions(dto.calendarConnectionPermissions)
          : undefined,
        whatsappConnectionPermissions: dto.whatsappConnectionPermissions
          ? this.uniquePermissions(dto.whatsappConnectionPermissions)
          : undefined,
        defaultMeetingVisibility: dto.defaultMeetingVisibility,
        allowExternalGuests: dto.allowExternalGuests,
        requireApprovalForExternalGuests: dto.requireApprovalForExternalGuests,
        maxAdvanceBookingDays: dto.maxAdvanceBookingDays,
        minBookingNoticeMins: dto.minBookingNoticeMins,
        maxMeetingDurationMins: dto.maxMeetingDurationMins,
        aiMeetingProcessingEnabled: dto.aiMeetingProcessingEnabled,
        policyConfig:
          dto.policyConfig === null
            ? Prisma.JsonNull
            : dto.policyConfig
              ? this.toJsonValue(dto.policyConfig)
              : undefined
      },
      select: meetingPolicySelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'meeting_policy.update',
      entityType: 'MeetingIntegrationSettings',
      entityId: updated.id,
      oldValue: this.toJsonValue(before),
      newValue: this.toJsonValue(updated),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return updated;
  }

  async analytics(user: AuthenticatedUser, query: MeetingAdminRangeQueryDto) {
    const where = this.meetingWhere(user.tenantId, query);
    const [statusCounts, meetings, convertedActionItems, totalActionItems, overdueFollowUps, bookingRequests] =
      await this.prisma.$transaction([
        this.prisma.meeting.groupBy({
          by: ['status'],
          where,
          _count: { _all: true }
        }),
        this.prisma.meeting.findMany({
          where,
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            hostId: true,
            host: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        }),
        this.prisma.meetingChecklistItem.count({
          where: {
            tenantId: user.tenantId,
            taskId: { not: null },
            createdAt: this.dateFilter(query.from, query.to)
          }
        }),
        this.prisma.meetingChecklistItem.count({
          where: {
            tenantId: user.tenantId,
            createdAt: this.dateFilter(query.from, query.to)
          }
        }),
        this.prisma.meetingChecklistItem.count({
          where: {
            tenantId: user.tenantId,
            isDone: false,
            dueAt: { lt: new Date() }
          }
        }),
        this.prisma.bookingRequest.groupBy({
          by: ['status'],
          where: {
            tenantId: user.tenantId,
            createdAt: this.dateFilter(query.from, query.to)
          },
          _count: { _all: true }
        })
      ]);

    const byStatus = this.groupCounts(statusCounts);
    const booked = meetings.length;
    const completed = byStatus[MeetingStatus.COMPLETED] ?? 0;
    const cancelled = byStatus[MeetingStatus.CANCELLED] ?? 0;
    const noShows = byStatus[MeetingStatus.NO_SHOW] ?? 0;
    const hostUtilization = this.hostUtilization(meetings);

    return {
      range: this.rangeLabel(query),
      totals: {
        booked,
        completed,
        noShows,
        cancelled,
        live: byStatus[MeetingStatus.LIVE] ?? 0,
        scheduled: byStatus[MeetingStatus.SCHEDULED] ?? 0,
        completionRate: this.percent(completed, booked),
        noShowRate: this.percent(noShows, booked),
        cancellationRate: this.percent(cancelled, booked),
        meetingToTaskConversion: this.percent(convertedActionItems, totalActionItems),
        convertedActionItems,
        totalActionItems,
        overdueFollowUps
      },
      byStatus,
      bookings: this.groupCounts(bookingRequests),
      hostUtilization
    };
  }

  async reminderDelivery(user: AuthenticatedUser, query: MeetingAdminRangeQueryDto) {
    const where: Prisma.MeetingReminderJobWhereInput = {
      tenantId: user.tenantId,
      scheduledFor: this.dateFilter(query.from, query.to)
    };
    const [byStatus, byChannel, failedRecent] = await this.prisma.$transaction([
      this.prisma.meetingReminderJob.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.meetingReminderJob.groupBy({ by: ['channel'], where, _count: { _all: true } }),
      this.prisma.meetingReminderJob.findMany({
        where: {
          ...where,
          status: { in: [MeetingReminderJobStatus.FAILED, MeetingReminderJobStatus.DEAD_LETTER] }
        },
        select: {
          id: true,
          channel: true,
          provider: true,
          status: true,
          attempts: true,
          scheduledFor: true,
          failedAt: true,
          deadLetterAt: true,
          lastError: true,
          meeting: { select: { id: true, title: true, startAt: true, status: true } }
        },
        orderBy: [{ failedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 8
      })
    ]);

    return {
      byStatus: this.groupCounts(byStatus),
      byChannel: this.groupCounts(byChannel),
      failedRecent
    };
  }

  async reminderLogs(user: AuthenticatedUser, query: MeetingAdminLogQueryDto) {
    const where: Prisma.MeetingReminderJobWhereInput = {
      tenantId: user.tenantId,
      meetingId: query.meetingId,
      status: query.status,
      channel: query.channel,
      scheduledFor: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { provider: { contains: query.search, mode: 'insensitive' } },
              { destination: { contains: query.search, mode: 'insensitive' } },
              { lastError: { contains: query.search, mode: 'insensitive' } },
              { meeting: { title: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.meetingReminderJob.findMany({
        where,
        select: {
          id: true,
          channel: true,
          provider: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          scheduledFor: true,
          nextAttemptAt: true,
          sentAt: true,
          failedAt: true,
          deadLetterAt: true,
          lastError: true,
          meeting: {
            select: {
              id: true,
              title: true,
              status: true,
              startAt: true,
              host: { select: { id: true, email: true, firstName: true, lastName: true } }
            }
          }
        },
        orderBy: [{ scheduledFor: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.meetingReminderJob.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async integrationHealth(user: AuthenticatedUser) {
    const [settings, integrations, queue, latestWebhookErrors] = await Promise.all([
      this.ensurePolicy(user.tenantId),
      this.prisma.integration.findMany({
        where: {
          tenantId: user.tenantId,
          provider: {
            in: [
              IntegrationProvider.GOOGLE,
              IntegrationProvider.MICROSOFT,
              IntegrationProvider.TEAMS,
              IntegrationProvider.ZOOM,
              IntegrationProvider.WHATSAPP,
              IntegrationProvider.EMAIL,
              IntegrationProvider.SMS,
              IntegrationProvider.CUSTOM
            ]
          }
        },
        select: {
          id: true,
          provider: true,
          name: true,
          status: true,
          enabled: true,
          scopes: true,
          updatedAt: true
        },
        orderBy: [{ updatedAt: 'desc' }]
      }),
      this.prisma.meetingReminderJob.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId },
        _count: { _all: true }
      }),
      this.prisma.webhookDelivery.findMany({
        where: {
          tenantId: user.tenantId,
          status: 'FAILED'
        },
        select: {
          id: true,
          eventType: true,
          status: true,
          attempts: true,
          responseStatus: true,
          lastError: true,
          createdAt: true,
          webhook: { select: { id: true, name: true, enabled: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 8
      })
    ]);

    const active = integrations.filter((item) => item.enabled && item.status === IntegrationStatus.ACTIVE);
    return {
      settings,
      providers: {
        google: this.providerReadiness(active, [IntegrationProvider.GOOGLE]),
        microsoft: this.providerReadiness(active, [IntegrationProvider.MICROSOFT, IntegrationProvider.TEAMS]),
        zoom: this.providerReadiness(active, [IntegrationProvider.ZOOM]),
        whatsapp: this.providerReadiness(active, [IntegrationProvider.WHATSAPP]),
        email: this.providerReadiness(active, [IntegrationProvider.EMAIL]),
        sms: this.providerReadiness(active, [IntegrationProvider.SMS]),
        custom: this.providerReadiness(active, [IntegrationProvider.CUSTOM])
      },
      queue: this.groupCounts(queue),
      webhookErrors: latestWebhookErrors
    };
  }

  async aiUsage(user: AuthenticatedUser, query: MeetingAdminRangeQueryDto) {
    const where: Prisma.AiUsageLogWhereInput = {
      tenantId: user.tenantId,
      requestType: { startsWith: 'meeting.', mode: 'insensitive' },
      createdAt: this.dateFilter(query.from, query.to)
    };
    const [totals, byType, recentFailures] = await this.prisma.$transaction([
      this.prisma.aiUsageLog.aggregate({
        where,
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true, totalTokens: true, estimatedCost: true }
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['requestType', 'status'],
        where,
        _count: { _all: true },
        _sum: { totalTokens: true, estimatedCost: true }
      }),
      this.prisma.aiUsageLog.findMany({
        where: { ...where, error: { not: null } },
        select: {
          id: true,
          provider: true,
          model: true,
          status: true,
          requestType: true,
          error: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 8
      })
    ]);

    return {
      totals: {
        requests: totals._count._all,
        inputTokens: totals._sum.inputTokens ?? 0,
        outputTokens: totals._sum.outputTokens ?? 0,
        totalTokens: totals._sum.totalTokens ?? 0,
        estimatedCost: Number(totals._sum.estimatedCost ?? 0)
      },
      byType: byType.map((item) => ({
        requestType: item.requestType ?? 'unknown',
        status: item.status,
        requests: item._count._all,
        totalTokens: item._sum.totalTokens ?? 0,
        estimatedCost: Number(item._sum.estimatedCost ?? 0)
      })),
      recentFailures
    };
  }

  async auditTrail(user: AuthenticatedUser, query: MeetingAdminLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: user.tenantId,
      createdAt: this.dateFilter(query.from, query.to),
      OR: [
        { entityType: { in: ['Meeting', 'BookingPage', 'BookingRequest', 'MeetingIntegrationSettings'] } },
        { action: { startsWith: 'meeting_', mode: 'insensitive' } },
        { action: { startsWith: 'meeting.', mode: 'insensitive' } },
        { action: { startsWith: 'booking_', mode: 'insensitive' } },
        { action: { startsWith: 'booking.', mode: 'insensitive' } }
      ],
      ...(query.search
        ? {
            AND: [
              {
                OR: [
                  { action: { contains: query.search, mode: 'insensitive' } },
                  { entityType: { contains: query.search, mode: 'insensitive' } },
                  { entityId: { contains: query.search, mode: 'insensitive' } }
                ]
              }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.auditLog.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  private async ensurePolicy(tenantId: string) {
    return this.prisma.meetingIntegrationSettings.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
      select: meetingPolicySelect
    });
  }

  private meetingWhere(tenantId: string, query: MeetingAdminRangeQueryDto): Prisma.MeetingWhereInput {
    return {
      tenantId,
      archivedAt: null,
      hostId: query.hostId,
      projectId: query.projectId,
      status: query.status,
      startAt: this.dateFilter(query.from, query.to)
    };
  }

  private hostUtilization(
    meetings: Array<{
      status: MeetingStatus;
      startAt: Date;
      endAt: Date;
      hostId: string | null;
      host: { id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
    }>
  ) {
    const byHost = new Map<
      string,
      {
        host: { id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
        meetings: number;
        completed: number;
        minutes: number;
      }
    >();
    for (const meeting of meetings) {
      const key = meeting.hostId ?? 'unassigned';
      const existing = byHost.get(key) ?? { host: meeting.host, meetings: 0, completed: 0, minutes: 0 };
      existing.meetings += 1;
      existing.completed += meeting.status === MeetingStatus.COMPLETED ? 1 : 0;
      existing.minutes += Math.max(0, Math.round((meeting.endAt.getTime() - meeting.startAt.getTime()) / 60000));
      byHost.set(key, existing);
    }
    return [...byHost.entries()]
      .map(([hostId, value]) => ({
        hostId,
        host: value.host,
        meetings: value.meetings,
        completed: value.completed,
        hours: Math.round((value.minutes / 60) * 10) / 10,
        completionRate: this.percent(value.completed, value.meetings)
      }))
      .sort((a, b) => b.meetings - a.meetings)
      .slice(0, 12);
  }

  private permissionMatrix(
    user: AuthenticatedUser,
    policy: Prisma.MeetingIntegrationSettingsGetPayload<{ select: typeof meetingPolicySelect }>
  ) {
    return {
      canManagePolicy: this.can(user, ['manage:all', 'manage:tenant', 'manage:meetings']),
      canCreateBookingLinks: this.can(user, ['manage:all', ...policy.publicBookingCreatorPermissions]),
      canConnectCalendar: this.can(user, ['manage:all', ...policy.calendarConnectionPermissions]),
      canConnectWhatsApp: this.can(user, ['manage:all', ...policy.whatsappConnectionPermissions]),
      canUseMeetingAi: policy.aiMeetingProcessingEnabled && this.can(user, ['manage:all', 'manage:ai', 'manage:meetings', 'read:ai'])
    };
  }

  private providerReadiness(
    integrations: Array<{ provider: IntegrationProvider; id: string; name: string; scopes: string[]; updatedAt: Date }>,
    providers: IntegrationProvider[]
  ) {
    const integration = integrations.find((item) => providers.includes(item.provider));
    return {
      connected: Boolean(integration),
      integrationId: integration?.id,
      name: integration?.name,
      scopes: integration?.scopes ?? [],
      updatedAt: integration?.updatedAt ?? null
    };
  }

  private assertCanManageMeetingPolicy(user: AuthenticatedUser) {
    if (this.can(user, ['manage:all', 'manage:tenant', 'manage:meetings'])) return;
    throw new ForbiddenException('Cannot manage tenant meeting policy');
  }

  private can(user: AuthenticatedUser, permissions: string[]) {
    return permissions.some((permission) => user.permissions.includes(permission));
  }

  private uniquePermissions(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private groupCounts<T extends Record<string, unknown>>(rows: Array<T & { _count: { _all: number } }>) {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const [key] = Object.values(row);
      if (typeof key === 'string') counts[key] = row._count._all;
    }
    return counts;
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private rangeLabel(query: MeetingAdminRangeQueryDto) {
    return {
      from: query.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: query.to ?? new Date().toISOString()
    };
  }

  private percent(part: number, total: number) {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10;
  }

  private skip(query: PaginationQueryDto) {
    return (query.page - 1) * query.limit;
  }

  private paginate<T>(data: T[], total: number, query: PaginationQueryDto) {
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    const serialized = JSON.stringify(value ?? null);
    if (serialized === undefined) throw new BadRequestException('Value must be JSON serializable');
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  }
}
