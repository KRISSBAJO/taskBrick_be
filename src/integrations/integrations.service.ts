import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationProvider,
  IntegrationStatus,
  Prisma,
  TaskPriority,
  TaskStatus,
  TaskType,
  WebhookDeliveryStatus
} from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID
} from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { IntegrationLogQueryDto } from './dto/integration-log-query.dto';
import { IntegrationQueryDto } from './dto/integration-query.dto';
import { OmoFlowRuntimeEventDto } from './dto/omoflow-runtime-event.dto';
import { RotateIntegrationSecretDto } from './dto/rotate-integration-secret.dto';
import { RotateWebhookSecretDto } from './dto/rotate-webhook-secret.dto';
import { SyncIntegrationDto } from './dto/sync-integration.dto';
import { TriggerWebhookEventDto } from './dto/trigger-webhook-event.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { UpdateWebhookDeliveryStatusDto } from './dto/update-webhook-delivery-status.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookDeliveryQueryDto } from './dto/webhook-delivery-query.dto';
import { WebhookQueryDto } from './dto/webhook-query.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface SecretEnvelope {
  v: number;
  alg: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
}

const integrationSelect = {
  id: true,
  tenantId: true,
  provider: true,
  name: true,
  config: true,
  encryptedSecrets: true,
  externalAccountId: true,
  scopes: true,
  enabled: true,
  status: true,
  lastSyncAt: true,
  lastError: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      logs: true
    }
  }
} satisfies Prisma.IntegrationSelect;

const integrationLogSelect = {
  id: true,
  tenantId: true,
  integrationId: true,
  level: true,
  eventType: true,
  message: true,
  data: true,
  createdAt: true
} satisfies Prisma.IntegrationLogSelect;

const webhookSelect = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  url: true,
  secret: true,
  signingAlgorithm: true,
  events: true,
  enabled: true,
  failureCount: true,
  lastDeliveryAt: true,
  lastError: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      deliveries: true
    }
  }
} satisfies Prisma.WebhookSelect;

const webhookDeliverySelect = {
  id: true,
  tenantId: true,
  webhookId: true,
  eventType: true,
  payload: true,
  status: true,
  attempts: true,
  nextAttemptAt: true,
  lastError: true,
  responseStatus: true,
  responseBody: true,
  requestHeaders: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
  webhook: {
    select: {
      id: true,
      tenantId: true,
      name: true,
      url: true,
      secret: true,
      signingAlgorithm: true,
      enabled: true,
      events: true
    }
  }
} satisfies Prisma.WebhookDeliverySelect;

