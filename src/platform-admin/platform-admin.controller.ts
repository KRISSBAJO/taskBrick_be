import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateFeatureDto } from '../billing/dto/create-feature.dto';
import { CreatePlanDto } from '../billing/dto/create-plan.dto';
import { PlanFeatureDto } from '../billing/dto/plan-feature.dto';
import { ReplacePlanFeaturesDto } from '../billing/dto/replace-plan-features.dto';
import { UpdateFeatureDto } from '../billing/dto/update-feature.dto';
import { UpdatePlanDto } from '../billing/dto/update-plan.dto';
import { UpdatePlanFeatureDto } from '../billing/dto/update-plan-feature.dto';
import { RequirePlatformAdminLevels } from './decorators/require-platform-admin-levels.decorator';
import { GrantPlatformAdminDto } from './dto/grant-platform-admin.dto';
import { RevokePlatformAdminDto } from './dto/revoke-platform-admin.dto';
import {
  SiteBillingActionDto,
  SiteBillingEventQueryDto,
  SiteBillingQueryDto,
  SiteChangePlanDto,
  SiteSubscriptionQueryDto,
  SiteSubscriptionUpdateDto
} from './dto/site-billing-query.dto';
import {
  SiteLoginHistoryQueryDto,
  SiteSecurityPolicyQueryDto,
  SiteSsoProviderQueryDto,
  SiteTrustedDeviceQueryDto
} from './dto/site-identity-query.dto';
import {
  SiteAiActionQueryDto,
  SiteAiAgentQueryDto,
  SiteAiConversationQueryDto,
  SiteAiSettingsQueryDto,
  SiteAiUsageQueryDto,
  SiteApprovalQueryDto,
  SiteComplianceDecisionDto,
  SiteComplianceJobQueryDto,
  SiteIntegrationQueryDto,
  SiteIntegrationSecretRotationDto,
  SiteMessagingQueryDto,
  SiteMeetingQueryDto,
  SiteMeetingReminderQueryDto,
  SitePlatformSearchQueryDto,
  SiteReportExecutionQueryDto,
  SiteReportExportQueryDto,
  SiteReportingQueryDto,
  SiteWorkflowQueryDto,
  SiteWorkflowRunQueryDto,
  SiteWebhookDeliveryQueryDto,
  SiteWebhookQueryDto
} from './dto/site-operations-query.dto';
import { SiteSessionQueryDto } from './dto/site-session-query.dto';
import { SiteUserSessionActionDto } from './dto/site-user-session-action.dto';
import {
  PlatformAdminQueryDto,
  PlatformAuditQueryDto,
  SiteSecurityEventQueryDto,
  SiteTenantResourceQueryDto,
  SiteTenantQueryDto,
  SiteUserQueryDto,
  SiteTenantUsersQueryDto
} from './dto/site-admin-query.dto';
import { UpdateSiteSecurityEventDto } from './dto/update-site-security-event.dto';
import { UpdateSiteUserStatusDto } from './dto/update-site-user-status.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';

type RequestWithId = Request & { requestId?: string };

