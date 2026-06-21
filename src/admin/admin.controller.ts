import {
  Body,
  Controller,
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
import { AdminService } from './admin.service';
import { ApiKeyQueryDto } from './dto/api-key-query.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ComplianceDecisionDto } from './dto/compliance-decision.dto';
import { ComplianceJobQueryDto } from './dto/compliance-job-query.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateComplianceJobDto } from './dto/create-compliance-job.dto';
import { CreateSecurityEventDto } from './dto/create-security-event.dto';
import { SecurityEventQueryDto } from './dto/security-event-query.dto';
import { SessionQueryDto } from './dto/session-query.dto';
import { UpdateSecurityEventDto } from './dto/update-security-event.dto';
import { UpdateSecurityPolicyDto } from './dto/update-security-policy.dto';

type RequestWithId = Request & { requestId?: string };

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Admin module readiness check' })
  status() {
    return this.adminService.status();
  }

  @Get('overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant admin, security, and compliance overview' })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.overview(user);
  }

  @Get('security-checks')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get runtime security hardening checks' })
  securityChecks() {
    return this.adminService.securityChecks();
  }

  @Get('audit-logs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:audit_logs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search immutable tenant audit logs' })
  @ApiOkResponse({ description: 'Paginated audit logs' })
  listAuditLogs(@CurrentUser() user: AuthenticatedUser, @Query() query: AuditLogQueryDto) {
    return this.adminService.listAuditLogs(user, query);
  }

  @Get('audit-logs/:auditLogId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:audit_logs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one tenant audit log entry' })
  getAuditLog(@CurrentUser() user: AuthenticatedUser, @Param('auditLogId') auditLogId: string) {
    return this.adminService.getAuditLog(user, auditLogId);
  }

  @Get('security-policy')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant security and retention policy' })
  getSecurityPolicy(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.getSecurityPolicy(user);
  }

  @Patch('security-policy')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current tenant security and retention policy' })
  updateSecurityPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSecurityPolicyDto,
    @Req() request: RequestWithId
  ) {
    return this.adminService.updateSecurityPolicy(user, dto, this.getRequestMeta(request));
  }

  @Get('sessions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant auth sessions without refresh token hashes' })
  listSessions(@CurrentUser() user: AuthenticatedUser, @Query() query: SessionQueryDto) {
    return this.adminService.listSessions(user, query);
  }

  @Post('users/:userId/sessions/revoke')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all active sessions for a tenant user' })
  revokeUserSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Req() request: RequestWithId
  ) {
    return this.adminService.revokeUserSessions(user, userId, this.getRequestMeta(request));
  }

  @Get('sessions/:sessionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one auth session without refresh token hash' })
  getSession(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') sessionId: string) {
    return this.adminService.getSession(user, sessionId);
  }

  @Post('sessions/:sessionId/revoke')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one auth session' })
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Req() request: RequestWithId
  ) {
    return this.adminService.revokeSession(user, sessionId, this.getRequestMeta(request));
  }

  @Get('security-events')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search tenant security events' })
  listSecurityEvents(@CurrentUser() user: AuthenticatedUser, @Query() query: SecurityEventQueryDto) {
    return this.adminService.listSecurityEvents(user, query);
  }

  @Post('security-events')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tenant security event' })
  @ApiCreatedResponse({ description: 'Created security event' })
  createSecurityEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSecurityEventDto,
    @Req() request: RequestWithId
  ) {
    return this.adminService.createSecurityEvent(user, dto, this.getRequestMeta(request));
  }

  @Get('security-events/:eventId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one tenant security event' })
  getSecurityEvent(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.adminService.getSecurityEvent(user, eventId);
  }

  @Patch('security-events/:eventId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update security event status, severity, or metadata' })
  updateSecurityEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateSecurityEventDto,
    @Req() request: RequestWithId
  ) {
    return this.adminService.updateSecurityEvent(user, eventId, dto, this.getRequestMeta(request));
  }

  @Get('compliance-jobs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:compliance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant compliance jobs' })
  listComplianceJobs(@CurrentUser() user: AuthenticatedUser, @Query() query: ComplianceJobQueryDto) {
    return this.adminService.listComplianceJobs(user, query);
  }

  @Post('compliance-jobs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:compliance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tracked compliance job' })
  @ApiCreatedResponse({ description: 'Created compliance job' })
  createComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateComplianceJobDto,
    @Req() request: RequestWithId
  ) {
    return this.adminService.createComplianceJob(user, dto, this.getRequestMeta(request));
  }

  @Get('compliance-jobs/:jobId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:compliance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one compliance job' })
  getComplianceJob(@CurrentUser() user: AuthenticatedUser, @Param('jobId') jobId: string) {
    return this.adminService.getComplianceJob(user, jobId);
  }

  @Post('compliance-jobs/:jobId/approve')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:compliance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a compliance job before execution' })
  approveComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: ComplianceDecisionDto,
    @Req() request: RequestWithId
  ) {
    return this.adminService.approveComplianceJob(user, jobId, dto, this.getRequestMeta(request));
  }

  @Post('compliance-jobs/:jobId/reject')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:compliance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a compliance job' })
  rejectComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: ComplianceDecisionDto,
    @Req() request: RequestWithId
  ) {
    return this.adminService.rejectComplianceJob(user, jobId, dto, this.getRequestMeta(request));
  }

  @Post('compliance-jobs/:jobId/run')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:compliance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run an approved or export compliance job' })
  runComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Req() request: RequestWithId
  ) {
    return this.adminService.runComplianceJob(user, jobId, this.getRequestMeta(request));
  }

  @Post('compliance-jobs/:jobId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:compliance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a non-terminal compliance job' })
  cancelComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Req() request: RequestWithId
  ) {
    return this.adminService.cancelComplianceJob(user, jobId, this.getRequestMeta(request));
  }

  @Get('api-keys')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant API keys without secret hashes' })
  listApiKeys(@CurrentUser() user: AuthenticatedUser, @Query() query: ApiKeyQueryDto) {
    return this.adminService.listApiKeys(user, query);
  }

  @Post('api-keys')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tenant API key and return the one-time token' })
  createApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
    @Req() request: RequestWithId
  ) {
    return this.adminService.createApiKey(user, dto, this.getRequestMeta(request));
  }

  @Get('api-keys/:apiKeyId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one tenant API key without secret hash' })
  getApiKey(@CurrentUser() user: AuthenticatedUser, @Param('apiKeyId') apiKeyId: string) {
    return this.adminService.getApiKey(user, apiKeyId);
  }

  @Post('api-keys/:apiKeyId/revoke')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one tenant API key' })
  revokeApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('apiKeyId') apiKeyId: string,
    @Req() request: RequestWithId
  ) {
    return this.adminService.revokeApiKey(user, apiKeyId, this.getRequestMeta(request));
  }

  private getRequestMeta(request: RequestWithId) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
      requestId: request.requestId ?? null
    };
  }
}
