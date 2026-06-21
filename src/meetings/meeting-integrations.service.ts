import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  IntegrationProvider,
  IntegrationStatus,
  MeetingConferenceProvider,
  MeetingReminderChannel,
  MeetingReminderJobStatus,
  MeetingReminderStatus,
  MeetingStatus,
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma
} from '@prisma/client';
import { createDecipheriv, createHash } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { IntegrationsService } from '../integrations/integrations.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMeetingConferenceDto,
  MeetingReminderJobQueryDto,
  ProcessMeetingReminderJobsDto,
  UpdateMeetingIntegrationSettingsDto
} from './dto/meeting-integrations.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface SecretEnvelope {
  v?: number;
  alg?: string;
  iv?: string;
  tag?: string;
  ciphertext?: string;
}

interface ConferenceCreationResult {
  meetingUrl: string | null;
  externalCalendarId?: string | null;
  externalConferenceId?: string | null;
  metadata?: Record<string, unknown>;
  message: string;
}

const meetingIntegrationSettingsSelect = {
  id: true,
  tenantId: true,
  defaultConferenceProvider: true,
  allowedConferenceProviders: true,
  defaultReminderChannels: true,
  calendarSyncEnabled: true,
  emailRemindersEnabled: true,
  whatsappRemindersEnabled: true,
  smsRemindersEnabled: true,
  webhookEventsEnabled: true,
  requireApprovedWhatsappTemplates: true,
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
  manualLinkPolicy: true,
  policyConfig: true,
  providerConfig: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.MeetingIntegrationSettingsSelect;

const reminderJobSelect = {
  id: true,
  tenantId: true,
  meetingId: true,
  reminderId: true,
  channel: true,
  provider: true,
  status: true,
  scheduledFor: true,
  destination: true,
  payload: true,
  attempts: true,
  maxAttempts: true,
  nextAttemptAt: true,
  lockedAt: true,
  sentAt: true,
  failedAt: true,
  deadLetterAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
  meeting: {
    select: {
      id: true,
      tenantId: true,
      title: true,
      description: true,
      status: true,
      startAt: true,
      endAt: true,
      timezone: true,
      meetingUrl: true,
      conferenceProvider: true,
      hostId: true,
      createdById: true,
      host: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      },
      attendees: {
        select: {
          id: true,
          userId: true,
          email: true,
          name: true,
          isExternal: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  },
  reminder: {
    select: {
      id: true,
      attendeeId: true,
      templateKey: true,
      offsetMinutes: true
    }
  }
} satisfies Prisma.MeetingReminderJobSelect;

type ReminderJobRecord = Prisma.MeetingReminderJobGetPayload<{ select: typeof reminderJobSelect }>;

const meetingForConferenceSelect = {
  id: true,
  tenantId: true,
  title: true,
  description: true,
  startAt: true,
  endAt: true,
  timezone: true,
  meetingUrl: true,
  conferenceProvider: true,
  externalCalendarId: true,
  externalConferenceId: true,
  host: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  },
  attendees: {
    select: {
      email: true,
      user: {
        select: {
          email: true
        }
      }
    }
  }
} satisfies Prisma.MeetingSelect;

type MeetingForConference = Prisma.MeetingGetPayload<{ select: typeof meetingForConferenceSelect }>;

@Injectable()
export class MeetingIntegrationsService {
  private readonly logger = new Logger(MeetingIntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly integrationsService: IntegrationsService
  ) {}

  async status(user: AuthenticatedUser) {
    const [settings, integrations, queue] = await Promise.all([
      this.getSettings(user),
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
          externalAccountId: true,
          updatedAt: true
        },
        orderBy: [{ updatedAt: 'desc' }]
      }),
      this.prisma.meetingReminderJob.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId },
        _count: { _all: true }
      })
    ]);

    const active = integrations.filter(
      (integration) => integration.enabled && integration.status === IntegrationStatus.ACTIVE
    );

    return {
      settings,
      providers: {
        google: this.providerReadiness(active, [IntegrationProvider.GOOGLE]),
        microsoft: this.providerReadiness(active, [
          IntegrationProvider.MICROSOFT,
          IntegrationProvider.TEAMS
        ]),
        zoom: this.providerReadiness(active, [IntegrationProvider.ZOOM]),
        whatsapp: this.providerReadiness(active, [IntegrationProvider.WHATSAPP]),
        email: {
          connected:
            this.configService.get<string>('mail.provider', 'none') !== 'none' ||
            active.some((integration) => integration.provider === IntegrationProvider.EMAIL),
          provider: this.configService.get<string>('mail.provider', 'none')
        },
        sms: this.providerReadiness(active, [IntegrationProvider.SMS]),
        custom: this.providerReadiness(active, [IntegrationProvider.CUSTOM])
      },
      queue: Object.fromEntries(queue.map((item) => [item.status, item._count._all])),
      supportedEvents: [
        'meeting.created',
        'meeting.updated',
        'meeting.cancelled',
        'meeting.started',
        'meeting.completed',
        'meeting.conference_created',
        'booking.created',
        'booking.cancelled',
        'booking.rescheduled'
      ]
    };
  }

  async getSettings(user: AuthenticatedUser) {
    const settings = await this.ensureSettings(user.tenantId);
    return settings;
  }

  async assertCanCreatePublicBookingPage(user: AuthenticatedUser) {
    const settings = await this.ensureSettings(user.tenantId);
    if (!settings.publicBookingEnabled) {
      throw new ForbiddenException('Public booking pages are disabled for this tenant');
    }
    this.assertAllowedByPolicy(
      user,
      settings.publicBookingCreatorPermissions,
      'Cannot create public booking links for this tenant'
    );
    return settings;
  }

  async assertCanUseMeetingAi(user: AuthenticatedUser) {
    const settings = await this.ensureSettings(user.tenantId);
    if (!settings.aiMeetingProcessingEnabled) {
      throw new ForbiddenException('Meeting AI automation is disabled for this tenant');
    }
    return settings;
  }

  async updateSettings(
    user: AuthenticatedUser,
    dto: UpdateMeetingIntegrationSettingsDto,
    meta: RequestMeta
  ) {
    this.assertCanManageMeetings(user);
    const before = await this.ensureSettings(user.tenantId);
    this.assertCanChangeProviderSettings(user, before, dto);
    const allowedConferenceProviders = dto.allowedConferenceProviders
      ? this.uniqueEnumValues(dto.allowedConferenceProviders)
      : undefined;
    const defaultReminderChannels = dto.defaultReminderChannels
      ? this.uniqueEnumValues(dto.defaultReminderChannels)
      : undefined;

    if (
      dto.defaultConferenceProvider &&
      allowedConferenceProviders &&
      !allowedConferenceProviders.includes(dto.defaultConferenceProvider)
    ) {
      throw new BadRequestException('Default conference provider must be allowed');
    }

    const updated = await this.prisma.meetingIntegrationSettings.update({
      where: { tenantId: user.tenantId },
      data: {
        defaultConferenceProvider: dto.defaultConferenceProvider,
        allowedConferenceProviders,
        defaultReminderChannels,
        calendarSyncEnabled: dto.calendarSyncEnabled,
        emailRemindersEnabled: dto.emailRemindersEnabled,
        whatsappRemindersEnabled: dto.whatsappRemindersEnabled,
        smsRemindersEnabled: dto.smsRemindersEnabled,
        webhookEventsEnabled: dto.webhookEventsEnabled,
        requireApprovedWhatsappTemplates: dto.requireApprovedWhatsappTemplates,
        manualLinkPolicy:
          dto.manualLinkPolicy === null
            ? Prisma.JsonNull
            : dto.manualLinkPolicy
              ? this.toJsonValue(dto.manualLinkPolicy)
              : undefined,
        providerConfig:
          dto.providerConfig === null
            ? Prisma.JsonNull
            : dto.providerConfig
              ? this.toJsonValue(dto.providerConfig)
              : undefined
      },
      select: meetingIntegrationSettingsSelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'meeting_integration_settings.update',
      entityType: 'MeetingIntegrationSettings',
      entityId: updated.id,
      oldValue: this.toJsonValue(before),
      newValue: this.toJsonValue(updated),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return updated;
  }

  async createConference(
    user: AuthenticatedUser,
    meetingId: string,
    dto: CreateMeetingConferenceDto,
    meta: RequestMeta
  ) {
    this.assertCanManageMeetings(user);
    const [settings, meeting] = await Promise.all([
      this.ensureSettings(user.tenantId),
      this.getMeetingForConference(user.tenantId, meetingId)
    ]);
    const provider = dto.provider ?? settings.defaultConferenceProvider;
    this.assertCanUseConferenceProvider(user, settings, provider);

    if (!settings.allowedConferenceProviders.includes(provider)) {
      throw new BadRequestException(`Conference provider ${provider} is not allowed for this tenant`);
    }

    const before = {
      meetingUrl: meeting.meetingUrl,
      conferenceProvider: meeting.conferenceProvider,
      externalCalendarId: meeting.externalCalendarId,
      externalConferenceId: meeting.externalConferenceId
    };
    const result = await this.createConferenceWithProvider(user.tenantId, meeting, provider, dto);
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        meetingUrl: result.meetingUrl,
        locationName: dto.locationName,
        conferenceProvider: provider,
        externalCalendarId: result.externalCalendarId,
        externalConferenceId: result.externalConferenceId,
        metadata: result.metadata ? this.toJsonValue(result.metadata) : undefined
      },
      select: {
        id: true,
        meetingUrl: true,
        conferenceProvider: true,
        externalCalendarId: true,
        externalConferenceId: true,
        updatedAt: true
      }
    });

    await this.prisma.meetingActivity.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        actorId: user.id,
        action: 'meeting.conference_create',
        oldValue: this.toJsonValue(before),
        newValue: this.toJsonValue(updated)
      }
    });
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'meeting.conference_create',
      entityType: 'Meeting',
      entityId: meetingId,
      oldValue: this.toJsonValue(before),
      newValue: this.toJsonValue(updated),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.publishMeetingEvent(user.tenantId, 'meeting.conference_created', {
      meetingId,
      provider,
      meetingUrl: updated.meetingUrl
    });

    return {
      meeting: updated,
      provider,
      message: result.message
    };
  }

  async listReminderJobs(user: AuthenticatedUser, query: MeetingReminderJobQueryDto) {
    const where: Prisma.MeetingReminderJobWhereInput = {
      tenantId: user.tenantId,
      meetingId: query.meetingId,
      channel: query.channel,
      status: query.status,
      scheduledFor: this.dateFilter(query.from, query.to),
      nextAttemptAt: query.dueOnly ? { lte: new Date() } : undefined
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.meetingReminderJob.findMany({
        where,
        select: reminderJobSelect,
        orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.meetingReminderJob.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async processReminderJobs(user: AuthenticatedUser, dto: ProcessMeetingReminderJobsDto) {
    this.assertCanManageMeetings(user);
    return this.processDueReminderJobs(dto.limit ?? 25, user.tenantId);
  }

  async retryReminderJob(user: AuthenticatedUser, jobId: string) {
    this.assertCanManageMeetings(user);
    const before = await this.prisma.meetingReminderJob.findFirst({
      where: { id: jobId, tenantId: user.tenantId },
      select: reminderJobSelect
    });
    if (!before) throw new NotFoundException('Reminder job not found');
    const updated = await this.prisma.meetingReminderJob.update({
      where: { id: jobId },
      data: {
        status: MeetingReminderJobStatus.QUEUED,
        nextAttemptAt: new Date(),
        lockedAt: null,
        failedAt: null,
        deadLetterAt: null,
        lastError: null
      },
      select: reminderJobSelect
    });
    return {
      job: updated,
      previousStatus: before.status
    };
  }

  async afterMeetingCreated(tenantId: string, meetingId: string, source = 'meeting') {
    await this.enqueueReminderJobsForMeeting(tenantId, meetingId);
    await this.publishMeetingEvent(tenantId, source === 'booking' ? 'booking.created' : 'meeting.created', {
      meetingId
    });
  }

  async afterMeetingUpdated(tenantId: string, meetingId: string, source = 'meeting') {
    await this.rescheduleReminderJobsForMeeting(tenantId, meetingId);
    await this.publishMeetingEvent(
      tenantId,
      source === 'booking_reschedule' ? 'booking.rescheduled' : 'meeting.updated',
      { meetingId }
    );
  }

  async afterMeetingCancelled(tenantId: string, meetingId: string, source = 'meeting') {
    await this.cancelReminderJobsForMeeting(tenantId, meetingId);
    await this.publishMeetingEvent(
      tenantId,
      source === 'booking_cancel' ? 'booking.cancelled' : 'meeting.cancelled',
      { meetingId }
    );
  }

  async afterMeetingStarted(tenantId: string, meetingId: string) {
    await this.publishMeetingEvent(tenantId, 'meeting.started', { meetingId });
  }

  async afterMeetingCompleted(tenantId: string, meetingId: string) {
    await this.cancelReminderJobsForMeeting(tenantId, meetingId);
    await this.publishMeetingEvent(tenantId, 'meeting.completed', { meetingId });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledReminderWorker() {
    try {
      await this.processDueReminderJobs(25);
    } catch (error) {
      this.logger.error(`Meeting reminder worker failed: ${this.errorMessage(error)}`);
    }
  }

  private async processDueReminderJobs(limit: number, tenantId?: string) {
    const jobs = await this.prisma.meetingReminderJob.findMany({
      where: {
        tenantId,
        status: { in: [MeetingReminderJobStatus.QUEUED, MeetingReminderJobStatus.FAILED] },
        nextAttemptAt: { lte: new Date() },
        attempts: { lt: 10 }
      },
      select: { id: true },
      orderBy: [{ nextAttemptAt: 'asc' }],
      take: Math.min(limit, 100)
    });

    const results: Array<{ id: string; status: string; provider?: string; error?: string }> = [];
    for (const job of jobs) {
      results.push(await this.processReminderJob(job.id));
    }

    return {
      processed: results.length,
      sent: results.filter((result) => result.status === MeetingReminderJobStatus.SENT).length,
      failed: results.filter((result) => result.status === MeetingReminderJobStatus.FAILED).length,
      deadLetter: results.filter((result) => result.status === MeetingReminderJobStatus.DEAD_LETTER).length,
      results
    };
  }

  private async processReminderJob(jobId: string) {
    const job = await this.prisma.meetingReminderJob.findUnique({
      where: { id: jobId },
      select: reminderJobSelect
    });
    if (!job) return { id: jobId, status: 'NOT_FOUND' };
    if (job.status === MeetingReminderJobStatus.SENT || job.status === MeetingReminderJobStatus.CANCELLED) {
      return { id: job.id, status: job.status };
    }

    const closedStatuses: MeetingStatus[] = [
      MeetingStatus.CANCELLED,
      MeetingStatus.ARCHIVED,
      MeetingStatus.COMPLETED
    ];
    if (closedStatuses.includes(job.meeting.status)) {
      const cancelled = await this.prisma.meetingReminderJob.update({
        where: { id: job.id },
        data: {
          status: MeetingReminderJobStatus.CANCELLED,
          lockedAt: null,
          lastError: `Meeting is ${job.meeting.status.toLowerCase()}`
        },
        select: reminderJobSelect
      });
      return { id: cancelled.id, status: cancelled.status };
    }

    await this.prisma.meetingReminderJob.update({
      where: { id: job.id },
      data: {
        status: MeetingReminderJobStatus.PROCESSING,
        lockedAt: new Date(),
        attempts: { increment: 1 }
      }
    });

    try {
      const delivered = await this.deliverReminder(job);
      await this.prisma.$transaction([
        this.prisma.meetingReminderJob.update({
          where: { id: job.id },
          data: {
            status: MeetingReminderJobStatus.SENT,
            provider: delivered.provider,
            sentAt: new Date(),
            lockedAt: null,
            lastError: null
          }
        }),
        ...(job.reminderId
          ? [
              this.prisma.meetingReminder.update({
                where: { id: job.reminderId },
                data: {
                  status: MeetingReminderStatus.SENT,
                  sentAt: new Date(),
                  error: null
                }
              })
            ]
          : [])
      ]);
      return { id: job.id, status: MeetingReminderJobStatus.SENT, provider: delivered.provider };
    } catch (error) {
      const attempts = job.attempts + 1;
      const deadLetter = attempts >= job.maxAttempts;
      const nextAttemptAt = deadLetter ? null : this.nextRetryAt(attempts);
      const status = deadLetter
        ? MeetingReminderJobStatus.DEAD_LETTER
        : MeetingReminderJobStatus.FAILED;
      const message = this.errorMessage(error);
      await this.prisma.$transaction([
        this.prisma.meetingReminderJob.update({
          where: { id: job.id },
          data: {
            status,
            lockedAt: null,
            failedAt: new Date(),
            deadLetterAt: deadLetter ? new Date() : null,
            nextAttemptAt: nextAttemptAt ?? new Date(),
            lastError: message
          }
        }),
        ...(job.reminderId
          ? [
              this.prisma.meetingReminder.update({
                where: { id: job.reminderId },
                data: {
                  status: deadLetter ? MeetingReminderStatus.FAILED : MeetingReminderStatus.SCHEDULED,
                  error: message
                }
              })
            ]
          : [])
      ]);
      return { id: job.id, status, error: message };
    }
  }

  private async deliverReminder(job: ReminderJobRecord) {
    if (job.channel === MeetingReminderChannel.IN_APP) {
      await this.deliverInAppReminder(job);
      return { provider: 'in_app' };
    }

    if (job.channel === MeetingReminderChannel.EMAIL) {
      await this.deliverEmailReminder(job);
      return { provider: this.configService.get<string>('mail.provider', 'none') };
    }

    if (job.channel === MeetingReminderChannel.WHATSAPP) {
      await this.deliverWhatsappReminder(job);
      return { provider: 'whatsapp_cloud_api' };
    }

    if (job.channel === MeetingReminderChannel.SMS) {
      throw new BadRequestException('SMS reminder provider is not configured yet');
    }

    if (job.channel === MeetingReminderChannel.WEBHOOK) {
      await this.publishMeetingEvent(job.tenantId, 'meeting.reminder_due', {
        meetingId: job.meetingId,
        reminderId: job.reminderId,
        scheduledFor: job.scheduledFor
      });
      return { provider: 'webhook' };
    }

    throw new BadRequestException(`Unsupported reminder channel ${job.channel}`);
  }

  private async deliverInAppReminder(job: ReminderJobRecord) {
    const userIds = this.uniqueStrings([
      job.meeting.hostId,
      job.meeting.createdById,
      ...job.meeting.attendees.map((attendee) => attendee.userId)
    ]);
    if (userIds.length === 0) {
      throw new BadRequestException('No internal users found for in-app meeting reminder');
    }

    for (const userId of userIds) {
      await this.prisma.notification.create({
        data: {
          tenantId: job.tenantId,
          userId,
          title: `Meeting reminder: ${job.meeting.title}`,
          body: `${this.formatDate(job.meeting.startAt)} - ${job.meeting.meetingUrl ?? 'Open TaskBricks for details'}`,
          channel: NotificationChannel.IN_APP,
          data: this.toJsonValue({
            type: 'meeting.reminder',
            meetingId: job.meetingId,
            reminderJobId: job.id
          }),
          deliveries: {
            create: {
              tenantId: job.tenantId,
              userId,
              channel: NotificationChannel.IN_APP,
              status: NotificationDeliveryStatus.SENT,
              provider: 'taskbricks',
              sentAt: new Date()
            }
          }
        }
      });
    }
  }

  private async deliverEmailReminder(job: ReminderJobRecord) {
    const destination = job.destination ?? this.firstEmailDestination(job);
    if (!destination) throw new BadRequestException('Email reminder destination is missing');
    const result = await this.mailService.send({
      to: destination,
      subject: `Reminder: ${job.meeting.title}`,
      text: [
        `Your meeting "${job.meeting.title}" starts at ${this.formatDate(job.meeting.startAt)}.`,
        job.meeting.meetingUrl ? `Join: ${job.meeting.meetingUrl}` : '',
        job.meeting.description ? `Notes: ${job.meeting.description}` : ''
      ]
        .filter(Boolean)
        .join('\n'),
      html: [
        `<p>Your meeting <strong>${this.escapeHtml(job.meeting.title)}</strong> starts at ${this.escapeHtml(this.formatDate(job.meeting.startAt))}.</p>`,
        job.meeting.meetingUrl
          ? `<p><a href="${this.escapeHtml(job.meeting.meetingUrl)}">Join meeting</a></p>`
          : '',
        job.meeting.description ? `<p>${this.escapeHtml(job.meeting.description)}</p>` : ''
      ].join('')
    });
    if (!result.sent) {
      throw new BadRequestException(result.error ?? `Mail provider ${result.provider} did not send`);
    }
  }

  private async deliverWhatsappReminder(job: ReminderJobRecord) {
    const settings = await this.ensureSettings(job.tenantId);
    if (!settings.whatsappRemindersEnabled) {
      throw new BadRequestException('WhatsApp reminders are disabled for this tenant');
    }
    const integration = await this.getActiveIntegration(job.tenantId, [IntegrationProvider.WHATSAPP]);
    const secrets = this.decryptSecrets(integration.encryptedSecrets);
    const config = this.asRecord(integration.config);
    const accessToken = this.firstString(secrets.accessToken, secrets.access_token, secrets.token);
    const phoneNumberId = this.firstString(config.phoneNumberId, secrets.phoneNumberId);
    const templateName = this.firstString(
      config.reminderTemplateName,
      config.templateName,
      job.reminder?.templateKey,
      'meeting_reminder'
    );
    const languageCode = this.firstString(config.languageCode, 'en_US');
    const destination = job.destination ?? this.firstPhoneDestination(job);

    if (!accessToken || !phoneNumberId) {
      throw new BadRequestException('WhatsApp integration requires accessToken and phoneNumberId secrets');
    }
    if (!destination) throw new BadRequestException('WhatsApp reminder destination is missing');

    await this.requestJson(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: destination.replace(/[^\d]/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: job.meeting.title },
                { type: 'text', text: this.formatDate(job.meeting.startAt) },
                { type: 'text', text: job.meeting.meetingUrl ?? 'TaskBricks' }
              ]
            }
          ]
        }
      })
    });
  }

  private async createConferenceWithProvider(
    tenantId: string,
    meeting: MeetingForConference,
    provider: MeetingConferenceProvider,
    dto: CreateMeetingConferenceDto
  ): Promise<ConferenceCreationResult> {
    if (provider === MeetingConferenceProvider.NONE) {
      return { meetingUrl: null, message: 'Conference link cleared' };
    }

    if (
      provider === MeetingConferenceProvider.MANUAL ||
      provider === MeetingConferenceProvider.CUSTOM_URL ||
      provider === MeetingConferenceProvider.ZOOM
    ) {
      if (!dto.meetingUrl) {
        throw new BadRequestException(`${provider} requires meetingUrl`);
      }
      return {
        meetingUrl: dto.meetingUrl,
        externalConferenceId: null,
        externalCalendarId: null,
        message: `${provider} link attached`
      };
    }

    if (provider === MeetingConferenceProvider.GOOGLE_CALENDAR) {
      return this.createGoogleCalendarConference(tenantId, meeting, dto);
    }

    if (provider === MeetingConferenceProvider.GOOGLE_MEET) {
      return this.createGoogleMeetSpace(tenantId, meeting);
    }

    if (provider === MeetingConferenceProvider.MICROSOFT_TEAMS) {
      return this.createMicrosoftTeamsMeeting(tenantId, meeting);
    }

    throw new BadRequestException(`Unsupported conference provider ${provider}`);
  }

  private async createGoogleCalendarConference(
    tenantId: string,
    meeting: MeetingForConference,
    dto: CreateMeetingConferenceDto
  ) {
    const integration = await this.getActiveIntegration(tenantId, [IntegrationProvider.GOOGLE]);
    const secrets = this.decryptSecrets(integration.encryptedSecrets);
    const config = this.asRecord(integration.config);
    const accessToken = this.firstString(secrets.accessToken, secrets.access_token, secrets.oauthAccessToken);
    const calendarId = dto.calendarId ?? this.firstString(config.calendarId, 'primary') ?? 'primary';
    if (!accessToken) throw new BadRequestException('Google integration requires an OAuth access token');
    const requestId = `taskbricks-${meeting.id}-${Date.now()}`;
    const sendUpdates = dto.sendUpdates ?? this.firstString(config.sendUpdates, 'all') ?? 'all';
    const response = await this.requestJson(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=${encodeURIComponent(sendUpdates)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: meeting.title,
          description: meeting.description,
          start: { dateTime: meeting.startAt.toISOString(), timeZone: meeting.timezone },
          end: { dateTime: meeting.endAt.toISOString(), timeZone: meeting.timezone },
          attendees: this.meetingEmails(meeting).map((email) => ({ email })),
          conferenceData: {
            createRequest: {
              requestId,
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          }
        })
      }
    );
    const record = this.asRecord(response);
    const conferenceData = this.asRecord(record.conferenceData);
    const entryPoints = Array.isArray(conferenceData.entryPoints) ? conferenceData.entryPoints : [];
    const videoEntry = entryPoints
      .map((entry) => this.asRecord(entry))
      .find((entry) => entry.entryPointType === 'video' && typeof entry.uri === 'string');
    const meetingUrl = this.firstString(record.hangoutLink, videoEntry?.uri);
    if (!meetingUrl) throw new BadRequestException('Google Calendar did not return a Meet link');

    return {
      meetingUrl,
      externalCalendarId: this.firstString(record.id),
      externalConferenceId: requestId,
      metadata: { googleCalendarEventId: record.id, providerResponseId: record.id },
      message: 'Google Calendar event and Meet conference created'
    };
  }

  private async createGoogleMeetSpace(tenantId: string, meeting: MeetingForConference) {
    const integration = await this.getActiveIntegration(tenantId, [IntegrationProvider.GOOGLE]);
    const secrets = this.decryptSecrets(integration.encryptedSecrets);
    const accessToken = this.firstString(secrets.accessToken, secrets.access_token, secrets.oauthAccessToken);
    if (!accessToken) throw new BadRequestException('Google integration requires an OAuth access token');
    const response = await this.requestJson('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const record = this.asRecord(response);
    const meetingUrl = this.firstString(record.meetingUri);
    if (!meetingUrl) throw new BadRequestException('Google Meet did not return meetingUri');
    return {
      meetingUrl,
      externalConferenceId: this.firstString(record.name),
      metadata: { googleMeetSpace: record.name, title: meeting.title },
      message: 'Google Meet space created'
    };
  }

  private async createMicrosoftTeamsMeeting(tenantId: string, meeting: MeetingForConference) {
    const integration = await this.getActiveIntegration(tenantId, [
      IntegrationProvider.MICROSOFT,
      IntegrationProvider.TEAMS
    ]);
    const secrets = this.decryptSecrets(integration.encryptedSecrets);
    const config = this.asRecord(integration.config);
    const accessToken = this.firstString(secrets.accessToken, secrets.access_token, secrets.oauthAccessToken);
    if (!accessToken) throw new BadRequestException('Microsoft integration requires an OAuth access token');
    const userId = this.firstString(config.userId);
    const url = userId
      ? `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/onlineMeetings`
      : 'https://graph.microsoft.com/v1.0/me/onlineMeetings';
    const response = await this.requestJson(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: meeting.title,
        startDateTime: meeting.startAt.toISOString(),
        endDateTime: meeting.endAt.toISOString()
      })
    });
    const record = this.asRecord(response);
    const meetingUrl = this.firstString(record.joinWebUrl);
    if (!meetingUrl) throw new BadRequestException('Microsoft Graph did not return joinWebUrl');
    return {
      meetingUrl,
      externalConferenceId: this.firstString(record.id),
      metadata: { onlineMeetingId: record.id },
      message: 'Microsoft Teams online meeting created'
    };
  }

  private async enqueueReminderJobsForMeeting(tenantId: string, meetingId: string) {
    const reminders = await this.prisma.meetingReminder.findMany({
      where: {
        tenantId,
        meetingId,
        status: { in: [MeetingReminderStatus.PENDING, MeetingReminderStatus.SCHEDULED] }
      },
      select: {
        id: true,
        channel: true,
        scheduledFor: true,
        destination: true,
        payload: true
      }
    });

    for (const reminder of reminders) {
      await this.prisma.meetingReminderJob.upsert({
        where: { reminderId: reminder.id },
        create: {
          tenantId,
          meetingId,
          reminderId: reminder.id,
          channel: reminder.channel,
          scheduledFor: reminder.scheduledFor,
          destination: reminder.destination,
          payload: reminder.payload === null ? Prisma.JsonNull : reminder.payload,
          nextAttemptAt: reminder.scheduledFor < new Date() ? new Date() : reminder.scheduledFor,
          provider: this.providerForChannel(reminder.channel)
        },
        update: {
          status: MeetingReminderJobStatus.QUEUED,
          scheduledFor: reminder.scheduledFor,
          destination: reminder.destination,
          payload: reminder.payload === null ? Prisma.JsonNull : reminder.payload,
          nextAttemptAt: reminder.scheduledFor < new Date() ? new Date() : reminder.scheduledFor,
          lockedAt: null,
          failedAt: null,
          deadLetterAt: null,
          lastError: null
        }
      });
      await this.prisma.meetingReminder.update({
        where: { id: reminder.id },
        data: { status: MeetingReminderStatus.SCHEDULED }
      });
    }
  }

  private async rescheduleReminderJobsForMeeting(tenantId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, tenantId },
      select: { startAt: true }
    });
    if (!meeting) return;
    const reminders = await this.prisma.meetingReminder.findMany({
      where: {
        tenantId,
        meetingId,
        status: { in: [MeetingReminderStatus.PENDING, MeetingReminderStatus.SCHEDULED, MeetingReminderStatus.FAILED] }
      },
      select: { id: true, offsetMinutes: true }
    });
    for (const reminder of reminders) {
      await this.prisma.meetingReminder.update({
        where: { id: reminder.id },
        data: {
          status: MeetingReminderStatus.PENDING,
          scheduledFor: this.reminderTime(meeting.startAt, reminder.offsetMinutes),
          error: null
        }
      });
    }
    await this.enqueueReminderJobsForMeeting(tenantId, meetingId);
  }

  private async cancelReminderJobsForMeeting(tenantId: string, meetingId: string) {
    await this.prisma.meetingReminderJob.updateMany({
      where: {
        tenantId,
        meetingId,
        status: {
          in: [
            MeetingReminderJobStatus.QUEUED,
            MeetingReminderJobStatus.PROCESSING,
            MeetingReminderJobStatus.FAILED
          ]
        }
      },
      data: {
        status: MeetingReminderJobStatus.CANCELLED,
        lockedAt: null,
        nextAttemptAt: new Date(),
        lastError: 'Meeting lifecycle cancelled remaining reminders'
      }
    });
  }

  private async publishMeetingEvent(tenantId: string, eventType: string, payload: unknown) {
    const settings = await this.ensureSettings(tenantId);
    if (!settings.webhookEventsEnabled) {
      return { matched: 0, skipped: true };
    }
    return this.integrationsService.publishTenantEvent(tenantId, eventType, payload);
  }

  private async ensureSettings(tenantId: string) {
    const existing = await this.prisma.meetingIntegrationSettings.findUnique({
      where: { tenantId },
      select: meetingIntegrationSettingsSelect
    });
    if (existing) return existing;
    return this.prisma.meetingIntegrationSettings.create({
      data: { tenantId },
      select: meetingIntegrationSettingsSelect
    });
  }

  private async getMeetingForConference(tenantId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, tenantId },
      select: meetingForConferenceSelect
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  private async getActiveIntegration(tenantId: string, providers: IntegrationProvider[]) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        tenantId,
        provider: { in: providers },
        enabled: true,
        status: IntegrationStatus.ACTIVE
      },
      select: {
        id: true,
        provider: true,
        name: true,
        config: true,
        encryptedSecrets: true,
        scopes: true
      },
      orderBy: [{ updatedAt: 'desc' }]
    });
    if (!integration) {
      throw new BadRequestException(`${providers.join('/')} integration is not connected for this tenant`);
    }
    return integration;
  }

  private async requestJson(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new BadRequestException(`Provider returned HTTP ${response.status}: ${text.slice(0, 1000)}`);
      }
      return body;
    } finally {
      clearTimeout(timeout);
    }
  }

  private providerReadiness(
    active: Array<{ provider: IntegrationProvider; id: string; name: string; scopes: string[] }>,
    providers: IntegrationProvider[]
  ) {
    const integration = active.find((item) => providers.includes(item.provider));
    return {
      connected: Boolean(integration),
      integrationId: integration?.id,
      name: integration?.name,
      scopes: integration?.scopes ?? []
    };
  }

  private meetingEmails(meeting: MeetingForConference) {
    return this.uniqueStrings([
      meeting.host?.email,
      ...meeting.attendees.map((attendee) => attendee.email ?? attendee.user?.email)
    ]);
  }

  private firstEmailDestination(job: ReminderJobRecord) {
    return this.firstString(
      job.meeting.host?.email,
      ...job.meeting.attendees.map((attendee) => attendee.email ?? attendee.user?.email)
    );
  }

  private firstPhoneDestination(job: ReminderJobRecord) {
    const payload = this.asRecord(job.payload);
    return this.firstString(payload.phone, payload.guestPhone, payload.whatsappTo);
  }

  private providerForChannel(channel: MeetingReminderChannel) {
    if (channel === MeetingReminderChannel.EMAIL) return this.configService.get<string>('mail.provider', 'none');
    if (channel === MeetingReminderChannel.WHATSAPP) return 'whatsapp_cloud_api';
    if (channel === MeetingReminderChannel.IN_APP) return 'taskbricks';
    return channel.toLowerCase();
  }

  private assertCanChangeProviderSettings(
    user: AuthenticatedUser,
    settings: Prisma.MeetingIntegrationSettingsGetPayload<{ select: typeof meetingIntegrationSettingsSelect }>,
    dto: UpdateMeetingIntegrationSettingsDto
  ) {
    const calendarProviderChange =
      dto.calendarSyncEnabled === true ||
      dto.defaultConferenceProvider !== undefined ||
      dto.allowedConferenceProviders?.some((provider) => this.isCalendarProvider(provider));
    if (calendarProviderChange) {
      this.assertAllowedByPolicy(
        user,
        settings.calendarConnectionPermissions,
        'Cannot connect or configure calendar providers for this tenant'
      );
    }

    if (dto.whatsappRemindersEnabled === true || dto.defaultReminderChannels?.includes(MeetingReminderChannel.WHATSAPP)) {
      this.assertAllowedByPolicy(
        user,
        settings.whatsappConnectionPermissions,
        'Cannot connect or configure WhatsApp reminders for this tenant'
      );
    }
  }

  private assertCanUseConferenceProvider(
    user: AuthenticatedUser,
    settings: Prisma.MeetingIntegrationSettingsGetPayload<{ select: typeof meetingIntegrationSettingsSelect }>,
    provider: MeetingConferenceProvider
  ) {
    if (!this.isCalendarProvider(provider)) return;
    this.assertAllowedByPolicy(
      user,
      settings.calendarConnectionPermissions,
      'Cannot create calendar or video conference links for this tenant'
    );
  }

  private isCalendarProvider(provider: MeetingConferenceProvider) {
    const providers: MeetingConferenceProvider[] = [
      MeetingConferenceProvider.GOOGLE_CALENDAR,
      MeetingConferenceProvider.GOOGLE_MEET,
      MeetingConferenceProvider.MICROSOFT_TEAMS,
      MeetingConferenceProvider.ZOOM
    ];
    return providers.includes(provider);
  }

  private assertAllowedByPolicy(user: AuthenticatedUser, permissions: string[], message: string) {
    if (user.permissions.includes('manage:all')) return;
    if (permissions.some((permission) => user.permissions.includes(permission))) return;
    throw new ForbiddenException(message);
  }

  private decryptSecrets(value: unknown): Record<string, string> {
    const record = this.asRecord(value);
    return Object.fromEntries(
      Object.entries(record)
        .map(([key, secretValue]) => [key, this.decryptSecret(secretValue)])
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
  }

  private decryptSecret(value: unknown) {
    if (typeof value === 'string') return value;
    const envelope = this.asRecord(value) as SecretEnvelope;
    if (
      envelope.alg !== 'aes-256-gcm' ||
      typeof envelope.iv !== 'string' ||
      typeof envelope.tag !== 'string' ||
      typeof envelope.ciphertext !== 'string'
    ) {
      return null;
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(envelope.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final()
    ]);
    return plaintext.toString('utf8');
  }

  private encryptionKey() {
    const configured =
      this.configService.get<string>('security.encryptionKey') ||
      this.configService.get<string>('jwt.accessSecret') ||
      'taskbricks-local-development-fallback-key';
    return createHash('sha256').update(configured).digest();
  }

  private assertCanManageMeetings(user: AuthenticatedUser) {
    if (
      user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:tenant') ||
      user.permissions.includes('manage:meetings') ||
      user.permissions.includes('manage:integrations')
    ) {
      return;
    }
    throw new ForbiddenException('Cannot manage meeting integrations');
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new BadRequestException('Value must be JSON serializable');
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  }

  private asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private firstString(...values: unknown[]) {
    return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
  }

  private uniqueStrings(values: Array<string | null | undefined>) {
    return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
  }

  private uniqueEnumValues<T extends string>(values: T[]) {
    return [...new Set(values)];
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private reminderTime(startAt: Date, offsetMinutes: number) {
    return new Date(startAt.getTime() - offsetMinutes * 60_000);
  }

  private nextRetryAt(attempts: number) {
    const delayMinutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  private formatDate(value: Date) {
    return value.toISOString();
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown meeting integration error';
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
