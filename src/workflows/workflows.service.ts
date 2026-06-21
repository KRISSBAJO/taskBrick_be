import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  ApprovalStatus,
  NotificationChannel,
  Prisma,
  TaskStatus,
  UserStatus,
  WorkflowRunStatus
} from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowQueueService, WorkflowRunJob } from './workflow-queue.service';
import { ApprovalDecisionDto } from './dto/approval-decision.dto';
import { ApprovalDefinitionQueryDto } from './dto/approval-definition-query.dto';
import { ApprovalDefinitionStepDto } from './dto/approval-definition-step.dto';
import { ApprovalQueryDto } from './dto/approval-query.dto';
import { CreateApprovalDefinitionDto } from './dto/create-approval-definition.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { ReplaceWorkflowNodesDto } from './dto/replace-workflow-nodes.dto';
import { RunWorkflowDto } from './dto/run-workflow.dto';
import { TriggerWorkflowEventDto } from './dto/trigger-workflow-event.dto';
import { UpdateApprovalDefinitionDto } from './dto/update-approval-definition.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowNodeDto } from './dto/workflow-node.dto';
import { WorkflowQueryDto } from './dto/workflow-query.dto';
import { WorkflowRunQueryDto } from './dto/workflow-run-query.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

type WorkflowRunResponse = Prisma.WorkflowRunGetPayload<{ select: typeof workflowRunSelect }>;
type ResolvedApprovalStep = ApprovalDefinitionStepDto & { approverId: string };

const workflowNodeSelect = {
  id: true,
  workflowId: true,
  key: true,
  name: true,
  type: true,
  actionType: true,
  config: true,
  sortOrder: true,
  enabled: true,
  retryAttempts: true,
  timeoutSeconds: true,
  dependsOn: true,
  onFailure: true,
  positionX: true,
  positionY: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.WorkflowNodeSelect;

const workflowSelect = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  entityType: true,
  triggerType: true,
  eventType: true,
  config: true,
  isActive: true,
  createdById: true,
  archivedAt: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
  nodes: {
    select: workflowNodeSelect,
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]
  },
  _count: {
    select: {
      runs: true
    }
  }
} satisfies Prisma.WorkflowSelect;

const runLogSelect = {
  id: true,
  runId: true,
  nodeId: true,
  level: true,
  message: true,
  data: true,
  startedAt: true,
  finishedAt: true,
  createdAt: true
} satisfies Prisma.WorkflowRunLogSelect;

