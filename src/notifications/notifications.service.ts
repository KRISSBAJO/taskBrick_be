import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RealtimeGateway } from '../collaboration/realtime.gateway';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationDeliveryQueryDto } from './dto/notification-delivery-query.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const notificationSelect = {
  id: true,
  tenantId: true,
  userId: true,
  templateId: true,
  title: true,
  body: true,
  channel: true,
  readAt: true,
  data: true,
  createdAt: true,
  template: {
    select: {
      id: true,
      key: true,
      name: true,
      channel: true
    }
  },
  deliveries: {
    select: {
      id: true,
      channel: true,
      status: true,
      attempts: true,
      provider: true,
      providerMessageId: true,
      lastError: true,
      nextAttemptAt: true,
      sentAt: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: [{ createdAt: 'asc' as const }]
  }
} satisfies Prisma.NotificationSelect;

type NotificationResponse = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

const templateSelect = {
  id: true,
  tenantId: true,
  key: true,
  name: true,
  subject: true,
  body: true,
  channel: true,
  isActive: true,
  config: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      notifications: true
    }
  }
} satisfies Prisma.NotificationTemplateSelect;

const deliverySelect = {
  id: true,
  tenantId: true,
  notificationId: true,
  userId: true,
  channel: true,
  status: true,
  attempts: true,
  provider: true,
  providerMessageId: true,
  lastError: true,
  nextAttemptAt: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
  notification: {
    select: {
      id: true,
      title: true,
      body: true,
      channel: true,
      readAt: true,
      createdAt: true
    }
  }
} satisfies Prisma.NotificationDeliverySelect;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  async list(user: AuthenticatedUser, query: NotificationQueryDto) {
    this.assertCanReadUserNotifications(user, query.userId);
    const targetUserId = query.userId ?? user.id;
    const where: Prisma.NotificationWhereInput = {
      tenantId: user.tenantId,
      userId: targetUserId,
      channel: query.channel,
      readAt: query.unreadOnly ? null : undefined,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { body: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        select: notificationSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.notification.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async unreadCount(user: AuthenticatedUser) {
    const total = await this.prisma.notification.count({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        readAt: null
      }
    });

    return { total };
  }

  async get(user: AuthenticatedUser, notificationId: string) {
    return this.getNotificationOrThrow(user, notificationId);
  }

  async create(user: AuthenticatedUser, dto: CreateNotificationDto, meta: RequestMeta) {
    const userIds = [...new Set(dto.userIds)];
    await this.assertUsersBelongToTenant(user.tenantId, userIds);

    const template = await this.resolveTemplate(user.tenantId, dto);
    const requestedChannels = this.uniqueChannels(
      dto.channels?.length ? dto.channels : [template?.channel ?? NotificationChannel.IN_APP]
    );
    const data = dto.data ? this.toJsonValue(dto.data) : undefined;
    const variables = dto.variables ?? {};
    const createdNotifications: NotificationResponse[] = [];
    const skippedDeliveries: Array<{ userId: string; channel: NotificationChannel; reason: string }> = [];

    for (const userId of userIds) {
      const preferences = await this.getPreferenceMap(userId);

      for (const channel of requestedChannels) {
        const enabled = dto.critical || channel === NotificationChannel.IN_APP || preferences.get(channel) !== false;

        if (!enabled) {
          skippedDeliveries.push({ userId, channel, reason: 'notification preference disabled' });
          continue;
        }

        const title = this.renderTemplate(template?.subject ?? dto.title, variables);
        const body = this.renderTemplate(template?.body ?? dto.body ?? '', variables) || null;
        const notification = await this.prisma.notification.create({
          data: {
            tenantId: user.tenantId,
            userId,
            templateId: template?.id,
            title,
            body,
            channel,
            data,
            deliveries: {
              create: {
                tenantId: user.tenantId,
                userId,
                channel,
                status:
                  channel === NotificationChannel.IN_APP
                    ? NotificationDeliveryStatus.SENT
                    : NotificationDeliveryStatus.PENDING,
                sentAt: channel === NotificationChannel.IN_APP ? new Date() : undefined
              }
            }
          },
          select: notificationSelect
        });

        createdNotifications.push(notification);

        if (channel === NotificationChannel.IN_APP) {
          this.realtimeGateway.emitNotificationCreated(
            userId,
            notification as unknown as Record<string, unknown>
          );
        }
      }
    }

    await this.recordAudit(user, 'notification.create', 'Notification', user.tenantId, undefined, {
      userIds,
      channels: requestedChannels,
      created: createdNotifications.length,
      skipped: skippedDeliveries.length
    }, meta);

    return {
      data: createdNotifications,
      skippedDeliveries
    };
  }

  async markRead(user: AuthenticatedUser, notificationId: string) {
    await this.getNotificationOrThrow(user, notificationId);

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
      select: notificationSelect
    });
  }

  async markUnread(user: AuthenticatedUser, notificationId: string) {
    await this.getNotificationOrThrow(user, notificationId);

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: null },
      select: notificationSelect
    });
  }

  async markAllRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    return { success: true, updated: result.count };
  }

  async delete(user: AuthenticatedUser, notificationId: string) {
    await this.getNotificationOrThrow(user, notificationId);
    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  async deleteRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        readAt: { not: null }
      }
    });

    return { success: true, deleted: result.count };
  }

  async listPreferences(user: AuthenticatedUser) {
    const saved = await this.prisma.notificationPreference.findMany({
      where: { userId: user.id },
      orderBy: [{ channel: 'asc' }]
    });
    const savedByChannel = new Map(saved.map((preference) => [preference.channel, preference]));

    return Object.values(NotificationChannel).map((channel) => {
      const savedPreference = savedByChannel.get(channel);

      return {
        id: savedPreference?.id ?? null,
        userId: user.id,
        channel,
        enabled: channel === NotificationChannel.IN_APP ? true : savedPreference?.enabled ?? true,
        locked: channel === NotificationChannel.IN_APP
      };
    });
  }

  async updatePreferences(user: AuthenticatedUser, dto: UpdateNotificationPreferencesDto) {
    for (const preference of dto.preferences) {
      if (preference.channel === NotificationChannel.IN_APP && !preference.enabled) {
        throw new BadRequestException('In-app notifications cannot be disabled');
      }
    }

    await this.prisma.$transaction(
      dto.preferences.map((preference) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_channel: {
              userId: user.id,
              channel: preference.channel
            }
          },
          update: { enabled: preference.channel === NotificationChannel.IN_APP ? true : preference.enabled },
          create: {
            userId: user.id,
            channel: preference.channel,
            enabled: preference.channel === NotificationChannel.IN_APP ? true : preference.enabled
          }
        })
      )
    );

    return this.listPreferences(user);
  }

  async listTemplates(user: AuthenticatedUser, query: PaginationQueryDto) {
    const where: Prisma.NotificationTemplateWhereInput = {
      tenantId: user.tenantId,
      ...(query.search
        ? {
            OR: [
              { key: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificationTemplate.findMany({
        where,
        select: templateSelect,
        orderBy: [{ key: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.notificationTemplate.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createTemplate(
    user: AuthenticatedUser,
    dto: CreateNotificationTemplateDto,
    meta: RequestMeta
  ) {
    try {
      const template = await this.prisma.notificationTemplate.create({
        data: {
          tenantId: user.tenantId,
          key: dto.key,
          name: dto.name,
          subject: dto.subject,
          body: dto.body,
          channel: dto.channel,
          isActive: dto.isActive,
          config: dto.config ? this.toJsonValue(dto.config) : undefined
        },
        select: templateSelect
      });

      await this.recordAudit(user, 'notification_template.create', 'NotificationTemplate', template.id, undefined, {
        key: template.key,
        channel: template.channel
      }, meta);

      return template;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Notification template key already exists for this channel');
      }
      throw error;
    }
  }

  async updateTemplate(
    user: AuthenticatedUser,
    templateId: string,
    dto: UpdateNotificationTemplateDto,
    meta: RequestMeta
  ) {
    const before = await this.getTemplateOrThrow(user.tenantId, templateId);

    try {
      const template = await this.prisma.notificationTemplate.update({
        where: { id: templateId },
        data: {
          key: dto.key,
          name: dto.name,
          subject: dto.subject,
          body: dto.body,
          channel: dto.channel,
          isActive: dto.isActive,
          config: dto.config ? this.toJsonValue(dto.config) : undefined
        },
        select: templateSelect
      });

      await this.recordAudit(user, 'notification_template.update', 'NotificationTemplate', templateId, {
        key: before.key,
        channel: before.channel,
        isActive: before.isActive
      }, {
        key: template.key,
        channel: template.channel,
        isActive: template.isActive
      }, meta);

      return template;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Notification template key already exists for this channel');
      }
      throw error;
    }
  }

  async deleteTemplate(user: AuthenticatedUser, templateId: string, meta: RequestMeta) {
    const template = await this.getTemplateOrThrow(user.tenantId, templateId);

    await this.prisma.notificationTemplate.delete({ where: { id: templateId } });
    await this.recordAudit(user, 'notification_template.delete', 'NotificationTemplate', templateId, {
      key: template.key,
      channel: template.channel
    }, undefined, meta);

    return { success: true };
  }

  async listDeliveries(user: AuthenticatedUser, query: NotificationDeliveryQueryDto) {
    const where: Prisma.NotificationDeliveryWhereInput = {
      tenantId: user.tenantId,
      notificationId: query.notificationId,
      userId: query.userId,
      channel: query.channel,
      status: query.status,
      ...(query.search
        ? {
            notification: {
              title: { contains: query.search, mode: 'insensitive' }
            }
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificationDelivery.findMany({
        where,
        select: deliverySelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.notificationDelivery.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async updateDeliveryStatus(
    user: AuthenticatedUser,
    deliveryId: string,
    dto: UpdateDeliveryStatusDto,
    meta: RequestMeta
  ) {
    const before = await this.getDeliveryOrThrow(user.tenantId, deliveryId);
    const delivery = await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: dto.status,
        attempts: dto.attempts,
        provider: dto.provider,
        providerMessageId: dto.providerMessageId,
        lastError: dto.lastError,
        sentAt: dto.status === NotificationDeliveryStatus.SENT ? new Date() : undefined,
        nextAttemptAt:
          dto.status === NotificationDeliveryStatus.FAILED
            ? new Date(Date.now() + 5 * 60 * 1000)
            : null
      },
      select: deliverySelect
    });

    await this.recordAudit(user, 'notification_delivery.update', 'NotificationDelivery', deliveryId, {
      status: before.status,
      attempts: before.attempts
    }, {
      status: delivery.status,
      attempts: delivery.attempts
    }, meta);

    return delivery;
  }

  async retryDelivery(user: AuthenticatedUser, deliveryId: string, meta: RequestMeta) {
    const before = await this.getDeliveryOrThrow(user.tenantId, deliveryId);

    if (before.status === NotificationDeliveryStatus.SENT) {
      throw new BadRequestException('Sent deliveries cannot be retried');
    }

    const delivery = await this.prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: NotificationDeliveryStatus.PENDING,
        attempts: before.attempts + 1,
        lastError: null,
        nextAttemptAt: null
      },
      select: deliverySelect
    });

    await this.recordAudit(user, 'notification_delivery.retry', 'NotificationDelivery', deliveryId, {
      status: before.status,
      attempts: before.attempts
    }, {
      status: delivery.status,
      attempts: delivery.attempts
    }, meta);

    return delivery;
  }

  private assertCanReadUserNotifications(user: AuthenticatedUser, userId?: string) {
    if (!userId || userId === user.id) {
      return;
    }

    if (user.permissions.includes('manage:all') || user.permissions.includes('manage:users')) {
      return;
    }

    throw new ForbiddenException('Cannot read notifications for another user');
  }

  private async getNotificationOrThrow(user: AuthenticatedUser, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        tenantId: user.tenantId,
        userId: user.permissions.includes('manage:all') ? undefined : user.id
      },
      select: notificationSelect
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  private async resolveTemplate(tenantId: string, dto: CreateNotificationDto) {
    if (dto.templateId) {
      return this.getTemplateOrThrow(tenantId, dto.templateId, true);
    }

    if (dto.templateKey) {
      const template = await this.prisma.notificationTemplate.findFirst({
        where: {
          tenantId,
          key: dto.templateKey,
          isActive: true,
          channel: dto.channels?.length === 1 ? dto.channels[0] : undefined
        },
        select: templateSelect,
        orderBy: [{ channel: 'asc' }]
      });

      if (!template) {
        throw new NotFoundException('Notification template not found');
      }

      return template;
    }

    return null;
  }

  private async getTemplateOrThrow(tenantId: string, templateId: string, activeOnly = false) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        id: templateId,
        tenantId,
        isActive: activeOnly ? true : undefined
      },
      select: templateSelect
    });

    if (!template) {
      throw new NotFoundException('Notification template not found');
    }

    return template;
  }

  private async getDeliveryOrThrow(tenantId: string, deliveryId: string) {
    const delivery = await this.prisma.notificationDelivery.findFirst({
      where: {
        id: deliveryId,
        tenantId
      },
      select: deliverySelect
    });

    if (!delivery) {
      throw new NotFoundException('Notification delivery not found');
    }

    return delivery;
  }

  private async assertUsersBelongToTenant(tenantId: string, userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: userIds }
      },
      select: { id: true }
    });

    if (users.length !== new Set(userIds).size) {
      throw new NotFoundException('One or more users were not found');
    }
  }

  private async getPreferenceMap(userId: string) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
      select: { channel: true, enabled: true }
    });

    return new Map(preferences.map((preference) => [preference.channel, preference.enabled]));
  }

  private uniqueChannels(channels: NotificationChannel[]) {
    return [...new Set(channels)];
  }

  private renderTemplate(template: string, variables: Record<string, unknown>) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
      const value = variables[key];
      return value === undefined || value === null ? '' : String(value);
    });
  }

  private async recordAudit(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: Record<string, unknown> | undefined,
    newValue: Record<string, unknown> | undefined,
    meta: RequestMeta
  ) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? this.toJsonValue(oldValue) : undefined,
      newValue: newValue ? this.toJsonValue(newValue) : undefined,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
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

  private isUniqueConstraintError(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
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
}
