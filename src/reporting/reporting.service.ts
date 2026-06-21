import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  DashboardVisibility,
  Prisma,
  ReportExecutionStatus,
  ReportExportFormat,
  ReportExportStatus,
  ReportStatus,
  TaskStatus
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { ExecutionQueryDto } from './dto/execution-query.dto';
import { ExportQueryDto } from './dto/export-query.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { RunReportDto } from './dto/run-report.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { UpdateWidgetDto } from './dto/update-widget.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const dashboardWidgetSelect = {
  id: true,
  tenantId: true,
  dashboardId: true,
  type: true,
  title: true,
  config: true,
  position: true,
  dataSource: true,
  refreshIntervalSeconds: true,
  hidden: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.DashboardWidgetSelect;

const dashboardSelect = {
  id: true,
  tenantId: true,
  ownerId: true,
  name: true,
  description: true,
  visibility: true,
  layout: true,
  filters: true,
  refreshIntervalSeconds: true,
  isDefault: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  },
  widgets: {
    select: dashboardWidgetSelect,
    orderBy: [{ createdAt: 'asc' as const }]
  },
  _count: {
    select: {
      widgets: true
    }
  }
} satisfies Prisma.DashboardSelect;

const reportSelect = {
  id: true,
  tenantId: true,
  createdById: true,
  name: true,
  description: true,
  type: true,
  status: true,
  query: true,
  schedule: true,
  timezone: true,
  recipients: true,
  cacheTtlSeconds: true,
  lastRunAt: true,
  nextRunAt: true,
  metadata: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  },
  _count: {
    select: {
      executions: true,
      exports: true
    }
  }
} satisfies Prisma.ReportSelect;

const executionSelect = {
  id: true,
  tenantId: true,
  reportId: true,
  requestedById: true,
  type: true,
  status: true,
  parameters: true,
  result: true,
  summary: true,
  error: true,
  rowCount: true,
  startedAt: true,
  completedAt: true,
  durationMs: true,
  cacheKey: true,
  createdAt: true,
  updatedAt: true,
  report: {
    select: {
      id: true,
      name: true,
      type: true,
      status: true
    }
  }
} satisfies Prisma.ReportExecutionSelect;

