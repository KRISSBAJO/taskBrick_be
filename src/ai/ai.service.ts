import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiActionStatus,
  AiConversationStatus,
  AiMessageRole,
  AiRequestStatus,
  Prisma,
  TaskPriority,
  TaskStatus,
  TaskType
} from '@prisma/client';
import { createHash } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AiActionQueryDto } from './dto/ai-action-query.dto';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';
import { AiUsageQueryDto } from './dto/ai-usage-query.dto';
import { ChatDto } from './dto/chat.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { CreateAiActionDto } from './dto/create-ai-action.dto';
import { CreateAiConversationDto } from './dto/create-conversation.dto';
import { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import { ProjectAiDto } from './dto/project-ai.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateAiConversationDto } from './dto/update-conversation.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface AiCompletionResult {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

export interface TenantAiGenerationInput {
  prompt: string;
  context?: Record<string, unknown>;
  requestType: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

const aiSettingsSelect = {
  id: true,
  tenantId: true,
  enabled: true,
  defaultProvider: true,
  defaultModel: true,
  allowedProviders: true,
  monthlyTokenLimit: true,
  monthlyCostLimit: true,
  redactSensitiveData: true,
  dataRetentionDays: true,
  policy: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.AiTenantSettingsSelect;

const aiAgentSelect = {
  id: true,
  tenantId: true,
  createdById: true,
  name: true,
  description: true,
  type: true,
  provider: true,
  model: true,
  systemPrompt: true,
  temperature: true,
  maxOutputTokens: true,
  tools: true,
  guardrails: true,
  knowledgeScope: true,
  enabled: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      conversations: true,
      actions: true,
      usageLogs: true
    }
  }
} satisfies Prisma.AiAgentSelect;

const aiMessageSelect = {
  id: true,
  tenantId: true,
  conversationId: true,
  userId: true,
  role: true,
  content: true,
  contentJson: true,
  provider: true,
  model: true,
  generated: true,
  inputTokens: true,
  outputTokens: true,
  safetyMetadata: true,
  metadata: true,
  createdAt: true
} satisfies Prisma.AiMessageSelect;

const aiConversationSelect = {
  id: true,
  tenantId: true,
  agentId: true,
  userId: true,
  title: true,
  status: true,
  contextType: true,
  contextId: true,
  metadata: true,
  summary: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  agent: {
    select: {
      id: true,
      name: true,
      provider: true,
      model: true,
      enabled: true,
      archivedAt: true
    }
  },
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  },
  messages: {
    select: aiMessageSelect,
    orderBy: [{ createdAt: 'asc' as const }],
    take: 50
  },
  _count: {
    select: {
      messages: true,
      actions: true,
      usageLogs: true
    }
  }
} satisfies Prisma.AiConversationSelect;

const aiUsageSelect = {
  id: true,
  tenantId: true,
  userId: true,
  agentId: true,
  conversationId: true,
  messageId: true,
  provider: true,
  model: true,
  status: true,
  inputTokens: true,
  outputTokens: true,
  totalTokens: true,
  estimatedCost: true,
  latencyMs: true,
  requestType: true,
  requestHash: true,
  error: true,
  metadata: true,
  createdAt: true
} satisfies Prisma.AiUsageLogSelect;

const aiActionSelect = {
  id: true,
  tenantId: true,
  agentId: true,
  conversationId: true,
  messageId: true,
  requestedById: true,
  type: true,
  status: true,
  entityType: true,
  entityId: true,
  input: true,
  output: true,
  error: true,
  idempotencyKey: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.AiActionSelect;

type AiAgentRecord = Prisma.AiAgentGetPayload<{ select: typeof aiAgentSelect }>;
type AiConversationRecord = Prisma.AiConversationGetPayload<{ select: typeof aiConversationSelect }>;
type AiSettingsRecord = Prisma.AiTenantSettingsGetPayload<{ select: typeof aiSettingsSelect }>;

export interface TenantAiGenerationResult extends AiCompletionResult {
  usage: Prisma.AiUsageLogGetPayload<{ select: typeof aiUsageSelect }>;
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {}

  status() {
    return {
      module: 'ai',
      status: 'ready',
      configured: {
        openai: Boolean(this.configService.get<string>('ai.openAiApiKey')),
        anthropic: Boolean(this.configService.get<string>('ai.anthropicApiKey')),
        local: true
      },
      defaultProvider: this.configService.get<string>('ai.defaultProvider', 'openai'),
      enabledByEnvironment: this.configService.get<boolean>('ai.enabled', false)
    };
  }

  async getSettings(user: AuthenticatedUser) {
    this.assertCanReadAi(user);
    return this.getOrCreateSettings(user.tenantId);
  }

  async updateSettings(user: AuthenticatedUser, dto: UpdateAiSettingsDto, meta: RequestMeta) {
    this.assertCanManageAi(user);
    const before = await this.getOrCreateSettings(user.tenantId);
    const updated = await this.prisma.aiTenantSettings.update({
      where: { tenantId: user.tenantId },
      data: {
        enabled: dto.enabled,
        defaultProvider: dto.defaultProvider ? this.normalizeProvider(dto.defaultProvider) : undefined,
        defaultModel: dto.defaultModel,
        allowedProviders:
          dto.allowedProviders === undefined
            ? undefined
            : this.normalizeStringArray(dto.allowedProviders),
        monthlyTokenLimit: dto.monthlyTokenLimit,
        monthlyCostLimit: dto.monthlyCostLimit,
        redactSensitiveData: dto.redactSensitiveData,
        dataRetentionDays: dto.dataRetentionDays,
        policy: dto.policy === undefined ? undefined : this.toJson(dto.policy)
      },
      select: aiSettingsSelect
    });
    await this.recordAudit(user, 'ai.settings_update', 'AiTenantSettings', updated.id, {
      enabled: before.enabled,
      defaultProvider: before.defaultProvider
    }, {
      enabled: updated.enabled,
      defaultProvider: updated.defaultProvider
    }, meta);
    return updated;
  }

  async listAgents(user: AuthenticatedUser, query: AgentQueryDto) {
    this.assertCanReadAi(user);
    const where: Prisma.AiAgentWhereInput = {
      tenantId: user.tenantId,
      provider: query.provider ? this.normalizeProvider(query.provider) : undefined,
      type: query.type ? this.normalizeKey(query.type) : undefined,
      enabled: query.enabled,
      archivedAt: query.includeArchived ? undefined : null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { systemPrompt: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiAgent.findMany({
        where,
        select: aiAgentSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.aiAgent.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createAgent(user: AuthenticatedUser, dto: CreateAgentDto, meta: RequestMeta) {
    this.assertCanManageAi(user);
    const settings = await this.getOrCreateSettings(user.tenantId);
    const provider = this.resolveProvider(dto.provider, settings);
    this.assertProviderAllowed(settings, provider);
    const agent = await this.prisma.aiAgent.create({
      data: {
        tenantId: user.tenantId,
        createdById: user.id,
        name: dto.name.trim(),
        description: dto.description,
        type: dto.type ? this.normalizeKey(dto.type) : 'ASSISTANT',
        provider,
        model: dto.model ?? this.resolveModel(provider, settings),
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature,
        maxOutputTokens: dto.maxOutputTokens,
        tools: this.normalizeStringArray(dto.tools),
        guardrails: this.toJson(dto.guardrails),
        knowledgeScope: this.toJson(dto.knowledgeScope),
        enabled: dto.enabled ?? true
      },
      select: aiAgentSelect
    });
    await this.recordAudit(user, 'ai.agent_create', 'AiAgent', agent.id, undefined, {
      name: agent.name,
      provider: agent.provider,
      model: agent.model
    }, meta);
    return agent;
  }

  async getAgent(user: AuthenticatedUser, agentId: string) {
    this.assertCanReadAi(user);
    return this.getAgentOrThrow(user.tenantId, agentId);
  }

  async updateAgent(user: AuthenticatedUser, agentId: string, dto: UpdateAgentDto, meta: RequestMeta) {
    this.assertCanManageAi(user);
    const before = await this.getAgentOrThrow(user.tenantId, agentId);
    const settings = await this.getOrCreateSettings(user.tenantId);
    const provider = dto.provider ? this.normalizeProvider(dto.provider) : undefined;
    if (provider) this.assertProviderAllowed(settings, provider);
    const updated = await this.prisma.aiAgent.update({
      where: { id: agentId },
      data: {
        name: dto.name?.trim(),
        description: dto.description,
        type: dto.type ? this.normalizeKey(dto.type) : undefined,
        provider,
        model: dto.model,
        systemPrompt: dto.systemPrompt,
        temperature: dto.temperature,
        maxOutputTokens: dto.maxOutputTokens,
        tools: dto.tools === undefined ? undefined : this.normalizeStringArray(dto.tools),
        guardrails: dto.guardrails === undefined ? undefined : this.toJson(dto.guardrails),
        knowledgeScope: dto.knowledgeScope === undefined ? undefined : this.toJson(dto.knowledgeScope),
        enabled: dto.enabled
      },
      select: aiAgentSelect
    });
    await this.recordAudit(user, 'ai.agent_update', 'AiAgent', updated.id, {
      name: before.name,
      enabled: before.enabled,
      provider: before.provider,
      model: before.model
    }, {
      name: updated.name,
      enabled: updated.enabled,
      provider: updated.provider,
      model: updated.model
    }, meta);
    return updated;
  }

  async archiveAgent(user: AuthenticatedUser, agentId: string, meta: RequestMeta) {
    this.assertCanManageAi(user);
    const before = await this.getAgentOrThrow(user.tenantId, agentId);
    const updated = await this.prisma.aiAgent.update({
      where: { id: agentId },
      data: { archivedAt: new Date(), enabled: false },
      select: aiAgentSelect
    });
    await this.recordAudit(user, 'ai.agent_archive', 'AiAgent', agentId, {
      archivedAt: before.archivedAt,
      enabled: before.enabled
    }, {
      archivedAt: updated.archivedAt,
      enabled: updated.enabled
    }, meta);
    return updated;
  }

  async restoreAgent(user: AuthenticatedUser, agentId: string, meta: RequestMeta) {
    this.assertCanManageAi(user);
    const before = await this.getAgentOrThrow(user.tenantId, agentId);
    const updated = await this.prisma.aiAgent.update({
      where: { id: agentId },
      data: { archivedAt: null, enabled: true },
      select: aiAgentSelect
    });
    await this.recordAudit(user, 'ai.agent_restore', 'AiAgent', agentId, {
      archivedAt: before.archivedAt,
      enabled: before.enabled
    }, {
      archivedAt: updated.archivedAt,
      enabled: updated.enabled
    }, meta);
    return updated;
  }

  async deleteAgent(user: AuthenticatedUser, agentId: string, meta: RequestMeta) {
    this.assertCanManageAi(user);
    const agent = await this.getAgentOrThrow(user.tenantId, agentId);
    if (agent._count.conversations > 0 || agent._count.actions > 0 || agent._count.usageLogs > 0) {
      return this.archiveAgent(user, agentId, meta);
    }
    await this.prisma.aiAgent.delete({ where: { id: agentId } });
    await this.recordAudit(user, 'ai.agent_delete', 'AiAgent', agentId, {
      name: agent.name
    }, undefined, meta);
    return { success: true };
  }

  async listConversations(user: AuthenticatedUser, query: ConversationQueryDto) {
    this.assertCanReadAi(user);
    const where: Prisma.AiConversationWhereInput = {
      tenantId: user.tenantId,
      agentId: query.agentId,
      status: query.status,
      contextType: query.contextType ? this.normalizeKey(query.contextType) : undefined,
      contextId: query.contextId,
      archivedAt: query.includeArchived ? undefined : null,
      ...(this.canManageAi(user) ? {} : { userId: user.id }),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { summary: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiConversation.findMany({
        where,
        select: aiConversationSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.aiConversation.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createConversation(
    user: AuthenticatedUser,
    dto: CreateAiConversationDto,
    meta: RequestMeta
  ) {
    this.assertCanReadAi(user);
    await this.assertAiEnabled(user.tenantId);
    const agent = await this.getAgentOrThrow(user.tenantId, dto.agentId);
    this.assertAgentUsable(agent);
    await this.assertContextAccess(user, dto.contextType, dto.contextId);
    const conversation = await this.prisma.aiConversation.create({
      data: {
        tenantId: user.tenantId,
        agentId: agent.id,
        userId: user.id,
        title: dto.title ?? 'New AI conversation',
        contextType: dto.contextType ? this.normalizeKey(dto.contextType) : undefined,
        contextId: dto.contextId,
        metadata: this.toJson(dto.metadata)
      },
      select: aiConversationSelect
    });
    await this.recordAudit(user, 'ai.conversation_create', 'AiConversation', conversation.id, undefined, {
      agentId: agent.id,
      contextType: conversation.contextType,
      contextId: conversation.contextId
    }, meta);
    return conversation;
  }

  async getConversation(user: AuthenticatedUser, conversationId: string) {
    this.assertCanReadAi(user);
    return this.getConversationOrThrow(user, conversationId);
  }

  async updateConversation(
    user: AuthenticatedUser,
    conversationId: string,
    dto: UpdateAiConversationDto,
    meta: RequestMeta
  ) {
    this.assertCanReadAi(user);
    const before = await this.getConversationOrThrow(user, conversationId);
    if (!this.canManageAi(user) && dto.status === AiConversationStatus.LOCKED) {
      throw new ForbiddenException('Only AI managers can lock conversations');
    }
    if (dto.contextType || dto.contextId) {
      await this.assertContextAccess(user, dto.contextType ?? before.contextType ?? undefined, dto.contextId ?? before.contextId ?? undefined);
    }
    const updated = await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        title: dto.title,
        status: dto.status,
        contextType: dto.contextType ? this.normalizeKey(dto.contextType) : undefined,
        contextId: dto.contextId,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: aiConversationSelect
    });
    await this.recordAudit(user, 'ai.conversation_update', 'AiConversation', updated.id, {
      title: before.title,
      status: before.status
    }, {
      title: updated.title,
      status: updated.status
    }, meta);
    return updated;
  }

  async archiveConversation(user: AuthenticatedUser, conversationId: string, meta: RequestMeta) {
    const before = await this.getConversationOrThrow(user, conversationId);
    const updated = await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { archivedAt: new Date(), status: AiConversationStatus.ARCHIVED },
      select: aiConversationSelect
    });
    await this.recordAudit(user, 'ai.conversation_archive', 'AiConversation', conversationId, {
      status: before.status
    }, {
      status: updated.status
    }, meta);
    return updated;
  }

  async restoreConversation(user: AuthenticatedUser, conversationId: string, meta: RequestMeta) {
    const before = await this.getConversationOrThrow(user, conversationId);
    const updated = await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { archivedAt: null, status: AiConversationStatus.OPEN },
      select: aiConversationSelect
    });
    await this.recordAudit(user, 'ai.conversation_restore', 'AiConversation', conversationId, {
      status: before.status,
      archivedAt: before.archivedAt
    }, {
      status: updated.status,
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async sendMessage(
    user: AuthenticatedUser,
    conversationId: string,
    dto: SendMessageDto,
    meta: RequestMeta
  ) {
    await this.assertAiEnabled(user.tenantId);
    const conversation = await this.getConversationOrThrow(user, conversationId);
    if (conversation.status !== AiConversationStatus.OPEN) {
      throw new BadRequestException('Conversation is not open');
    }
    this.assertAgentUsable(conversation.agent as AiAgentRecord);
    const settings = await this.getOrCreateSettings(user.tenantId);
    await this.assertWithinUsageLimit(user.tenantId, settings);

    const sanitizedContent = settings.redactSensitiveData ? this.redactSensitiveData(dto.content) : dto.content;
    const userMessage = await this.prisma.aiMessage.create({
      data: {
        tenantId: user.tenantId,
        conversationId,
        userId: user.id,
        role: AiMessageRole.USER,
        content: sanitizedContent,
        generated: false,
        metadata: this.toJson(dto.metadata)
      },
      select: aiMessageSelect
    });

    if (dto.generateResponse === false) {
      return {
        userMessage,
        assistantMessage: null
      };
    }

    const context = await this.buildContext(user, conversation);
    const messages = await this.prisma.aiMessage.findMany({
      where: { tenantId: user.tenantId, conversationId },
      select: aiMessageSelect,
      orderBy: [{ createdAt: 'asc' }],
      take: 30
    });
    const completion = await this.completeWithProvider(
      settings,
      conversation.agent as AiAgentRecord,
      messages,
      context
    );

    const assistantMessage = await this.prisma.aiMessage.create({
      data: {
        tenantId: user.tenantId,
        conversationId,
        role: AiMessageRole.ASSISTANT,
        content: completion.content,
        provider: completion.provider,
        model: completion.model,
        generated: true,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        safetyMetadata: this.toJson({ generatedContent: true, providerMode: completion.metadata?.mode }),
        metadata: this.toJson(completion.metadata)
      },
      select: aiMessageSelect
    });

    await this.logUsage({
      tenantId: user.tenantId,
      userId: user.id,
      agentId: conversation.agentId,
      conversationId,
      messageId: assistantMessage.id,
      provider: completion.provider,
      model: completion.model,
      status: AiRequestStatus.COMPLETED,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      latencyMs: completion.latencyMs,
      requestType: 'chat',
      requestHash: this.hashText(sanitizedContent),
      metadata: completion.metadata
    });

    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        title:
          conversation.title && conversation.title !== 'New AI conversation'
            ? conversation.title
            : this.titleFromPrompt(sanitizedContent)
      }
    });

    await this.recordAudit(user, 'ai.message_send', 'AiConversation', conversationId, undefined, {
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      provider: completion.provider,
      model: completion.model
    }, meta);

    return {
      userMessage,
      assistantMessage
    };
  }

  async chat(user: AuthenticatedUser, dto: ChatDto, meta: RequestMeta) {
    await this.assertAiEnabled(user.tenantId);
    const agent = dto.agentId
      ? await this.getAgentOrThrow(user.tenantId, dto.agentId)
      : await this.getOrCreateDefaultAgent(user);
    if (dto.conversationId) {
      return this.sendMessage(user, dto.conversationId, {
        content: dto.content,
        metadata: dto.metadata,
        generateResponse: true
      }, meta);
    }
    const conversation = await this.createConversation(user, {
      agentId: agent.id,
      title: this.titleFromPrompt(dto.content),
      contextType: dto.contextType,
      contextId: dto.contextId,
      metadata: dto.metadata
    }, meta);
    const result = await this.sendMessage(user, conversation.id, {
      content: dto.content,
      metadata: dto.metadata,
      generateResponse: true
    }, meta);
    return {
      conversation,
      ...result
    };
  }

  async generateTenantContent(
    user: AuthenticatedUser,
    input: TenantAiGenerationInput,
    meta: RequestMeta
  ): Promise<TenantAiGenerationResult> {
    const settings = await this.assertAiEnabled(user.tenantId);
    await this.assertWithinUsageLimit(user.tenantId, settings);
    const agent = input.agentId
      ? await this.getAgentOrThrow(user.tenantId, input.agentId)
      : await this.getOrCreateDefaultAgent(user);
    this.assertAgentUsable(agent);
    const sanitizedPrompt = settings.redactSensitiveData ? this.redactSensitiveData(input.prompt) : input.prompt;
    const message = {
      id: 'ephemeral',
      tenantId: user.tenantId,
      conversationId: 'ephemeral',
      userId: user.id,
      role: AiMessageRole.USER,
      content: sanitizedPrompt,
      contentJson: null,
      provider: null,
      model: null,
      generated: false,
      inputTokens: null,
      outputTokens: null,
      safetyMetadata: null,
      metadata: null,
      createdAt: new Date()
    } as Prisma.AiMessageGetPayload<{ select: typeof aiMessageSelect }>;
    const completion = await this.completeWithProvider(settings, agent, [message], input.context ?? {});
    const usage = await this.logUsage({
      tenantId: user.tenantId,
      userId: user.id,
      agentId: agent.id,
      provider: completion.provider,
      model: completion.model,
      status: AiRequestStatus.COMPLETED,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      latencyMs: completion.latencyMs,
      requestType: input.requestType,
      requestHash: this.hashText(`${input.requestType}:${sanitizedPrompt}`),
      metadata: {
        ...input.metadata,
        mode: completion.metadata?.mode,
        generatedContent: true
      }
    });
    await this.recordAudit(user, `ai.${input.requestType}`, 'AiUsageLog', usage.id, undefined, this.toJson({
      provider: completion.provider,
      model: completion.model,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      metadata: input.metadata
    }), meta);
    return { ...completion, usage };
  }

  async summarizeConversation(user: AuthenticatedUser, conversationId: string, meta: RequestMeta) {
    const conversation = await this.getConversationOrThrow(user, conversationId);
    const transcript = conversation.messages
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n')
      .slice(-8000);
    const summary = this.localSummary(`Summarize this conversation:\n${transcript}`, {});
    const updated = await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { summary },
      select: aiConversationSelect
    });
    await this.recordAudit(user, 'ai.conversation_summarize', 'AiConversation', conversationId, undefined, {
      summaryLength: summary.length
    }, meta);
    return updated;
  }

  async projectSummary(user: AuthenticatedUser, dto: ProjectAiDto, meta: RequestMeta) {
    await this.assertAiEnabled(user.tenantId);
    const agent = dto.agentId
      ? await this.getAgentOrThrow(user.tenantId, dto.agentId)
      : await this.getOrCreateDefaultAgent(user);
    const context = await this.getProjectContext(user.tenantId, dto.projectId);
    const content = this.localSummary(dto.prompt ?? 'Create an executive project summary.', context);
    const usage = await this.logUsage({
      tenantId: user.tenantId,
      userId: user.id,
      agentId: agent.id,
      provider: agent.provider,
      model: agent.model,
      status: AiRequestStatus.COMPLETED,
      inputTokens: this.estimateTokens(JSON.stringify(context)),
      outputTokens: this.estimateTokens(content),
      requestType: 'project_summary',
      requestHash: this.hashText(dto.projectId),
      metadata: { projectId: dto.projectId }
    });
    await this.recordAudit(user, 'ai.project_summary', 'Project', dto.projectId, undefined, {
      usageLogId: usage.id
    }, meta);
    return {
      generated: true,
      projectId: dto.projectId,
      content,
      usage
    };
  }

  async sprintPlanning(user: AuthenticatedUser, dto: ProjectAiDto, meta: RequestMeta) {
    await this.assertAiEnabled(user.tenantId);
    const context = await this.getProjectContext(user.tenantId, dto.projectId);
    const backlog = (context.tasks as Array<Record<string, unknown>>).filter((task) =>
      ['BACKLOG', 'TODO'].includes(String(task.status))
    );
    const recommendation = {
      generated: true,
      projectId: dto.projectId,
      recommendedTasks: backlog.slice(0, 10),
      capacityNote: 'Use team capacity and historical velocity before committing sprint scope.',
      risks: backlog.length > 10 ? ['Backlog exceeds suggested planning batch size.'] : [],
      narrative: this.localSummary(dto.prompt ?? 'Suggest a sprint plan.', { ...context, backlog })
    };
    await this.recordAudit(user, 'ai.sprint_planning', 'Project', dto.projectId, undefined, {
      recommendedTasks: recommendation.recommendedTasks.length
    }, meta);
    return recommendation;
  }

  async riskDetection(user: AuthenticatedUser, dto: ProjectAiDto, meta: RequestMeta) {
    await this.assertAiEnabled(user.tenantId);
    const context = await this.getProjectContext(user.tenantId, dto.projectId);
    const tasks = context.tasks as Array<Record<string, unknown>>;
    const openRisks = context.risks as Array<Record<string, unknown>>;
    const overdueTasks = tasks.filter((task) => task.dueDate && new Date(String(task.dueDate)) < new Date() && task.status !== TaskStatus.DONE);
    const blockedSignals = tasks.filter((task) => /block|risk|delay|stuck/i.test(`${task.title ?? ''} ${task.description ?? ''}`));
    const findings = [
      ...openRisks.map((risk) => ({
        type: 'OPEN_RISK',
        severity: risk.severity,
        title: risk.title,
        evidence: risk.description
      })),
      ...overdueTasks.map((task) => ({
        type: 'OVERDUE_TASK',
        severity: task.priority,
        title: task.title,
        evidence: `Due date passed: ${task.dueDate}`
      })),
      ...blockedSignals.map((task) => ({
        type: 'BLOCKED_SIGNAL',
        severity: task.priority,
        title: task.title,
        evidence: 'Task text contains blocking language'
      }))
    ];
    await this.recordAudit(user, 'ai.risk_detection', 'Project', dto.projectId, undefined, {
      findings: findings.length
    }, meta);
    return {
      generated: true,
      projectId: dto.projectId,
      findings,
      narrative: this.localSummary(dto.prompt ?? 'Identify project delivery risks.', { ...context, findings })
    };
  }

  async knowledgeSearch(user: AuthenticatedUser, dto: KnowledgeSearchDto) {
    this.assertCanReadAi(user);
    const limit = dto.limit ?? 10;
    const entityTypes = new Set((dto.entityTypes ?? ['projects', 'tasks', 'documents']).map((type) => type.toLowerCase()));
    const query = dto.query.trim();
    const results: Array<Record<string, unknown>> = [];

    if (entityTypes.has('projects')) {
      const projects = await this.prisma.project.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { key: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: { id: true, key: true, name: true, description: true, status: true, updatedAt: true },
        take: limit
      });
      results.push(...projects.map((project) => ({ entityType: 'PROJECT', score: 1, ...project })));
    }

    if (entityTypes.has('tasks')) {
      const tasks = await this.prisma.task.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [
            { key: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: { id: true, key: true, title: true, description: true, status: true, priority: true, updatedAt: true },
        take: limit
      });
      results.push(...tasks.map((task) => ({ entityType: 'TASK', score: 1, ...task })));
    }

    if (entityTypes.has('documents')) {
      const documents = await this.prisma.document.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { body: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: { id: true, title: true, status: true, updatedAt: true },
        take: limit
      });
      results.push(...documents.map((document) => ({ entityType: 'DOCUMENT', score: 1, ...document })));
    }

    return {
      query,
      data: results.slice(0, limit),
      total: results.length
    };
  }

  async listActions(user: AuthenticatedUser, query: AiActionQueryDto) {
    this.assertCanReadAi(user);
    const where: Prisma.AiActionWhereInput = {
      tenantId: user.tenantId,
      status: query.status,
      type: query.type ? this.normalizeKey(query.type) : undefined,
      conversationId: query.conversationId,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { type: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
              { error: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiAction.findMany({
        where,
        select: aiActionSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.aiAction.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createAction(user: AuthenticatedUser, dto: CreateAiActionDto, meta: RequestMeta) {
    this.assertCanReadAi(user);
    if (dto.idempotencyKey) {
      const existing = await this.prisma.aiAction.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: user.tenantId, idempotencyKey: dto.idempotencyKey } },
        select: aiActionSelect
      });
      if (existing) return existing;
    }
    if (dto.agentId) await this.getAgentOrThrow(user.tenantId, dto.agentId);
    if (dto.conversationId) await this.getConversationOrThrow(user, dto.conversationId);
    const action = await this.prisma.aiAction.create({
      data: {
        tenantId: user.tenantId,
        agentId: dto.agentId,
        conversationId: dto.conversationId,
        messageId: dto.messageId,
        requestedById: user.id,
        type: this.normalizeKey(dto.type),
        entityType: dto.entityType ? this.normalizeKey(dto.entityType) : undefined,
        entityId: dto.entityId,
        input: this.toJson(dto.input),
        idempotencyKey: dto.idempotencyKey
      },
      select: aiActionSelect
    });
    await this.recordAudit(user, 'ai.action_create', 'AiAction', action.id, undefined, {
      type: action.type,
      entityType: action.entityType,
      entityId: action.entityId
    }, meta);
    return action;
  }

  async runAction(user: AuthenticatedUser, actionId: string, meta: RequestMeta) {
    this.assertCanReadAi(user);
    const action = await this.getActionOrThrow(user.tenantId, actionId);
    if (action.status === AiActionStatus.COMPLETED) return action;
    try {
      const output = await this.executeAction(user, action);
      const outputRecord = this.asRecord(output);
      const producedEntityId = this.stringValue(outputRecord.id);
      const producedEntityType =
        producedEntityId && ['CREATE_TASK', 'AI_CREATE_TASK'].includes(action.type) ? 'TASK' : undefined;
      const updated = await this.prisma.aiAction.update({
        where: { id: actionId },
        data: {
          status: AiActionStatus.COMPLETED,
          entityType: action.entityType ?? producedEntityType,
          entityId: action.entityId ?? producedEntityId,
          output: this.toJson(output),
          completedAt: new Date(),
          error: null
        },
        select: aiActionSelect
      });
      await this.recordAudit(user, 'ai.action_run', 'AiAction', actionId, {
        status: action.status
      }, {
        status: updated.status,
        entityType: updated.entityType,
        entityId: updated.entityId
      }, meta);
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI action failed';
      const failed = await this.prisma.aiAction.update({
        where: { id: actionId },
        data: {
          status: AiActionStatus.FAILED,
          error: message,
          completedAt: new Date()
        },
        select: aiActionSelect
      });
      return failed;
    }
  }

  async cancelAction(user: AuthenticatedUser, actionId: string, meta: RequestMeta) {
    const action = await this.getActionOrThrow(user.tenantId, actionId);
    const terminalStatuses: AiActionStatus[] = [
      AiActionStatus.COMPLETED,
      AiActionStatus.FAILED,
      AiActionStatus.CANCELLED
    ];
    if (terminalStatuses.includes(action.status)) {
      throw new BadRequestException('AI action is already terminal');
    }
    const updated = await this.prisma.aiAction.update({
      where: { id: actionId },
      data: { status: AiActionStatus.CANCELLED, completedAt: new Date() },
      select: aiActionSelect
    });
    await this.recordAudit(user, 'ai.action_cancel', 'AiAction', actionId, {
      status: action.status
    }, {
      status: updated.status
    }, meta);
    return updated;
  }

  async listUsage(user: AuthenticatedUser, query: AiUsageQueryDto) {
    this.assertCanManageAi(user);
    const where: Prisma.AiUsageLogWhereInput = {
      tenantId: user.tenantId,
      provider: query.provider,
      model: query.model,
      status: query.status,
      userId: query.userId,
      createdAt: this.dateFilter(query.from, query.to)
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiUsageLog.findMany({
        where,
        select: aiUsageSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.aiUsageLog.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async usageSummary(user: AuthenticatedUser, query: AiUsageQueryDto) {
    this.assertCanManageAi(user);
    const where: Prisma.AiUsageLogWhereInput = {
      tenantId: user.tenantId,
      provider: query.provider,
      model: query.model,
      status: query.status,
      userId: query.userId,
      createdAt: this.dateFilter(query.from, query.to)
    };
    const [byProvider, totals] = await this.prisma.$transaction([
      this.prisma.aiUsageLog.groupBy({
        by: ['provider', 'model', 'status'],
        where,
        _sum: { inputTokens: true, outputTokens: true, totalTokens: true, estimatedCost: true },
        _count: { _all: true },
        orderBy: [{ provider: 'asc' }, { model: 'asc' }]
      }),
      this.prisma.aiUsageLog.aggregate({
        where,
        _sum: { inputTokens: true, outputTokens: true, totalTokens: true, estimatedCost: true },
        _count: { _all: true }
      })
    ]);
    return {
      data: byProvider.map((item) => ({
        provider: item.provider,
        model: item.model,
        status: item.status,
        requests: item._count._all,
        inputTokens: item._sum.inputTokens ?? 0,
        outputTokens: item._sum.outputTokens ?? 0,
        totalTokens: item._sum.totalTokens ?? 0,
        estimatedCost: item._sum.estimatedCost ?? 0
      })),
      totals: {
        requests: totals._count._all,
        inputTokens: totals._sum.inputTokens ?? 0,
        outputTokens: totals._sum.outputTokens ?? 0,
        totalTokens: totals._sum.totalTokens ?? 0,
        estimatedCost: totals._sum.estimatedCost ?? 0
      }
    };
  }

  private async executeAction(user: AuthenticatedUser, action: Prisma.AiActionGetPayload<{ select: typeof aiActionSelect }>) {
    const input = this.asRecord(action.input);
    switch (action.type) {
      case 'CREATE_TASK':
      case 'AI_CREATE_TASK':
        return this.executeCreateTask(user, input);
      case 'SUMMARIZE_PROJECT':
        if (!action.entityId) throw new BadRequestException('SUMMARIZE_PROJECT requires entityId');
        return this.projectSummary(user, { projectId: action.entityId }, { ipAddress: null, userAgent: null });
      case 'DETECT_RISKS':
        if (!action.entityId) throw new BadRequestException('DETECT_RISKS requires entityId');
        return this.riskDetection(user, { projectId: action.entityId }, { ipAddress: null, userAgent: null });
      default:
        return {
          generated: true,
          message: 'Action recorded for provider-specific worker execution',
          type: action.type,
          input
        };
    }
  }

  private async executeCreateTask(user: AuthenticatedUser, input: Record<string, unknown>) {
    const projectId = this.stringValue(input.projectId);
    const title = this.stringValue(input.title);
    if (!projectId || !title) throw new BadRequestException('CREATE_TASK requires projectId and title');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: user.tenantId },
      select: { id: true, key: true }
    });
    if (!project) throw new NotFoundException('Project not found');
    const taskCount = await this.prisma.task.count({ where: { projectId } });
    const task = await this.prisma.task.create({
      data: {
        tenantId: user.tenantId,
        projectId,
        reporterId: user.id,
        key: `${project.key.toUpperCase()}-${taskCount + 1}`,
        title,
        description: this.stringValue(input.description),
        type: this.enumValue(input.type, TaskType) ?? TaskType.TASK,
        status: this.enumValue(input.status, TaskStatus) ?? TaskStatus.TODO,
        priority: this.enumValue(input.priority, TaskPriority) ?? TaskPriority.MEDIUM,
        dueDate: this.stringValue(input.dueDate) ? new Date(String(input.dueDate)) : undefined,
        storyPoints: this.numberValue(input.storyPoints),
        estimateMins: this.numberValue(input.estimateMins)
      },
      select: {
        id: true,
        key: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        createdAt: true
      }
    });
    await this.prisma.taskActivity.create({
      data: {
        taskId: task.id,
        actorId: user.id,
        action: 'ai.task_create',
        newValue: this.toJson({ key: task.key, title: task.title })
      }
    });
    return task;
  }

  private async completeWithProvider(
    settings: AiSettingsRecord,
    agent: AiAgentRecord,
    messages: Array<Prisma.AiMessageGetPayload<{ select: typeof aiMessageSelect }>>,
    context: Record<string, unknown>
  ): Promise<AiCompletionResult> {
    const start = Date.now();
    const provider = this.normalizeProvider(agent.provider || settings.defaultProvider);
    const model = agent.model || settings.defaultModel;
    const systemPrompt = [
      agent.systemPrompt || 'You are TaskBricks AI. Be concise, factual, and mark generated content clearly.',
      'Never claim access to data outside the tenant-scoped context provided.',
      `Context: ${JSON.stringify(context).slice(0, 6000)}`
    ].join('\n');
    const providerMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role === AiMessageRole.ASSISTANT ? 'assistant' : 'user',
        content: message.content
      }))
    ];

    if (provider === 'openai' && this.configService.get<string>('ai.openAiApiKey')) {
      return this.openAiCompletion(model, providerMessages, agent, start);
    }
    if (provider === 'anthropic' && this.configService.get<string>('ai.anthropicApiKey')) {
      return this.anthropicCompletion(model, providerMessages, agent, start);
    }

    const latestUser = [...messages].reverse().find((message) => message.role === AiMessageRole.USER);
    const content = this.localSummary(latestUser?.content ?? 'Respond to the user.', context);
    return {
      content,
      provider,
      model,
      inputTokens: this.estimateTokens(JSON.stringify(providerMessages)),
      outputTokens: this.estimateTokens(content),
      latencyMs: Date.now() - start,
      metadata: { mode: provider === 'local' ? 'local' : 'local-fallback' }
    };
  }

  private async openAiCompletion(
    model: string,
    messages: Array<{ role: string; content: string }>,
    agent: AiAgentRecord,
    start: number
  ): Promise<AiCompletionResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.configService.get<string>('ai.openAiApiKey')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: agent.temperature ?? 0.2,
        max_tokens: agent.maxOutputTokens ?? 800
      })
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new BadRequestException({ message: 'OpenAI request failed', provider: body });
    const choice = (body.choices as Array<Record<string, unknown>> | undefined)?.[0];
    const message = this.asRecord(choice?.message);
    const usage = this.asRecord(body.usage);
    const content = this.stringValue(message.content) ?? 'Generated content unavailable.';
    return {
      content,
      provider: 'openai',
      model,
      inputTokens: this.numberValue(usage.prompt_tokens) ?? this.estimateTokens(JSON.stringify(messages)),
      outputTokens: this.numberValue(usage.completion_tokens) ?? this.estimateTokens(content),
      latencyMs: Date.now() - start,
      metadata: { mode: 'provider' }
    };
  }

  private async anthropicCompletion(
    model: string,
    messages: Array<{ role: string; content: string }>,
    agent: AiAgentRecord,
    start: number
  ): Promise<AiCompletionResult> {
    const [system, ...conversationMessages] = messages;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': `${this.configService.get<string>('ai.anthropicApiKey')}`,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        system: system.content,
        messages: conversationMessages.map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content
        })),
        temperature: agent.temperature ?? 0.2,
        max_tokens: agent.maxOutputTokens ?? 800
      })
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new BadRequestException({ message: 'Anthropic request failed', provider: body });
    const blocks = body.content as Array<Record<string, unknown>> | undefined;
    const content = blocks?.map((block) => this.stringValue(block.text)).filter(Boolean).join('\n') || 'Generated content unavailable.';
    const usage = this.asRecord(body.usage);
    return {
      content,
      provider: 'anthropic',
      model,
      inputTokens: this.numberValue(usage.input_tokens) ?? this.estimateTokens(JSON.stringify(messages)),
      outputTokens: this.numberValue(usage.output_tokens) ?? this.estimateTokens(content),
      latencyMs: Date.now() - start,
      metadata: { mode: 'provider' }
    };
  }

  private localSummary(prompt: string, context: Record<string, unknown>) {
    const project = this.asRecord(context.project);
    const counts = this.asRecord(context.counts);
    const findings = Array.isArray(context.findings) ? context.findings : [];
    const tasks = Array.isArray(context.tasks) ? context.tasks : [];
    const title = this.stringValue(project.name) ?? 'TaskBricks workspace';
    const lines = [
      'Generated content: AI-assisted draft.',
      `Focus: ${prompt.slice(0, 240)}`,
      `Scope: ${title}.`,
      counts.totalTasks !== undefined
        ? `Current signals: ${counts.totalTasks} tasks, ${counts.doneTasks ?? 0} done, ${counts.openRisks ?? 0} open risks.`
        : `Current signals: ${tasks.length} tenant-scoped records considered.`,
      findings.length
        ? `Risk signals: ${findings.length} findings require review.`
        : 'Risk signals: no critical signal was detected from the provided context.',
      'Recommended next step: review this draft with the responsible project owner before acting.'
    ];
    return lines.join('\n');
  }

  private async getProjectContext(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        status: true,
        progress: true,
        startDate: true,
        dueDate: true,
        updatedAt: true
      }
    });
    if (!project) throw new NotFoundException('Project not found');
    const [tasks, risks, budgets, sprints, counts] = await Promise.all([
      this.prisma.task.findMany({
        where: { tenantId, projectId },
        select: { id: true, key: true, title: true, description: true, status: true, priority: true, dueDate: true, storyPoints: true, estimateMins: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 50
      }),
      this.prisma.projectRisk.findMany({
        where: { projectId },
        select: { id: true, title: true, description: true, severity: true, mitigation: true, isOpen: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 25
      }),
      this.prisma.projectBudget.findMany({
        where: { projectId },
        select: { id: true, currency: true, planned: true, actual: true, notes: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 10
      }),
      this.prisma.sprint.findMany({
        where: { projectId },
        select: { id: true, name: true, goal: true, startDate: true, endDate: true, completedAt: true },
        orderBy: [{ createdAt: 'desc' }],
        take: 10
      }),
      this.projectCounts(tenantId, projectId)
    ]);
    return { project, tasks, risks, budgets, sprints, counts };
  }

  private async projectCounts(tenantId: string, projectId: string) {
    const [totalTasks, doneTasks, openRisks, overdueTasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where: { tenantId, projectId } }),
      this.prisma.task.count({ where: { tenantId, projectId, status: TaskStatus.DONE } }),
      this.prisma.projectRisk.count({ where: { projectId, isOpen: true } }),
      this.prisma.task.count({
        where: {
          tenantId,
          projectId,
          dueDate: { lt: new Date() },
          status: { not: TaskStatus.DONE }
        }
      })
    ]);
    return { totalTasks, doneTasks, openRisks, overdueTasks };
  }

  private async buildContext(user: AuthenticatedUser, conversation: AiConversationRecord) {
    if (conversation.contextType === 'PROJECT' && conversation.contextId) {
      return this.getProjectContext(user.tenantId, conversation.contextId);
    }
    if (conversation.contextType === 'TASK' && conversation.contextId) {
      const task = await this.prisma.task.findFirst({
        where: { id: conversation.contextId, tenantId: user.tenantId },
        select: { id: true, key: true, title: true, description: true, status: true, priority: true, dueDate: true }
      });
      if (!task) throw new NotFoundException('Task not found');
      return { task };
    }
    return { tenantId: user.tenantId };
  }

  private async assertContextAccess(user: AuthenticatedUser, contextType?: string, contextId?: string) {
    if (!contextType || !contextId) return;
    const type = this.normalizeKey(contextType);
    if (type === 'PROJECT') {
      const count = await this.prisma.project.count({ where: { id: contextId, tenantId: user.tenantId } });
      if (count === 0) throw new NotFoundException('Project context not found');
    } else if (type === 'TASK') {
      const count = await this.prisma.task.count({ where: { id: contextId, tenantId: user.tenantId } });
      if (count === 0) throw new NotFoundException('Task context not found');
    }
  }

  private async getOrCreateSettings(tenantId: string) {
    const existing = await this.prisma.aiTenantSettings.findUnique({
      where: { tenantId },
      select: aiSettingsSelect
    });
    if (existing) return existing;
    return this.prisma.aiTenantSettings.create({
      data: {
        tenantId,
        enabled: this.configService.get<boolean>('ai.enabled', false),
        defaultProvider: this.normalizeProvider(this.configService.get<string>('ai.defaultProvider', 'local')),
        defaultModel: 'taskbricks-local',
        allowedProviders: ['local', 'openai', 'anthropic'],
        redactSensitiveData: true
      },
      select: aiSettingsSelect
    });
  }

  private async getOrCreateDefaultAgent(user: AuthenticatedUser) {
    const settings = await this.getOrCreateSettings(user.tenantId);
    const existing = await this.prisma.aiAgent.findFirst({
      where: { tenantId: user.tenantId, type: 'ASSISTANT', archivedAt: null },
      select: aiAgentSelect,
      orderBy: [{ createdAt: 'asc' }]
    });
    if (existing) return existing;
    return this.prisma.aiAgent.create({
      data: {
        tenantId: user.tenantId,
        createdById: user.id,
        name: 'TaskBricks Assistant',
        description: 'Default tenant AI assistant',
        type: 'ASSISTANT',
        provider: settings.defaultProvider,
        model: settings.defaultModel,
        systemPrompt: 'Assist with tenant-scoped project and work management data only.',
        tools: ['knowledge_search', 'project_summary', 'risk_detection'],
        enabled: true
      },
      select: aiAgentSelect
    });
  }

  private async assertAiEnabled(tenantId: string) {
    const settings = await this.getOrCreateSettings(tenantId);
    if (!settings.enabled) {
      throw new ForbiddenException('AI is disabled for this tenant');
    }
    return settings;
  }

  private async assertWithinUsageLimit(tenantId: string, settings: AiSettingsRecord) {
    if (!settings.monthlyTokenLimit) return;
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const usage = await this.prisma.aiUsageLog.aggregate({
      where: { tenantId, createdAt: { gte: start } },
      _sum: { totalTokens: true }
    });
    if ((usage._sum.totalTokens ?? 0) >= settings.monthlyTokenLimit) {
      throw new ForbiddenException('Monthly AI token limit has been reached');
    }
  }

  private async getAgentOrThrow(tenantId: string, agentId: string) {
    const agent = await this.prisma.aiAgent.findFirst({
      where: { id: agentId, tenantId },
      select: aiAgentSelect
    });
    if (!agent) throw new NotFoundException('AI agent not found');
    return agent;
  }

  private async getConversationOrThrow(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        tenantId: user.tenantId,
        ...(this.canManageAi(user) ? {} : { userId: user.id })
      },
      select: aiConversationSelect
    });
    if (!conversation) throw new NotFoundException('AI conversation not found');
    return conversation;
  }

  private async getActionOrThrow(tenantId: string, actionId: string) {
    const action = await this.prisma.aiAction.findFirst({
      where: { id: actionId, tenantId },
      select: aiActionSelect
    });
    if (!action) throw new NotFoundException('AI action not found');
    return action;
  }

  private assertAgentUsable(agent: Pick<AiAgentRecord, 'enabled' | 'archivedAt'>) {
    if (!agent.enabled || agent.archivedAt) throw new BadRequestException('AI agent is not active');
  }

  private resolveProvider(provider: string | undefined, settings: AiSettingsRecord) {
    return this.normalizeProvider(provider ?? settings.defaultProvider);
  }

  private resolveModel(provider: string, settings: AiSettingsRecord) {
    if (provider === settings.defaultProvider) return settings.defaultModel;
    if (provider === 'openai') return 'gpt-4o-mini';
    if (provider === 'anthropic') return 'claude-3-5-haiku-latest';
    return 'taskbricks-local';
  }

  private assertProviderAllowed(settings: AiSettingsRecord, provider: string) {
    const allowed = settings.allowedProviders.length ? settings.allowedProviders : ['local'];
    if (!allowed.includes(provider)) throw new ForbiddenException('AI provider is not allowed for this tenant');
  }

  private assertCanReadAi(user: AuthenticatedUser) {
    if (this.canReadAi(user)) return;
    throw new ForbiddenException('Cannot access AI resources');
  }

  private assertCanManageAi(user: AuthenticatedUser) {
    if (this.canManageAi(user)) return;
    throw new ForbiddenException('Cannot manage AI resources');
  }

  private canReadAi(user: AuthenticatedUser) {
    return this.canManageAi(user) || user.permissions.includes('read:ai');
  }

  private canManageAi(user: AuthenticatedUser) {
    return (
      user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:tenant') ||
      user.permissions.includes('manage:ai')
    );
  }

  private async logUsage(input: {
    tenantId: string;
    userId?: string;
    agentId?: string;
    conversationId?: string;
    messageId?: string;
    provider: string;
    model: string;
    status: AiRequestStatus;
    inputTokens: number;
    outputTokens: number;
    latencyMs?: number;
    requestType?: string;
    requestHash?: string;
    error?: string;
    metadata?: unknown;
  }) {
    return this.prisma.aiUsageLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        agentId: input.agentId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        provider: input.provider,
        model: input.model,
        status: input.status,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        totalTokens: input.inputTokens + input.outputTokens,
        estimatedCost: this.estimateCost(input.provider, input.inputTokens, input.outputTokens),
        latencyMs: input.latencyMs,
        requestType: input.requestType,
        requestHash: input.requestHash,
        error: input.error,
        metadata: this.toJson(input.metadata)
      },
      select: aiUsageSelect
    });
  }

  private estimateCost(provider: string, inputTokens: number, outputTokens: number) {
    if (provider === 'openai') return Number(((inputTokens * 0.00000015) + (outputTokens * 0.0000006)).toFixed(6));
    if (provider === 'anthropic') return Number(((inputTokens * 0.0000008) + (outputTokens * 0.000004)).toFixed(6));
    return 0;
  }

  private estimateTokens(text: string) {
    return Math.max(1, Math.ceil(text.length / 4));
  }

  private redactSensitiveData(value: string) {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
      .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*['"]?[\w\-./+=]{8,}/gi, '$1=[redacted]')
      .replace(/bearer\s+[\w\-._~+/]+=*/gi, 'Bearer [redacted]');
  }

  private titleFromPrompt(prompt: string) {
    return prompt.trim().replace(/\s+/g, ' ').slice(0, 80) || 'AI conversation';
  }

  private hashText(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }

  private normalizeProvider(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizeKey(value: string) {
    return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
  }

  private normalizeStringArray(values?: string[]) {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }

  private enumValue<T extends Record<string, string>>(value: unknown, enumeration: T): T[keyof T] | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = this.normalizeKey(value);
    return Object.values(enumeration).includes(normalized as T[keyof T])
      ? (normalized as T[keyof T])
      : undefined;
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private numberValue(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
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