const workflowRunSelect = {
  id: true,
  workflowId: true,
  tenantId: true,
  entityType: true,
  entityId: true,
  eventType: true,
  triggerType: true,
  idempotencyKey: true,
  status: true,
  context: true,
  error: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  workflow: {
    select: {
      id: true,
      name: true,
      entityType: true,
      triggerType: true,
      eventType: true
    }
  },
  logs: {
    select: runLogSelect,
    orderBy: [{ createdAt: 'asc' as const }]
  },
  approvals: {
    select: {
      id: true,
      title: true,
      status: true,
      currentStep: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: [{ createdAt: 'asc' as const }]
  }
} satisfies Prisma.WorkflowRunSelect;

const approvalDefinitionSelect = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  entityType: true,
  isActive: true,
  createdById: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  steps: {
    select: {
      id: true,
      definitionId: true,
      stepOrder: true,
      title: true,
      approverId: true,
      approverRole: true,
      required: true,
      escalationHours: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: [{ stepOrder: 'asc' as const }]
  }
} satisfies Prisma.ApprovalDefinitionSelect;

const approvalSelect = {
  id: true,
  tenantId: true,
  definitionId: true,
  workflowRunId: true,
  entityType: true,
  entityId: true,
  title: true,
  description: true,
  status: true,
  requestedById: true,
  currentStep: true,
  dueDate: true,
  decidedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  steps: {
    select: {
      id: true,
      approvalId: true,
      stepOrder: true,
      title: true,
      approverId: true,
      required: true,
      status: true,
      comments: true,
      decidedById: true,
      decidedAt: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: [{ stepOrder: 'asc' as const }]
  }
} satisfies Prisma.ApprovalSelect;

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly aiService: AiService
  ) {}

  async listWorkflows(user: AuthenticatedUser, query: WorkflowQueryDto) {
    const where: Prisma.WorkflowWhereInput = {
      tenantId: user.tenantId,
      entityType: query.entityType,
      triggerType: query.triggerType,
      eventType: query.eventType,
      isActive: query.isActive,
      archivedAt: query.includeArchived ? undefined : null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workflow.findMany({
        where,
        select: workflowSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.workflow.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createWorkflow(user: AuthenticatedUser, dto: CreateWorkflowDto, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const workflow = await this.prisma.workflow.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        entityType: this.normalizeKey(dto.entityType),
        triggerType: this.normalizeKey(dto.triggerType ?? 'MANUAL'),
        eventType: dto.eventType ? this.normalizeKey(dto.eventType) : undefined,
        isActive: dto.isActive ?? true,
        config: this.toJson(dto.config),
        createdById: user.id,
        nodes: dto.nodes?.length
          ? {
              create: dto.nodes.map((node, index) => this.toNodeNestedCreateInput(node, index))
            }
          : undefined
      },
      select: workflowSelect
    });
    await this.recordAudit(user, 'workflow.create', 'Workflow', workflow.id, undefined, {
      name: workflow.name,
      entityType: workflow.entityType,
      triggerType: workflow.triggerType,
      nodes: workflow.nodes.length
    }, meta);
    return workflow;
  }

  async getWorkflow(user: AuthenticatedUser, workflowId: string) {
    return this.getWorkflowOrThrow(user.tenantId, workflowId);
  }

  async updateWorkflow(user: AuthenticatedUser, workflowId: string, dto: UpdateWorkflowDto, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const before = await this.getWorkflowOrThrow(user.tenantId, workflowId);
    const updated = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: dto.name,
        description: dto.description,
        entityType: dto.entityType ? this.normalizeKey(dto.entityType) : undefined,
        triggerType: dto.triggerType ? this.normalizeKey(dto.triggerType) : undefined,
        eventType: dto.eventType ? this.normalizeKey(dto.eventType) : undefined,
        isActive: dto.isActive,
        config: dto.config === undefined ? undefined : this.toJson(dto.config)
      },
      select: workflowSelect
    });
    await this.recordAudit(user, 'workflow.update', 'Workflow', workflowId, {
      name: before.name,
      isActive: before.isActive
    }, {
      name: updated.name,
      isActive: updated.isActive
    }, meta);
    return updated;
  }

  async archiveWorkflow(user: AuthenticatedUser, workflowId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const before = await this.getWorkflowOrThrow(user.tenantId, workflowId);
    const updated = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: { archivedAt: new Date(), isActive: false },
      select: workflowSelect
    });
    await this.recordAudit(user, 'workflow.archive', 'Workflow', workflowId, {
      archivedAt: before.archivedAt,
      isActive: before.isActive
    }, {
      archivedAt: updated.archivedAt,
      isActive: updated.isActive
    }, meta);
    return updated;
  }

  async restoreWorkflow(user: AuthenticatedUser, workflowId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const before = await this.getWorkflowOrThrow(user.tenantId, workflowId);
    const updated = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: { archivedAt: null },
      select: workflowSelect
    });
    await this.recordAudit(user, 'workflow.restore', 'Workflow', workflowId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async deleteWorkflow(user: AuthenticatedUser, workflowId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const workflow = await this.getWorkflowOrThrow(user.tenantId, workflowId);
    if (workflow._count.runs > 0) return this.archiveWorkflow(user, workflowId, meta);
    await this.prisma.workflow.delete({ where: { id: workflowId } });
    await this.recordAudit(user, 'workflow.delete', 'Workflow', workflowId, {
      name: workflow.name
    }, undefined, meta);
    return { success: true };
  }

  async createNode(user: AuthenticatedUser, workflowId: string, dto: WorkflowNodeDto, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    await this.getWorkflowOrThrow(user.tenantId, workflowId);
    const node = await this.prisma.workflowNode.create({
      data: this.toNodeUncheckedCreateInput(dto, workflowId, dto.sortOrder ?? 0),
      select: workflowNodeSelect
    });
    await this.recordAudit(user, 'workflow_node.create', 'WorkflowNode', node.id, undefined, {
      workflowId,
      type: node.type,
      actionType: node.actionType
    }, meta);
    return node;
  }

  async replaceNodes(user: AuthenticatedUser, workflowId: string, dto: ReplaceWorkflowNodesDto, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    await this.getWorkflowOrThrow(user.tenantId, workflowId);
    const nodes = await this.prisma.$transaction(async (tx) => {
      await tx.workflowNode.deleteMany({ where: { workflowId } });
      await tx.workflowNode.createMany({
        data: dto.nodes.map((node, index) => this.toNodeUncheckedCreateInput(node, workflowId, index))
      });
      return tx.workflowNode.findMany({
        where: { workflowId },
        select: workflowNodeSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      });
    });
    await this.recordAudit(user, 'workflow_node.replace', 'Workflow', workflowId, undefined, {
      count: nodes.length
    }, meta);
    return nodes;
  }

  async updateNode(user: AuthenticatedUser, workflowId: string, nodeId: string, dto: WorkflowNodeDto, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    await this.getWorkflowOrThrow(user.tenantId, workflowId);
    const before = await this.getNodeOrThrow(workflowId, nodeId);
    const updated = await this.prisma.workflowNode.update({
      where: { id: nodeId },
      data: {
        key: dto.key,
        name: dto.name,
        type: this.normalizeKey(dto.type),
        actionType: dto.actionType ? this.normalizeKey(dto.actionType) : undefined,
        config: dto.config === undefined ? undefined : this.toJson(dto.config),
        sortOrder: dto.sortOrder,
        enabled: dto.enabled,
        retryAttempts: dto.retryAttempts,
        timeoutSeconds: dto.timeoutSeconds,
        dependsOn: dto.dependsOn === undefined ? undefined : this.toJson(dto.dependsOn),
        onFailure: dto.onFailure ? this.normalizeKey(dto.onFailure) : undefined,
        positionX: dto.positionX,
        positionY: dto.positionY
      },
      select: workflowNodeSelect
    });
    await this.recordAudit(user, 'workflow_node.update', 'WorkflowNode', nodeId, {
      type: before.type,
      enabled: before.enabled
    }, {
      type: updated.type,
      enabled: updated.enabled
    }, meta);
    return updated;
  }

  async deleteNode(user: AuthenticatedUser, workflowId: string, nodeId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    await this.getWorkflowOrThrow(user.tenantId, workflowId);
    const before = await this.getNodeOrThrow(workflowId, nodeId);
    await this.prisma.workflowNode.delete({ where: { id: nodeId } });
    await this.recordAudit(user, 'workflow_node.delete', 'WorkflowNode', nodeId, {
      workflowId,
      type: before.type
    }, undefined, meta);
    return { success: true };
  }

  async listRuns(user: AuthenticatedUser, query: WorkflowRunQueryDto) {
    const where: Prisma.WorkflowRunWhereInput = {
      tenantId: user.tenantId,
      workflowId: query.workflowId,
      entityType: query.entityType,
      entityId: query.entityId,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { workflow: { name: { contains: query.search, mode: 'insensitive' } } },
              { error: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workflowRun.findMany({
        where,
        select: workflowRunSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.workflowRun.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async getRun(user: AuthenticatedUser, runId: string) {
    return this.getRunOrThrow(user.tenantId, runId);
  }

  async runWorkflow(
    user: AuthenticatedUser,
    workflowId: string,
    dto: RunWorkflowDto,
    meta: RequestMeta,
    reason: WorkflowRunJob['reason'] = 'manual'
  ) {
    const workflow = await this.getWorkflowOrThrow(user.tenantId, workflowId);
    if (!workflow.isActive || workflow.archivedAt) throw new BadRequestException('Workflow is not active');
    if (dto.idempotencyKey) {
      const existing = await this.prisma.workflowRun.findUnique({
        where: { workflowId_idempotencyKey: { workflowId, idempotencyKey: dto.idempotencyKey } },
        select: workflowRunSelect
      });
      if (existing) return existing;
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId,
        tenantId: user.tenantId,
        entityType: dto.entityType ? this.normalizeKey(dto.entityType) : workflow.entityType,
        entityId: dto.entityId ?? 'manual',
        eventType: dto.eventType ? this.normalizeKey(dto.eventType) : workflow.eventType,
        triggerType: reason === 'event' ? 'EVENT' : 'MANUAL',
        idempotencyKey: dto.idempotencyKey,
        context: this.toJson(dto.context)
      },
      select: workflowRunSelect
    });

    await this.queueOrExecuteRun(user, run.id, meta, reason);
    return this.getRun(user, run.id);
  }

  async triggerEvent(user: AuthenticatedUser, dto: TriggerWorkflowEventDto, meta: RequestMeta) {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        tenantId: user.tenantId,
        entityType: this.normalizeKey(dto.entityType),
        triggerType: 'EVENT',
        OR: [{ eventType: this.normalizeKey(dto.eventType) }, { eventType: null }],
        isActive: true,
        archivedAt: null
      },
      select: { id: true }
    });

    const runs: WorkflowRunResponse[] = [];
    for (const workflow of workflows) {
      runs.push(await this.runWorkflow(user, workflow.id, {
        entityType: dto.entityType,
        entityId: dto.entityId,
        eventType: dto.eventType,
        idempotencyKey: dto.idempotencyKey ? `${dto.idempotencyKey}:${workflow.id}` : undefined,
        context: dto.context
      }, meta, 'event'));
    }

    return { matched: workflows.length, runs };
  }

  async retryRun(user: AuthenticatedUser, runId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const before = await this.getRunOrThrow(user.tenantId, runId);
    if (before.status === WorkflowRunStatus.RUNNING) throw new ConflictException('Workflow run is already running');
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: WorkflowRunStatus.PENDING,
        error: null,
        startedAt: null,
        completedAt: null
      }
    });
    await this.logRun(runId, null, 'INFO', 'Workflow run retry requested', { previousStatus: before.status });
    await this.queueOrExecuteRun(user, runId, meta, 'retry');
    return this.getRun(user, runId);
  }

  async listDeadLetterRuns(user: AuthenticatedUser, query: WorkflowRunQueryDto) {
    return this.listRuns(user, {
      ...query,
      status: WorkflowRunStatus.FAILED
    });
  }

  async listRunLogs(user: AuthenticatedUser, runId: string) {
    const run = await this.getRunOrThrow(user.tenantId, runId);
    return run.logs;
  }

  async requeueRun(user: AuthenticatedUser, runId: string, meta: RequestMeta) {
    return this.retryRun(user, runId, meta);
  }

  async cancelRun(user: AuthenticatedUser, runId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const before = await this.getRunOrThrow(user.tenantId, runId);
    if (([WorkflowRunStatus.COMPLETED, WorkflowRunStatus.FAILED, WorkflowRunStatus.CANCELLED] as WorkflowRunStatus[]).includes(before.status)) {
      throw new BadRequestException('Workflow run is already terminal');
    }
    const updated = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: WorkflowRunStatus.CANCELLED,
        completedAt: new Date(),
        error: 'Cancelled by user'
      },
      select: workflowRunSelect
    });
    await this.recordAudit(user, 'workflow_run.cancel', 'WorkflowRun', runId, {
      status: before.status
    }, {
      status: updated.status
    }, meta);
    return updated;
  }

  async listApprovalDefinitions(user: AuthenticatedUser, query: ApprovalDefinitionQueryDto) {
    const where: Prisma.ApprovalDefinitionWhereInput = {
      tenantId: user.tenantId,
      entityType: query.entityType ? this.normalizeKey(query.entityType) : undefined,
      isActive: query.isActive,
      archivedAt: query.includeArchived ? undefined : null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.approvalDefinition.findMany({
        where,
        select: approvalDefinitionSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.approvalDefinition.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createApprovalDefinition(user: AuthenticatedUser, dto: CreateApprovalDefinitionDto, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    await this.validateDefinitionSteps(user.tenantId, dto.steps);
    const definition = await this.prisma.approvalDefinition.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        entityType: this.normalizeKey(dto.entityType),
        isActive: dto.isActive ?? true,
        createdById: user.id,
        steps: {
          create: dto.steps.map((step) => this.toDefinitionStepCreateInput(step))
        }
      },
      select: approvalDefinitionSelect
    });
    await this.recordAudit(user, 'approval_definition.create', 'ApprovalDefinition', definition.id, undefined, {
      name: definition.name,
      entityType: definition.entityType,
      steps: definition.steps.length
    }, meta);
    return definition;
  }

  async getApprovalDefinition(user: AuthenticatedUser, definitionId: string) {
    return this.getApprovalDefinitionOrThrow(user.tenantId, definitionId);
  }

  async updateApprovalDefinition(
    user: AuthenticatedUser,
    definitionId: string,
    dto: UpdateApprovalDefinitionDto,
    meta: RequestMeta
  ) {
    this.assertCanManageAutomation(user);
    const before = await this.getApprovalDefinitionOrThrow(user.tenantId, definitionId);
    if (dto.steps) await this.validateDefinitionSteps(user.tenantId, dto.steps);

    const definition = await this.prisma.$transaction(async (tx) => {
      if (dto.steps) {
        await tx.approvalDefinitionStep.deleteMany({ where: { definitionId } });
      }
      return tx.approvalDefinition.update({
        where: { id: definitionId },
        data: {
          name: dto.name,
          description: dto.description,
          entityType: dto.entityType ? this.normalizeKey(dto.entityType) : undefined,
          isActive: dto.isActive,
          steps: dto.steps
            ? {
                create: dto.steps.map((step) => this.toDefinitionStepCreateInput(step))
              }
            : undefined
        },
        select: approvalDefinitionSelect
      });
    });

    await this.recordAudit(user, 'approval_definition.update', 'ApprovalDefinition', definitionId, {
      name: before.name,
      steps: before.steps.length
    }, {
      name: definition.name,
      steps: definition.steps.length
    }, meta);
    return definition;
  }

  async archiveApprovalDefinition(user: AuthenticatedUser, definitionId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const before = await this.getApprovalDefinitionOrThrow(user.tenantId, definitionId);
    const updated = await this.prisma.approvalDefinition.update({
      where: { id: definitionId },
      data: { archivedAt: new Date(), isActive: false },
      select: approvalDefinitionSelect
    });
    await this.recordAudit(user, 'approval_definition.archive', 'ApprovalDefinition', definitionId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async restoreApprovalDefinition(user: AuthenticatedUser, definitionId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const before = await this.getApprovalDefinitionOrThrow(user.tenantId, definitionId);
    const updated = await this.prisma.approvalDefinition.update({
      where: { id: definitionId },
      data: { archivedAt: null },
      select: approvalDefinitionSelect
    });
    await this.recordAudit(user, 'approval_definition.restore', 'ApprovalDefinition', definitionId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async listApprovals(user: AuthenticatedUser, query: ApprovalQueryDto) {
    const andFilters: Prisma.ApprovalWhereInput[] = [];
    if (query.search) {
      andFilters.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } }
        ]
      });
    }
    if (!this.canManageAutomation(user)) {
      andFilters.push({
        OR: [
          { requestedById: user.id },
          { steps: { some: { approverId: user.id } } }
        ]
      });
    }

    const where: Prisma.ApprovalWhereInput = {
      tenantId: user.tenantId,
      entityType: query.entityType ? this.normalizeKey(query.entityType) : undefined,
      entityId: query.entityId,
      requestedById: query.requestedById,
      status: query.status,
      steps: query.approverId ? { some: { approverId: query.approverId } } : undefined,
      createdAt: this.dateFilter(query.from, query.to),
      AND: andFilters.length ? andFilters : undefined
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.approval.findMany({
        where,
        select: approvalSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.approval.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async myPendingApprovals(user: AuthenticatedUser, query: PaginationQueryDto) {
    return this.listApprovals(user, {
      ...query,
      approverId: user.id,
      status: ApprovalStatus.PENDING
    });
  }

  async createApproval(user: AuthenticatedUser, dto: CreateApprovalDto, meta: RequestMeta) {
    const approval = await this.createApprovalInternal(user, dto, meta);
    await this.recordAudit(user, 'approval.create', 'Approval', approval.id, undefined, {
      entityType: approval.entityType,
      entityId: approval.entityId,
      steps: approval.steps.length
    }, meta);
    return approval;
  }

  async getApproval(user: AuthenticatedUser, approvalId: string) {
    const approval = await this.getApprovalOrThrow(user.tenantId, approvalId);
    this.assertCanReadApproval(user, approval);
    return approval;
  }

  async approveStep(user: AuthenticatedUser, approvalId: string, stepId: string, dto: ApprovalDecisionDto, meta: RequestMeta) {
    return this.decideStep(user, approvalId, stepId, ApprovalStatus.APPROVED, dto, meta);
  }

  async rejectStep(user: AuthenticatedUser, approvalId: string, stepId: string, dto: ApprovalDecisionDto, meta: RequestMeta) {
    return this.decideStep(user, approvalId, stepId, ApprovalStatus.REJECTED, dto, meta);
  }

  async cancelApproval(user: AuthenticatedUser, approvalId: string, meta: RequestMeta) {
    const before = await this.getApprovalOrThrow(user.tenantId, approvalId);
    if (before.requestedById !== user.id) this.assertCanManageAutomation(user);
    if (before.status !== ApprovalStatus.PENDING) throw new BadRequestException('Only pending approvals can be cancelled');
    const updated = await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: ApprovalStatus.CANCELLED,
        decidedAt: new Date(),
        steps: {
          updateMany: {
            where: { status: ApprovalStatus.PENDING },
            data: { status: ApprovalStatus.CANCELLED, decidedAt: new Date(), decidedById: user.id }
          }
        }
      },
      select: approvalSelect
    });
    await this.recordAudit(user, 'approval.cancel', 'Approval', approvalId, {
      status: before.status
    }, {
      status: updated.status
    }, meta);
    return updated;
  }

  async reopenApproval(user: AuthenticatedUser, approvalId: string, meta: RequestMeta) {
    this.assertCanManageAutomation(user);
    const before = await this.getApprovalOrThrow(user.tenantId, approvalId);
    if (before.status === ApprovalStatus.PENDING) throw new BadRequestException('Approval is already pending');
    const updated = await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: ApprovalStatus.PENDING,
        decidedAt: null,
        currentStep: 1,
        steps: {
          updateMany: {
            where: {},
            data: {
              status: ApprovalStatus.PENDING,
              comments: null,
              decidedAt: null,
              decidedById: null
            }
          }
        }
      },
      select: approvalSelect
    });
    await this.recordAudit(user, 'approval.reopen', 'Approval', approvalId, {
      status: before.status
    }, {
      status: updated.status
    }, meta);
    return updated;
  }

  async executeQueuedRun(job: WorkflowRunJob) {
    await this.executeRun(job.user, job.runId, job.meta);
  }

  async enqueueDueScheduledWorkflows(meta: RequestMeta) {
    const now = new Date();
    const workflows = await this.prisma.workflow.findMany({
      where: {
        triggerType: 'SCHEDULE',
        isActive: true,
        archivedAt: null
      },
      select: {
        id: true,
        tenantId: true,
        entityType: true,
        eventType: true,
        config: true,
        lastRunAt: true,
        createdById: true
      }
    });

    let queued = 0;
    let skipped = 0;
    for (const workflow of workflows) {
      const intervalMinutes = this.scheduleIntervalMinutes(workflow.config);
      if (!this.scheduleDue(workflow.lastRunAt, intervalMinutes, now)) {
        skipped += 1;
        continue;
      }

      const actor = await this.resolveAutomationActor(workflow.tenantId, workflow.createdById);
      if (!actor) {
        skipped += 1;
        continue;
      }

      const slot = Math.floor(now.getTime() / (intervalMinutes * 60 * 1000));
      const idempotencyKey = `schedule:${workflow.id}:${slot}`;
      try {
        const run = await this.prisma.workflowRun.create({
          data: {
            workflowId: workflow.id,
            tenantId: workflow.tenantId,
            entityType: workflow.entityType,
            entityId: `schedule:${slot}`,
            eventType: workflow.eventType ?? 'SCHEDULE',
            triggerType: 'SCHEDULE',
            idempotencyKey,
            context: this.toJson({
              scheduledAt: now.toISOString(),
              intervalMinutes
            })
          },
          select: workflowRunSelect
        });
        await this.queueOrExecuteRun(actor, run.id, meta, 'schedule');
        queued += 1;
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          skipped += 1;
          continue;
        }
        throw error;
      }
    }

    return { queued, skipped, scanned: workflows.length };
  }

  private async queueOrExecuteRun(
    user: AuthenticatedUser,
    runId: string,
    meta: RequestMeta,
    reason: WorkflowRunJob['reason']
  ) {
    const queued = await this.workflowQueueService.enqueueRun({
      runId,
      user,
      meta,
      requestedAt: new Date().toISOString(),
      reason
    });
    if (queued) {
      await this.logRun(runId, null, 'INFO', 'Workflow run queued', {
        queue: this.workflowQueueService.queueName,
        reason
      });
      return;
    }

    await this.logRun(runId, null, 'WARN', 'Workflow queue unavailable; executing inline', {
      reason
    });
    await this.executeRun(user, runId, meta);
  }

  private async executeRun(user: AuthenticatedUser, runId: string, meta: RequestMeta) {
    const run = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: WorkflowRunStatus.RUNNING, startedAt: new Date(), completedAt: null, error: null },
      select: workflowRunSelect
    });
    const workflow = await this.getWorkflowOrThrow(user.tenantId, run.workflowId);
    await this.logRun(run.id, null, 'INFO', 'Workflow run started', {
      workflowId: workflow.id,
      entityType: run.entityType,
      entityId: run.entityId
    });

    try {
      for (const node of workflow.nodes.filter((item) => item.enabled)) {
        const startedAt = new Date();
        await this.logRun(run.id, node.id, 'INFO', `Node started: ${node.name}`, {
          type: node.type,
          actionType: node.actionType
        }, startedAt);
        try {
          await this.executeNode(user, run, node, meta);
          await this.logRun(run.id, node.id, 'INFO', `Node completed: ${node.name}`, undefined, startedAt, new Date());
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown workflow node error';
          await this.logRun(run.id, node.id, 'ERROR', `Node failed: ${node.name}`, { error: message }, startedAt, new Date());
          if (node.onFailure !== 'CONTINUE') throw error;
        }
      }
      await this.prisma.$transaction([
        this.prisma.workflowRun.update({
          where: { id: run.id },
          data: { status: WorkflowRunStatus.COMPLETED, completedAt: new Date(), error: null }
        }),
        this.prisma.workflow.update({
          where: { id: workflow.id },
          data: { lastRunAt: new Date() }
        })
      ]);
      await this.logRun(run.id, null, 'INFO', 'Workflow run completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workflow run failed';
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: WorkflowRunStatus.FAILED, completedAt: new Date(), error: message }
      });
      await this.logRun(run.id, null, 'ERROR', 'Workflow run failed', { error: message });
    }

    await this.recordAudit(user, 'workflow_run.execute', 'WorkflowRun', run.id, undefined, {
      workflowId: workflow.id
    }, meta);
  }

  private async executeNode(
    user: AuthenticatedUser,
    run: Prisma.WorkflowRunGetPayload<{ select: typeof workflowRunSelect }>,
    node: Prisma.WorkflowNodeGetPayload<{ select: typeof workflowNodeSelect }>,
    meta: RequestMeta
  ) {
    const action = this.normalizeKey(node.actionType ?? node.type);
    const config = this.asRecord(node.config);

    if (action === 'CONDITION') {
      const path = typeof config.path === 'string' ? config.path : '';
      const expected = config.equals;
      const actual = this.readPath(run.context, path);
      if (actual !== expected) throw new BadRequestException(`Condition failed for ${path}`);
      return;
    }

    if (['NOTIFY', 'SEND_NOTIFICATION'].includes(action)) {
      const userIds = this.stringArray(config.userIds);
      await this.notificationsService.create(user, {
        userIds: userIds.length ? userIds : [user.id],
        title: typeof config.title === 'string' ? config.title : `Workflow: ${run.workflow.name}`,
        body: typeof config.body === 'string' ? config.body : `Workflow ${run.workflow.name} completed a notification step.`,
        channels: this.notificationChannels(config.channels),
        critical: Boolean(config.critical),
        data: {
          workflowRunId: run.id,
          workflowId: run.workflowId,
          entityType: run.entityType,
          entityId: run.entityId
        }
      }, meta);
      return;
    }

    if (['REQUEST_APPROVAL', 'CREATE_APPROVAL'].includes(action)) {
      const approval = await this.createApprovalInternal(user, {
        entityType: typeof config.entityType === 'string' ? config.entityType : run.entityType ?? 'WORKFLOW',
        entityId: typeof config.entityId === 'string' ? config.entityId : run.entityId,
        title: typeof config.title === 'string' ? config.title : `Approval requested by ${run.workflow.name}`,
        description: typeof config.description === 'string' ? config.description : undefined,
        metadata: {
          workflowRunId: run.id,
          workflowId: run.workflowId,
          config: config.metadata
        },
        steps: this.approvalStepsFromConfig(config)
      }, meta, run.id);
      await this.logRun(run.id, node.id, 'INFO', 'Approval requested', { approvalId: approval.id });
      return;
    }

    if (action === 'UPDATE_TASK_STATUS') {
      const taskId = typeof config.taskId === 'string'
        ? config.taskId
        : run.entityType === 'TASK'
          ? run.entityId
          : undefined;
      const status = typeof config.status === 'string' ? this.normalizeKey(config.status) : undefined;
      if (!taskId || !status || !(status in TaskStatus)) {
        throw new BadRequestException('UPDATE_TASK_STATUS requires taskId or TASK entity and valid status');
      }
      await this.prisma.task.updateMany({
        where: { id: taskId, tenantId: user.tenantId },
        data: {
          status: status as TaskStatus,
          completedAt: status === TaskStatus.DONE ? new Date() : undefined
        }
      });
      return;
    }

    if (['RUN_AGENT', 'AI_ACTION', 'AGENT_ACTION', 'EXECUTE_AI_ACTION'].includes(action)) {
      const actionType = typeof config.actionType === 'string'
        ? config.actionType
        : typeof config.type === 'string'
          ? config.type
          : 'SUMMARIZE_PROJECT';
      const entityType = typeof config.entityType === 'string'
        ? config.entityType
        : run.entityType ?? undefined;
      const entityId = typeof config.entityId === 'string'
        ? config.entityId
        : run.entityId;
      const aiAction = await this.aiService.createAction(user, {
        type: actionType,
        agentId: typeof config.agentId === 'string' ? config.agentId : undefined,
        conversationId: typeof config.conversationId === 'string' ? config.conversationId : undefined,
        messageId: typeof config.messageId === 'string' ? config.messageId : undefined,
        entityType,
        entityId,
        input: {
          ...this.asRecord(config.input),
          workflowRunId: run.id,
          workflowId: run.workflowId,
          entityType,
          entityId
        },
        idempotencyKey: `workflow:${run.id}:${node.id}:${actionType}`
      }, meta);
      const result = config.defer === true
        ? aiAction
        : await this.aiService.runAction(user, aiAction.id, meta);
      await this.logRun(run.id, node.id, 'INFO', 'AI action executed', {
        aiActionId: result.id,
        status: result.status,
        actionType
      });
      return;
    }

    if (['WEBHOOK', 'CALL_API', 'HTTP_REQUEST'].includes(action)) {
      await this.logRun(run.id, node.id, 'INFO', 'External action queued for worker execution', {
        action,
        url: typeof config.url === 'string' ? config.url : undefined
      });
      return;
    }

    await this.logRun(run.id, node.id, 'INFO', 'No-op workflow node executed', { action });
  }

  private async createApprovalInternal(
    user: AuthenticatedUser,
    dto: CreateApprovalDto,
    meta: RequestMeta,
    workflowRunId?: string
  ) {
    const steps = dto.definitionId
      ? await this.stepsFromDefinition(user.tenantId, dto.definitionId)
      : dto.steps ?? [];
    if (steps.length === 0) throw new BadRequestException('Approval requires at least one step');
    const resolvedSteps = await this.resolveApprovalSteps(user.tenantId, steps);

    const approval = await this.prisma.approval.create({
      data: {
        tenantId: user.tenantId,
        definitionId: dto.definitionId,
        workflowRunId,
        entityType: this.normalizeKey(dto.entityType),
        entityId: dto.entityId,
        title: dto.title,
        description: dto.description,
        requestedById: user.id,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        metadata: this.toJson(dto.metadata),
        currentStep: Math.min(...resolvedSteps.map((step) => step.stepOrder)),
        steps: {
          create: resolvedSteps.map((step) => ({
            stepOrder: step.stepOrder,
            title: step.title,
            approverId: step.approverId,
            required: step.required ?? true,
            dueDate: step.escalationHours
              ? new Date(Date.now() + step.escalationHours * 60 * 60 * 1000)
              : undefined
          }))
        }
      },
      select: approvalSelect
    });

    await this.notifyApprovers(user, approval.id, approval.title, approval.steps.map((step) => step.approverId), meta);
    return approval;
  }

  private async decideStep(
    user: AuthenticatedUser,
    approvalId: string,
    stepId: string,
    decision: typeof ApprovalStatus.APPROVED | typeof ApprovalStatus.REJECTED,
    dto: ApprovalDecisionDto,
    meta: RequestMeta
  ) {
    const approval = await this.getApprovalOrThrow(user.tenantId, approvalId);
    this.assertCanReadApproval(user, approval);
    if (approval.status !== ApprovalStatus.PENDING) throw new BadRequestException('Approval is already decided');
    const step = approval.steps.find((item) => item.id === stepId);
    if (!step) throw new NotFoundException('Approval step not found');
    if (step.status !== ApprovalStatus.PENDING) throw new BadRequestException('Approval step is already decided');
    if (step.approverId !== user.id && !this.canManageAutomation(user)) {
      throw new ForbiddenException('Only the assigned approver can decide this step');
    }

    const decidedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.approvalStep.update({
        where: { id: stepId },
        data: {
          status: decision,
          comments: dto.comments,
          decidedById: user.id,
          decidedAt
        }
      });
      const steps = await tx.approvalStep.findMany({
        where: { approvalId },
        orderBy: [{ stepOrder: 'asc' }]
      });
      const requiredSteps = steps.filter((item) => item.required);
      const rejected = requiredSteps.some((item) => item.status === ApprovalStatus.REJECTED);
      const approved = requiredSteps.every((item) => item.status === ApprovalStatus.APPROVED);
      const nextPending = requiredSteps.find((item) => item.status === ApprovalStatus.PENDING);
      const nextStatus = rejected
        ? ApprovalStatus.REJECTED
        : approved
          ? ApprovalStatus.APPROVED
          : ApprovalStatus.PENDING;
      return tx.approval.update({
        where: { id: approvalId },
        data: {
          status: nextStatus,
          currentStep: nextPending?.stepOrder ?? approval.currentStep,
          decidedAt: nextStatus === ApprovalStatus.PENDING ? null : decidedAt
        },
        select: approvalSelect
      });
    });

    await this.recordAudit(user, `approval_step.${decision.toLowerCase()}`, 'ApprovalStep', stepId, {
      status: step.status
    }, {
      status: decision,
      approvalStatus: updated.status
    }, meta);
    return updated;
  }

  private async notifyApprovers(
    user: AuthenticatedUser,
    approvalId: string,
    title: string,
    approverIds: string[],
    meta: RequestMeta
  ) {
    const uniqueApprovers = [...new Set(approverIds)];
    if (uniqueApprovers.length === 0) return;
    await this.notificationsService.create(user, {
      userIds: uniqueApprovers,
      title: 'Approval requested',
      body: title,
      channels: [NotificationChannel.IN_APP],
      data: {
        approvalId,
        entityType: 'approval'
      }
    }, meta);
  }

  private async stepsFromDefinition(tenantId: string, definitionId: string): Promise<ApprovalDefinitionStepDto[]> {
    const definition = await this.getApprovalDefinitionOrThrow(tenantId, definitionId);
    if (!definition.isActive || definition.archivedAt) throw new BadRequestException('Approval definition is not active');
    return definition.steps.map((step) => ({
      stepOrder: step.stepOrder,
      title: step.title,
      approverId: step.approverId ?? undefined,
      approverRole: step.approverRole ?? undefined,
      required: step.required,
      escalationHours: step.escalationHours ?? undefined
    }));
  }

  private async resolveApprovalSteps(tenantId: string, steps: ApprovalDefinitionStepDto[]) {
    const seen = new Set<number>();
    const resolved: ResolvedApprovalStep[] = [];
    for (const step of steps) {
      if (seen.has(step.stepOrder)) throw new BadRequestException('Approval step orders must be unique');
      seen.add(step.stepOrder);
      resolved.push({
        ...step,
        approverId: await this.resolveApproverId(tenantId, step)
      });
    }
    return resolved;
  }

  private async resolveApproverId(tenantId: string, step: ApprovalDefinitionStepDto) {
    if (step.approverId) {
      await this.assertUserBelongsToTenant(tenantId, step.approverId);
      return step.approverId;
    }
    if (step.approverRole) {
      const user = await this.prisma.user.findFirst({
        where: {
          tenantId,
          status: UserStatus.ACTIVE,
          roles: {
            some: {
              role: {
                name: step.approverRole
              }
            }
          }
        },
        select: { id: true }
      });
      if (user) return user.id;
    }
    throw new BadRequestException(`Approval step ${step.stepOrder} requires a resolvable approver`);
  }

  private async validateDefinitionSteps(tenantId: string, steps: ApprovalDefinitionStepDto[]) {
    await this.resolveApprovalSteps(tenantId, steps);
  }

  private toDefinitionStepCreateInput(step: ApprovalDefinitionStepDto): Prisma.ApprovalDefinitionStepCreateWithoutDefinitionInput {
    return {
      stepOrder: step.stepOrder,
      title: step.title,
      approverId: step.approverId,
      approverRole: step.approverRole,
      required: step.required ?? true,
      escalationHours: step.escalationHours
    };
  }

  private toNodeNestedCreateInput(dto: WorkflowNodeDto, index: number): Prisma.WorkflowNodeCreateWithoutWorkflowInput {
    return {
      key: dto.key,
      name: dto.name,
      type: this.normalizeKey(dto.type),
      actionType: dto.actionType ? this.normalizeKey(dto.actionType) : undefined,
      config: this.toJson(dto.config),
      sortOrder: dto.sortOrder ?? index,
      enabled: dto.enabled ?? true,
      retryAttempts: dto.retryAttempts ?? 0,
      timeoutSeconds: dto.timeoutSeconds,
      dependsOn: this.toJson(dto.dependsOn),
      onFailure: dto.onFailure ? this.normalizeKey(dto.onFailure) : undefined,
      positionX: dto.positionX,
      positionY: dto.positionY
    };
  }

  private approvalStepsFromConfig(config: Record<string, unknown>): ApprovalDefinitionStepDto[] {
    if (Array.isArray(config.steps)) {
      return config.steps.map((step, index) => {
        const item = this.asRecord(step);
        return {
          stepOrder: Number(item.stepOrder ?? index + 1),
          title: typeof item.title === 'string' ? item.title : `Approval step ${index + 1}`,
          approverId: typeof item.approverId === 'string' ? item.approverId : undefined,
          approverRole: typeof item.approverRole === 'string' ? item.approverRole : undefined,
          required: typeof item.required === 'boolean' ? item.required : true,
          escalationHours: typeof item.escalationHours === 'number' ? item.escalationHours : undefined
        };
      });
    }
    const approverIds = this.stringArray(config.approverIds);
    return approverIds.map((approverId, index) => ({
      stepOrder: index + 1,
      title: `Approval step ${index + 1}`,
      approverId,
      required: true
    }));
  }

  private toNodeUncheckedCreateInput(dto: WorkflowNodeDto, workflowId: string, index: number): Prisma.WorkflowNodeUncheckedCreateInput {
    return {
      workflowId,
      key: dto.key,
      name: dto.name,
      type: this.normalizeKey(dto.type),
      actionType: dto.actionType ? this.normalizeKey(dto.actionType) : undefined,
      config: this.toJson(dto.config),
      sortOrder: dto.sortOrder ?? index,
      enabled: dto.enabled ?? true,
      retryAttempts: dto.retryAttempts ?? 0,
      timeoutSeconds: dto.timeoutSeconds,
      dependsOn: this.toJson(dto.dependsOn),
      onFailure: dto.onFailure ? this.normalizeKey(dto.onFailure) : undefined,
      positionX: dto.positionX,
      positionY: dto.positionY
    };
  }

  private async getWorkflowOrThrow(tenantId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      select: workflowSelect
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  private async getNodeOrThrow(workflowId: string, nodeId: string) {
    const node = await this.prisma.workflowNode.findFirst({
      where: { id: nodeId, workflowId },
      select: workflowNodeSelect
    });
    if (!node) throw new NotFoundException('Workflow node not found');
    return node;
  }

  private async getRunOrThrow(tenantId: string, runId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, tenantId },
      select: workflowRunSelect
    });
    if (!run) throw new NotFoundException('Workflow run not found');
    return run;
  }

  private async getApprovalDefinitionOrThrow(tenantId: string, definitionId: string) {
    const definition = await this.prisma.approvalDefinition.findFirst({
      where: { id: definitionId, tenantId },
      select: approvalDefinitionSelect
    });
    if (!definition) throw new NotFoundException('Approval definition not found');
    return definition;
  }

  private async getApprovalOrThrow(tenantId: string, approvalId: string) {
    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId, tenantId },
      select: approvalSelect
    });
    if (!approval) throw new NotFoundException('Approval not found');
    return approval;
  }

  private assertCanReadApproval(
    user: AuthenticatedUser,
    approval: Prisma.ApprovalGetPayload<{ select: typeof approvalSelect }>
  ) {
    if (
      this.canManageAutomation(user) ||
      approval.requestedById === user.id ||
      approval.steps.some((step) => step.approverId === user.id)
    ) {
      return;
    }
    throw new ForbiddenException('Cannot access this approval');
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const count = await this.prisma.user.count({ where: { id: userId, tenantId } });
    if (count === 0) throw new NotFoundException('User not found');
  }

  private assertCanManageAutomation(user: AuthenticatedUser) {
    if (this.canManageAutomation(user)) return;
    throw new ForbiddenException('Cannot manage workflow automation');
  }

  private canManageAutomation(user: AuthenticatedUser) {
    return user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:tenant') ||
      user.permissions.includes('manage:projects');
  }

  private async logRun(
    runId: string,
    nodeId: string | null,
    level: string,
    message: string,
    data?: Prisma.InputJsonValue,
    startedAt?: Date,
    finishedAt?: Date
  ) {
    await this.prisma.workflowRunLog.create({
      data: {
        runId,
        nodeId,
        level,
        message,
        data: data ?? Prisma.JsonNull,
        startedAt,
        finishedAt
      }
    });
  }

  private normalizeKey(value: string) {
    return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    return value === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private notificationChannels(value: unknown): NotificationChannel[] {
    const valid = new Set(Object.values(NotificationChannel));
    const channels = this.stringArray(value).filter((item): item is NotificationChannel =>
      valid.has(item as NotificationChannel)
    );
    return channels.length ? channels : [NotificationChannel.IN_APP];
  }

  private scheduleIntervalMinutes(config: unknown) {
    const record = this.asRecord(config);
    const raw = record.intervalMinutes ?? record.everyMinutes ?? record.frequencyMinutes;
    const parsed = typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw, 10)
        : 60;
    if (!Number.isFinite(parsed) || parsed < 1) return 60;
    return Math.min(parsed, 24 * 60);
  }

  private scheduleDue(lastRunAt: Date | null, intervalMinutes: number, now: Date) {
    if (!lastRunAt) return true;
    return now.getTime() - lastRunAt.getTime() >= intervalMinutes * 60 * 1000;
  }

  private async resolveAutomationActor(tenantId: string, preferredUserId?: string | null) {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        ...(preferredUserId ? { id: preferredUserId } : { status: UserStatus.ACTIVE })
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        action: true,
                        subject: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!user) return null;
    const permissions = user.roles.flatMap((role) =>
      role.role.permissions.map((item) => `${item.permission.action}:${item.permission.subject}`)
    );
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      sessionId: 'workflow-scheduler',
      roles: user.roles.map((role) => role.role.name),
      permissions: [...new Set([...permissions, 'manage:all'])]
    } satisfies AuthenticatedUser;
  }

  private readPath(source: unknown, path: string) {
    if (!path) return undefined;
    return path.split('.').reduce<unknown>((current, segment) => {
      if (current && typeof current === 'object' && segment in current) {
        return (current as Record<string, unknown>)[segment];
      }
      return undefined;
    }, source);
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
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