@ApiTags('site-admin')
@Controller('site-admin')
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Site admin module readiness check' })
  status() {
    return this.platformAdminService.status();
  }

  @Get('me')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated platform admin profile' })
  @ApiOkResponse({ description: 'Platform admin profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.platformAdminService.me(user);
  }

  @Get('overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform-level tenant, user, session, security, and audit overview' })
  overview() {
    return this.platformAdminService.overview();
  }

  @Get('identity-security/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cross-tenant identity security posture' })
  identitySecurityOverview() {
    return this.platformAdminService.identitySecurityOverview();
  }

  @Get('identity-security/login-history')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search login history across tenants' })
  listLoginHistory(@Query() query: SiteLoginHistoryQueryDto) {
    return this.platformAdminService.listLoginHistory(query);
  }

  @Get('identity-security/trusted-devices')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search trusted devices across tenants' })
  listTrustedDevices(@Query() query: SiteTrustedDeviceQueryDto) {
    return this.platformAdminService.listTrustedDevices(query);
  }

  @Patch('identity-security/trusted-devices/:deviceId/revoke')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a trusted device and its active sessions' })
  revokeTrustedDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deviceId') deviceId: string,
    @Body() dto: SiteBillingActionDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.revokeTrustedDevice(user, deviceId, dto, this.getRequestMeta(request));
  }

  @Get('identity-security/sso-providers')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search SSO provider visibility across tenants' })
  listSsoProviders(@Query() query: SiteSsoProviderQueryDto) {
    return this.platformAdminService.listSsoProviders(query);
  }

  @Get('identity-security/policies')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search tenant login policies and domain-discovery posture' })
  listSecurityPolicies(@Query() query: SiteSecurityPolicyQueryDto) {
    return this.platformAdminService.listSecurityPolicies(query);
  }

  @Post('identity-security/users/:userId/password-reset')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send an admin-initiated password recovery email' })
  sendAdminPasswordReset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.sendAdminPasswordReset(user, userId, this.getRequestMeta(request));
  }

  @Get('sessions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search active and historical sessions globally' })
  listSessions(@Query() query: SiteSessionQueryDto) {
    return this.platformAdminService.listSessions(query);
  }

  @Patch('sessions/:sessionId/revoke')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one session globally' })
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SiteUserSessionActionDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.revokeSession(user, sessionId, dto, this.getRequestMeta(request));
  }

  @Get('billing/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform billing and plan health overview' })
  billingOverview() {
    return this.platformAdminService.billingOverview();
  }

  @Get('billing/plans')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search platform billing plans and features' })
  listBillingPlans(@Query() query: SiteBillingQueryDto) {
    return this.platformAdminService.listBillingPlans(query);
  }

  @Post('billing/plans')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Created platform billing plan' })
  @ApiOperation({ summary: 'Create a platform billing plan from the site-admin catalog' })
  createBillingPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlanDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.createBillingPlan(user, dto, this.getRequestMeta(request));
  }

  @Patch('billing/plans/:planId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a platform billing plan from the site-admin catalog' })
  updateBillingPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.updateBillingPlan(user, planId, dto, this.getRequestMeta(request));
  }

  @Post('billing/plans/:planId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a platform billing plan' })
  archiveBillingPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.archiveBillingPlan(user, planId, this.getRequestMeta(request));
  }

  @Post('billing/plans/:planId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived platform billing plan' })
  restoreBillingPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.restoreBillingPlan(user, planId, this.getRequestMeta(request));
  }

  @Post('billing/plans/:planId/sync/stripe')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync a platform billing plan to Stripe product and price records' })
  syncBillingPlanToStripe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.syncBillingPlanToStripe(user, planId, this.getRequestMeta(request));
  }

  @Put('billing/plans/:planId/features')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace all feature entitlements on a platform billing plan' })
  replaceBillingPlanFeatures(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: ReplacePlanFeaturesDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.replaceBillingPlanFeatures(user, planId, dto, this.getRequestMeta(request));
  }

  @Post('billing/plans/:planId/features')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a feature entitlement to a platform billing plan' })
  assignBillingPlanFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: PlanFeatureDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.assignBillingPlanFeature(user, planId, dto, this.getRequestMeta(request));
  }

  @Patch('billing/plans/:planId/features/:featureId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a platform plan feature entitlement' })
  updateBillingPlanFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
    @Body() dto: UpdatePlanFeatureDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.updateBillingPlanFeature(user, planId, featureId, dto, this.getRequestMeta(request));
  }

  @Delete('billing/plans/:planId/features/:featureId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a feature entitlement from a platform billing plan' })
  removeBillingPlanFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.removeBillingPlanFeature(user, planId, featureId, this.getRequestMeta(request));
  }

  @Get('billing/features')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search platform billing features' })
  listBillingFeatures(@Query() query: SiteBillingQueryDto) {
    return this.platformAdminService.listBillingFeatures(query);
  }

  @Post('billing/features')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Created platform billing feature' })
  @ApiOperation({ summary: 'Create a platform billing feature from the site-admin catalog' })
  createBillingFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeatureDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.createBillingFeature(user, dto, this.getRequestMeta(request));
  }

  @Patch('billing/features/:featureId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a platform billing feature' })
  updateBillingFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('featureId') featureId: string,
    @Body() dto: UpdateFeatureDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.updateBillingFeature(user, featureId, dto, this.getRequestMeta(request));
  }

  @Post('billing/features/:featureId/disable')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable a platform billing feature' })
  disableBillingFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('featureId') featureId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.setBillingFeatureActive(user, featureId, false, this.getRequestMeta(request));
  }

  @Post('billing/features/:featureId/enable')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable a platform billing feature' })
  enableBillingFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('featureId') featureId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.setBillingFeatureActive(user, featureId, true, this.getRequestMeta(request));
  }

  @Get('billing/subscriptions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search tenant subscriptions globally' })
  listBillingSubscriptions(@Query() query: SiteSubscriptionQueryDto) {
    return this.platformAdminService.listBillingSubscriptions(query);
  }

  @Patch('billing/subscriptions/:subscriptionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tenant subscription from the platform console' })
  updateSiteSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: SiteSubscriptionUpdateDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.updateSiteSubscription(user, subscriptionId, dto, this.getRequestMeta(request));
  }

  @Post('billing/subscriptions/:subscriptionId/change-plan')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change a tenant subscription plan from the platform console' })
  changeSiteSubscriptionPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: SiteChangePlanDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.changeSiteSubscriptionPlan(user, subscriptionId, dto, this.getRequestMeta(request));
  }

  @Post('billing/subscriptions/:subscriptionId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a tenant subscription from the platform console' })
  cancelSiteSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: SiteBillingActionDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.cancelSiteSubscription(user, subscriptionId, dto, this.getRequestMeta(request));
  }

  @Post('billing/subscriptions/:subscriptionId/resume')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a tenant subscription from the platform console' })
  resumeSiteSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: SiteBillingActionDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.resumeSiteSubscription(user, subscriptionId, dto, this.getRequestMeta(request));
  }

  @Post('billing/tenants/:tenantId/start-trial')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start or restart a tenant trial from the platform console' })
  startSiteSubscriptionTrial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId') tenantId: string,
    @Body() dto: SiteChangePlanDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.startSiteSubscriptionTrial(user, tenantId, dto, this.getRequestMeta(request));
  }

  @Get('billing/invoices')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search invoices globally' })
  listBillingInvoices(@Query() query: SiteBillingQueryDto) {
    return this.platformAdminService.listBillingInvoices(query);
  }

  @Get('billing/usage-records')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search usage records globally' })
  listBillingUsageRecords(@Query() query: SiteBillingQueryDto) {
    return this.platformAdminService.listBillingUsageRecords(query);
  }

  @Get('billing/events')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Stripe and billing provider events globally' })
  listBillingEvents(@Query() query: SiteBillingEventQueryDto) {
    return this.platformAdminService.listBillingEvents(query);
  }

  @Get('billing/entitlements')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant entitlements globally' })
  listBillingEntitlements(@Query() query: SiteBillingQueryDto) {
    return this.platformAdminService.listBillingEntitlements(query);
  }

  @Get('search')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search tenants, users, projects, tasks, events, and audit records across tenants' })
  platformSearch(@Query() query: SitePlatformSearchQueryDto) {
    return this.platformAdminService.platformSearch(query);
  }

  @Get('automation/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform workflow automation runtime overview' })
  workflowAutomationOverview() {
    return this.platformAdminService.workflowAutomationOverview();
  }

  @Get('automation/workflows')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search workflow definitions across tenants' })
  listSiteWorkflows(@Query() query: SiteWorkflowQueryDto) {
    return this.platformAdminService.listSiteWorkflows(query);
  }

  @Get('automation/runs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search workflow runs across tenants' })
  listSiteWorkflowRuns(@Query() query: SiteWorkflowRunQueryDto) {
    return this.platformAdminService.listSiteWorkflowRuns(query);
  }

  @Post('automation/runs/:runId/retry')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry a failed or cancelled workflow run from the platform console' })
  retrySiteWorkflowRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.retrySiteWorkflowRun(user, runId, this.getRequestMeta(request));
  }

  @Post('automation/runs/:runId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending or running workflow run from the platform console' })
  cancelSiteWorkflowRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.cancelSiteWorkflowRun(user, runId, this.getRequestMeta(request));
  }

  @Get('automation/approval-definitions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search approval definitions across tenants' })
  listSiteApprovalDefinitions(@Query() query: SiteApprovalQueryDto) {
    return this.platformAdminService.listSiteApprovalDefinitions(query);
  }

  @Get('automation/approvals')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search approval queue across tenants' })
  listSiteApprovals(@Query() query: SiteApprovalQueryDto) {
    return this.platformAdminService.listSiteApprovals(query);
  }

  @Get('automation/run-logs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search workflow runtime logs and dead-letter error states' })
  listSiteWorkflowRunLogs(@Query() query: SiteWorkflowRunQueryDto) {
    return this.platformAdminService.listSiteWorkflowRunLogs(query);
  }

  @Get('ai/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform AI and agent operations overview' })
  aiOperationsOverview() {
    return this.platformAdminService.aiOperationsOverview();
  }

  @Get('ai/settings')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search tenant AI settings across tenants' })
  listSiteAiSettings(@Query() query: SiteAiSettingsQueryDto) {
    return this.platformAdminService.listSiteAiSettings(query);
  }

  @Get('ai/agents')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search AI agents across tenants' })
  listSiteAiAgents(@Query() query: SiteAiAgentQueryDto) {
    return this.platformAdminService.listSiteAiAgents(query);
  }

  @Get('ai/conversations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search AI conversation metadata across tenants' })
  listSiteAiConversations(@Query() query: SiteAiConversationQueryDto) {
    return this.platformAdminService.listSiteAiConversations(query);
  }

  @Get('ai/actions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search AI actions and agent run audit across tenants' })
  listSiteAiActions(@Query() query: SiteAiActionQueryDto) {
    return this.platformAdminService.listSiteAiActions(query);
  }

  @Get('ai/usage')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search AI usage and cost records across tenants' })
  listSiteAiUsage(@Query() query: SiteAiUsageQueryDto) {
    return this.platformAdminService.listSiteAiUsage(query);
  }

  @Get('reporting/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform dashboards, reports, analytics, export, and SLA overview' })
  reportingAnalyticsOverview() {
    return this.platformAdminService.reportingAnalyticsOverview();
  }

  @Get('reporting/dashboards')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search dashboards across tenants' })
  listSiteDashboards(@Query() query: SiteReportingQueryDto) {
    return this.platformAdminService.listSiteDashboards(query);
  }

  @Get('reporting/reports')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search reports across tenants' })
  listSiteReports(@Query() query: SiteReportingQueryDto) {
    return this.platformAdminService.listSiteReports(query);
  }

  @Get('reporting/executions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search report executions across tenants' })
  listSiteReportExecutions(@Query() query: SiteReportExecutionQueryDto) {
    return this.platformAdminService.listSiteReportExecutions(query);
  }

  @Get('reporting/exports')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search report exports across tenants' })
  listSiteReportExports(@Query() query: SiteReportExportQueryDto) {
    return this.platformAdminService.listSiteReportExports(query);
  }

  @Get('hardening/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Site Admin hardening and QA readiness overview' })
  hardeningQaOverview() {
    return this.platformAdminService.hardeningQaOverview();
  }

  @Get('integrations/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform integrations, webhook, provider, and OmoFlow health overview' })
  integrationsOverview() {
    return this.platformAdminService.integrationsOverview();
  }

  @Get('integrations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search integrations across all tenants' })
  listSiteIntegrations(@Query() query: SiteIntegrationQueryDto) {
    return this.platformAdminService.listSiteIntegrations(query);
  }

  @Patch('integrations/:integrationId/rotate-secret')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate an integration secret from the site-admin boundary' })
  rotateSiteIntegrationSecret(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Body() dto: SiteIntegrationSecretRotationDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.rotateSiteIntegrationSecret(user, integrationId, dto, this.getRequestMeta(request));
  }

  @Get('webhooks')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search webhooks across all tenants' })
  listSiteWebhooks(@Query() query: SiteWebhookQueryDto) {
    return this.platformAdminService.listSiteWebhooks(query);
  }

  @Get('webhook-deliveries')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search webhook deliveries across all tenants' })
  listSiteWebhookDeliveries(@Query() query: SiteWebhookDeliveryQueryDto) {
    return this.platformAdminService.listSiteWebhookDeliveries(query);
  }

  @Post('webhook-deliveries/:deliveryId/retry')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry a failed webhook delivery from the site-admin boundary' })
  retrySiteWebhookDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.retrySiteWebhookDelivery(user, deliveryId, this.getRequestMeta(request));
  }

  @Patch('webhooks/:webhookId/rotate-secret')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate a webhook signing secret from the site-admin boundary' })
  rotateSiteWebhookSecret(
    @CurrentUser() user: AuthenticatedUser,
    @Param('webhookId') webhookId: string,
    @Body() dto: SiteIntegrationSecretRotationDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.rotateSiteWebhookSecret(user, webhookId, dto, this.getRequestMeta(request));
  }

  @Get('observability/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform observability, health, metrics, queues, and worker status' })
  observabilityOverview() {
    return this.platformAdminService.observabilityOverview();
  }

  @Get('realtime/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get websocket, room, presence, and message delivery oversight without private message content' })
  realtimeMessagingOverview() {
    return this.platformAdminService.realtimeMessagingOverview();
  }

  @Get('realtime/conversations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search conversation room activity metadata across tenants' })
  listSiteConversations(@Query() query: SiteMessagingQueryDto) {
    return this.platformAdminService.listSiteConversations(query);
  }

  @Get('realtime/message-activity')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search message delivery metadata without returning private message bodies' })
  listSiteMessageActivity(@Query() query: SiteMessagingQueryDto) {
    return this.platformAdminService.listSiteMessageActivity(query);
  }

  @Get('meetings/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cross-tenant meeting operations oversight without private meeting content' })
  meetingOperationsOverview(@Query() query: SiteMeetingQueryDto) {
    return this.platformAdminService.meetingOperationsOverview(query);
  }

  @Get('meetings/tenants')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search tenant meeting policy and analytics posture' })
  listSiteMeetingTenants(@Query() query: SiteMeetingQueryDto) {
    return this.platformAdminService.listSiteMeetingTenants(query);
  }

  @Get('meetings/reminder-logs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search cross-tenant meeting reminder delivery metadata without private meeting content' })
  listSiteMeetingReminderLogs(@Query() query: SiteMeetingReminderQueryDto) {
    return this.platformAdminService.listSiteMeetingReminderLogs(query);
  }

  @Get('compliance/overview')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform compliance and data governance overview' })
  complianceOverview() {
    return this.platformAdminService.complianceOverview();
  }

  @Get('compliance/jobs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search compliance jobs across tenants' })
  listSiteComplianceJobs(@Query() query: SiteComplianceJobQueryDto) {
    return this.platformAdminService.listSiteComplianceJobs(query);
  }

  @Post('compliance/jobs/:jobId/approve')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a platform compliance job' })
  approveSiteComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: SiteComplianceDecisionDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.approveSiteComplianceJob(user, jobId, dto, this.getRequestMeta(request));
  }

  @Post('compliance/jobs/:jobId/reject')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a platform compliance job' })
  rejectSiteComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: SiteComplianceDecisionDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.rejectSiteComplianceJob(user, jobId, dto, this.getRequestMeta(request));
  }

  @Post('compliance/jobs/:jobId/run')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run an approved platform compliance job' })
  runSiteComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.runSiteComplianceJob(user, jobId, this.getRequestMeta(request));
  }

  @Post('compliance/jobs/:jobId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a non-terminal platform compliance job' })
  cancelSiteComplianceJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: SiteComplianceDecisionDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.cancelSiteComplianceJob(user, jobId, dto, this.getRequestMeta(request));
  }

  @Get('tenants')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search all tenants across the platform' })
  listTenants(@Query() query: SiteTenantQueryDto) {
    return this.platformAdminService.listTenants(query);
  }

  @Get('users')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search platform users across tenants from the site-admin boundary' })
  listUsers(@Query() query: SiteUserQueryDto) {
    return this.platformAdminService.listUsers(query);
  }

  @Get('users/:userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a platform-level user profile with sessions, MFA, memberships, and audit signals' })
  getUser(@Param('userId') userId: string) {
    return this.platformAdminService.getUser(userId);
  }

  @Patch('users/:userId/status')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend, reactivate, invite, or deactivate a user from the site-admin boundary' })
  updateUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateSiteUserStatusDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.updateUserStatus(user, userId, dto, this.getRequestMeta(request));
  }

  @Post('users/:userId/sessions/revoke')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Force logout by revoking all active user sessions' })
  revokeUserSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: SiteUserSessionActionDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.revokeUserSessions(user, userId, dto, this.getRequestMeta(request));
  }

  @Post('users/:userId/resend-verification')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend a user invite or verification email from the platform console' })
  resendUserVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.resendUserVerification(user, userId, this.getRequestMeta(request));
  }

  @Get('tenants/:tenantId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get platform-level tenant detail' })
  getTenant(@Param('tenantId') tenantId: string) {
    return this.platformAdminService.getTenant(tenantId);
  }

  @Patch('tenants/:tenantId/status')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend, reactivate, trial, or cancel a tenant' })
  updateTenantStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantStatusDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.updateTenantStatus(user, tenantId, dto, this.getRequestMeta(request));
  }

  @Get('tenants/:tenantId/users')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search users inside a tenant from the platform boundary' })
  listTenantUsers(@Param('tenantId') tenantId: string, @Query() query: SiteTenantUsersQueryDto) {
    return this.platformAdminService.listTenantUsers(tenantId, query);
  }

  @Get('tenants/:tenantId/projects')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant projects from the platform boundary' })
  listTenantProjects(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantProjects(tenantId, query);
  }

  @Get('tenants/:tenantId/workspaces')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant workspaces from the platform boundary' })
  listTenantWorkspaces(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantWorkspaces(tenantId, query);
  }

  @Get('tenants/:tenantId/teams')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant teams from the platform boundary' })
  listTenantTeams(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantTeams(tenantId, query);
  }

  @Get('tenants/:tenantId/sessions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant sessions from the platform boundary' })
  listTenantSessions(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantSessions(tenantId, query);
  }

  @Get('tenants/:tenantId/security')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant security posture and events from the platform boundary' })
  listTenantSecurity(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantSecurity(tenantId, query);
  }

  @Get('tenants/:tenantId/billing')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant billing, usage, invoices, and billing events from the platform boundary' })
  listTenantBilling(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantBilling(tenantId, query);
  }

  @Get('tenants/:tenantId/integrations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant integrations, webhooks, and deliveries from the platform boundary' })
  listTenantIntegrations(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantIntegrations(tenantId, query);
  }

  @Get('tenants/:tenantId/files')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant files and storage usage from the platform boundary' })
  listTenantFiles(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantFiles(tenantId, query);
  }

  @Get('tenants/:tenantId/ai')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant AI settings, agents, actions, and usage from the platform boundary' })
  listTenantAiUsage(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantAiUsage(tenantId, query);
  }

  @Get('tenants/:tenantId/reports')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant dashboards, reports, executions, and exports from the platform boundary' })
  listTenantReports(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantReports(tenantId, query);
  }

  @Get('tenants/:tenantId/activity')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inspect tenant activity and audit events from the platform boundary' })
  listTenantActivity(@Param('tenantId') tenantId: string, @Query() query: SiteTenantResourceQueryDto) {
    return this.platformAdminService.listTenantActivity(tenantId, query);
  }

  @Get('security-events')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search security events across every tenant' })
  listSecurityEvents(@Query() query: SiteSecurityEventQueryDto) {
    return this.platformAdminService.listSecurityEvents(query);
  }

  @Patch('security-events/:eventId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN', 'SUPPORT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cross-tenant security event status, severity, or metadata' })
  updateSecurityEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateSiteSecurityEventDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.updateSecurityEvent(user, eventId, dto, this.getRequestMeta(request));
  }

  @Get('audit-logs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search immutable platform audit logs' })
  listPlatformAuditLogs(@Query() query: PlatformAuditQueryDto) {
    return this.platformAdminService.listPlatformAuditLogs(query);
  }

  @Get('platform-admins')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List platform administrator grants' })
  listPlatformAdmins(@Query() query: PlatformAdminQueryDto) {
    return this.platformAdminService.listPlatformAdmins(query);
  }

  @Post('platform-admins')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grant platform administrator access to an existing user' })
  @ApiCreatedResponse({ description: 'Platform admin grant' })
  grantPlatformAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GrantPlatformAdminDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.grantPlatformAdmin(user, dto, this.getRequestMeta(request));
  }

  @Patch('platform-admins/:platformAdminId/revoke')
  @Version('1')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @RequirePlatformAdminLevels('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a platform administrator grant' })
  revokePlatformAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('platformAdminId') platformAdminId: string,
    @Body() dto: RevokePlatformAdminDto,
    @Req() request: RequestWithId
  ) {
    return this.platformAdminService.revokePlatformAdmin(user, platformAdminId, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: RequestWithId) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
      requestId: request.requestId
    };
  }
}
