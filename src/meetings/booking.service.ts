import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  BookingRequestStatus,
  BookingRoutingStrategy,
  MeetingApprovalStatus,
  MeetingAttendeeRole,
  MeetingAttendeeStatus,
  MeetingAvailabilityScope,
  MeetingReminderChannel,
  MeetingReminderStatus,
  MeetingStatus,
  Prisma,
  TenantStatus,
  UserStatus
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingPageQueryDto,
  CancelPublicBookingDto,
  CreateBookingFormFieldDto,
  CreateBookingPageDto,
  CreatePublicBookingDto,
  PublicBookingPageQueryDto,
  PublicBookingSlotsQueryDto,
  ReschedulePublicBookingDto,
  UpdateBookingFormFieldDto,
  UpdateBookingPageDto
} from './dto/booking.dto';
import { MeetingIntegrationsService } from './meeting-integrations.service';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

type BookingPageWithRelations = Prisma.BookingPageGetPayload<{
  include: typeof bookingPageInclude;
}>;

type HostCandidate = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  timezone: string | null;
  priority: number;
  load: number;
};

type PublicSlot = {
  startAt: string;
  endAt: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl: string | null;
  routingStrategy: BookingRoutingStrategy;
};

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  timezone: true,
  status: true
} satisfies Prisma.UserSelect;

const bookingFieldSelect = {
  id: true,
  tenantId: true,
  pageId: true,
  fieldKey: true,
  label: true,
  type: true,
  required: true,
  placeholder: true,
  helpText: true,
  options: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.BookingFormFieldSelect;

const bookingPageInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      website: true,
      status: true
    }
  },
  meetingType: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      durationMins: true,
      bufferBeforeMins: true,
      bufferAfterMins: true,
      locationMode: true,
      requiresApproval: true,
      defaultAgenda: true,
      defaultReminderMins: true,
      isActive: true
    }
  },
  team: {
    select: {
      id: true,
      name: true,
      description: true,
      members: {
        select: {
          role: true,
          user: {
            select: publicUserSelect
          }
        }
      }
    }
  },
  owner: {
    select: publicUserSelect
  },
  createdBy: {
    select: publicUserSelect
  },
  fields: {
    select: bookingFieldSelect,
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]
  },
  _count: {
    select: {
      requests: true,
      fields: true
    }
  }
} satisfies Prisma.BookingPageInclude;

