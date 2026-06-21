import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BillingService } from './billing.service';
import { BillingEventQueryDto } from './dto/billing-event-query.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateUsageRecordDto } from './dto/create-usage-record.dto';
import { FeatureQueryDto } from './dto/feature-query.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { PlanFeatureDto } from './dto/plan-feature.dto';
import { PlanQueryDto } from './dto/plan-query.dto';
import { PortalDto } from './dto/portal.dto';
import { ReplacePlanFeaturesDto } from './dto/replace-plan-features.dto';
import { StartTenantTrialDto } from './dto/start-tenant-trial.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-feature.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('billing')
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('billing/status')
  @Version('1')
  @ApiOperation({ summary: 'Billing module readiness and provider status' })
  status() {
    return this.billingService.status();
  }

  @Get('billing/account')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant billing account status' })
  accountStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.accountStatus(user);
  }

  @Get('plans')
  @Version('1')
  @ApiOperation({ summary: 'List active billing plans' })
  @ApiOkResponse({ description: 'Paginated billing plans' })
  listPlans(@Query() query: PlanQueryDto) {
    return this.billingService.listPlans(query);
  }

  @Post('plans')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a billing plan' })
  @ApiCreatedResponse({ description: 'Created billing plan' })
  createPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlanDto,
    @Req() request: Request
  ) {
    return this.billingService.createPlan(user, dto, this.getRequestMeta(request));
  }

  @Get('plans/:planId')
  @Version('1')
  @ApiOperation({ summary: 'Get a billing plan with features' })
  getPlan(@Param('planId') planId: string) {
    return this.billingService.getPlan(planId);
  }

  @Patch('plans/:planId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a billing plan' })
  updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @Req() request: Request
  ) {
    return this.billingService.updatePlan(user, planId, dto, this.getRequestMeta(request));
  }

  @Post('plans/:planId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a billing plan' })
  archivePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Req() request: Request
  ) {
    return this.billingService.archivePlan(user, planId, this.getRequestMeta(request));
  }

  @Post('plans/:planId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived billing plan' })
  restorePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Req() request: Request
  ) {
    return this.billingService.restorePlan(user, planId, this.getRequestMeta(request));
  }

  @Delete('plans/:planId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete or archive an unused billing plan' })
  deletePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Req() request: Request
  ) {
    return this.billingService.deletePlan(user, planId, this.getRequestMeta(request));
  }

  @Put('plans/:planId/features')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace all features assigned to a plan' })
  replacePlanFeatures(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: ReplacePlanFeaturesDto,
    @Req() request: Request
  ) {
    return this.billingService.replacePlanFeatures(user, planId, dto, this.getRequestMeta(request));
  }

  @Post('plans/:planId/features')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign or update a feature on a plan' })
  assignPlanFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: PlanFeatureDto,
    @Req() request: Request
  ) {
    return this.billingService.assignPlanFeature(user, planId, dto, this.getRequestMeta(request));
  }

  @Patch('plans/:planId/features/:featureId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a plan feature entitlement' })
  updatePlanFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
    @Body() dto: UpdatePlanFeatureDto,
    @Req() request: Request
  ) {
    return this.billingService.updatePlanFeature(
      user,
      planId,
      featureId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('plans/:planId/features/:featureId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a feature from a plan' })
  removePlanFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
    @Req() request: Request
  ) {
    return this.billingService.removePlanFeature(
      user,
      planId,
      featureId,
      this.getRequestMeta(request)
    );
  }

  @Get('features')
  @Version('1')
  @ApiOperation({ summary: 'List billing features' })
  listFeatures(@Query() query: FeatureQueryDto) {
    return this.billingService.listFeatures(query);
  }

  @Post('features')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a billable feature' })
  createFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeatureDto,
    @Req() request: Request
  ) {
    return this.billingService.createFeature(user, dto, this.getRequestMeta(request));
  }

  @Get('features/:featureId')
  @Version('1')
  @ApiOperation({ summary: 'Get a billable feature' })
  getFeature(@Param('featureId') featureId: string) {
    return this.billingService.getFeature(featureId);
  }

  @Patch('features/:featureId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a billable feature' })
  updateFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('featureId') featureId: string,
    @Body() dto: UpdateFeatureDto,
    @Req() request: Request
  ) {
    return this.billingService.updateFeature(user, featureId, dto, this.getRequestMeta(request));
  }

  @Delete('features/:featureId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete or disable a billable feature' })
  deleteFeature(
    @CurrentUser() user: AuthenticatedUser,
    @Param('featureId') featureId: string,
    @Req() request: Request
  ) {
    return this.billingService.deleteFeature(user, featureId, this.getRequestMeta(request));
  }

  @Get('subscriptions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current tenant subscriptions' })
  listSubscriptions(@CurrentUser() user: AuthenticatedUser, @Query() query: SubscriptionQueryDto) {
    return this.billingService.listSubscriptions(user, query);
  }

  @Get('subscriptions/current')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant subscription' })
  currentSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getCurrentSubscription(user);
  }

  @Post('subscriptions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create current tenant subscription' })
  createSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubscriptionDto,
    @Req() request: Request
  ) {
    return this.billingService.createSubscription(user, dto, this.getRequestMeta(request));
  }

  @Get('subscriptions/:subscriptionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a subscription' })
  getSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string
  ) {
    return this.billingService.getSubscription(user, subscriptionId);
  }

  @Patch('subscriptions/:subscriptionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subscription' })
  updateSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: UpdateSubscriptionDto,
    @Req() request: Request
  ) {
    return this.billingService.updateSubscription(
      user,
      subscriptionId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Post('subscriptions/:subscriptionId/change-plan')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change subscription plan' })
  changePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: ChangePlanDto,
    @Req() request: Request
  ) {
    return this.billingService.changePlan(user, subscriptionId, dto, this.getRequestMeta(request));
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a subscription immediately' })
  cancelSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Req() request: Request
  ) {
    return this.billingService.cancelSubscription(user, subscriptionId, this.getRequestMeta(request));
  }

  @Post('subscriptions/:subscriptionId/resume')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume a cancelled or paused subscription' })
  resumeSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Req() request: Request
  ) {
    return this.billingService.resumeSubscription(user, subscriptionId, this.getRequestMeta(request));
  }

  @Post('subscriptions/:subscriptionId/start-trial')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start or restart a subscription trial' })
  startTrial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('subscriptionId') subscriptionId: string,
    @Req() request: Request
  ) {
    return this.billingService.startTrial(user, subscriptionId, this.getRequestMeta(request));
  }

  @Get('invoices')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant invoices' })
  listInvoices(@CurrentUser() user: AuthenticatedUser, @Query() query: InvoiceQueryDto) {
    return this.billingService.listInvoices(user, query);
  }

  @Post('invoices')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a manual invoice' })
  createInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceDto,
    @Req() request: Request
  ) {
    return this.billingService.createInvoice(user, dto, this.getRequestMeta(request));
  }

  @Get('invoices/:invoiceId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an invoice' })
  getInvoice(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId') invoiceId: string) {
    return this.billingService.getInvoice(user, invoiceId);
  }

  @Patch('invoices/:invoiceId/status')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update invoice payment status' })
  updateInvoiceStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateInvoiceStatusDto,
    @Req() request: Request
  ) {
    return this.billingService.updateInvoiceStatus(
      user,
      invoiceId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Get('entitlements')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current tenant entitlements and usage limits' })
  getEntitlements(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getEntitlements(user);
  }

  @Get('entitlements/:featureKey')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check a single feature entitlement' })
  getEntitlement(@CurrentUser() user: AuthenticatedUser, @Param('featureKey') featureKey: string) {
    return this.billingService.getEntitlement(user, featureKey);
  }

  @Get('usage-records')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List usage records for the current tenant' })
  listUsageRecords(@CurrentUser() user: AuthenticatedUser, @Query() query: UsageQueryDto) {
    return this.billingService.listUsageRecords(user, query);
  }

  @Get('usage-records/summary')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Summarize usage records by feature' })
  usageSummary(@CurrentUser() user: AuthenticatedUser, @Query() query: UsageQueryDto) {
    return this.billingService.usageSummary(user, query);
  }

  @Post('usage-records')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record metered feature usage' })
  createUsageRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUsageRecordDto,
    @Req() request: Request
  ) {
    return this.billingService.createUsageRecord(user, dto, this.getRequestMeta(request));
  }

  @Post('billing/checkout')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a billing checkout session' })
  createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutDto,
    @Req() request: Request
  ) {
    return this.billingService.createCheckoutSession(user, dto, this.getRequestMeta(request));
  }

  @Post('billing/trial')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a trial for the current tenant and selected plan' })
  startTenantTrial(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartTenantTrialDto,
    @Req() request: Request
  ) {
    return this.billingService.startTenantTrial(user, dto, this.getRequestMeta(request));
  }

  @Post('billing/portal')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a billing portal session' })
  createPortalSession(@CurrentUser() user: AuthenticatedUser, @Body() dto: PortalDto) {
    return this.billingService.createPortalSession(user, dto);
  }

  @Post('billing/webhooks/stripe')
  @Version('1')
  @ApiOperation({ summary: 'Receive Stripe billing webhooks' })
  stripeWebhook(
    @Body() payload: unknown,
    @Req() request: RawBodyRequest,
    @Headers('stripe-signature') signature?: string
  ) {
    return this.billingService.processStripeWebhook(payload, request.rawBody, signature);
  }

  @Post('billing/webhooks/paystack')
  @Version('1')
  @ApiOperation({ summary: 'Receive Paystack billing webhooks' })
  paystackWebhook(
    @Body() payload: unknown,
    @Req() request: RawBodyRequest,
    @Headers('x-paystack-signature') signature?: string
  ) {
    return this.billingService.processPaystackWebhook(payload, request.rawBody, signature);
  }

  @Get('billing/events')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List processed billing provider events' })
  listBillingEvents(@CurrentUser() user: AuthenticatedUser, @Query() query: BillingEventQueryDto) {
    return this.billingService.listBillingEvents(user, query);
  }

  @Get('billing/events/:eventId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:billing')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a billing provider event' })
  getBillingEvent(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.billingService.getBillingEvent(user, eventId);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
