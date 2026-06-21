import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Version
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
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
import { ReportingService } from './reporting.service';

@ApiTags('reporting')
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Reporting module readiness and supported report types' })
  status() {
    return this.reportingService.status();
  }

  @Get('dashboards')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant dashboards' })
  @ApiOkResponse({ description: 'Paginated dashboards with widgets' })
  listDashboards(@CurrentUser() user: AuthenticatedUser, @Query() query: DashboardQueryDto) {
    return this.reportingService.listDashboards(user, query);
  }

  @Post('dashboards')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a dashboard' })
  @ApiCreatedResponse({ description: 'Created dashboard' })
  createDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDashboardDto,
    @Req() request: Request
  ) {
    return this.reportingService.createDashboard(user, dto, this.getRequestMeta(request));
  }

  @Get('dashboards/:dashboardId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a dashboard with resolved widget data' })
  getDashboard(@CurrentUser() user: AuthenticatedUser, @Param('dashboardId') dashboardId: string) {
    return this.reportingService.getDashboard(user, dashboardId);
  }

  @Patch('dashboards/:dashboardId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a dashboard' })
  updateDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dashboardId') dashboardId: string,
    @Body() dto: UpdateDashboardDto,
    @Req() request: Request
  ) {
    return this.reportingService.updateDashboard(user, dashboardId, dto, this.getRequestMeta(request));
  }

  @Post('dashboards/:dashboardId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a dashboard' })
  archiveDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dashboardId') dashboardId: string,
    @Req() request: Request
  ) {
    return this.reportingService.archiveDashboard(user, dashboardId, this.getRequestMeta(request));
  }

  @Post('dashboards/:dashboardId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived dashboard' })
  restoreDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dashboardId') dashboardId: string,
    @Req() request: Request
  ) {
    return this.reportingService.restoreDashboard(user, dashboardId, this.getRequestMeta(request));
  }

  @Delete('dashboards/:dashboardId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a dashboard, or archive it when widgets exist' })
  deleteDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dashboardId') dashboardId: string,
    @Req() request: Request
  ) {
    return this.reportingService.deleteDashboard(user, dashboardId, this.getRequestMeta(request));
  }

  @Post('dashboards/:dashboardId/widgets')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a widget to a dashboard' })
  @ApiCreatedResponse({ description: 'Created dashboard widget' })
  createWidget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dashboardId') dashboardId: string,
    @Body() dto: CreateWidgetDto,
    @Req() request: Request
  ) {
    return this.reportingService.createWidget(user, dashboardId, dto, this.getRequestMeta(request));
  }

  @Patch('widgets/:widgetId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a dashboard widget' })
  updateWidget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('widgetId') widgetId: string,
    @Body() dto: UpdateWidgetDto,
    @Req() request: Request
  ) {
    return this.reportingService.updateWidget(user, widgetId, dto, this.getRequestMeta(request));
  }

  @Get('widgets/:widgetId/refresh')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve the current data for one dashboard widget' })
  refreshWidget(@CurrentUser() user: AuthenticatedUser, @Param('widgetId') widgetId: string) {
    return this.reportingService.refreshWidget(user, widgetId);
  }

  @Delete('widgets/:widgetId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a dashboard widget' })
  deleteWidget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('widgetId') widgetId: string,
    @Req() request: Request
  ) {
    return this.reportingService.deleteWidget(user, widgetId, this.getRequestMeta(request));
  }

  @Get('reports')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List saved reports' })
  @ApiOkResponse({ description: 'Paginated reports' })
  listReports(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQueryDto) {
    return this.reportingService.listReports(user, query);
  }

  @Post('reports')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a saved report' })
  @ApiCreatedResponse({ description: 'Created report' })
  createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
    @Req() request: Request
  ) {
    return this.reportingService.createReport(user, dto, this.getRequestMeta(request));
  }

  @Post('reports/run')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run an ad hoc report' })
  runAdHocReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RunReportDto,
    @Req() request: Request
  ) {
    return this.reportingService.runAdHocReport(user, dto, this.getRequestMeta(request));
  }

  @Get('reports/:reportId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a saved report' })
  getReport(@CurrentUser() user: AuthenticatedUser, @Param('reportId') reportId: string) {
    return this.reportingService.getReport(user, reportId);
  }

  @Patch('reports/:reportId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a saved report' })
  updateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportDto,
    @Req() request: Request
  ) {
    return this.reportingService.updateReport(user, reportId, dto, this.getRequestMeta(request));
  }

  @Post('reports/:reportId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a saved report' })
  archiveReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
    @Req() request: Request
  ) {
    return this.reportingService.archiveReport(user, reportId, this.getRequestMeta(request));
  }

  @Post('reports/:reportId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived report' })
  restoreReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
    @Req() request: Request
  ) {
    return this.reportingService.restoreReport(user, reportId, this.getRequestMeta(request));
  }

  @Delete('reports/:reportId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a saved report, or archive it when history exists' })
  deleteReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
    @Req() request: Request
  ) {
    return this.reportingService.deleteReport(user, reportId, this.getRequestMeta(request));
  }

  @Post('reports/:reportId/run')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run a saved report' })
  runReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
    @Body() dto: RunReportDto,
    @Req() request: Request
  ) {
    return this.reportingService.runReport(user, reportId, dto, this.getRequestMeta(request));
  }

  @Post('reports/:reportId/exports')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a report export record' })
  exportReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
    @Body() dto: ExportReportDto,
    @Req() request: Request
  ) {
    return this.reportingService.exportReport(user, reportId, dto, this.getRequestMeta(request));
  }

  @Get('executions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List report executions' })
  listExecutions(@CurrentUser() user: AuthenticatedUser, @Query() query: ExecutionQueryDto) {
    return this.reportingService.listExecutions(user, query);
  }

  @Get('executions/:executionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a report execution' })
  getExecution(@CurrentUser() user: AuthenticatedUser, @Param('executionId') executionId: string) {
    return this.reportingService.getExecution(user, executionId);
  }

  @Get('exports')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List report exports' })
  listExports(@CurrentUser() user: AuthenticatedUser, @Query() query: ExportQueryDto) {
    return this.reportingService.listExports(user, query);
  }

  @Get('exports/:exportId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a report export' })
  getExport(@CurrentUser() user: AuthenticatedUser, @Param('exportId') exportId: string) {
    return this.reportingService.getExport(user, exportId);
  }

  @Get('analytics/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant portfolio analytics overview' })
  overview(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsQueryDto) {
    return this.reportingService.overview(user, query);
  }

  @Get('analytics/project-health')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project health analytics' })
  projectHealth(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsQueryDto) {
    return this.reportingService.projectHealth(user, query);
  }

  @Get('analytics/team-performance')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team throughput and time analytics' })
  teamPerformance(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsQueryDto) {
    return this.reportingService.teamPerformance(user, query);
  }

  @Get('analytics/cycle-time')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get task cycle-time analytics' })
  cycleTime(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsQueryDto) {
    return this.reportingService.cycleTime(user, query);
  }

  @Get('analytics/velocity')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get completed sprint velocity analytics' })
  velocity(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsQueryDto) {
    return this.reportingService.velocity(user, query);
  }

  @Get('analytics/budget')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get budget utilization analytics' })
  budget(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsQueryDto) {
    return this.reportingService.budget(user, query);
  }

  @Get('analytics/sla')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SLA and due-date compliance analytics' })
  sla(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsQueryDto) {
    return this.reportingService.sla(user, query);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null
    };
  }
}