const bookingRequestInclude = {
  page: {
    select: {
      id: true,
      path: true,
      title: true,
      allowCancel: true,
      allowReschedule: true
    }
  },
  meeting: {
    select: {
      id: true,
      title: true,
      status: true,
      approvalStatus: true,
      startAt: true,
      endAt: true
    }
  },
  host: {
    select: publicUserSelect
  },
  meetingType: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  team: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.BookingRequestInclude;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly meetingIntegrationsService: MeetingIntegrationsService
  ) {}

  async listPages(user: AuthenticatedUser, query: BookingPageQueryDto) {
    const where: Prisma.BookingPageWhereInput = {
      tenantId: user.tenantId,
      scope: query.scope,
      routingStrategy: query.routingStrategy,
      meetingTypeId: query.meetingTypeId,
      teamId: query.teamId,
      ownerId: query.ownerId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { path: { contains: query.search, mode: 'insensitive' } },
              { subtitle: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.bookingPage.findMany({
        where,
        include: bookingPageInclude,
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.bookingPage.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async getPage(user: AuthenticatedUser, pageId: string) {
    const page = await this.prisma.bookingPage.findFirst({
      where: { id: pageId, tenantId: user.tenantId },
      include: bookingPageInclude
    });
    if (!page) throw new NotFoundException('Booking page not found');
    return page;
  }

  async createPage(user: AuthenticatedUser, dto: CreateBookingPageDto, meta: RequestMeta) {
    await this.meetingIntegrationsService.assertCanCreatePublicBookingPage(user);
    const path = this.normalizePath(dto.path);
    await this.assertBookingPathAvailable(user.tenantId, path);
    await this.assertBookingReferences(user.tenantId, dto);

    const created = await this.prisma.$transaction(async (tx) => {
      const page = await tx.bookingPage.create({
        data: this.bookingPageCreateData(user, dto, path)
      });

      if (dto.fields?.length) {
        await tx.bookingFormField.createMany({
          data: dto.fields.map((field, index) => ({
            tenantId: user.tenantId,
            pageId: page.id,
            fieldKey: this.normalizeFieldKey(field.fieldKey),
            label: field.label.trim(),
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            helpText: field.helpText,
            options: field.options ? this.toJsonValue(field.options) : undefined,
            sortOrder: field.sortOrder ?? index
          })),
          skipDuplicates: true
        });
      }

      return tx.bookingPage.findUniqueOrThrow({ where: { id: page.id }, include: bookingPageInclude });
    });

    await this.recordTenantAudit(user, 'booking_page.create', 'BookingPage', created.id, undefined, created, meta);
    return created;
  }

  async updatePage(user: AuthenticatedUser, pageId: string, dto: UpdateBookingPageDto, meta: RequestMeta) {
    const before = await this.getPage(user, pageId);
    const nextPath = dto.path ? this.normalizePath(dto.path) : undefined;
    if (nextPath && nextPath !== before.path) await this.assertBookingPathAvailable(user.tenantId, nextPath);
    await this.assertBookingReferences(user.tenantId, dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.bookingPage.update({
        where: { id: pageId },
        data: this.bookingPageUpdateData(dto, nextPath)
      });

      if (dto.fields) {
        await tx.bookingFormField.deleteMany({ where: { tenantId: user.tenantId, pageId } });
        if (dto.fields.length) {
          await tx.bookingFormField.createMany({
            data: dto.fields.map((field, index) => ({
              tenantId: user.tenantId,
              pageId,
              fieldKey: this.normalizeFieldKey(field.fieldKey),
              label: field.label.trim(),
              type: field.type,
              required: field.required,
              placeholder: field.placeholder,
              helpText: field.helpText,
              options: field.options ? this.toJsonValue(field.options) : undefined,
              sortOrder: field.sortOrder ?? index
            })),
            skipDuplicates: true
          });
        }
      }

      return tx.bookingPage.findUniqueOrThrow({ where: { id: pageId }, include: bookingPageInclude });
    });

    await this.recordTenantAudit(user, 'booking_page.update', 'BookingPage', pageId, before, updated, meta);
    return updated;
  }

  async createField(user: AuthenticatedUser, pageId: string, dto: CreateBookingFormFieldDto, meta: RequestMeta) {
    await this.getPage(user, pageId);
    const created = await this.prisma.bookingFormField.create({
      data: {
        tenantId: user.tenantId,
        pageId,
        fieldKey: this.normalizeFieldKey(dto.fieldKey),
        label: dto.label.trim(),
        type: dto.type,
        required: dto.required,
        placeholder: dto.placeholder,
        helpText: dto.helpText,
        options: dto.options ? this.toJsonValue(dto.options) : undefined,
        sortOrder: dto.sortOrder
      },
      select: bookingFieldSelect
    });
    await this.recordTenantAudit(user, 'booking_page.field_create', 'BookingFormField', created.id, undefined, created, meta);
    return created;
  }

  async updateField(user: AuthenticatedUser, pageId: string, fieldId: string, dto: UpdateBookingFormFieldDto, meta: RequestMeta) {
    await this.getPage(user, pageId);
    const before = await this.getFieldOrThrow(user.tenantId, pageId, fieldId);
    const updated = await this.prisma.bookingFormField.update({
      where: { id: fieldId },
      data: {
        fieldKey: dto.fieldKey ? this.normalizeFieldKey(dto.fieldKey) : undefined,
        label: dto.label?.trim(),
        type: dto.type,
        required: dto.required,
        placeholder: dto.placeholder,
        helpText: dto.helpText,
        options: dto.options === null ? Prisma.JsonNull : dto.options ? this.toJsonValue(dto.options) : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive
      },
      select: bookingFieldSelect
    });
    await this.recordTenantAudit(user, 'booking_page.field_update', 'BookingFormField', fieldId, before, updated, meta);
    return updated;
  }

  async deleteField(user: AuthenticatedUser, pageId: string, fieldId: string, meta: RequestMeta) {
    await this.getPage(user, pageId);
    const before = await this.getFieldOrThrow(user.tenantId, pageId, fieldId);
    await this.prisma.bookingFormField.delete({ where: { id: fieldId } });
    await this.recordTenantAudit(user, 'booking_page.field_delete', 'BookingFormField', fieldId, before, { fieldId }, meta);
    return { success: true };
  }

  async listRequests(user: AuthenticatedUser, query: BookingPageQueryDto) {
    const where: Prisma.BookingRequestWhereInput = {
      tenantId: user.tenantId,
      page: {
        scope: query.scope,
        routingStrategy: query.routingStrategy,
        meetingTypeId: query.meetingTypeId,
        teamId: query.teamId,
        ownerId: query.ownerId
      },
      ...(query.search
        ? {
            OR: [
              { guestName: { contains: query.search, mode: 'insensitive' } },
              { guestEmail: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.bookingRequest.findMany({
        where,
        include: bookingRequestInclude,
        orderBy: [{ startAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.bookingRequest.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async resolvePublicPage(tenantSlug: string, query: PublicBookingPageQueryDto) {
    const page = await this.getPublicPage(tenantSlug, query.path);
    const hosts = await this.resolveHostCandidates(page, new Date(), new Date(Date.now() + 30 * 24 * 60 * 60_000));
    return this.toPublicPage(page, hosts);
  }

  async listPublicSlots(tenantSlug: string, query: PublicBookingSlotsQueryDto) {
    const page = await this.getPublicPage(tenantSlug, query.path);
    const now = new Date();
    const from = query.from ? new Date(query.from) : now;
    const to = query.to ? new Date(query.to) : new Date(from.getTime() + 14 * 24 * 60 * 60_000);
    return {
      page: { id: page.id, path: page.path, title: page.title, timezone: page.timezone },
      slots: await this.availableSlotsForPage(page, from, to)
    };
  }

  async createPublicBooking(tenantSlug: string, dto: CreatePublicBookingDto, meta: RequestMeta) {
    const page = await this.getPublicPage(tenantSlug, dto.path);
    const policy = await this.getTenantMeetingPolicy(page.tenantId);
    if (!policy.allowExternalGuests) {
      throw new BadRequestException('External guest booking is disabled for this tenant');
    }
    this.assertIntakeResponses(page, dto.intakeResponses ?? []);

    const startAt = new Date(dto.startAt);
    const durationMins = this.durationForPage(page);
    const endAt = new Date(startAt.getTime() + durationMins * 60_000);
    if (durationMins > policy.maxMeetingDurationMins) {
      throw new BadRequestException('Selected meeting type exceeds the tenant maximum duration');
    }
    this.assertBookableWindow(page, startAt, endAt);

    const matchingSlot = await this.findMatchingSlot(page, startAt, dto.hostId);
    if (!matchingSlot) {
      throw new ConflictException('Selected time is no longer available');
    }

    const host = await this.prisma.user.findFirst({
      where: { id: matchingSlot.hostId, tenantId: page.tenantId, status: UserStatus.ACTIVE },
      select: publicUserSelect
    });
    if (!host) throw new ConflictException('Selected host is no longer available');

    const approvalRequired =
      page.approvalRequired ||
      Boolean(page.meetingType?.requiresApproval) ||
      policy.requireApprovalForExternalGuests;
    const bookingStatus = approvalRequired ? BookingRequestStatus.PENDING_APPROVAL : BookingRequestStatus.CONFIRMED;
    const approvalStatus = approvalRequired ? MeetingApprovalStatus.PENDING : MeetingApprovalStatus.NOT_REQUIRED;
    const title = `${page.title} with ${dto.guestName.trim()}`;
    const tokens = this.issueSelfServiceTokens(startAt);
    const intakeMap = this.responsesToMap(dto.intakeResponses ?? []);

    const created = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: {
          tenantId: page.tenantId,
          meetingTypeId: page.meetingTypeId,
          teamId: page.teamId,
          hostId: host.id,
          title,
          description: dto.notes,
          status: MeetingStatus.SCHEDULED,
          visibility: policy.defaultMeetingVisibility,
          approvalStatus,
          startAt,
          endAt,
          timezone: dto.guestTimezone ?? page.timezone,
          locationMode: page.locationMode,
          locationName: page.locationName,
          meetingUrl: page.meetingUrl,
          conferenceProvider: page.conferenceProvider,
          aiEnabled: policy.aiMeetingProcessingEnabled,
          metadata: this.toJsonValue({
            source: 'public_booking',
            bookingPageId: page.id,
            guestEmail: dto.guestEmail.toLowerCase()
          })
        }
      });

      await tx.meetingAttendee.createMany({
        data: [
          {
            tenantId: page.tenantId,
            meetingId: meeting.id,
            userId: host.id,
            role: MeetingAttendeeRole.HOST,
            status: MeetingAttendeeStatus.ACCEPTED
          },
          {
            tenantId: page.tenantId,
            meetingId: meeting.id,
            email: dto.guestEmail.toLowerCase(),
            name: dto.guestName.trim(),
            role: MeetingAttendeeRole.GUEST,
            status: MeetingAttendeeStatus.INVITED,
            isExternal: true,
            metadata: this.toJsonValue({
              phone: dto.guestPhone,
              company: dto.guestCompany
            })
          }
        ]
      });

      const agenda = this.defaultAgenda(page.meetingType?.defaultAgenda);
      if (agenda.length) {
        await tx.meetingAgendaItem.createMany({
          data: agenda.map((item, index) => ({
            tenantId: page.tenantId,
            meetingId: meeting.id,
            title: item,
            sortOrder: index
          }))
        });
      }

      const reminderOffsets = page.meetingType?.defaultReminderMins?.length ? page.meetingType.defaultReminderMins : [1440, 60];
      await tx.meetingReminder.createMany({
        data: this.uniqueNumbers(reminderOffsets).flatMap((offset) => [
          {
            tenantId: page.tenantId,
            meetingId: meeting.id,
            channel: MeetingReminderChannel.IN_APP,
            offsetMinutes: offset,
            scheduledFor: this.reminderTime(startAt, offset),
            status: MeetingReminderStatus.PENDING
          },
          {
            tenantId: page.tenantId,
            meetingId: meeting.id,
            channel: MeetingReminderChannel.EMAIL,
            offsetMinutes: offset,
            scheduledFor: this.reminderTime(startAt, offset),
            status: MeetingReminderStatus.PENDING,
            destination: dto.guestEmail.toLowerCase(),
            templateKey: 'booking_reminder'
          }
        ])
      });

      const booking = await tx.bookingRequest.create({
        data: {
          tenantId: page.tenantId,
          pageId: page.id,
          meetingId: meeting.id,
          meetingTypeId: page.meetingTypeId,
          teamId: page.teamId,
          hostId: host.id,
          status: bookingStatus,
          guestName: dto.guestName.trim(),
          guestEmail: dto.guestEmail.toLowerCase(),
          guestPhone: dto.guestPhone,
          guestCompany: dto.guestCompany,
          guestTimezone: dto.guestTimezone ?? page.timezone,
          title,
          notes: dto.notes,
          intakeResponses: this.toJsonValue(intakeMap),
          routingSnapshot: this.toJsonValue({
            strategy: page.routingStrategy,
            hostId: host.id,
            hostName: this.hostName(host),
            selectedSlot: matchingSlot
          }),
          startAt,
          endAt,
          locationMode: page.locationMode,
          locationName: page.locationName,
          meetingUrl: page.meetingUrl,
          conferenceProvider: page.conferenceProvider,
          cancelTokenHash: tokens.cancelHash,
          rescheduleTokenHash: tokens.rescheduleHash,
          tokenExpiresAt: tokens.expiresAt
        },
        include: bookingRequestInclude
      });

      await tx.meetingActivity.create({
        data: {
          tenantId: page.tenantId,
          meetingId: meeting.id,
          action: 'booking.create',
          newValue: this.toJsonValue({
            bookingRequestId: booking.id,
            guestEmail: booking.guestEmail,
            hostId: host.id,
            approvalRequired
          })
        }
      });

      return booking;
    });

    await this.auditService.record({
      tenantId: page.tenantId,
      action: 'booking.public_create',
      entityType: 'BookingRequest',
      entityId: created.id,
      newValue: this.toJsonValue({ guestEmail: created.guestEmail, pageId: page.id, hostId: host.id, startAt }),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    if (created.meetingId) {
      await this.meetingIntegrationsService.afterMeetingCreated(page.tenantId, created.meetingId, 'booking');
    }

    return {
      booking: created,
      selfService: {
        cancelUrl: `/book/manage/cancel/${tokens.cancelToken}`,
        rescheduleUrl: `/book/manage/reschedule/${tokens.rescheduleToken}`,
        expiresAt: tokens.expiresAt
      }
    };
  }

  async cancelPublicBooking(token: string, dto: CancelPublicBookingDto, meta: RequestMeta) {
    const booking = await this.getBookingByToken(token, 'cancel');
    if (!booking.page.allowCancel) throw new BadRequestException('This booking page does not allow self-service cancellation');
    if (!['CONFIRMED', 'PENDING_APPROVAL'].includes(booking.status)) throw new BadRequestException('Booking can no longer be cancelled');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.bookingRequest.update({
        where: { id: booking.id },
        data: {
          status: BookingRequestStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
          cancelTokenHash: null,
          rescheduleTokenHash: null
        }
      });
      if (booking.meetingId) {
        await tx.meeting.update({
          where: { id: booking.meetingId },
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
          }
        });
        await tx.meetingActivity.create({
          data: {
            tenantId: booking.tenantId,
            meetingId: booking.meetingId,
            action: 'booking.self_cancel',
            newValue: this.toJsonValue({ reason: dto.reason })
          }
        });
      }
      return tx.bookingRequest.findUniqueOrThrow({ where: { id: booking.id }, include: bookingRequestInclude });
    });

    await this.auditService.record({
      tenantId: booking.tenantId,
      action: 'booking.public_cancel',
      entityType: 'BookingRequest',
      entityId: booking.id,
      newValue: this.toJsonValue({ reason: dto.reason }),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    if (booking.meetingId) {
      await this.meetingIntegrationsService.afterMeetingCancelled(
        booking.tenantId,
        booking.meetingId,
        'booking_cancel'
      );
    }

    return updated;
  }

  async reschedulePublicBooking(token: string, dto: ReschedulePublicBookingDto, meta: RequestMeta) {
    const booking = await this.getBookingByToken(token, 'reschedule');
    if (!booking.page.allowReschedule) throw new BadRequestException('This booking page does not allow self-service rescheduling');
    if (!['CONFIRMED', 'PENDING_APPROVAL'].includes(booking.status)) throw new BadRequestException('Booking can no longer be rescheduled');

    const page = await this.prisma.bookingPage.findFirst({
      where: { id: booking.pageId, tenantId: booking.tenantId, isActive: true },
      include: bookingPageInclude
    });
    if (!page) throw new NotFoundException('Booking page not found');

    const startAt = new Date(dto.startAt);
    const durationMins = this.durationForPage(page);
    const endAt = new Date(startAt.getTime() + durationMins * 60_000);
    this.assertBookableWindow(page, startAt, endAt);
    const matchingSlot = await this.findMatchingSlot(page, startAt, dto.hostId ?? booking.hostId ?? undefined);
    if (!matchingSlot) throw new ConflictException('Selected time is no longer available');

    const previous = { startAt: booking.startAt, endAt: booking.endAt, hostId: booking.hostId };
    const updated = await this.prisma.$transaction(async (tx) => {
      const nextTokens = this.issueSelfServiceTokens(startAt);
      await tx.bookingRequest.update({
        where: { id: booking.id },
        data: {
          hostId: matchingSlot.hostId,
          startAt,
          endAt,
          status: booking.status,
          cancelTokenHash: nextTokens.cancelHash,
          rescheduleTokenHash: nextTokens.rescheduleHash,
          tokenExpiresAt: nextTokens.expiresAt,
          routingSnapshot: this.toJsonValue({
            strategy: page.routingStrategy,
            previous,
            selectedSlot: matchingSlot
          })
        }
      });
      if (booking.meetingId) {
        await tx.meeting.update({
          where: { id: booking.meetingId },
          data: {
            hostId: matchingSlot.hostId,
            startAt,
            endAt,
            reminders: {
              updateMany: {
                where: { status: { in: [MeetingReminderStatus.PENDING, MeetingReminderStatus.SCHEDULED] } },
                data: { scheduledFor: startAt }
              }
            }
          }
        });
        await tx.meetingActivity.create({
          data: {
            tenantId: booking.tenantId,
            meetingId: booking.meetingId,
            action: 'booking.self_reschedule',
            oldValue: this.toJsonValue(previous),
            newValue: this.toJsonValue({ startAt, endAt, hostId: matchingSlot.hostId })
          }
        });
      }
      const nextBooking = await tx.bookingRequest.findUniqueOrThrow({ where: { id: booking.id }, include: bookingRequestInclude });
      return {
        booking: nextBooking,
        selfService: {
          cancelUrl: `/book/manage/cancel/${nextTokens.cancelToken}`,
          rescheduleUrl: `/book/manage/reschedule/${nextTokens.rescheduleToken}`,
          expiresAt: nextTokens.expiresAt
        }
      };
    });

    await this.auditService.record({
      tenantId: booking.tenantId,
      action: 'booking.public_reschedule',
      entityType: 'BookingRequest',
      entityId: booking.id,
      oldValue: this.toJsonValue(previous),
      newValue: this.toJsonValue({ startAt, endAt, hostId: matchingSlot.hostId }),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    if (booking.meetingId) {
      await this.meetingIntegrationsService.afterMeetingUpdated(
        booking.tenantId,
        booking.meetingId,
        'booking_reschedule'
      );
    }

    return updated;
  }

  private async getPublicPage(tenantSlug: string, path: string) {
    const normalizedPath = this.normalizePath(path);
    const page = await this.prisma.bookingPage.findFirst({
      where: {
        path: normalizedPath,
        isActive: true,
        tenant: {
          slug: tenantSlug.toLowerCase().trim(),
          status: { in: [TenantStatus.ACTIVE, TenantStatus.TRIAL] }
        }
      },
      include: bookingPageInclude
    });
    if (!page || page.meetingType?.isActive === false) throw new NotFoundException('Booking page not found');
    const policy = await this.getTenantMeetingPolicy(page.tenantId);
    if (!policy.publicBookingEnabled) throw new NotFoundException('Booking page not found');
    return page;
  }

  private async availableSlotsForPage(page: BookingPageWithRelations, requestedFrom: Date, requestedTo: Date, hostId?: string) {
    const policy = await this.getTenantMeetingPolicy(page.tenantId);
    const now = new Date();
    const minNoticeMins = Math.max(page.minNoticeMins, policy.minBookingNoticeMins);
    const rollingWindowDays = Math.min(page.rollingWindowDays, policy.maxAdvanceBookingDays);
    const minStart = new Date(now.getTime() + minNoticeMins * 60_000);
    const hardEnd = new Date(now.getTime() + rollingWindowDays * 24 * 60 * 60_000);
    const from = new Date(Math.max(requestedFrom.getTime(), minStart.getTime()));
    const to = new Date(Math.min(requestedTo.getTime(), hardEnd.getTime()));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) return [];

    const hostCandidates = await this.resolveHostCandidates(page, from, to);
    const candidates = hostId ? hostCandidates.filter((host) => host.id === hostId) : hostCandidates;
    if (candidates.length === 0) return [];

    const hostIds = candidates.map((host) => host.id);
    const durationMins = this.durationForPage(page);
    const beforeBuffer = this.bufferBeforeForPage(page);
    const afterBuffer = this.bufferAfterForPage(page);
    const busy = await this.busyMeetings(page.tenantId, hostIds, from, to, beforeBuffer, afterBuffer);
    const blackouts = await this.blackoutWindows(page, hostIds, from, to);
    const bookingCounts = await this.bookingCounts(page, hostIds, from, to);
    const windows = await this.availabilityWindows(page, hostIds);
    const slots: PublicSlot[] = [];

    for (const day of this.daysBetween(from, to)) {
      for (let start = new Date(day); start < to; start = new Date(start.getTime() + 15 * 60_000)) {
        const slotEnd = new Date(start.getTime() + durationMins * 60_000);
        if (start < from || slotEnd > to) continue;
        const availableHosts = candidates.filter((candidate) =>
          this.hostAvailableForSlot(candidate, page, windows, busy, blackouts, bookingCounts, start, slotEnd, beforeBuffer, afterBuffer)
        );
        if (!availableHosts.length) continue;
        const selectedHost = this.selectHostForSlot(page.routingStrategy, availableHosts);
        slots.push({
          startAt: start.toISOString(),
          endAt: slotEnd.toISOString(),
          hostId: selectedHost.id,
          hostName: this.hostName(selectedHost),
          hostAvatarUrl: selectedHost.avatarUrl,
          routingStrategy: page.routingStrategy
        });
        if (slots.length >= 120) return slots;
      }
    }

    return slots;
  }

  private async getTenantMeetingPolicy(tenantId: string) {
    return this.prisma.meetingIntegrationSettings.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
      select: {
        publicBookingEnabled: true,
        defaultMeetingVisibility: true,
        allowExternalGuests: true,
        requireApprovalForExternalGuests: true,
        maxAdvanceBookingDays: true,
        minBookingNoticeMins: true,
        maxMeetingDurationMins: true,
        aiMeetingProcessingEnabled: true
      }
    });
  }

  private async findMatchingSlot(page: BookingPageWithRelations, startAt: Date, hostId?: string) {
    const from = new Date(startAt.getTime() - 60 * 60_000);
    const to = new Date(startAt.getTime() + 24 * 60 * 60_000);
    const slots = await this.availableSlotsForPage(page, from, to, hostId);
    return slots.find((slot) => slot.startAt === startAt.toISOString() && (!hostId || slot.hostId === hostId));
  }

  private async resolveHostCandidates(page: BookingPageWithRelations, from: Date, to: Date): Promise<HostCandidate[]> {
    const explicitHosts = [
      page.owner,
      page.createdBy,
      ...(page.team?.members ?? []).map((member) => member.user)
    ].filter((host): host is NonNullable<typeof page.owner> => Boolean(host && host.status === UserStatus.ACTIVE));

    const fallbackHosts = explicitHosts.length
      ? explicitHosts
      : await this.prisma.user.findMany({
          where: { tenantId: page.tenantId, status: UserStatus.ACTIVE },
          select: publicUserSelect,
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
          take: 25
        });

    const unique = new Map<string, NonNullable<typeof page.owner>>();
    fallbackHosts.forEach((host) => unique.set(host.id, host));
    const loads = await this.prisma.bookingRequest.groupBy({
      by: ['hostId'],
      where: {
        tenantId: page.tenantId,
        hostId: { in: [...unique.keys()] },
        status: { in: [BookingRequestStatus.CONFIRMED, BookingRequestStatus.PENDING_APPROVAL] },
        startAt: { gte: from, lt: to }
      },
      _count: { _all: true }
    });
    const loadMap = new Map(loads.map((row) => [row.hostId ?? '', row._count._all]));

    return [...unique.values()].map((host, index) => ({
      ...host,
      priority: host.id === page.ownerId ? -1 : index,
      load: loadMap.get(host.id) ?? 0
    }));
  }

  private selectHostForSlot(strategy: BookingRoutingStrategy, hosts: HostCandidate[]) {
    const sorted = [...hosts];
    if (strategy === BookingRoutingStrategy.LEAST_BUSY || strategy === BookingRoutingStrategy.ROUND_ROBIN) {
      return sorted.sort((a, b) => a.load - b.load || a.priority - b.priority || a.lastName.localeCompare(b.lastName))[0];
    }
    if (strategy === BookingRoutingStrategy.PRIORITY || strategy === BookingRoutingStrategy.DEPARTMENT) {
      return sorted.sort((a, b) => a.priority - b.priority || a.load - b.load)[0];
    }
    return sorted.sort((a, b) => a.priority - b.priority || a.lastName.localeCompare(b.lastName))[0];
  }

  private async busyMeetings(tenantId: string, hostIds: string[], from: Date, to: Date, beforeBuffer: number, afterBuffer: number) {
    return this.prisma.meeting.findMany({
      where: {
        tenantId,
        archivedAt: null,
        status: { notIn: [MeetingStatus.CANCELLED, MeetingStatus.ARCHIVED] },
        startAt: { lt: new Date(to.getTime() + afterBuffer * 60_000) },
        endAt: { gt: new Date(from.getTime() - beforeBuffer * 60_000) },
        OR: [
          { hostId: { in: hostIds } },
          { attendees: { some: { userId: { in: hostIds }, status: { not: MeetingAttendeeStatus.REMOVED } } } }
        ]
      },
      select: {
        id: true,
        hostId: true,
        startAt: true,
        endAt: true,
        attendees: {
          where: { userId: { in: hostIds }, status: { not: MeetingAttendeeStatus.REMOVED } },
          select: { userId: true }
        }
      }
    });
  }

  private async blackoutWindows(page: BookingPageWithRelations, hostIds: string[], from: Date, to: Date) {
    return this.prisma.meetingBlackoutWindow.findMany({
      where: {
        tenantId: page.tenantId,
        startAt: { lt: to },
        endAt: { gt: from },
        OR: [
          { ownerId: { in: hostIds } },
          { teamId: page.teamId ?? undefined },
          { ownerId: null, teamId: null }
        ]
      },
      select: {
        ownerId: true,
        teamId: true,
        startAt: true,
        endAt: true
      }
    });
  }

  private async availabilityWindows(page: BookingPageWithRelations, hostIds: string[]) {
    return this.prisma.meetingAvailabilityWindow.findMany({
      where: {
        tenantId: page.tenantId,
        isActive: true,
        OR: [
          { ownerId: { in: hostIds } },
          { teamId: page.teamId ?? undefined },
          { scope: MeetingAvailabilityScope.TENANT }
        ]
      },
      select: {
        ownerId: true,
        teamId: true,
        scope: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true
      }
    });
  }

  private async bookingCounts(page: BookingPageWithRelations, hostIds: string[], from: Date, to: Date) {
    const requests = await this.prisma.bookingRequest.findMany({
      where: {
        tenantId: page.tenantId,
        pageId: page.id,
        hostId: { in: hostIds },
        status: { in: [BookingRequestStatus.CONFIRMED, BookingRequestStatus.PENDING_APPROVAL] },
        startAt: { gte: this.startOfWeek(from), lt: this.endOfWeek(to) }
      },
      select: { hostId: true, startAt: true }
    });
    const counts = new Map<string, { day: Map<string, number>; week: Map<string, number> }>();
    for (const hostId of hostIds) counts.set(hostId, { day: new Map(), week: new Map() });
    for (const request of requests) {
      if (!request.hostId) continue;
      const entry = counts.get(request.hostId);
      if (!entry) continue;
      const dayKey = this.dayKey(request.startAt);
      const weekKey = this.weekKey(request.startAt);
      entry.day.set(dayKey, (entry.day.get(dayKey) ?? 0) + 1);
      entry.week.set(weekKey, (entry.week.get(weekKey) ?? 0) + 1);
    }
    return counts;
  }

  private hostAvailableForSlot(
    host: HostCandidate,
    page: BookingPageWithRelations,
    windows: Awaited<ReturnType<BookingService['availabilityWindows']>>,
    busy: Awaited<ReturnType<BookingService['busyMeetings']>>,
    blackouts: Awaited<ReturnType<BookingService['blackoutWindows']>>,
    bookingCounts: Awaited<ReturnType<BookingService['bookingCounts']>>,
    startAt: Date,
    endAt: Date,
    beforeBuffer: number,
    afterBuffer: number
  ) {
    const effectiveStart = new Date(startAt.getTime() - beforeBuffer * 60_000);
    const effectiveEnd = new Date(endAt.getTime() + afterBuffer * 60_000);
    if (!this.withinAvailability(host.id, page, windows, startAt, endAt)) return false;
    if (busy.some((meeting) => this.meetingTouchesHost(meeting, host.id) && this.overlaps(effectiveStart, effectiveEnd, meeting.startAt, meeting.endAt))) return false;
    if (blackouts.some((blackout) => this.blackoutTouchesHostOrPage(blackout, host.id, page) && this.overlaps(startAt, endAt, blackout.startAt, blackout.endAt))) return false;
    const counts = bookingCounts.get(host.id);
    if (page.dailyLimit && (counts?.day.get(this.dayKey(startAt)) ?? 0) >= page.dailyLimit) return false;
    if (page.weeklyLimit && (counts?.week.get(this.weekKey(startAt)) ?? 0) >= page.weeklyLimit) return false;
    return true;
  }

  private withinAvailability(
    hostId: string,
    page: BookingPageWithRelations,
    windows: Awaited<ReturnType<BookingService['availabilityWindows']>>,
    startAt: Date,
    endAt: Date
  ) {
    const day = startAt.getUTCDay();
    const matching = windows.filter(
      (window) =>
        window.dayOfWeek === day &&
        (window.ownerId === hostId || (page.teamId && window.teamId === page.teamId) || window.scope === MeetingAvailabilityScope.TENANT)
    );
    const effectiveWindows = matching.length ? matching : this.defaultWindows(day);
    return effectiveWindows.some((window) => {
      const windowStart = this.dateAtTime(startAt, window.startTime);
      const windowEnd = this.dateAtTime(startAt, window.endTime);
      return startAt >= windowStart && endAt <= windowEnd;
    });
  }

  private defaultWindows(dayOfWeek: number) {
    if (dayOfWeek === 0 || dayOfWeek === 6) return [];
    return [{ startTime: '09:00', endTime: '17:00' }];
  }

  private meetingTouchesHost(meeting: Awaited<ReturnType<BookingService['busyMeetings']>>[number], hostId: string) {
    return meeting.hostId === hostId || meeting.attendees.some((attendee) => attendee.userId === hostId);
  }

  private blackoutTouchesHostOrPage(
    blackout: Awaited<ReturnType<BookingService['blackoutWindows']>>[number],
    hostId: string,
    page: BookingPageWithRelations
  ) {
    return blackout.ownerId === hostId || blackout.teamId === page.teamId || (!blackout.ownerId && !blackout.teamId);
  }

  private toPublicPage(page: BookingPageWithRelations, hosts: HostCandidate[]) {
    return {
      tenant: page.tenant,
      page: {
        id: page.id,
        path: page.path,
        title: page.title,
        subtitle: page.subtitle,
        description: page.description,
        scope: page.scope,
        routingStrategy: page.routingStrategy,
        durationMins: this.durationForPage(page),
        minNoticeMins: page.minNoticeMins,
        rollingWindowDays: page.rollingWindowDays,
        approvalRequired: page.approvalRequired || Boolean(page.meetingType?.requiresApproval),
        allowCancel: page.allowCancel,
        allowReschedule: page.allowReschedule,
        collectCompanyName: page.collectCompanyName,
        locationMode: page.locationMode,
        locationName: page.locationName,
        timezone: page.timezone,
        brandColor: page.brandColor,
        logoUrl: page.logoUrl ?? page.tenant.logoUrl,
        heroImageUrl: page.heroImageUrl,
        meetingType: page.meetingType,
        team: page.team ? { id: page.team.id, name: page.team.name, description: page.team.description } : null,
        fields: page.fields.filter((field) => field.isActive),
        hosts: hosts.map((host) => ({
          id: host.id,
          name: this.hostName(host),
          avatarUrl: host.avatarUrl,
          timezone: host.timezone
        }))
      }
    };
  }

  private bookingPageCreateData(user: AuthenticatedUser, dto: CreateBookingPageDto, path: string): Prisma.BookingPageCreateInput {
    return {
      tenant: { connect: { id: user.tenantId } },
      createdBy: { connect: { id: user.id } },
      meetingType: dto.meetingTypeId ? { connect: { id: dto.meetingTypeId } } : undefined,
      team: dto.teamId ? { connect: { id: dto.teamId } } : undefined,
      owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
      path,
      title: dto.title.trim(),
      subtitle: dto.subtitle,
      description: dto.description,
      scope: dto.scope,
      routingStrategy: dto.routingStrategy,
      department: dto.department,
      durationMins: dto.durationMins,
      bufferBeforeMins: dto.bufferBeforeMins,
      bufferAfterMins: dto.bufferAfterMins,
      minNoticeMins: dto.minNoticeMins,
      rollingWindowDays: dto.rollingWindowDays,
      dailyLimit: dto.dailyLimit,
      weeklyLimit: dto.weeklyLimit,
      approvalRequired: dto.approvalRequired,
      allowReschedule: dto.allowReschedule,
      allowCancel: dto.allowCancel,
      collectCompanyName: dto.collectCompanyName,
      locationMode: dto.locationMode,
      locationName: dto.locationName,
      meetingUrl: dto.meetingUrl,
      conferenceProvider: dto.conferenceProvider,
      timezone: dto.timezone,
      brandColor: dto.brandColor,
      logoUrl: dto.logoUrl,
      heroImageUrl: dto.heroImageUrl,
      isActive: dto.isActive,
      metadata: dto.metadata ? this.toJsonValue(dto.metadata) : undefined
    };
  }

  private bookingPageUpdateData(dto: UpdateBookingPageDto, path?: string): Prisma.BookingPageUpdateInput {
    return {
      meetingType: dto.meetingTypeId ? { connect: { id: dto.meetingTypeId } } : undefined,
      team: dto.teamId ? { connect: { id: dto.teamId } } : undefined,
      owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
      path,
      title: dto.title?.trim(),
      subtitle: dto.subtitle,
      description: dto.description,
      scope: dto.scope,
      routingStrategy: dto.routingStrategy,
      department: dto.department,
      durationMins: dto.durationMins,
      bufferBeforeMins: dto.bufferBeforeMins,
      bufferAfterMins: dto.bufferAfterMins,
      minNoticeMins: dto.minNoticeMins,
      rollingWindowDays: dto.rollingWindowDays,
      dailyLimit: dto.dailyLimit,
      weeklyLimit: dto.weeklyLimit,
      approvalRequired: dto.approvalRequired,
      allowReschedule: dto.allowReschedule,
      allowCancel: dto.allowCancel,
      collectCompanyName: dto.collectCompanyName,
      locationMode: dto.locationMode,
      locationName: dto.locationName,
      meetingUrl: dto.meetingUrl,
      conferenceProvider: dto.conferenceProvider,
      timezone: dto.timezone,
      brandColor: dto.brandColor,
      logoUrl: dto.logoUrl,
      heroImageUrl: dto.heroImageUrl,
      isActive: dto.isActive,
      metadata: dto.metadata ? this.toJsonValue(dto.metadata) : undefined
    };
  }

  private async getFieldOrThrow(tenantId: string, pageId: string, fieldId: string) {
    const field = await this.prisma.bookingFormField.findFirst({ where: { id: fieldId, tenantId, pageId }, select: bookingFieldSelect });
    if (!field) throw new NotFoundException('Booking form field not found');
    return field;
  }

  private async assertBookingReferences(tenantId: string, dto: { meetingTypeId?: string | null; teamId?: string | null; ownerId?: string | null }) {
    if (dto.meetingTypeId) {
      const type = await this.prisma.meetingType.findFirst({ where: { id: dto.meetingTypeId, tenantId }, select: { id: true } });
      if (!type) throw new NotFoundException('Meeting type not found');
    }
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({ where: { id: dto.teamId, tenantId }, select: { id: true } });
      if (!team) throw new NotFoundException('Team not found');
    }
    if (dto.ownerId) {
      const owner = await this.prisma.user.findFirst({ where: { id: dto.ownerId, tenantId, status: { not: UserStatus.DEACTIVATED } }, select: { id: true } });
      if (!owner) throw new NotFoundException('Owner user not found');
    }
  }

  private async assertBookingPathAvailable(tenantId: string, path: string) {
    const existing = await this.prisma.bookingPage.findUnique({ where: { tenantId_path: { tenantId, path } }, select: { id: true } });
    if (existing) throw new ConflictException('Booking path already exists in this tenant');
  }

  private assertIntakeResponses(page: BookingPageWithRelations, responses: Array<{ fieldKey: string; value?: unknown }>) {
    const responseMap = this.responsesToMap(responses);
    const fields = page.fields.filter((field) => field.isActive);
    for (const field of fields) {
      if (field.required && (responseMap[field.fieldKey] === undefined || responseMap[field.fieldKey] === null || responseMap[field.fieldKey] === '')) {
        throw new BadRequestException(`Required intake field missing: ${field.label}`);
      }
    }
  }

  private assertBookableWindow(page: BookingPageWithRelations, startAt: Date, endAt: Date) {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
      throw new BadRequestException('Invalid booking time window');
    }
    const now = new Date();
    const minStart = new Date(now.getTime() + page.minNoticeMins * 60_000);
    const maxStart = new Date(now.getTime() + page.rollingWindowDays * 24 * 60 * 60_000);
    if (startAt < minStart) throw new BadRequestException('Selected time is inside the minimum notice window');
    if (startAt > maxStart) throw new BadRequestException('Selected time is outside the booking window');
  }

  private async getBookingByToken(token: string, purpose: 'cancel' | 'reschedule') {
    const hash = this.hashToken(token);
    const booking = await this.prisma.bookingRequest.findFirst({
      where: purpose === 'cancel' ? { cancelTokenHash: hash } : { rescheduleTokenHash: hash },
      include: bookingRequestInclude
    });
    if (!booking || !booking.tokenExpiresAt || booking.tokenExpiresAt < new Date()) throw new NotFoundException('Booking link is invalid or expired');
    return booking;
  }

  private durationForPage(page: BookingPageWithRelations) {
    return page.durationMins ?? page.meetingType?.durationMins ?? 30;
  }

  private bufferBeforeForPage(page: BookingPageWithRelations) {
    return Math.max(page.bufferBeforeMins, page.meetingType?.bufferBeforeMins ?? 0);
  }

  private bufferAfterForPage(page: BookingPageWithRelations) {
    return Math.max(page.bufferAfterMins, page.meetingType?.bufferAfterMins ?? 0);
  }

  private defaultAgenda(value: Prisma.JsonValue | null | undefined) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  }

  private issueSelfServiceTokens(startAt: Date) {
    const cancelToken = randomBytes(32).toString('base64url');
    const rescheduleToken = randomBytes(32).toString('base64url');
    return {
      cancelToken,
      rescheduleToken,
      cancelHash: this.hashToken(cancelToken),
      rescheduleHash: this.hashToken(rescheduleToken),
      expiresAt: new Date(Math.max(startAt.getTime(), Date.now() + 30 * 24 * 60 * 60_000))
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizePath(value: string) {
    const path = value
      .split('/')
      .map((part) => this.slugify(part))
      .filter(Boolean)
      .join('/');
    if (!path) throw new BadRequestException('Booking path must contain at least one segment');
    if (path.length > 160) throw new BadRequestException('Booking path is too long');
    return path;
  }

  private normalizeFieldKey(value: string) {
    return this.slugify(value).replace(/-/g, '_').slice(0, 80);
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) throw new BadRequestException('Slug must contain at least one letter or number');
    return slug;
  }

  private responsesToMap(responses: Array<{ fieldKey: string; value?: unknown }>) {
    return responses.reduce<Record<string, unknown>>((acc, response) => {
      acc[this.normalizeFieldKey(response.fieldKey)] = response.value ?? null;
      return acc;
    }, {});
  }

  private dateAtTime(day: Date, time: string) {
    const [hour = '0', minute = '0'] = time.split(':');
    return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), Number(hour), Number(minute)));
  }

  private daysBetween(from: Date, to: Date) {
    const days: Date[] = [];
    let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cursor <= end && days.length < 45) {
      days.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + 24 * 60 * 60_000);
    }
    return days;
  }

  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart < bEnd && aEnd > bStart;
  }

  private dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private weekKey(date: Date) {
    const start = this.startOfWeek(date);
    return this.dayKey(start);
  }

  private startOfWeek(date: Date) {
    const day = date.getUTCDay();
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - day);
    return start;
  }

  private endOfWeek(date: Date) {
    const end = this.startOfWeek(date);
    end.setUTCDate(end.getUTCDate() + 7);
    return end;
  }

  private reminderTime(startAt: Date, offsetMinutes: number) {
    return new Date(startAt.getTime() - offsetMinutes * 60_000);
  }

  private hostName(host: { firstName: string; lastName: string }) {
    return `${host.firstName} ${host.lastName}`.trim();
  }

  private uniqueNumbers(values: number[]) {
    return [...new Set(values.filter((value) => Number.isInteger(value) && value >= 0))].sort((a, b) => b - a);
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new BadRequestException('Value must be JSON serializable');
    return JSON.parse(serialized) as Prisma.InputJsonValue;
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