type IntegrationRecord = Prisma.IntegrationGetPayload<{ select: typeof integrationSelect }>;
type WebhookRecord = Prisma.WebhookGetPayload<{ select: typeof webhookSelect }>;
type WebhookDeliveryRecord = Prisma.WebhookDeliveryGetPayload<{
  select: typeof webhookDeliverySelect;
}>;

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {}

  status() {
    return {
      module: 'integrations',
      status: 'ready',
      providers: Object.values(IntegrationProvider),
      encryptionConfigured: Boolean(
        this.configService.get<string>('security.encryptionKey') ||
          this.configService.get<string>('jwt.accessSecret')
      ),
      webhookSigningConfigured: Boolean(
        this.configService.get<string>('integrations.webhookSigningSecret')
      )
    };
  }

  async listIntegrations(user: AuthenticatedUser, query: IntegrationQueryDto) {
    const where: Prisma.IntegrationWhereInput = {
      tenantId: user.tenantId,
      provider: query.provider,
      status: query.status,
      enabled: query.enabled,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { externalAccountId: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.integration.findMany({
        where,
        select: integrationSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.integration.count({ where })
    ]);

    return this.paginate(data.map((integration) => this.integrationResponse(integration)), total, query);
  }

  async createIntegration(
    user: AuthenticatedUser,
    dto: CreateIntegrationDto,
    meta: RequestMeta
  ) {
    this.assertCanManageIntegrations(user);
    const enabled = dto.enabled ?? true;
    try {
      const integration = await this.prisma.integration.create({
        data: {
          tenantId: user.tenantId,
          provider: dto.provider,
          name: dto.name.trim(),
          config: this.toJson(dto.config),
          encryptedSecrets: this.encryptSecrets(dto.secrets),
          externalAccountId: dto.externalAccountId,
          scopes: this.normalizeStringArray(dto.scopes),
          enabled,
          status: enabled ? IntegrationStatus.ACTIVE : IntegrationStatus.DISABLED,
          createdById: user.id
        },
        select: integrationSelect
      });

      await this.logIntegration(
        user.tenantId,
        integration.id,
        'integration.created',
        'Integration created',
        'INFO',
        { provider: integration.provider, name: integration.name }
      );
      await this.recordAudit(user, 'integration.create', 'Integration', integration.id, undefined, {
        provider: integration.provider,
        name: integration.name
      }, meta);

      return this.integrationResponse(integration);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Integration provider and name already exist');
      }
      throw error;
    }
  }

  async getIntegration(user: AuthenticatedUser, integrationId: string) {
    const integration = await this.getIntegrationOrThrow(user.tenantId, integrationId);
    return this.integrationResponse(integration);
  }

  async updateIntegration(
    user: AuthenticatedUser,
    integrationId: string,
    dto: UpdateIntegrationDto,
    meta: RequestMeta
  ) {
    this.assertCanManageIntegrations(user);
    const before = await this.getIntegrationOrThrow(user.tenantId, integrationId);
    const enabled = dto.enabled;
    const status =
      dto.status ??
      (enabled === false
        ? IntegrationStatus.DISABLED
        : enabled === true && before.status === IntegrationStatus.DISABLED
          ? IntegrationStatus.ACTIVE
          : undefined);
    const encryptedSecrets =
      dto.secrets === undefined
        ? undefined
        : this.encryptSecrets({
            ...this.decryptSecrets(before.encryptedSecrets),
            ...this.validateSecretRecord(dto.secrets)
          });

    try {
      const integration = await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          name: dto.name?.trim(),
          config: dto.config === undefined ? undefined : this.toJson(dto.config),
          encryptedSecrets,
          externalAccountId: dto.externalAccountId,
          scopes: dto.scopes === undefined ? undefined : this.normalizeStringArray(dto.scopes),
          enabled,
          status,
          lastError: status === IntegrationStatus.ACTIVE ? null : undefined
        },
        select: integrationSelect
      });

      await this.logIntegration(
        user.tenantId,
        integration.id,
        'integration.updated',
        'Integration updated',
        'INFO',
        { changedSecrets: dto.secrets ? Object.keys(dto.secrets) : [] }
      );
      await this.recordAudit(user, 'integration.update', 'Integration', integration.id, {
        name: before.name,
        enabled: before.enabled,
        status: before.status
      }, {
        name: integration.name,
        enabled: integration.enabled,
        status: integration.status
      }, meta);

      return this.integrationResponse(integration);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Integration provider and name already exist');
      }
      throw error;
    }
  }

  async deleteIntegration(user: AuthenticatedUser, integrationId: string, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const integration = await this.getIntegrationOrThrow(user.tenantId, integrationId);
    await this.prisma.integration.delete({ where: { id: integrationId } });
    await this.recordAudit(user, 'integration.delete', 'Integration', integrationId, {
      provider: integration.provider,
      name: integration.name
    }, undefined, meta);
    return { success: true };
  }

  async enableIntegration(user: AuthenticatedUser, integrationId: string, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const integration = await this.setIntegrationEnabled(user, integrationId, true, meta);
    return this.integrationResponse(integration);
  }

  async disableIntegration(user: AuthenticatedUser, integrationId: string, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const integration = await this.setIntegrationEnabled(user, integrationId, false, meta);
    return this.integrationResponse(integration);
  }

  async rotateIntegrationSecret(
    user: AuthenticatedUser,
    integrationId: string,
    dto: RotateIntegrationSecretDto,
    meta: RequestMeta
  ) {
    this.assertCanManageIntegrations(user);
    const before = await this.getIntegrationOrThrow(user.tenantId, integrationId);
    const secrets = {
      ...this.decryptSecrets(before.encryptedSecrets),
      [dto.key.trim()]: dto.value
    };
    const integration = await this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        encryptedSecrets: this.encryptSecrets(secrets),
        status: before.enabled ? IntegrationStatus.ACTIVE : IntegrationStatus.DISABLED,
        lastError: null
      },
      select: integrationSelect
    });

    await this.logIntegration(
      user.tenantId,
      integration.id,
      'integration.secret_rotated',
      `Integration secret rotated: ${dto.key.trim()}`,
      'INFO',
      { key: dto.key.trim() }
    );
    await this.recordAudit(user, 'integration.secret_rotate', 'Integration', integration.id, {
      secretKeys: this.secretKeys(before.encryptedSecrets)
    }, {
      secretKeys: this.secretKeys(integration.encryptedSecrets)
    }, meta);

    return this.integrationResponse(integration);
  }

  async syncIntegration(
    user: AuthenticatedUser,
    integrationId: string,
    dto: SyncIntegrationDto,
    meta: RequestMeta
  ) {
    this.assertCanManageIntegrations(user);
    const before = await this.getIntegrationOrThrow(user.tenantId, integrationId);
    if (!before.enabled || before.status === IntegrationStatus.DISABLED) {
      throw new BadRequestException('Integration is disabled');
    }

    await this.logIntegration(
      user.tenantId,
      integrationId,
      'integration.sync_requested',
      'Integration sync requested',
      'INFO',
      {
        mode: dto.mode ?? 'manual',
        cursor: dto.cursor
      }
    );

    const integration = await this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        status: IntegrationStatus.ACTIVE,
        lastSyncAt: new Date(),
        lastError: null
      },
      select: integrationSelect
    });

    await this.logIntegration(
      user.tenantId,
      integrationId,
      'integration.sync_completed',
      'Integration sync marked complete for worker handoff',
      'INFO',
      {
        mode: dto.mode ?? 'manual',
        cursor: dto.cursor,
        payload: dto.payload
      }
    );
    await this.recordAudit(user, 'integration.sync', 'Integration', integration.id, {
      lastSyncAt: before.lastSyncAt?.toISOString()
    }, {
      lastSyncAt: integration.lastSyncAt?.toISOString()
    }, meta);

    return {
      integration: this.integrationResponse(integration),
      queued: true,
      message: 'Sync request accepted; provider-specific workers can consume the integration log'
    };
  }

  async processOmoFlowEvent(user: AuthenticatedUser, dto: OmoFlowRuntimeEventDto, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const integration = await this.ensureOmoFlowIntegration(user);

    const duplicate = await this.prisma.integrationLog.findFirst({
      where: {
        tenantId: user.tenantId,
        integrationId: integration.id,
        eventType: 'omoflow.event_processed',
        data: {
          path: ['eventId'],
          equals: dto.eventId
        }
      },
      select: integrationLogSelect
    });

    if (duplicate) {
      return {
        idempotent: true,
        eventId: dto.eventId,
        integration: this.integrationResponse(integration),
        mappedTasks: [],
        message: 'OmoFlow event was already processed'
      };
    }

    await this.logIntegration(
      user.tenantId,
      integration.id,
      'omoflow.event_received',
      `Received OmoFlow event ${dto.eventType}`,
      'INFO',
      {
        eventId: dto.eventId,
        eventType: dto.eventType,
        projectId: dto.projectId,
        meetingId: dto.meeting?.id
      }
    );

    const mappedTasks = dto.projectId
      ? await this.mapOmoFlowActionItemsToTasks(user, dto)
      : [];

    await this.logIntegration(
      user.tenantId,
      integration.id,
      'omoflow.event_processed',
      `Processed OmoFlow event ${dto.eventType}`,
      'INFO',
      {
        eventId: dto.eventId,
        eventType: dto.eventType,
        projectId: dto.projectId,
        meeting: dto.meeting,
        actionItemCount: dto.actionItems?.length ?? 0,
        mappedTaskIds: mappedTasks.map((task) => task.id)
      }
    );

    await this.recordAudit(user, 'omoflow.event_process', 'OmoFlowEvent', dto.eventId, undefined, this.toJson({
      eventType: dto.eventType,
      projectId: dto.projectId,
      mappedTaskIds: mappedTasks.map((task) => task.id)
    }), meta);

    return {
      idempotent: false,
      eventId: dto.eventId,
      integration: this.integrationResponse(integration),
      mappedTasks,
      message: dto.projectId
        ? `Processed event and mapped ${mappedTasks.length} action item${mappedTasks.length === 1 ? '' : 's'}`
        : 'Processed event without task mapping because no projectId was supplied'
    };
  }

  async listIntegrationLogs(
    user: AuthenticatedUser,
    integrationId: string,
    query: IntegrationLogQueryDto
  ) {
    await this.getIntegrationOrThrow(user.tenantId, integrationId);
    const where: Prisma.IntegrationLogWhereInput = {
      tenantId: user.tenantId,
      integrationId,
      level: query.level?.toUpperCase(),
      eventType: query.eventType,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { message: { contains: query.search, mode: 'insensitive' } },
              { eventType: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.integrationLog.findMany({
        where,
        select: integrationLogSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.integrationLog.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async listWebhooks(user: AuthenticatedUser, query: WebhookQueryDto) {
    const eventType = query.eventType ? this.normalizeEventType(query.eventType) : undefined;
    const where: Prisma.WebhookWhereInput = {
      tenantId: user.tenantId,
      enabled: query.enabled,
      ...(eventType
        ? {
            OR: [
              { events: { has: eventType } },
              { events: { has: '*' } }
            ]
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { url: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhook.findMany({
        where,
        select: webhookSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.webhook.count({ where })
    ]);

    return this.paginate(data.map((webhook) => this.webhookResponse(webhook)), total, query);
  }

  async createWebhook(user: AuthenticatedUser, dto: CreateWebhookDto, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const signingSecret = dto.secret ?? this.generateSecret();
    const webhook = await this.prisma.webhook.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        description: dto.description,
        url: dto.url.trim(),
        secret: this.encryptSingleSecret(signingSecret),
        signingAlgorithm: dto.signingAlgorithm ?? 'hmac-sha256',
        events: this.normalizeEvents(dto.events),
        enabled: dto.enabled ?? true,
        createdById: user.id
      },
      select: webhookSelect
    });

    await this.recordAudit(user, 'webhook.create', 'Webhook', webhook.id, undefined, {
      name: webhook.name,
      url: webhook.url,
      events: webhook.events
    }, meta);

    return this.webhookResponse(webhook, signingSecret);
  }

  async getWebhook(user: AuthenticatedUser, webhookId: string) {
    const webhook = await this.getWebhookOrThrow(user.tenantId, webhookId);
    return this.webhookResponse(webhook);
  }

  async updateWebhook(
    user: AuthenticatedUser,
    webhookId: string,
    dto: UpdateWebhookDto,
    meta: RequestMeta
  ) {
    this.assertCanManageIntegrations(user);
    const before = await this.getWebhookOrThrow(user.tenantId, webhookId);
    const webhook = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        name: dto.name?.trim(),
        description: dto.description,
        url: dto.url?.trim(),
        events: dto.events === undefined ? undefined : this.normalizeEvents(dto.events),
        signingAlgorithm: dto.signingAlgorithm,
        enabled: dto.enabled
      },
      select: webhookSelect
    });

    await this.recordAudit(user, 'webhook.update', 'Webhook', webhook.id, {
      name: before.name,
      enabled: before.enabled,
      events: before.events
    }, {
      name: webhook.name,
      enabled: webhook.enabled,
      events: webhook.events
    }, meta);

    return this.webhookResponse(webhook);
  }

  async deleteWebhook(user: AuthenticatedUser, webhookId: string, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const webhook = await this.getWebhookOrThrow(user.tenantId, webhookId);
    await this.prisma.webhook.delete({ where: { id: webhookId } });
    await this.recordAudit(user, 'webhook.delete', 'Webhook', webhookId, {
      name: webhook.name,
      url: webhook.url
    }, undefined, meta);
    return { success: true };
  }

  async enableWebhook(user: AuthenticatedUser, webhookId: string, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const webhook = await this.setWebhookEnabled(user, webhookId, true, meta);
    return this.webhookResponse(webhook);
  }

  async disableWebhook(user: AuthenticatedUser, webhookId: string, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const webhook = await this.setWebhookEnabled(user, webhookId, false, meta);
    return this.webhookResponse(webhook);
  }

  async rotateWebhookSecret(
    user: AuthenticatedUser,
    webhookId: string,
    dto: RotateWebhookSecretDto,
    meta: RequestMeta
  ) {
    this.assertCanManageIntegrations(user);
    const before = await this.getWebhookOrThrow(user.tenantId, webhookId);
    const signingSecret = dto.secret ?? this.generateSecret();
    const webhook = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        secret: this.encryptSingleSecret(signingSecret),
        failureCount: 0,
        lastError: null
      },
      select: webhookSelect
    });
    await this.recordAudit(user, 'webhook.secret_rotate', 'Webhook', webhook.id, {
      hadSecret: Boolean(before.secret)
    }, {
      hasSecret: Boolean(webhook.secret)
    }, meta);
    return this.webhookResponse(webhook, signingSecret);
  }

  async triggerWebhookEvent(
    user: AuthenticatedUser,
    dto: TriggerWebhookEventDto,
    meta: RequestMeta
  ) {
    this.assertCanManageIntegrations(user);
    const eventType = this.normalizeEventType(dto.eventType);
    const eventPayload = {
      id: dto.eventId ?? randomUUID(),
      type: eventType,
      tenantId: user.tenantId,
      createdAt: new Date().toISOString(),
      data: dto.payload ?? {}
    };

    const webhooks = await this.prisma.webhook.findMany({
      where: {
        tenantId: user.tenantId,
        enabled: true,
        OR: [
          { events: { has: eventType } },
          { events: { has: '*' } }
        ]
      },
      select: webhookSelect,
      orderBy: [{ createdAt: 'asc' }]
    });

    const deliveries: Array<{
      delivery: unknown;
      dispatched: boolean;
    }> = [];

    for (const webhook of webhooks) {
      const payloadString = JSON.stringify(eventPayload);
      const headers = this.buildWebhookHeaders(webhook, eventType, payloadString);
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          tenantId: user.tenantId,
          webhookId: webhook.id,
          eventType,
          payload: this.toJson(eventPayload),
          requestHeaders: this.toJson(headers),
          status: WebhookDeliveryStatus.PENDING,
          nextAttemptAt: new Date()
        },
        select: webhookDeliverySelect
      });

      const dispatched = await this.dispatchDelivery(delivery);
      deliveries.push({
        delivery: this.deliveryResponse(dispatched),
        dispatched: dispatched.status === WebhookDeliveryStatus.DELIVERED
      });
    }

    await this.recordAudit(user, 'webhook_event.trigger', 'WebhookEvent', eventPayload.id, undefined, {
      eventType,
      matchedWebhooks: webhooks.length
    }, meta);

    return {
      event: eventPayload,
      matched: webhooks.length,
      deliveries
    };
  }

  async publishTenantEvent(tenantId: string, eventType: string, payload?: unknown) {
    const normalizedEventType = this.normalizeEventType(eventType);
    const namespace = normalizedEventType.includes('.')
      ? `${normalizedEventType.split('.')[0]}.*`
      : undefined;
    const eventPayload = {
      id: randomUUID(),
      type: normalizedEventType,
      tenantId,
      createdAt: new Date().toISOString(),
      data: payload ?? {}
    };

    const webhooks = await this.prisma.webhook.findMany({
      where: {
        tenantId,
        enabled: true,
        OR: [
          { events: { has: normalizedEventType } },
          ...(namespace ? [{ events: { has: namespace } }] : []),
          { events: { has: '*' } }
        ]
      },
      select: webhookSelect,
      orderBy: [{ createdAt: 'asc' }]
    });

    const deliveries: Array<{ delivery: unknown; dispatched: boolean }> = [];

    for (const webhook of webhooks) {
      const payloadString = JSON.stringify(eventPayload);
      const headers = this.buildWebhookHeaders(webhook, normalizedEventType, payloadString);
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          tenantId,
          webhookId: webhook.id,
          eventType: normalizedEventType,
          payload: this.toJson(eventPayload),
          requestHeaders: this.toJson(headers),
          status: WebhookDeliveryStatus.PENDING,
          nextAttemptAt: new Date()
        },
        select: webhookDeliverySelect
      });

      const dispatched = await this.dispatchDelivery(delivery);
      deliveries.push({
        delivery: this.deliveryResponse(dispatched),
        dispatched: dispatched.status === WebhookDeliveryStatus.DELIVERED
      });
    }

    return {
      event: eventPayload,
      matched: webhooks.length,
      deliveries
    };
  }

  async listWebhookDeliveries(user: AuthenticatedUser, query: WebhookDeliveryQueryDto) {
    const where: Prisma.WebhookDeliveryWhereInput = {
      tenantId: user.tenantId,
      webhookId: query.webhookId,
      eventType: query.eventType ? this.normalizeEventType(query.eventType) : undefined,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { eventType: { contains: query.search, mode: 'insensitive' } },
              { lastError: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhookDelivery.findMany({
        where,
        select: webhookDeliverySelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.webhookDelivery.count({ where })
    ]);

    return this.paginate(data.map((delivery) => this.deliveryResponse(delivery)), total, query);
  }

  async getWebhookDelivery(user: AuthenticatedUser, deliveryId: string) {
    const delivery = await this.getWebhookDeliveryOrThrow(user.tenantId, deliveryId);
    return this.deliveryResponse(delivery);
  }

  async retryWebhookDelivery(user: AuthenticatedUser, deliveryId: string, meta: RequestMeta) {
    this.assertCanManageIntegrations(user);
    const delivery = await this.getWebhookDeliveryOrThrow(user.tenantId, deliveryId);
    if (delivery.status === WebhookDeliveryStatus.DELIVERED) {
      throw new ConflictException('Webhook delivery already succeeded');
    }

    const pending = await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.PENDING,
        nextAttemptAt: new Date(),
        lastError: null
      },
      select: webhookDeliverySelect
    });
    const dispatched = await this.dispatchDelivery(pending);

    await this.recordAudit(user, 'webhook_delivery.retry', 'WebhookDelivery', deliveryId, {
      status: delivery.status,
      attempts: delivery.attempts
    }, {
      status: dispatched.status,
      attempts: dispatched.attempts
    }, meta);

    return this.deliveryResponse(dispatched);
  }

  async updateWebhookDeliveryStatus(
    user: AuthenticatedUser,
    deliveryId: string,
    dto: UpdateWebhookDeliveryStatusDto,
    meta: RequestMeta
  ) {
    this.assertCanManageIntegrations(user);
    const before = await this.getWebhookDeliveryOrThrow(user.tenantId, deliveryId);
    const deliveredAt = dto.status === WebhookDeliveryStatus.DELIVERED ? new Date() : undefined;
    const delivery = await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: dto.status,
        responseStatus: dto.responseStatus,
        responseBody: dto.responseBody,
        lastError: dto.lastError,
        deliveredAt,
        nextAttemptAt:
          dto.status === WebhookDeliveryStatus.FAILED ? this.nextRetryAt(before.attempts) : null
      },
      select: webhookDeliverySelect
    });

    await this.prisma.webhook.update({
      where: { id: delivery.webhookId },
      data:
        dto.status === WebhookDeliveryStatus.DELIVERED
          ? {
              failureCount: 0,
              lastError: null,
              lastDeliveryAt: deliveredAt
            }
          : dto.status === WebhookDeliveryStatus.FAILED
            ? {
                failureCount: { increment: 1 },
                lastError: dto.lastError ?? 'Delivery marked failed'
              }
            : {}
    });

    await this.recordAudit(user, 'webhook_delivery.update_status', 'WebhookDelivery', delivery.id, {
      status: before.status
    }, {
      status: delivery.status
    }, meta);

    return this.deliveryResponse(delivery);
  }

  private async dispatchDelivery(delivery: WebhookDeliveryRecord): Promise<WebhookDeliveryRecord> {
    if (!delivery.webhook.enabled) {
      return this.markDeliveryFailed(delivery, 'Webhook is disabled');
    }

    const body = JSON.stringify(delivery.payload ?? {});
    const headers = {
      ...this.asStringRecord(delivery.requestHeaders),
      ...this.buildWebhookHeaders(delivery.webhook, delivery.eventType, body)
    };
    const attempts = delivery.attempts + 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(delivery.webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });
      const responseBody = (await response.text()).slice(0, 2000);

      if (!response.ok) {
        return this.markDeliveryFailed(
          delivery,
          `Webhook endpoint returned HTTP ${response.status}`,
          attempts,
          response.status,
          responseBody
        );
      }

      const deliveredAt = new Date();
      await this.prisma.$transaction([
        this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: WebhookDeliveryStatus.DELIVERED,
            attempts,
            deliveredAt,
            nextAttemptAt: null,
            lastError: null,
            responseStatus: response.status,
            responseBody,
            requestHeaders: this.toJson(headers)
          }
        }),
        this.prisma.webhook.update({
          where: { id: delivery.webhookId },
          data: {
            failureCount: 0,
            lastDeliveryAt: deliveredAt,
            lastError: null
          }
        })
      ]);
      return this.getWebhookDeliveryRecord(delivery.tenantId, delivery.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook delivery failed';
      return this.markDeliveryFailed(delivery, message, attempts);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async ensureOmoFlowIntegration(user: AuthenticatedUser) {
    const candidates = await this.prisma.integration.findMany({
      where: {
        tenantId: user.tenantId,
        provider: IntegrationProvider.CUSTOM
      },
      select: integrationSelect,
      orderBy: [{ updatedAt: 'desc' }]
    });

    const existing = candidates.find((integration) => {
      const config = this.asRecord(integration.config);
      return (
        config.app === 'omoflow' ||
        config.product === 'OmoFlow' ||
        integration.name.toLowerCase().includes('omoflow')
      );
    });

    if (existing) return existing;

    const integration = await this.prisma.integration.create({
      data: {
        tenantId: user.tenantId,
        provider: IntegrationProvider.CUSTOM,
        name: 'OmoFlow runtime',
        config: this.toJson({
          app: 'omoflow',
          product: 'OmoFlow',
          baseUrl: 'https://meeting-backend-tg9d.onrender.com/api',
          runtime: true,
          mapping: {
            meetingsToProjects: true,
            agendasToTasks: true,
            actionItemsToBoard: true
          }
        }),
        externalAccountId: 'omoflow-runtime',
        scopes: ['meetings:read', 'agendas:read', 'tasks:sync', 'webhooks:receive'],
        enabled: true,
        status: IntegrationStatus.ACTIVE,
        createdById: user.id
      },
      select: integrationSelect
    });

    await this.logIntegration(
      user.tenantId,
      integration.id,
      'omoflow.runtime_created',
      'OmoFlow runtime integration created automatically',
      'INFO',
      { baseUrl: 'https://meeting-backend-tg9d.onrender.com/api' }
    );

    return integration;
  }

  private async mapOmoFlowActionItemsToTasks(
    user: AuthenticatedUser,
    dto: OmoFlowRuntimeEventDto
  ) {
    const actionItems = dto.actionItems ?? [];
    if (!dto.projectId || !actionItems.length) return [];

    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        tenantId: user.tenantId
      },
      select: {
        id: true,
        key: true
      }
    });

    if (!project) throw new NotFoundException('Project not found for OmoFlow task mapping');

    const assigneeEmails = [
      ...new Set(actionItems.map((item) => item.assigneeEmail?.trim().toLowerCase()).filter(Boolean))
    ] as string[];
    const assignees = assigneeEmails.length
      ? await this.prisma.user.findMany({
          where: {
            tenantId: user.tenantId,
            email: { in: assigneeEmails }
          },
          select: { id: true, email: true }
        })
      : [];
    const assigneesByEmail = new Map(assignees.map((assignee) => [assignee.email.toLowerCase(), assignee]));
    const existingCount = await this.prisma.task.count({ where: { projectId: project.id } });

    return this.prisma.$transaction(async (tx) => {
      const createdTasks: Array<{
        id: string;
        projectId: string;
        key: string;
        title: string;
        description: string | null;
        status: TaskStatus;
        priority: TaskPriority;
        dueDate: Date | null;
        storyPoints: number | null;
        createdAt: Date;
      }> = [];

      for (const [index, actionItem] of actionItems.entries()) {
        const assignee = actionItem.assigneeEmail
          ? assigneesByEmail.get(actionItem.assigneeEmail.trim().toLowerCase())
          : undefined;
        const task = await tx.task.create({
          data: {
            tenantId: user.tenantId,
            projectId: project.id,
            reporterId: user.id,
            key: `${project.key.toUpperCase()}-${existingCount + index + 1}`,
            title: actionItem.title,
            description: this.omoflowTaskDescription(dto, actionItem.description),
            type: TaskType.TASK,
            status: TaskStatus.TODO,
            priority: actionItem.priority ?? TaskPriority.MEDIUM,
            dueDate: actionItem.dueDate ? new Date(actionItem.dueDate) : undefined,
            storyPoints: typeof actionItem.storyPoints === 'number' ? actionItem.storyPoints : undefined,
            sortOrder: existingCount + index
          },
          select: {
            id: true,
            projectId: true,
            key: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            storyPoints: true,
            createdAt: true
          }
        });

        if (assignee) {
          await tx.taskAssignee.create({
            data: {
              taskId: task.id,
              userId: assignee.id
            }
          });
        }

        await tx.taskActivity.create({
          data: {
            taskId: task.id,
            actorId: user.id,
            action: 'omoflow.action_item_import',
            oldValue: Prisma.JsonNull,
            newValue: this.toJson({
              eventId: dto.eventId,
              eventType: dto.eventType,
              meetingId: dto.meeting?.id,
              assigneeEmail: actionItem.assigneeEmail
            }) ?? Prisma.JsonNull
          }
        });

        createdTasks.push(task);
      }

      return createdTasks;
    });
  }

  private omoflowTaskDescription(dto: OmoFlowRuntimeEventDto, actionDescription?: string) {
    return [
      actionDescription,
      dto.meeting?.title ? `Source meeting: ${dto.meeting.title}` : undefined,
      dto.meeting?.summary ? `Meeting summary: ${dto.meeting.summary}` : undefined,
      dto.meeting?.recordingUrl ? `Recording: ${dto.meeting.recordingUrl}` : undefined,
      dto.meeting?.transcriptUrl ? `Transcript: ${dto.meeting.transcriptUrl}` : undefined,
      `OmoFlow event: ${dto.eventType} (${dto.eventId})`
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private async markDeliveryFailed(
    delivery: WebhookDeliveryRecord,
    message: string,
    attempts = delivery.attempts + 1,
    responseStatus?: number,
    responseBody?: string
  ) {
    await this.prisma.$transaction([
      this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          attempts,
          nextAttemptAt: this.nextRetryAt(attempts),
          lastError: message,
          responseStatus,
          responseBody
        }
      }),
      this.prisma.webhook.update({
        where: { id: delivery.webhookId },
        data: {
          failureCount: { increment: 1 },
          lastError: message
        }
      })
    ]);
    return this.getWebhookDeliveryRecord(delivery.tenantId, delivery.id);
  }

  private async getIntegrationOrThrow(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: integrationId,
        tenantId
      },
      select: integrationSelect
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  private async getWebhookOrThrow(tenantId: string, webhookId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: {
        id: webhookId,
        tenantId
      },
      select: webhookSelect
    });
    if (!webhook) throw new NotFoundException('Webhook not found');
    return webhook;
  }

  private async getWebhookDeliveryOrThrow(tenantId: string, deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: {
        id: deliveryId,
        tenantId
      },
      select: webhookDeliverySelect
    });
    if (!delivery) throw new NotFoundException('Webhook delivery not found');
    return delivery;
  }

  private async getWebhookDeliveryRecord(tenantId: string, deliveryId: string) {
    return this.getWebhookDeliveryOrThrow(tenantId, deliveryId);
  }

  private async setIntegrationEnabled(
    user: AuthenticatedUser,
    integrationId: string,
    enabled: boolean,
    meta: RequestMeta
  ) {
    const before = await this.getIntegrationOrThrow(user.tenantId, integrationId);
    const integration = await this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        enabled,
        status: enabled ? IntegrationStatus.ACTIVE : IntegrationStatus.DISABLED,
        lastError: enabled ? null : undefined
      },
      select: integrationSelect
    });
    await this.logIntegration(
      user.tenantId,
      integration.id,
      enabled ? 'integration.enabled' : 'integration.disabled',
      enabled ? 'Integration enabled' : 'Integration disabled',
      'INFO'
    );
    await this.recordAudit(user, enabled ? 'integration.enable' : 'integration.disable', 'Integration', integration.id, {
      enabled: before.enabled,
      status: before.status
    }, {
      enabled: integration.enabled,
      status: integration.status
    }, meta);
    return integration;
  }

  private async setWebhookEnabled(
    user: AuthenticatedUser,
    webhookId: string,
    enabled: boolean,
    meta: RequestMeta
  ) {
    const before = await this.getWebhookOrThrow(user.tenantId, webhookId);
    const webhook = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        enabled,
        lastError: enabled ? null : before.lastError
      },
      select: webhookSelect
    });
    await this.recordAudit(user, enabled ? 'webhook.enable' : 'webhook.disable', 'Webhook', webhook.id, {
      enabled: before.enabled
    }, {
      enabled: webhook.enabled
    }, meta);
    return webhook;
  }

  private integrationResponse(integration: IntegrationRecord) {
    const { encryptedSecrets: _encryptedSecrets, ...rest } = integration;
    const secretKeys = this.secretKeys(integration.encryptedSecrets);
    return {
      ...rest,
      hasSecrets: secretKeys.length > 0,
      secretKeys
    };
  }

  private webhookResponse(webhook: WebhookRecord, signingSecret?: string) {
    const { secret: _secret, ...rest } = webhook;
    return {
      ...rest,
      hasSecret: Boolean(webhook.secret),
      ...(signingSecret ? { signingSecret } : {})
    };
  }

  private deliveryResponse(delivery: WebhookDeliveryRecord) {
    const { webhook, ...rest } = delivery;
    return {
      ...rest,
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        enabled: webhook.enabled,
        events: webhook.events
      }
    };
  }

  private buildWebhookHeaders(
    webhook: Pick<WebhookRecord, 'id' | 'secret' | 'signingAlgorithm'> | WebhookDeliveryRecord['webhook'],
    eventType: string,
    payloadString: string
  ) {
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const secret = this.decryptSingleSecret(webhook.secret) ?? this.defaultWebhookSecret();
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');
    return {
      'content-type': 'application/json',
      'user-agent': 'TaskBricks-Webhooks/1.0',
      'x-taskbricks-event': eventType,
      'x-taskbricks-webhook-id': webhook.id,
      'x-taskbricks-timestamp': timestamp,
      'x-taskbricks-signature-algorithm': webhook.signingAlgorithm,
      'x-taskbricks-signature': signature
    };
  }

  private encryptSecrets(secrets?: Record<string, string>) {
    if (secrets === undefined) return undefined;
    const safeSecrets = this.validateSecretRecord(secrets);
    const encrypted = Object.fromEntries(
      Object.entries(safeSecrets).map(([key, value]) => [key, this.encryptSecret(value)])
    );
    return this.toJson(encrypted);
  }

  private decryptSecrets(value: unknown): Record<string, string> {
    const record = this.asRecord(value);
    return Object.fromEntries(
      Object.entries(record)
        .map(([key, secretValue]) => [key, this.decryptSecret(secretValue)])
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
  }

  private secretKeys(value: unknown) {
    return Object.keys(this.asRecord(value)).sort();
  }

  private encryptSingleSecret(secret: string) {
    return JSON.stringify(this.encryptSecret(secret));
  }

  private decryptSingleSecret(secret: string | null) {
    if (!secret) return null;
    try {
      return this.decryptSecret(JSON.parse(secret));
    } catch {
      return secret;
    }
  }

  private encryptSecret(secret: string): SecretEnvelope {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      v: 1,
      alg: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64')
    };
  }

  private decryptSecret(value: unknown) {
    if (typeof value === 'string') return value;
    const envelope = this.asRecord(value);
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

  private defaultWebhookSecret() {
    return (
      this.configService.get<string>('integrations.webhookSigningSecret') ||
      this.configService.get<string>('security.encryptionKey') ||
      this.configService.get<string>('jwt.accessSecret') ||
      'taskbricks-local-webhook-secret'
    );
  }

  private generateSecret() {
    return `whsec_${randomBytes(32).toString('base64url')}`;
  }

  private validateSecretRecord(secrets: Record<string, string>) {
    if (!secrets || typeof secrets !== 'object' || Array.isArray(secrets)) {
      throw new BadRequestException('Secrets must be an object');
    }
    return Object.fromEntries(
      Object.entries(secrets).map(([key, value]) => {
        if (typeof value !== 'string' || value.length === 0) {
          throw new BadRequestException(`Secret ${key} must be a non-empty string`);
        }
        return [key.trim(), value];
      })
    );
  }

  private normalizeStringArray(values?: string[]) {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }

  private normalizeEvents(events: string[]) {
    const normalized = [...new Set(events.map((event) => this.normalizeEventType(event)).filter(Boolean))];
    if (normalized.length === 0) throw new BadRequestException('At least one webhook event is required');
    return normalized;
  }

  private normalizeEventType(value: string) {
    return value.trim();
  }

  private nextRetryAt(attempts: number) {
    const delayMinutes = Math.min(Math.max(1, 2 ** Math.max(attempts - 1, 0)), 60);
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  private assertCanManageIntegrations(user: AuthenticatedUser) {
    if (
      user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:tenant') ||
      user.permissions.includes('manage:integrations')
    ) {
      return;
    }
    throw new ForbiddenException('Cannot manage integrations');
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asStringRecord(value: unknown) {
    return Object.fromEntries(
      Object.entries(this.asRecord(value)).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
  }

  private isUniqueConstraintError(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
  }

  private async logIntegration(
    tenantId: string,
    integrationId: string,
    eventType: string,
    message: string,
    level = 'INFO',
    data?: unknown
  ) {
    await this.prisma.integrationLog.create({
      data: {
        tenantId,
        integrationId,
        level,
        eventType,
        message,
        data: this.toJson(data)
      }
    });
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
