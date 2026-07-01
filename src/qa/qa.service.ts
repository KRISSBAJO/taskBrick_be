import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  Prisma,
  QaExecutionStatus,
  QaTaskLinkType,
  QaTestCaseStatus,
  QaTestRunSource,
  QaTestRunStatus,
  TaskPriority,
  TaskStatus,
  TaskType
} from '@prisma/client';
import { ProjectAccessPolicyService } from '../access-policy/project-access-policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddQaTestPlanItemDto,
  CreateQaDefectDto,
  CreateQaEvidenceDto,
  CreateQaExecutionDto,
  CreateQaTestCaseDto,
  CreateQaTestPlanDto,
  CreateQaTestRunDto,
  ImportJunitResultsDto,
  LinkQaTestCaseTaskDto,
  QaListQueryDto,
  QaTestCaseQueryDto,
  QaTestRunQueryDto,
  UpdateQaProjectSettingsDto,
  UpdateQaTestCaseDto,
  UpdateQaTestExecutionDto,
  UpdateQaTestPlanDto
} from './dto/qa.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const testCaseInclude = {
  project: { select: { id: true, key: true, name: true, qaGateEnabled: true, qaGateMinimumPassRate: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  taskLinks: {
    include: {
      task: {
        select: {
          id: true,
          key: true,
          title: true,
          status: true,
          priority: true,
          projectId: true
        }
      }
    }
  },
  _count: { select: { executions: true, evidence: true, planItems: true } }
} satisfies Prisma.QaTestCaseInclude;

const planInclude = {
  project: { select: { id: true, key: true, name: true } },
  sprint: { select: { id: true, name: true, startDate: true, endDate: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  items: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: {
      testCase: {
        select: {
          id: true,
          title: true,
          type: true,
          priority: true,
          status: true,
          automationKey: true
        }
      }
    }
  },
  _count: { select: { runs: true, items: true } }
} satisfies Prisma.QaTestPlanInclude;

const runInclude = {
  project: { select: { id: true, key: true, name: true } },
  sprint: { select: { id: true, name: true, startDate: true, endDate: true } },
  plan: { select: { id: true, name: true, status: true } },
  triggeredBy: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  executions: {
    orderBy: [{ createdAt: 'asc' as const }],
    include: {
      testCase: { select: { id: true, title: true, priority: true, type: true, automationKey: true } },
      task: { select: { id: true, key: true, title: true, status: true, priority: true } },
      defectTask: { select: { id: true, key: true, title: true, status: true, priority: true } },
      evidenceItems: true
    }
  }
} satisfies Prisma.QaTestRunInclude;

type JunitCase = {
  title: string;
  className?: string;
  durationMs?: number;
  status: QaExecutionStatus;
  failureMessage?: string;
  failureStack?: string;
  skippedMessage?: string;
};

@Injectable()
export class QaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessPolicy: ProjectAccessPolicyService,
    private readonly auditService: AuditService
  ) {}

  status() {
    return {
      module: 'qa',
      status: 'ready',
      capabilities: [
        'test_cases',
        'test_plans',
        'test_runs',
        'task_links',
        'qa_gates',
        'evidence',
        'defect_creation',
        'junit_import'
      ]
    };
  }

  taxonomy() {
    return {
      testCasePriorities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      testCaseTypes: [
        'FUNCTIONAL',
        'REGRESSION',
        'SMOKE',
        'INTEGRATION',
        'PERFORMANCE',
        'SECURITY',
        'ACCESSIBILITY',
        'ACCEPTANCE'
      ],
      testCaseStatuses: ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'],
      taskLinkTypes: ['COVERS', 'REGRESSION', 'ACCEPTANCE', 'BLOCKER'],
      testPlanStatuses: ['PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
      testRunSources: ['MANUAL', 'AUTOMATION', 'CI', 'API'],
      testRunStatuses: ['QUEUED', 'RUNNING', 'COMPLETED', 'CANCELLED'],
      executionStatuses: ['UNTESTED', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'FLAKY'],
      evidenceTypes: ['SCREENSHOT', 'VIDEO', 'LOG', 'FILE', 'LINK', 'NOTE']
    };
  }

  async listTestCases(user: AuthenticatedUser, query: QaTestCaseQueryDto) {
    const { page, limit, skip } = this.pagination(query);
    const projectWhere = query.projectId
      ? await this.projectWhereForRead(user, query.projectId)
      : this.projectAccessPolicy.projectAccessWhere(user);
    const where: Prisma.QaTestCaseWhereInput = {
      tenantId: user.tenantId,
      project: projectWhere,
      archivedAt: query.status === QaTestCaseStatus.ARCHIVED ? { not: null } : null,
      status:
        query.status && query.status !== QaTestCaseStatus.ARCHIVED
          ? query.status
          : undefined,
      type: query.type,
      priority: query.priority,
      taskLinks: query.taskId ? { some: { taskId: query.taskId } } : undefined,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { expectedResult: { contains: query.search, mode: 'insensitive' } },
            { automationKey: { contains: query.search, mode: 'insensitive' } }
          ]
        : undefined
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.qaTestCase.findMany({
        where,
        include: testCaseInclude,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: limit
      }),
      this.prisma.qaTestCase.count({ where })
    ]);

    return this.page(items, total, page, limit);
  }

  async createTestCase(
    user: AuthenticatedUser,
    dto: CreateQaTestCaseDto,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertProjectAction(user, dto.projectId, 'viewProject');
    await this.assertProjectBelongsToTenant(user.tenantId, dto.projectId);

    if (dto.taskId) {
      await this.assertTaskInProjectForWrite(user, dto.taskId, dto.projectId);
    }

    const created = await this.prisma.qaTestCase.create({
      data: {
        tenantId: user.tenantId,
        projectId: dto.projectId,
        createdById: user.id,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority,
        status: dto.status,
        preconditions: dto.preconditions,
        steps: this.toJson(dto.steps),
        expectedResult: dto.expectedResult,
        tags: dto.tags ?? [],
        automationKey: dto.automationKey,
        estimateMins: dto.estimateMins,
        metadata: this.toJson(dto.metadata),
        taskLinks: dto.taskId
          ? {
              create: {
                taskId: dto.taskId,
                linkType: dto.linkType ?? QaTaskLinkType.COVERS
              }
            }
          : undefined
      },
      include: testCaseInclude
    });

    await this.recordAudit(user, 'qa.test_case.create', 'QaTestCase', created.id, undefined, {
      projectId: created.projectId,
      title: created.title
    }, meta);

    return created;
  }

  async getTestCase(user: AuthenticatedUser, testCaseId: string) {
    const testCase = await this.prisma.qaTestCase.findFirst({
      where: { id: testCaseId, tenantId: user.tenantId },
      include: testCaseInclude
    });
    if (!testCase) throw new NotFoundException('Test case not found');
    await this.projectAccessPolicy.assertProjectAction(user, testCase.projectId, 'viewProject');
    return testCase;
  }

  async updateTestCase(
    user: AuthenticatedUser,
    testCaseId: string,
    dto: UpdateQaTestCaseDto,
    meta: RequestMeta
  ) {
    const before = await this.getTestCase(user, testCaseId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'viewProject');

    const updated = await this.prisma.qaTestCase.update({
      where: { id: testCaseId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority,
        status: dto.status,
        preconditions: dto.preconditions,
        steps: this.toJson(dto.steps),
        expectedResult: dto.expectedResult,
        tags: dto.tags,
        automationKey: dto.automationKey,
        estimateMins: dto.estimateMins,
        metadata: this.toJson(dto.metadata)
      },
      include: testCaseInclude
    });

    await this.recordAudit(user, 'qa.test_case.update', 'QaTestCase', testCaseId, {
      title: before.title,
      status: before.status,
      priority: before.priority
    }, {
      title: updated.title,
      status: updated.status,
      priority: updated.priority
    }, meta);

    return updated;
  }

  async archiveTestCase(user: AuthenticatedUser, testCaseId: string, meta: RequestMeta) {
    const before = await this.getTestCase(user, testCaseId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'viewProject');
    const updated = await this.prisma.qaTestCase.update({
      where: { id: testCaseId },
      data: {
        status: QaTestCaseStatus.ARCHIVED,
        archivedAt: new Date()
      },
      include: testCaseInclude
    });
    await this.recordAudit(user, 'qa.test_case.archive', 'QaTestCase', testCaseId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async linkTestCaseToTask(
    user: AuthenticatedUser,
    testCaseId: string,
    dto: LinkQaTestCaseTaskDto,
    meta: RequestMeta
  ) {
    const testCase = await this.getTestCase(user, testCaseId);
    await this.projectAccessPolicy.assertProjectAction(user, testCase.projectId, 'editTasks');
    await this.assertTaskInProjectForWrite(user, dto.taskId, testCase.projectId);

    const link = await this.prisma.qaTestCaseTaskLink.upsert({
      where: {
        testCaseId_taskId_linkType: {
          testCaseId,
          taskId: dto.taskId,
          linkType: dto.linkType ?? QaTaskLinkType.COVERS
        }
      },
      update: {},
      create: {
        testCaseId,
        taskId: dto.taskId,
        linkType: dto.linkType ?? QaTaskLinkType.COVERS
      },
      include: {
        testCase: { select: { id: true, title: true } },
        task: { select: { id: true, key: true, title: true, status: true } }
      }
    });

    await this.recordAudit(user, 'qa.test_case.link_task', 'QaTestCaseTaskLink', link.id, undefined, {
      testCaseId,
      taskId: dto.taskId,
      linkType: link.linkType
    }, meta);

    return link;
  }

  async unlinkTestCaseFromTask(
    user: AuthenticatedUser,
    testCaseId: string,
    taskId: string,
    meta: RequestMeta,
    linkType?: QaTaskLinkType
  ) {
    const testCase = await this.getTestCase(user, testCaseId);
    await this.projectAccessPolicy.assertProjectAction(user, testCase.projectId, 'editTasks');
    await this.assertTaskInProjectForWrite(user, taskId, testCase.projectId);

    const where: Prisma.QaTestCaseTaskLinkWhereInput = { testCaseId, taskId, linkType };
    const deleted = await this.prisma.qaTestCaseTaskLink.deleteMany({ where });
    await this.recordAudit(user, 'qa.test_case.unlink_task', 'QaTestCaseTaskLink', testCaseId, undefined, {
      testCaseId,
      taskId,
      linkType,
      deleted: deleted.count
    }, meta);
    return { deleted: deleted.count };
  }

  async listPlans(user: AuthenticatedUser, query: QaListQueryDto) {
    const { page, limit, skip } = this.pagination(query);
    const where: Prisma.QaTestPlanWhereInput = {
      tenantId: user.tenantId,
      project: query.projectId
        ? await this.projectWhereForRead(user, query.projectId)
        : this.projectAccessPolicy.projectAccessWhere(user),
      sprintId: query.sprintId,
      archivedAt: null,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { releaseName: { contains: query.search, mode: 'insensitive' } },
            { milestone: { contains: query.search, mode: 'insensitive' } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.qaTestPlan.findMany({ where, include: planInclude, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      this.prisma.qaTestPlan.count({ where })
    ]);
    return this.page(items, total, page, limit);
  }

  async createPlan(user: AuthenticatedUser, dto: CreateQaTestPlanDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, dto.projectId, 'viewProject');
    await this.assertProjectBelongsToTenant(user.tenantId, dto.projectId);
    if (dto.sprintId) await this.assertSprintBelongsToProject(user.tenantId, dto.sprintId, dto.projectId);
    if (dto.testCaseIds?.length) await this.assertTestCasesBelongToProject(user.tenantId, dto.testCaseIds, dto.projectId);

    const created = await this.prisma.qaTestPlan.create({
      data: {
        tenantId: user.tenantId,
        projectId: dto.projectId,
        sprintId: dto.sprintId,
        createdById: user.id,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        releaseName: dto.releaseName,
        milestone: dto.milestone,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        metadata: this.toJson(dto.metadata),
        items: dto.testCaseIds?.length
          ? {
              create: dto.testCaseIds.map((testCaseId, index) => ({
                testCaseId,
                sortOrder: index
              }))
            }
          : undefined
      },
      include: planInclude
    });

    await this.recordAudit(user, 'qa.test_plan.create', 'QaTestPlan', created.id, undefined, {
      projectId: created.projectId,
      name: created.name,
      itemCount: created.items.length
    }, meta);
    return created;
  }

  async getPlan(user: AuthenticatedUser, planId: string) {
    const plan = await this.prisma.qaTestPlan.findFirst({
      where: { id: planId, tenantId: user.tenantId },
      include: planInclude
    });
    if (!plan) throw new NotFoundException('Test plan not found');
    await this.projectAccessPolicy.assertProjectAction(user, plan.projectId, 'viewProject');
    return plan;
  }

  async updatePlan(user: AuthenticatedUser, planId: string, dto: UpdateQaTestPlanDto, meta: RequestMeta) {
    const before = await this.getPlan(user, planId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'viewProject');
    const updated = await this.prisma.qaTestPlan.update({
      where: { id: planId },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        releaseName: dto.releaseName,
        milestone: dto.milestone,
        startDate: dto.startDate === undefined ? undefined : dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate === undefined ? undefined : dto.endDate ? new Date(dto.endDate) : null,
        metadata: this.toJson(dto.metadata)
      },
      include: planInclude
    });
    await this.recordAudit(user, 'qa.test_plan.update', 'QaTestPlan', planId, {
      name: before.name,
      status: before.status
    }, {
      name: updated.name,
      status: updated.status
    }, meta);
    return updated;
  }

  async archivePlan(user: AuthenticatedUser, planId: string, meta: RequestMeta) {
    const before = await this.getPlan(user, planId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'viewProject');
    const updated = await this.prisma.qaTestPlan.update({
      where: { id: planId },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
      include: planInclude
    });
    await this.recordAudit(user, 'qa.test_plan.archive', 'QaTestPlan', planId, undefined, {
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async addPlanItem(user: AuthenticatedUser, planId: string, dto: AddQaTestPlanItemDto, meta: RequestMeta) {
    const plan = await this.getPlan(user, planId);
    await this.projectAccessPolicy.assertProjectAction(user, plan.projectId, 'viewProject');
    await this.assertTestCasesBelongToProject(user.tenantId, [dto.testCaseId], plan.projectId);
    const item = await this.prisma.qaTestPlanItem.upsert({
      where: { planId_testCaseId: { planId, testCaseId: dto.testCaseId } },
      update: { sortOrder: dto.sortOrder },
      create: {
        planId,
        testCaseId: dto.testCaseId,
        sortOrder: dto.sortOrder ?? plan.items.length
      },
      include: { testCase: true }
    });
    await this.recordAudit(user, 'qa.test_plan.add_item', 'QaTestPlanItem', item.id, undefined, {
      planId,
      testCaseId: dto.testCaseId
    }, meta);
    return item;
  }

  async removePlanItem(user: AuthenticatedUser, planId: string, testCaseId: string, meta: RequestMeta) {
    const plan = await this.getPlan(user, planId);
    await this.projectAccessPolicy.assertProjectAction(user, plan.projectId, 'viewProject');
    const deleted = await this.prisma.qaTestPlanItem.deleteMany({ where: { planId, testCaseId } });
    await this.recordAudit(user, 'qa.test_plan.remove_item', 'QaTestPlanItem', planId, undefined, {
      planId,
      testCaseId,
      deleted: deleted.count
    }, meta);
    return { deleted: deleted.count };
  }

  async listRuns(user: AuthenticatedUser, query: QaTestRunQueryDto) {
    const { page, limit, skip } = this.pagination(query);
    const where: Prisma.QaTestRunWhereInput = {
      tenantId: user.tenantId,
      project: query.projectId
        ? await this.projectWhereForRead(user, query.projectId)
        : this.projectAccessPolicy.projectAccessWhere(user),
      sprintId: query.sprintId,
      taskId: query.taskId,
      status: query.status,
      source: query.source,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { provider: { contains: query.search, mode: 'insensitive' } },
            { externalRunId: { contains: query.search, mode: 'insensitive' } },
            { buildVersion: { contains: query.search, mode: 'insensitive' } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.qaTestRun.findMany({
        where,
        include: {
          project: runInclude.project,
          sprint: runInclude.sprint,
          plan: runInclude.plan,
          triggeredBy: runInclude.triggeredBy,
          _count: { select: { executions: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.qaTestRun.count({ where })
    ]);
    return this.page(items, total, page, limit);
  }

  async createRun(user: AuthenticatedUser, dto: CreateQaTestRunDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, dto.projectId, 'viewProject');
    await this.assertProjectBelongsToTenant(user.tenantId, dto.projectId);
    if (dto.sprintId) await this.assertSprintBelongsToProject(user.tenantId, dto.sprintId, dto.projectId);
    if (dto.planId) await this.assertPlanBelongsToProject(user.tenantId, dto.planId, dto.projectId);
    if (dto.taskId) await this.assertTaskInProjectForRead(user, dto.taskId, dto.projectId);

    const testCaseIds = await this.resolveRunTestCaseIds(user.tenantId, dto);
    const cases = testCaseIds.length
      ? await this.prisma.qaTestCase.findMany({
          where: { tenantId: user.tenantId, projectId: dto.projectId, id: { in: testCaseIds }, archivedAt: null },
          select: { id: true, title: true, taskLinks: { select: { taskId: true } } }
        })
      : [];

    const run = await this.prisma.qaTestRun.create({
      data: {
        tenantId: user.tenantId,
        projectId: dto.projectId,
        sprintId: dto.sprintId,
        planId: dto.planId,
        taskId: dto.taskId,
        triggeredById: user.id,
        name: dto.name,
        source: dto.source ?? QaTestRunSource.MANUAL,
        status: dto.status ?? QaTestRunStatus.RUNNING,
        provider: dto.provider,
        externalRunId: dto.externalRunId,
        environment: dto.environment,
        buildVersion: dto.buildVersion,
        startedAt: new Date(),
        executions: cases.length
          ? {
              create: cases.map((testCase) => ({
                tenantId: user.tenantId,
                testCaseId: testCase.id,
                taskId: dto.taskId ?? testCase.taskLinks[0]?.taskId,
                title: testCase.title,
                status: QaExecutionStatus.UNTESTED
              }))
            }
          : undefined
      },
      include: runInclude
    });

    await this.recordAudit(user, 'qa.test_run.create', 'QaTestRun', run.id, undefined, {
      projectId: run.projectId,
      name: run.name,
      executionCount: run.executions.length
    }, meta);
    return this.withRunSummary(run);
  }

  async getRun(user: AuthenticatedUser, runId: string) {
    const run = await this.prisma.qaTestRun.findFirst({
      where: { id: runId, tenantId: user.tenantId },
      include: runInclude
    });
    if (!run) throw new NotFoundException('Test run not found');
    await this.projectAccessPolicy.assertProjectAction(user, run.projectId, 'viewProject');
    return this.withRunSummary(run);
  }

  async completeRun(user: AuthenticatedUser, runId: string, meta: RequestMeta) {
    const before = await this.getRun(user, runId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'editTasks');
    const updated = await this.prisma.qaTestRun.update({
      where: { id: runId },
      data: {
        status: QaTestRunStatus.COMPLETED,
        completedAt: new Date(),
        summary: this.toJson(this.summarizeExecutions(before.executions))
      },
      include: runInclude
    });
    await this.recordAudit(user, 'qa.test_run.complete', 'QaTestRun', runId, {
      status: before.status
    }, {
      status: updated.status
    }, meta);
    return this.withRunSummary(updated);
  }

  async cancelRun(user: AuthenticatedUser, runId: string, meta: RequestMeta) {
    const before = await this.getRun(user, runId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'editTasks');
    const updated = await this.prisma.qaTestRun.update({
      where: { id: runId },
      data: { status: QaTestRunStatus.CANCELLED, completedAt: new Date() },
      include: runInclude
    });
    await this.recordAudit(user, 'qa.test_run.cancel', 'QaTestRun', runId, {
      status: before.status
    }, {
      status: updated.status
    }, meta);
    return this.withRunSummary(updated);
  }

  async createExecution(user: AuthenticatedUser, runId: string, dto: CreateQaExecutionDto, meta: RequestMeta) {
    const run = await this.getRun(user, runId);
    await this.projectAccessPolicy.assertProjectAction(user, run.projectId, 'editTasks');
    if (dto.testCaseId) await this.assertTestCasesBelongToProject(user.tenantId, [dto.testCaseId], run.projectId);
    if (dto.taskId) await this.assertTaskInProjectForRead(user, dto.taskId, run.projectId);

    const execution = await this.prisma.qaTestExecution.create({
      data: {
        tenantId: user.tenantId,
        testRunId: runId,
        testCaseId: dto.testCaseId,
        taskId: dto.taskId ?? run.taskId,
        executedById: user.id,
        title: dto.title,
        status: dto.status ?? QaExecutionStatus.UNTESTED,
        notes: dto.notes,
        actualResult: dto.actualResult,
        durationMs: dto.durationMs,
        failureMessage: dto.failureMessage,
        failureStack: dto.failureStack,
        executedAt: dto.executedAt ? new Date(dto.executedAt) : dto.status ? new Date() : undefined,
        metadata: this.toJson(dto.metadata)
      },
      include: {
        testCase: true,
        task: { select: { id: true, key: true, title: true, status: true } },
        evidenceItems: true
      }
    });
    await this.refreshRunSummary(runId);
    await this.recordAudit(user, 'qa.execution.create', 'QaTestExecution', execution.id, undefined, {
      runId,
      status: execution.status,
      title: execution.title
    }, meta);
    return execution;
  }

  async updateExecution(
    user: AuthenticatedUser,
    runId: string,
    executionId: string,
    dto: UpdateQaTestExecutionDto,
    meta: RequestMeta
  ) {
    const run = await this.getRun(user, runId);
    await this.projectAccessPolicy.assertProjectAction(user, run.projectId, 'editTasks');
    const before = run.executions.find((execution) => execution.id === executionId);
    if (!before) throw new NotFoundException('Test execution not found');
    const updated = await this.prisma.qaTestExecution.update({
      where: { id: executionId },
      data: {
        executedById: dto.status ? user.id : undefined,
        status: dto.status,
        notes: dto.notes,
        actualResult: dto.actualResult,
        durationMs: dto.durationMs,
        failureMessage: dto.failureMessage,
        failureStack: dto.failureStack,
        executedAt: dto.executedAt === undefined ? (dto.status ? new Date() : undefined) : dto.executedAt ? new Date(dto.executedAt) : null,
        metadata: this.toJson(dto.metadata)
      },
      include: {
        testCase: true,
        task: { select: { id: true, key: true, title: true, status: true } },
        defectTask: { select: { id: true, key: true, title: true, status: true } },
        evidenceItems: true
      }
    });
    await this.refreshRunSummary(runId);
    await this.recordAudit(user, 'qa.execution.update', 'QaTestExecution', executionId, {
      status: before.status
    }, {
      status: updated.status
    }, meta);
    return updated;
  }

  async addEvidence(
    user: AuthenticatedUser,
    runId: string,
    executionId: string,
    dto: CreateQaEvidenceDto,
    meta: RequestMeta
  ) {
    const run = await this.getRun(user, runId);
    await this.projectAccessPolicy.assertProjectAction(user, run.projectId, 'editTasks');
    const execution = run.executions.find((item) => item.id === executionId);
    if (!execution) throw new NotFoundException('Test execution not found');
    if (dto.testCaseId) await this.assertTestCasesBelongToProject(user.tenantId, [dto.testCaseId], run.projectId);
    if (dto.taskId) await this.assertTaskInProjectForRead(user, dto.taskId, run.projectId);

    const evidence = await this.prisma.qaEvidence.create({
      data: {
        tenantId: user.tenantId,
        executionId,
        testCaseId: dto.testCaseId ?? execution.testCaseId,
        taskId: dto.taskId ?? execution.taskId,
        createdById: user.id,
        type: dto.type,
        title: dto.title,
        url: dto.url,
        fileAssetId: dto.fileAssetId,
        notes: dto.notes,
        metadata: this.toJson(dto.metadata)
      }
    });

    await this.recordAudit(user, 'qa.evidence.create', 'QaEvidence', evidence.id, undefined, {
      runId,
      executionId,
      title: evidence.title,
      type: evidence.type
    }, meta);
    return evidence;
  }

  async createDefectFromExecution(
    user: AuthenticatedUser,
    runId: string,
    executionId: string,
    dto: CreateQaDefectDto,
    meta: RequestMeta
  ) {
    const run = await this.getRun(user, runId);
    await this.projectAccessPolicy.assertProjectAction(user, run.projectId, 'createTasks');
    const execution = run.executions.find((item) => item.id === executionId);
    if (!execution) throw new NotFoundException('Test execution not found');

    const project = await this.prisma.project.findFirst({
      where: { id: run.projectId, tenantId: user.tenantId },
      select: { id: true, key: true }
    });
    if (!project) throw new NotFoundException('Project not found');

    const key = await this.generateTaskKey(project.id, project.key);
    const defect = await this.prisma.task.create({
      data: {
        tenantId: user.tenantId,
        projectId: project.id,
        reporterId: user.id,
        key,
        title: dto.title ?? `Bug: ${execution.title}`,
        description:
          dto.description ??
          this.buildDefectDescription(run.name, execution.title, execution.failureMessage, execution.failureStack),
        type: dto.type ?? TaskType.BUG,
        status: TaskStatus.BACKLOG,
        priority: dto.priority ?? this.priorityFromExecution(execution.status),
        dueDate: null
      },
      select: {
        id: true,
        key: true,
        title: true,
        status: true,
        priority: true,
        type: true,
        projectId: true,
        createdAt: true
      }
    });

    await this.prisma.qaTestExecution.update({
      where: { id: executionId },
      data: { defectTaskId: defect.id }
    });

    await this.recordAudit(user, 'qa.execution.create_defect', 'Task', defect.id, undefined, {
      runId,
      executionId,
      defectKey: defect.key
    }, meta);

    return { defect };
  }

  async importJunit(user: AuthenticatedUser, dto: ImportJunitResultsDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, dto.projectId, 'viewProject');
    await this.assertProjectBelongsToTenant(user.tenantId, dto.projectId);
    if (dto.sprintId) await this.assertSprintBelongsToProject(user.tenantId, dto.sprintId, dto.projectId);
    if (dto.planId) await this.assertPlanBelongsToProject(user.tenantId, dto.planId, dto.projectId);
    if (dto.taskId) await this.assertTaskInProjectForRead(user, dto.taskId, dto.projectId);

    const cases = this.parseJunit(dto.xml);
    if (cases.length === 0) {
      throw new BadRequestException('No JUnit test cases were found');
    }

    const run = await this.prisma.qaTestRun.create({
      data: {
        tenantId: user.tenantId,
        projectId: dto.projectId,
        sprintId: dto.sprintId,
        planId: dto.planId,
        taskId: dto.taskId,
        triggeredById: user.id,
        name: dto.name ?? `Automated test import - ${new Date().toISOString()}`,
        source: QaTestRunSource.CI,
        status: QaTestRunStatus.COMPLETED,
        provider: dto.provider ?? 'junit',
        externalRunId: dto.externalRunId,
        environment: dto.environment,
        buildVersion: dto.buildVersion,
        startedAt: new Date(),
        completedAt: new Date(),
        executions: {
          create: cases.map((testCase) => ({
            tenantId: user.tenantId,
            taskId: dto.taskId,
            title: testCase.className ? `${testCase.className} - ${testCase.title}` : testCase.title,
            status: testCase.status,
            durationMs: testCase.durationMs,
            failureMessage: testCase.failureMessage ?? testCase.skippedMessage,
            failureStack: testCase.failureStack,
            executedAt: new Date()
          }))
        }
      },
      include: runInclude
    });

    await this.refreshRunSummary(run.id);
    await this.recordAudit(user, 'qa.test_run.import_junit', 'QaTestRun', run.id, undefined, {
      projectId: run.projectId,
      caseCount: cases.length,
      provider: dto.provider ?? 'junit'
    }, meta);

    return this.withRunSummary(await this.getRun(user, run.id));
  }

  async getProjectSummary(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    const [project, cases, executions, linkedTasks, runs] = await this.prisma.$transaction([
      this.prisma.project.findFirst({
        where: { id: projectId, tenantId: user.tenantId },
        select: { id: true, key: true, name: true, qaGateEnabled: true, qaGateMinimumPassRate: true }
      }),
      this.prisma.qaTestCase.findMany({
        where: { tenantId: user.tenantId, projectId, archivedAt: null },
        select: { id: true, status: true }
      }),
      this.prisma.qaTestExecution.findMany({
        where: { tenantId: user.tenantId, testRun: { projectId } },
        select: { id: true, status: true, taskId: true, defectTaskId: true }
      }),
      this.prisma.qaTestCaseTaskLink.findMany({
        where: { testCase: { tenantId: user.tenantId, projectId, archivedAt: null } },
        select: { taskId: true }
      }),
      this.prisma.qaTestRun.findMany({
        where: { tenantId: user.tenantId, projectId },
        select: { id: true, status: true, source: true, createdAt: true }
      })
    ]);
    if (!project) throw new NotFoundException('Project not found');
    return {
      project,
      testCases: {
        total: cases.length,
        active: cases.filter((item) => item.status === QaTestCaseStatus.ACTIVE).length
      },
      linkedTasks: new Set(linkedTasks.map((item) => item.taskId)).size,
      runs: {
        total: runs.length,
        completed: runs.filter((item) => item.status === QaTestRunStatus.COMPLETED).length,
        automation: runs.filter((item) => item.source !== QaTestRunSource.MANUAL).length
      },
      executions: this.summarizeExecutions(executions)
    };
  }

  async getTaskSummary(user: AuthenticatedUser, taskId: string) {
    const task = await this.assertTaskForRead(user, taskId);
    const [links, executions, evidence] = await this.prisma.$transaction([
      this.prisma.qaTestCaseTaskLink.findMany({
        where: { taskId, testCase: { tenantId: user.tenantId, archivedAt: null } },
        include: {
          testCase: {
            select: {
              id: true,
              title: true,
              priority: true,
              type: true,
              status: true,
              automationKey: true
            }
          }
        }
      }),
      this.prisma.qaTestExecution.findMany({
        where: { tenantId: user.tenantId, taskId },
        include: {
          testRun: { select: { id: true, name: true, status: true, source: true, createdAt: true } },
          testCase: { select: { id: true, title: true, priority: true, type: true } },
          defectTask: { select: { id: true, key: true, title: true, status: true } },
          evidenceItems: true
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.qaEvidence.findMany({
        where: { tenantId: user.tenantId, taskId },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    const latestByCase = this.latestExecutionsByCase(executions);
    return {
      task,
      linkedTestCases: links,
      latestExecutions: latestByCase,
      executions: this.summarizeExecutions(executions),
      evidence
    };
  }

  async getProjectSettings(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: user.tenantId },
      select: { id: true, key: true, name: true, qaGateEnabled: true, qaGateMinimumPassRate: true }
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async updateProjectSettings(
    user: AuthenticatedUser,
    projectId: string,
    dto: UpdateQaProjectSettingsDto,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    const before = await this.getProjectSettings(user, projectId);
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        qaGateEnabled: dto.qaGateEnabled,
        qaGateMinimumPassRate: dto.qaGateMinimumPassRate
      },
      select: { id: true, key: true, name: true, qaGateEnabled: true, qaGateMinimumPassRate: true }
    });
    await this.recordAudit(user, 'qa.project_settings.update', 'Project', projectId, {
      qaGateEnabled: before.qaGateEnabled,
      qaGateMinimumPassRate: before.qaGateMinimumPassRate
    }, {
      qaGateEnabled: updated.qaGateEnabled,
      qaGateMinimumPassRate: updated.qaGateMinimumPassRate
    }, meta);
    return updated;
  }

  async assertTaskDoneGate(user: AuthenticatedUser, taskId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: user.tenantId },
      select: { qaGateEnabled: true, qaGateMinimumPassRate: true }
    });
    if (!project?.qaGateEnabled) return;

    const links = await this.prisma.qaTestCaseTaskLink.findMany({
      where: { taskId, testCase: { tenantId: user.tenantId, archivedAt: null, status: { not: QaTestCaseStatus.ARCHIVED } } },
      select: { testCaseId: true, testCase: { select: { title: true } } }
    });
    if (links.length === 0) {
      throw new ForbiddenException('QA gate requires at least one linked test case before this task can be marked Done');
    }

    const executions = await this.prisma.qaTestExecution.findMany({
      where: {
        tenantId: user.tenantId,
        taskId,
        testCaseId: { in: links.map((link) => link.testCaseId) },
        testRun: { status: { not: QaTestRunStatus.CANCELLED } }
      },
      orderBy: { updatedAt: 'desc' },
      select: { testCaseId: true, status: true, updatedAt: true }
    });
    const latestByCase = new Map<string, QaExecutionStatus>();
    for (const execution of executions) {
      if (execution.testCaseId && !latestByCase.has(execution.testCaseId)) {
        latestByCase.set(execution.testCaseId, execution.status);
      }
    }

    const passed = links.filter((link) => latestByCase.get(link.testCaseId) === QaExecutionStatus.PASSED).length;
    const blocked = links.filter((link) => {
      const status = latestByCase.get(link.testCaseId);
      return status === QaExecutionStatus.FAILED || status === QaExecutionStatus.BLOCKED || !status;
    });
    const passRate = Math.round((passed / links.length) * 100);
    if (blocked.length > 0 || passRate < project.qaGateMinimumPassRate) {
      throw new ForbiddenException(
        `QA gate blocked Done: ${passed}/${links.length} tests passed (${passRate}%). Required ${project.qaGateMinimumPassRate}%.`
      );
    }
  }

  private pagination(query: QaListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return { page, limit, skip: (page - 1) * limit };
  }

  private page<T>(items: T[], total: number, page: number, limit: number) {
    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  private async projectWhereForRead(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    return this.projectAccessPolicy.projectAccessWhere(user, projectId);
  }

  private async assertProjectBelongsToTenant(tenantId: string, projectId: string) {
    const count = await this.prisma.project.count({ where: { id: projectId, tenantId } });
    if (count === 0) throw new NotFoundException('Project not found');
  }

  private async assertTaskForRead(user: AuthenticatedUser, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: this.projectAccessPolicy.taskAccessWhere(user, taskId),
      select: {
        id: true,
        key: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        sprintId: true,
        dueDate: true
      }
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async assertTaskInProjectForRead(user: AuthenticatedUser, taskId: string, projectId: string) {
    const task = await this.assertTaskForRead(user, taskId);
    if (task.projectId !== projectId) throw new BadRequestException('Task does not belong to this project');
    return task;
  }

  private async assertTaskInProjectForWrite(user: AuthenticatedUser, taskId: string, projectId: string) {
    const task = await this.assertTaskInProjectForRead(user, taskId, projectId);
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editTasks');
    return task;
  }

  private async assertSprintBelongsToProject(tenantId: string, sprintId: string, projectId: string) {
    const count = await this.prisma.sprint.count({ where: { id: sprintId, tenantId, projectId } });
    if (count === 0) throw new BadRequestException('Sprint does not belong to this project');
  }

  private async assertPlanBelongsToProject(tenantId: string, planId: string, projectId: string) {
    const count = await this.prisma.qaTestPlan.count({ where: { id: planId, tenantId, projectId } });
    if (count === 0) throw new BadRequestException('Test plan does not belong to this project');
  }

  private async assertTestCasesBelongToProject(tenantId: string, testCaseIds: string[], projectId: string) {
    const uniqueIds = [...new Set(testCaseIds)];
    const count = await this.prisma.qaTestCase.count({
      where: { tenantId, projectId, id: { in: uniqueIds }, archivedAt: null }
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('One or more test cases do not belong to this project');
    }
  }

  private async resolveRunTestCaseIds(tenantId: string, dto: CreateQaTestRunDto) {
    if (dto.testCaseIds?.length) return [...new Set(dto.testCaseIds)];
    if (dto.planId) {
      const items = await this.prisma.qaTestPlanItem.findMany({
        where: { planId: dto.planId, plan: { tenantId } },
        select: { testCaseId: true },
        orderBy: { sortOrder: 'asc' }
      });
      return items.map((item) => item.testCaseId);
    }
    if (dto.taskId) {
      const links = await this.prisma.qaTestCaseTaskLink.findMany({
        where: { taskId: dto.taskId, testCase: { tenantId, archivedAt: null } },
        select: { testCaseId: true }
      });
      return links.map((link) => link.testCaseId);
    }
    return [];
  }

  private summarizeExecutions(executions: Array<{ status: QaExecutionStatus }>) {
    const counts = {
      total: executions.length,
      untested: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      flaky: 0
    };
    for (const execution of executions) {
      if (execution.status === QaExecutionStatus.UNTESTED) counts.untested += 1;
      if (execution.status === QaExecutionStatus.PASSED) counts.passed += 1;
      if (execution.status === QaExecutionStatus.FAILED) counts.failed += 1;
      if (execution.status === QaExecutionStatus.BLOCKED) counts.blocked += 1;
      if (execution.status === QaExecutionStatus.SKIPPED) counts.skipped += 1;
      if (execution.status === QaExecutionStatus.FLAKY) counts.flaky += 1;
    }
    return {
      ...counts,
      passRate: counts.total > 0 ? Math.round((counts.passed / counts.total) * 100) : 0,
      ready: counts.total > 0 && counts.failed === 0 && counts.blocked === 0 && counts.untested === 0
    };
  }

  private latestExecutionsByCase<T extends { testCaseId: string | null; updatedAt: Date }>(executions: T[]) {
    const map = new Map<string, T>();
    for (const execution of executions) {
      if (!execution.testCaseId) continue;
      const current = map.get(execution.testCaseId);
      if (!current || execution.updatedAt > current.updatedAt) {
        map.set(execution.testCaseId, execution);
      }
    }
    return Array.from(map.values());
  }

  private withRunSummary<T extends { executions: Array<{ status: QaExecutionStatus }> }>(run: T) {
    return {
      ...run,
      computedSummary: this.summarizeExecutions(run.executions)
    };
  }

  private async refreshRunSummary(runId: string) {
    const executions = await this.prisma.qaTestExecution.findMany({
      where: { testRunId: runId },
      select: { status: true }
    });
    await this.prisma.qaTestRun.update({
      where: { id: runId },
      data: {
        summary: this.toJson(this.summarizeExecutions(executions))
      }
    });
  }

  private async generateTaskKey(projectId: string, projectKey: string) {
    for (let offset = 0; offset < 10; offset += 1) {
      const count = await this.prisma.task.count({ where: { projectId } });
      const key = `${projectKey.toUpperCase()}-${count + offset + 1}`;
      const existing = await this.prisma.task.findFirst({ where: { projectId, key }, select: { id: true } });
      if (!existing) return key;
    }
    throw new ConflictException('Could not generate a unique defect task key');
  }

  private priorityFromExecution(status: QaExecutionStatus) {
    if (status === QaExecutionStatus.BLOCKED || status === QaExecutionStatus.FAILED) {
      return TaskPriority.HIGH;
    }
    return TaskPriority.MEDIUM;
  }

  private buildDefectDescription(runName: string, title: string, failureMessage?: string | null, failureStack?: string | null) {
    return [
      `Created from QA run: ${runName}`,
      '',
      `Failed test: ${title}`,
      failureMessage ? `Failure: ${failureMessage}` : undefined,
      failureStack ? `Stack/log:\n${failureStack}` : undefined
    ].filter(Boolean).join('\n');
  }

  private parseJunit(xml: string): JunitCase[] {
    const cases: JunitCase[] = [];
    const testcaseRegex = /<testcase\b([^>]*)>([\s\S]*?)<\/testcase>|<testcase\b([^>]*)\/>/gi;
    let match: RegExpExecArray | null;
    while ((match = testcaseRegex.exec(xml)) !== null) {
      const attrs = this.parseXmlAttributes(match[1] || match[3] || '');
      const body = match[2] || '';
      const failure = /<(failure|error)\b([^>]*)>([\s\S]*?)<\/\1>/i.exec(body);
      const skipped = /<skipped\b([^>]*)>([\s\S]*?)<\/skipped>|<skipped\b([^>]*)\/>/i.exec(body);
      const timeSeconds = attrs.time ? Number(attrs.time) : undefined;
      cases.push({
        title: this.decodeXml(attrs.name ?? 'Unnamed automated test'),
        className: attrs.classname ? this.decodeXml(attrs.classname) : undefined,
        durationMs: Number.isFinite(timeSeconds) ? Math.round((timeSeconds ?? 0) * 1000) : undefined,
        status: failure
          ? QaExecutionStatus.FAILED
          : skipped
            ? QaExecutionStatus.SKIPPED
            : QaExecutionStatus.PASSED,
        failureMessage: failure ? this.decodeXml(this.parseXmlAttributes(failure[2] || '').message ?? '') : undefined,
        failureStack: failure ? this.decodeXml(this.stripXml(failure[3] || '')) : undefined,
        skippedMessage: skipped ? this.decodeXml(this.stripXml(skipped[2] || '')) : undefined
      });
    }
    return cases;
  }

  private parseXmlAttributes(source: string) {
    const attrs: Record<string, string> = {};
    const attrRegex = /([:\w.-]+)\s*=\s*["']([^"']*)["']/g;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(source)) !== null) {
      attrs[match[1]] = this.decodeXml(match[2]);
    }
    return attrs;
  }

  private stripXml(value: string) {
    return value.replace(/<[^>]+>/g, '').trim();
  }

  private decodeXml(value: string) {
    return value
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  private toJson(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
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