const exportSelect = {
  id: true,
  tenantId: true,
  reportId: true,
  executionId: true,
  requestedById: true,
  format: true,
  status: true,
  fileName: true,
  fileUrl: true,
  mimeType: true,
  sizeBytes: true,
  expiresAt: true,
  error: true,
  createdAt: true,
  updatedAt: true,
  report: {
    select: {
      id: true,
      name: true,
      type: true
    }
  },
  execution: {
    select: {
      id: true,
      status: true,
      rowCount: true
    }
  }
} satisfies Prisma.ReportExportSelect;

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  status() {
    return {
      module: 'reporting',
      status: 'ready',
      reportTypes: [
        'OVERVIEW',
        'PROJECT_HEALTH',
        'TEAM_PERFORMANCE',
        'CYCLE_TIME',
        'VELOCITY',
        'BUDGET',
        'SLA'
      ]
    };
  }

  async listDashboards(user: AuthenticatedUser, query: DashboardQueryDto) {
    this.assertCanReadReports(user);
    const where: Prisma.DashboardWhereInput = {
      tenantId: user.tenantId,
      visibility: query.visibility,
      archivedAt: query.includeArchived ? undefined : null,
      OR: this.canManageReports(user)
        ? undefined
        : [
            { ownerId: user.id },
            { visibility: { in: [DashboardVisibility.TENANT, DashboardVisibility.PUBLIC] } }
          ],
      ...(query.search
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: query.search, mode: 'insensitive' } },
                  { description: { contains: query.search, mode: 'insensitive' } }
                ]
              }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.dashboard.findMany({
        where,
        select: dashboardSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.dashboard.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createDashboard(user: AuthenticatedUser, dto: CreateDashboardDto, meta: RequestMeta) {
    this.assertCanManageReports(user);
    if (dto.isDefault) await this.clearDefaultDashboard(user.tenantId);
    const dashboard = await this.prisma.dashboard.create({
      data: {
        tenantId: user.tenantId,
        ownerId: user.id,
        name: dto.name.trim(),
        description: dto.description,
        visibility: dto.visibility ?? DashboardVisibility.PRIVATE,
        layout: this.toJson(dto.layout),
        filters: this.toJson(dto.filters),
        refreshIntervalSeconds: dto.refreshIntervalSeconds,
        isDefault: dto.isDefault ?? false
      },
      select: dashboardSelect
    });
    await this.recordAudit(user, 'dashboard.create', 'Dashboard', dashboard.id, undefined, {
      name: dashboard.name,
      visibility: dashboard.visibility
    }, meta);
    return dashboard;
  }

  async getDashboard(user: AuthenticatedUser, dashboardId: string) {
    const dashboard = await this.getDashboardOrThrow(user, dashboardId);
    return {
      ...dashboard,
      widgetData: await this.resolveDashboardWidgetData(user, dashboard.widgets)
    };
  }

  async updateDashboard(
    user: AuthenticatedUser,
    dashboardId: string,
    dto: UpdateDashboardDto,
    meta: RequestMeta
  ) {
    this.assertCanManageReports(user);
    const before = await this.getDashboardOrThrow(user, dashboardId);
    if (dto.isDefault) await this.clearDefaultDashboard(user.tenantId, dashboardId);
    const dashboard = await this.prisma.dashboard.update({
      where: { id: dashboardId },
      data: {
        name: dto.name?.trim(),
        description: dto.description,
        visibility: dto.visibility,
        layout: dto.layout === undefined ? undefined : this.toJson(dto.layout),
        filters: dto.filters === undefined ? undefined : this.toJson(dto.filters),
        refreshIntervalSeconds: dto.refreshIntervalSeconds,
        isDefault: dto.isDefault
      },
      select: dashboardSelect
    });
    await this.recordAudit(user, 'dashboard.update', 'Dashboard', dashboardId, {
      name: before.name,
      visibility: before.visibility
    }, {
      name: dashboard.name,
      visibility: dashboard.visibility
    }, meta);
    return dashboard;
  }

  async archiveDashboard(user: AuthenticatedUser, dashboardId: string, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const before = await this.getDashboardOrThrow(user, dashboardId);
    const dashboard = await this.prisma.dashboard.update({
      where: { id: dashboardId },
      data: { archivedAt: new Date(), isDefault: false },
      select: dashboardSelect
    });
    await this.recordAudit(user, 'dashboard.archive', 'Dashboard', dashboardId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: dashboard.archivedAt
    }, meta);
    return dashboard;
  }

  async restoreDashboard(user: AuthenticatedUser, dashboardId: string, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const before = await this.getDashboardOrThrow(user, dashboardId);
    const dashboard = await this.prisma.dashboard.update({
      where: { id: dashboardId },
      data: { archivedAt: null },
      select: dashboardSelect
    });
    await this.recordAudit(user, 'dashboard.restore', 'Dashboard', dashboardId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: dashboard.archivedAt
    }, meta);
    return dashboard;
  }

  async deleteDashboard(user: AuthenticatedUser, dashboardId: string, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const dashboard = await this.getDashboardOrThrow(user, dashboardId);
    if (dashboard._count.widgets > 0) return this.archiveDashboard(user, dashboardId, meta);
    await this.prisma.dashboard.delete({ where: { id: dashboardId } });
    await this.recordAudit(user, 'dashboard.delete', 'Dashboard', dashboardId, {
      name: dashboard.name
    }, undefined, meta);
    return { success: true };
  }

  async createWidget(
    user: AuthenticatedUser,
    dashboardId: string,
    dto: CreateWidgetDto,
    meta: RequestMeta
  ) {
    this.assertCanManageReports(user);
    await this.getDashboardOrThrow(user, dashboardId);
    const widget = await this.prisma.dashboardWidget.create({
      data: {
        tenantId: user.tenantId,
        dashboardId,
        type: this.normalizeKey(dto.type),
        title: dto.title.trim(),
        config: this.toJson(dto.config),
        position: this.toJson(dto.position),
        dataSource: this.toJson(dto.dataSource),
        refreshIntervalSeconds: dto.refreshIntervalSeconds,
        hidden: dto.hidden ?? false
      },
      select: dashboardWidgetSelect
    });
    await this.recordAudit(user, 'dashboard_widget.create', 'DashboardWidget', widget.id, undefined, {
      dashboardId,
      type: widget.type
    }, meta);
    return widget;
  }

  async updateWidget(user: AuthenticatedUser, widgetId: string, dto: UpdateWidgetDto, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const before = await this.getWidgetOrThrow(user.tenantId, widgetId);
    const widget = await this.prisma.dashboardWidget.update({
      where: { id: widgetId },
      data: {
        type: dto.type ? this.normalizeKey(dto.type) : undefined,
        title: dto.title?.trim(),
        config: dto.config === undefined ? undefined : this.toJson(dto.config),
        position: dto.position === undefined ? undefined : this.toJson(dto.position),
        dataSource: dto.dataSource === undefined ? undefined : this.toJson(dto.dataSource),
        refreshIntervalSeconds: dto.refreshIntervalSeconds,
        hidden: dto.hidden
      },
      select: dashboardWidgetSelect
    });
    await this.recordAudit(user, 'dashboard_widget.update', 'DashboardWidget', widget.id, {
      title: before.title,
      type: before.type
    }, {
      title: widget.title,
      type: widget.type
    }, meta);
    return widget;
  }

  async refreshWidget(user: AuthenticatedUser, widgetId: string) {
    this.assertCanReadReports(user);
    const widget = await this.getWidgetOrThrow(user.tenantId, widgetId);
    return {
      widget,
      data: await this.resolveWidgetData(user, widget)
    };
  }

  async deleteWidget(user: AuthenticatedUser, widgetId: string, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const widget = await this.getWidgetOrThrow(user.tenantId, widgetId);
    await this.prisma.dashboardWidget.delete({ where: { id: widgetId } });
    await this.recordAudit(user, 'dashboard_widget.delete', 'DashboardWidget', widgetId, {
      dashboardId: widget.dashboardId,
      title: widget.title
    }, undefined, meta);
    return { success: true };
  }

  async listReports(user: AuthenticatedUser, query: ReportQueryDto) {
    this.assertCanReadReports(user);
    const where: Prisma.ReportWhereInput = {
      tenantId: user.tenantId,
      type: query.type ? this.normalizeKey(query.type) : undefined,
      status: query.status,
      archivedAt: query.includeArchived ? undefined : null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { type: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        select: reportSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.report.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createReport(user: AuthenticatedUser, dto: CreateReportDto, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const report = await this.prisma.report.create({
      data: {
        tenantId: user.tenantId,
        createdById: user.id,
        name: dto.name.trim(),
        description: dto.description,
        type: this.normalizeKey(dto.type),
        status: dto.status ?? ReportStatus.DRAFT,
        query: this.toJson(dto.query),
        schedule: dto.schedule,
        timezone: dto.timezone,
        recipients: this.normalizeStringArray(dto.recipients),
        cacheTtlSeconds: dto.cacheTtlSeconds,
        nextRunAt: dto.nextRunAt ? new Date(dto.nextRunAt) : undefined,
        metadata: this.toJson(dto.metadata)
      },
      select: reportSelect
    });
    await this.recordAudit(user, 'report.create', 'Report', report.id, undefined, {
      name: report.name,
      type: report.type
    }, meta);
    return report;
  }

  async getReport(user: AuthenticatedUser, reportId: string) {
    this.assertCanReadReports(user);
    return this.getReportOrThrow(user.tenantId, reportId);
  }

  async updateReport(user: AuthenticatedUser, reportId: string, dto: UpdateReportDto, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const before = await this.getReportOrThrow(user.tenantId, reportId);
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        name: dto.name?.trim(),
        description: dto.description,
        type: dto.type ? this.normalizeKey(dto.type) : undefined,
        status: dto.status,
        query: dto.query === undefined ? undefined : this.toJson(dto.query),
        schedule: dto.schedule,
        timezone: dto.timezone,
        recipients: dto.recipients === undefined ? undefined : this.normalizeStringArray(dto.recipients),
        cacheTtlSeconds: dto.cacheTtlSeconds,
        nextRunAt: dto.nextRunAt ? new Date(dto.nextRunAt) : undefined,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: reportSelect
    });
    await this.recordAudit(user, 'report.update', 'Report', report.id, {
      name: before.name,
      status: before.status,
      type: before.type
    }, {
      name: report.name,
      status: report.status,
      type: report.type
    }, meta);
    return report;
  }

  async archiveReport(user: AuthenticatedUser, reportId: string, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const before = await this.getReportOrThrow(user.tenantId, reportId);
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: { archivedAt: new Date(), status: ReportStatus.ARCHIVED },
      select: reportSelect
    });
    await this.recordAudit(user, 'report.archive', 'Report', reportId, {
      status: before.status
    }, {
      status: report.status
    }, meta);
    return report;
  }

  async restoreReport(user: AuthenticatedUser, reportId: string, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const before = await this.getReportOrThrow(user.tenantId, reportId);
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: { archivedAt: null, status: ReportStatus.ACTIVE },
      select: reportSelect
    });
    await this.recordAudit(user, 'report.restore', 'Report', reportId, {
      status: before.status
    }, {
      status: report.status
    }, meta);
    return report;
  }

  async deleteReport(user: AuthenticatedUser, reportId: string, meta: RequestMeta) {
    this.assertCanManageReports(user);
    const report = await this.getReportOrThrow(user.tenantId, reportId);
    if (report._count.executions > 0 || report._count.exports > 0) return this.archiveReport(user, reportId, meta);
    await this.prisma.report.delete({ where: { id: reportId } });
    await this.recordAudit(user, 'report.delete', 'Report', reportId, {
      name: report.name
    }, undefined, meta);
    return { success: true };
  }

  async runReport(user: AuthenticatedUser, reportId: string, dto: RunReportDto, meta: RequestMeta) {
    this.assertCanReadReports(user);
    const report = await this.getReportOrThrow(user.tenantId, reportId);
    if (report.archivedAt || report.status === ReportStatus.ARCHIVED) {
      throw new BadRequestException('Report is archived');
    }
    const parameters = { ...this.asRecord(report.query), ...this.asRecord(dto.parameters) };
    return this.createAndExecuteReport(user, report.type, parameters, report.id, dto.cacheKey, meta);
  }

  async runAdHocReport(user: AuthenticatedUser, dto: RunReportDto, meta: RequestMeta) {
    this.assertCanReadReports(user);
    const type = dto.type ? this.normalizeKey(dto.type) : 'OVERVIEW';
    return this.createAndExecuteReport(user, type, this.asRecord(dto.parameters), null, dto.cacheKey, meta);
  }

  async listExecutions(user: AuthenticatedUser, query: ExecutionQueryDto) {
    this.assertCanReadReports(user);
    const where: Prisma.ReportExecutionWhereInput = {
      tenantId: user.tenantId,
      reportId: query.reportId,
      type: query.type ? this.normalizeKey(query.type) : undefined,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { type: { contains: query.search, mode: 'insensitive' } },
              { error: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.reportExecution.findMany({
        where,
        select: executionSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.reportExecution.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async getExecution(user: AuthenticatedUser, executionId: string) {
    const execution = await this.prisma.reportExecution.findFirst({
      where: { id: executionId, tenantId: user.tenantId },
      select: executionSelect
    });
    if (!execution) throw new NotFoundException('Report execution not found');
    return execution;
  }

  async exportReport(user: AuthenticatedUser, reportId: string, dto: ExportReportDto, meta: RequestMeta) {
    this.assertCanReadReports(user);
    const report = await this.getReportOrThrow(user.tenantId, reportId);
    const execution = await this.createAndExecuteReport(user, report.type, this.asRecord(dto.parameters ?? report.query), report.id, undefined, meta);
    const payload = JSON.stringify(execution.result ?? {}, null, 2);
    const fileName = `${report.name.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.${dto.format.toLowerCase()}`;
    const exportRecord = await this.prisma.reportExport.create({
      data: {
        tenantId: user.tenantId,
        reportId: report.id,
        executionId: execution.id,
        requestedById: user.id,
        format: dto.format,
        status: ReportExportStatus.COMPLETED,
        fileName,
        fileUrl: `inline://report-exports/${execution.id}`,
        mimeType: this.mimeType(dto.format),
        sizeBytes: Buffer.byteLength(payload),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      select: exportSelect
    });
    await this.recordAudit(user, 'report.export', 'ReportExport', exportRecord.id, undefined, {
      reportId,
      executionId: execution.id,
      format: dto.format
    }, meta);
    return exportRecord;
  }

  async listExports(user: AuthenticatedUser, query: ExportQueryDto) {
    this.assertCanReadReports(user);
    const where: Prisma.ReportExportWhereInput = {
      tenantId: user.tenantId,
      reportId: query.reportId,
      format: query.format,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { fileName: { contains: query.search, mode: 'insensitive' } },
              { error: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.reportExport.findMany({
        where,
        select: exportSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.reportExport.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async getExport(user: AuthenticatedUser, exportId: string) {
    const exportRecord = await this.prisma.reportExport.findFirst({
      where: { id: exportId, tenantId: user.tenantId },
      select: exportSelect
    });
    if (!exportRecord) throw new NotFoundException('Report export not found');
    return exportRecord;
  }

  async overview(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.assertCanReadReports(user);
    const where = await this.analyticsWhere(user.tenantId, query);
    const [projects, tasks, overdueTasks, risks, budgets, timeEntries] = await this.prisma.$transaction([
      this.prisma.project.count({ where: where.project }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: where.task,
        _count: { _all: true }
      }),
      this.prisma.task.count({
        where: { ...where.task, dueDate: { lt: new Date() }, status: { not: TaskStatus.DONE } }
      }),
      this.prisma.projectRisk.count({ where: { project: where.project, isOpen: true } }),
      this.prisma.projectBudget.aggregate({
        where: { project: where.project },
        _sum: { planned: true, actual: true }
      }),
      this.prisma.timeEntry.aggregate({
        where: where.timeEntry,
        _sum: { minutes: true },
        _count: { _all: true }
      })
    ]);
    return {
      projects,
      tasks: Object.fromEntries(tasks.map((item) => [item.status, item._count._all])),
      overdueTasks,
      openRisks: risks,
      budget: {
        planned: budgets._sum.planned ?? 0,
        actual: budgets._sum.actual ?? 0
      },
      time: {
        entries: timeEntries._count._all,
        minutes: timeEntries._sum.minutes ?? 0
      }
    };
  }

  async projectHealth(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.assertCanReadReports(user);
    const where = await this.analyticsWhere(user.tenantId, query);
    const projects = await this.prisma.project.findMany({
      where: where.project,
      select: {
        id: true,
        key: true,
        name: true,
        status: true,
        progress: true,
        dueDate: true,
        _count: { select: { tasks: true, risks: true } }
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 100
    });
    const data: Array<typeof projects[number] & {
      doneTasks: number;
      overdueTasks: number;
      openRisks: number;
      completion: number;
      healthScore: number;
    }> = [];
    for (const project of projects) {
      const [doneTasks, overdueTasks, openRisks] = await this.prisma.$transaction([
        this.prisma.task.count({ where: { tenantId: user.tenantId, projectId: project.id, status: TaskStatus.DONE } }),
        this.prisma.task.count({ where: { tenantId: user.tenantId, projectId: project.id, dueDate: { lt: new Date() }, status: { not: TaskStatus.DONE } } }),
        this.prisma.projectRisk.count({ where: { projectId: project.id, isOpen: true } })
      ]);
      const completion = project._count.tasks ? Math.round((doneTasks / project._count.tasks) * 100) : project.progress;
      const score = Math.max(0, Math.min(100, completion - overdueTasks * 5 - openRisks * 8));
      data.push({ ...project, doneTasks, overdueTasks, openRisks, completion, healthScore: score });
    }
    return { data, total: data.length };
  }

  async teamPerformance(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.assertCanReadReports(user);
    const where = await this.analyticsWhere(user.tenantId, query);
    const teams = await this.prisma.team.findMany({
      where: { tenantId: user.tenantId, id: query.teamId, workspaceId: query.workspaceId },
      select: { id: true, name: true, _count: { select: { members: true, projects: true } } },
      orderBy: [{ name: 'asc' }],
      take: 100
    });
    const data: Array<typeof teams[number] & {
      tasks: number;
      doneTasks: number;
      completionRate: number;
      minutes: number;
    }> = [];
    for (const team of teams) {
      const [tasks, doneTasks, minutes] = await this.prisma.$transaction([
        this.prisma.task.count({ where: { ...where.task, project: { ...where.project, teamId: team.id } } }),
        this.prisma.task.count({ where: { ...where.task, status: TaskStatus.DONE, project: { ...where.project, teamId: team.id } } }),
        this.prisma.timeEntry.aggregate({
          where: { ...where.timeEntry, project: { ...where.project, teamId: team.id } },
          _sum: { minutes: true }
        })
      ]);
      data.push({
        ...team,
        tasks,
        doneTasks,
        completionRate: tasks ? Math.round((doneTasks / tasks) * 100) : 0,
        minutes: minutes._sum.minutes ?? 0
      });
    }
    return { data, total: data.length };
  }

  async cycleTime(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.assertCanReadReports(user);
    const where = await this.analyticsWhere(user.tenantId, query);
    const tasks = await this.prisma.task.findMany({
      where: { ...where.task, completedAt: { not: null } },
      select: { id: true, key: true, title: true, createdAt: true, completedAt: true, priority: true, type: true },
      orderBy: [{ completedAt: 'desc' }],
      take: 500
    });
    const data = tasks.map((task) => ({
      ...task,
      cycleTimeHours: task.completedAt
        ? Math.round((task.completedAt.getTime() - task.createdAt.getTime()) / 36_000) / 100
        : null
    }));
    const values = data.map((item) => item.cycleTimeHours).filter((value): value is number => typeof value === 'number');
    return {
      data,
      averageCycleTimeHours: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
      total: data.length
    };
  }

  async velocity(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.assertCanReadReports(user);
    const where = await this.analyticsWhere(user.tenantId, query);
    const sprints = await this.prisma.sprint.findMany({
      where: {
        project: where.project,
        completedAt: this.dateFilter(query.from, query.to) ?? { not: null }
      },
      select: { id: true, name: true, projectId: true, startDate: true, endDate: true, completedAt: true, project: { select: { key: true, name: true } } },
      orderBy: [{ completedAt: 'desc' }],
      take: 50
    });
    const data: Array<typeof sprints[number] & {
      completedTasks: number;
      storyPoints: number;
    }> = [];
    for (const sprint of sprints) {
      const points = await this.prisma.task.aggregate({
        where: { tenantId: user.tenantId, sprintId: sprint.id, status: TaskStatus.DONE },
        _sum: { storyPoints: true },
        _count: { _all: true }
      });
      data.push({ ...sprint, completedTasks: points._count._all, storyPoints: points._sum.storyPoints ?? 0 });
    }
    return {
      data,
      averageStoryPoints: data.length ? data.reduce((sum, item) => sum + item.storyPoints, 0) / data.length : 0,
      total: data.length
    };
  }

  async budget(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.assertCanReadReports(user);
    const where = await this.analyticsWhere(user.tenantId, query);
    const budgets = await this.prisma.projectBudget.findMany({
      where: { project: where.project },
      select: { id: true, currency: true, planned: true, actual: true, notes: true, project: { select: { id: true, key: true, name: true } } },
      orderBy: [{ updatedAt: 'desc' }],
      take: 200
    });
    const data = budgets.map((item) => ({
      ...item,
      variance: Number(item.planned) - Number(item.actual),
      utilizationPercent: Number(item.planned) > 0 ? Math.round((Number(item.actual) / Number(item.planned)) * 100) : 0
    }));
    return { data, total: data.length };
  }

  async sla(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.assertCanReadReports(user);
    const where = await this.analyticsWhere(user.tenantId, query);
    const [totalWithDueDate, breached, completedTasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where: { ...where.task, dueDate: { not: null } } }),
      this.prisma.task.count({ where: { ...where.task, dueDate: { lt: new Date() }, status: { not: TaskStatus.DONE } } }),
      this.prisma.task.findMany({
        where: {
          ...where.task,
          dueDate: { not: null },
          completedAt: { not: null }
        },
        select: { dueDate: true, completedAt: true },
        take: 1000
      })
    ]);
    const completedOnTime = completedTasks.filter(
      (task) => task.completedAt && task.dueDate && task.completedAt.getTime() <= task.dueDate.getTime()
    ).length;
    return {
      totalWithDueDate,
      breached,
      completedOnTime,
      compliancePercent: totalWithDueDate
        ? Math.round(((totalWithDueDate - breached) / totalWithDueDate) * 100)
        : 100
    };
  }

  private async createAndExecuteReport(
    user: AuthenticatedUser,
    type: string,
    parameters: Record<string, unknown>,
    reportId: string | null,
    cacheKey: string | undefined,
    meta: RequestMeta
  ) {
    const normalizedType = this.normalizeKey(type);
    const startedAt = new Date();
    const execution = await this.prisma.reportExecution.create({
      data: {
        tenantId: user.tenantId,
        reportId,
        requestedById: user.id,
        type: normalizedType,
        status: ReportExecutionStatus.RUNNING,
        parameters: this.toJson(parameters),
        startedAt,
        cacheKey
      },
      select: executionSelect
    });
    try {
      const result = await this.executeReportType(user, normalizedType, parameters);
      const completedAt = new Date();
      const summary = this.executionSummary(result);
      const updated = await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: ReportExecutionStatus.COMPLETED,
          result: this.toJson(result),
          summary: this.toJson(summary),
          rowCount: summary.rowCount,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime()
        },
        select: executionSelect
      });
      if (reportId) {
        await this.prisma.report.update({
          where: { id: reportId },
          data: { lastRunAt: completedAt }
        });
      }
      await this.recordAudit(user, 'report.execute', 'ReportExecution', execution.id, undefined, {
        type: normalizedType,
        status: updated.status,
        reportId
      }, meta);
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Report execution failed';
      return this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: ReportExecutionStatus.FAILED,
          error: message,
          completedAt: new Date()
        },
        select: executionSelect
      });
    }
  }

  private async executeReportType(user: AuthenticatedUser, type: string, parameters: Record<string, unknown>) {
    const query: AnalyticsQueryDto = {
      projectId: this.stringValue(parameters.projectId),
      teamId: this.stringValue(parameters.teamId),
      workspaceId: this.stringValue(parameters.workspaceId),
      from: this.stringValue(parameters.from),
      to: this.stringValue(parameters.to)
    };
    switch (type) {
      case 'PROJECT_HEALTH':
        return this.projectHealth(user, query);
      case 'TEAM_PERFORMANCE':
        return this.teamPerformance(user, query);
      case 'CYCLE_TIME':
        return this.cycleTime(user, query);
      case 'VELOCITY':
        return this.velocity(user, query);
      case 'BUDGET':
        return this.budget(user, query);
      case 'SLA':
        return this.sla(user, query);
      case 'OVERVIEW':
      default:
        return this.overview(user, query);
    }
  }

  private executionSummary(result: unknown) {
    const record = this.asRecord(result);
    const data = Array.isArray(record.data) ? record.data : [];
    return {
      rowCount: data.length || this.numberValue(record.total) || 1,
      generatedAt: new Date().toISOString(),
      keys: Object.keys(record)
    };
  }

  private async analyticsWhere(tenantId: string, query: AnalyticsQueryDto) {
    if (query.projectId) await this.assertProjectBelongsToTenant(tenantId, query.projectId);
    if (query.teamId) await this.assertTeamBelongsToTenant(tenantId, query.teamId);
    const dateFilter = this.dateFilter(query.from, query.to);
    const project: Prisma.ProjectWhereInput = {
      tenantId,
      id: query.projectId,
      teamId: query.teamId,
      workspaceId: query.workspaceId
    };
    const task: Prisma.TaskWhereInput = {
      tenantId,
      projectId: query.projectId,
      project: {
        tenantId,
        teamId: query.teamId,
        workspaceId: query.workspaceId
      },
      createdAt: dateFilter
    };
    const timeEntry: Prisma.TimeEntryWhereInput = {
      tenantId,
      projectId: query.projectId,
      project: {
        tenantId,
        teamId: query.teamId,
        workspaceId: query.workspaceId
      },
      startedAt: dateFilter
    };
    return { project, task, timeEntry };
  }

  private async resolveDashboardWidgetData(
    user: AuthenticatedUser,
    widgets: Array<Prisma.DashboardWidgetGetPayload<{ select: typeof dashboardWidgetSelect }>>
  ) {
    const data: Record<string, unknown> = {};
    for (const widget of widgets.filter((item) => !item.hidden)) {
      data[widget.id] = await this.resolveWidgetData(user, widget);
    }
    return data;
  }

  private async resolveWidgetData(
    user: AuthenticatedUser,
    widget: Prisma.DashboardWidgetGetPayload<{ select: typeof dashboardWidgetSelect }>
  ) {
    const source = this.asRecord(widget.dataSource);
    const type = this.normalizeKey(this.stringValue(source.reportType) ?? widget.type);
    return this.executeReportType(user, type, source);
  }

  private async getDashboardOrThrow(user: AuthenticatedUser, dashboardId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        tenantId: user.tenantId,
        ...(this.canManageReports(user)
          ? {}
          : {
              OR: [
                { ownerId: user.id },
                { visibility: { in: [DashboardVisibility.TENANT, DashboardVisibility.PUBLIC] } }
              ]
            })
      },
      select: dashboardSelect
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found');
    return dashboard;
  }

  private async getWidgetOrThrow(tenantId: string, widgetId: string) {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, tenantId },
      select: dashboardWidgetSelect
    });
    if (!widget) throw new NotFoundException('Dashboard widget not found');
    return widget;
  }

  private async getReportOrThrow(tenantId: string, reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, tenantId },
      select: reportSelect
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  private async clearDefaultDashboard(tenantId: string, excludedDashboardId?: string) {
    await this.prisma.dashboard.updateMany({
      where: {
        tenantId,
        isDefault: true,
        id: excludedDashboardId ? { not: excludedDashboardId } : undefined
      },
      data: { isDefault: false }
    });
  }

  private async assertProjectBelongsToTenant(tenantId: string, projectId: string) {
    const count = await this.prisma.project.count({ where: { id: projectId, tenantId } });
    if (count === 0) throw new NotFoundException('Project not found');
  }

  private async assertTeamBelongsToTenant(tenantId: string, teamId: string) {
    const count = await this.prisma.team.count({ where: { id: teamId, tenantId } });
    if (count === 0) throw new NotFoundException('Team not found');
  }

  private assertCanReadReports(user: AuthenticatedUser) {
    if (this.canReadReports(user)) return;
    throw new ForbiddenException('Cannot access reports');
  }

  private assertCanManageReports(user: AuthenticatedUser) {
    if (this.canManageReports(user)) return;
    throw new ForbiddenException('Cannot manage reports');
  }

  private canReadReports(user: AuthenticatedUser) {
    return this.canManageReports(user) || user.permissions.includes('read:reports');
  }

  private canManageReports(user: AuthenticatedUser) {
    return (
      user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:tenant') ||
      user.permissions.includes('manage:reports')
    );
  }

  private mimeType(format: ReportExportFormat) {
    switch (format) {
      case ReportExportFormat.CSV:
        return 'text/csv';
      case ReportExportFormat.XLSX:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ReportExportFormat.PDF:
        return 'application/pdf';
      case ReportExportFormat.JSON:
      default:
        return 'application/json';
    }
  }

  private normalizeKey(value: string) {
    return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
  }

  private normalizeStringArray(values?: string[]) {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private numberValue(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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
