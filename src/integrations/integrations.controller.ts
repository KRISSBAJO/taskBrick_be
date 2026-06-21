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
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@Controller()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('integrations/status')
  @Version('1')
  @ApiOperation({ summary: 'Integrations module readiness check' })
  status() {
    return this.integrationsService.status();
  }

  @Get('integrations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current tenant integrations' })
  @ApiOkResponse({ description: 'Paginated integrations without raw secrets' })
  listIntegrations(@CurrentUser() user: AuthenticatedUser, @Query() query: IntegrationQueryDto) {
    return this.integrationsService.listIntegrations(user, query);
  }

  @Post('integrations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an external provider integration' })
  @ApiCreatedResponse({ description: 'Created integration without raw secrets' })
  createIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIntegrationDto,
    @Req() request: Request
  ) {
    return this.integrationsService.createIntegration(user, dto, this.getRequestMeta(request));
  }

  @Get('integrations/:integrationId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an integration without raw secrets' })
  getIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string
  ) {
    return this.integrationsService.getIntegration(user, integrationId);
  }

  @Patch('integrations/:integrationId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an integration configuration' })
  updateIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Body() dto: UpdateIntegrationDto,
    @Req() request: Request
  ) {
    return this.integrationsService.updateIntegration(
      user,
      integrationId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('integrations/:integrationId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an integration and logs' })
  deleteIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Req() request: Request
  ) {
    return this.integrationsService.deleteIntegration(
      user,
      integrationId,
      this.getRequestMeta(request)
    );
  }

  @Post('integrations/:integrationId/enable')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable an integration' })
  enableIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Req() request: Request
  ) {
    return this.integrationsService.enableIntegration(
      user,
      integrationId,
      this.getRequestMeta(request)
    );
  }

  @Post('integrations/:integrationId/disable')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable an integration' })
  disableIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Req() request: Request
  ) {
    return this.integrationsService.disableIntegration(
      user,
      integrationId,
      this.getRequestMeta(request)
    );
  }

  @Post('integrations/:integrationId/rotate-secret')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate one encrypted integration secret' })
  rotateIntegrationSecret(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Body() dto: RotateIntegrationSecretDto,
    @Req() request: Request
  ) {
    return this.integrationsService.rotateIntegrationSecret(
      user,
      integrationId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Post('integrations/:integrationId/sync')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request an integration sync' })
  syncIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Body() dto: SyncIntegrationDto,
    @Req() request: Request
  ) {
    return this.integrationsService.syncIntegration(
      user,
      integrationId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Get('integrations/:integrationId/logs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List integration logs' })
  listIntegrationLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('integrationId') integrationId: string,
    @Query() query: IntegrationLogQueryDto
  ) {
    return this.integrationsService.listIntegrationLogs(user, integrationId, query);
  }

  @Get('webhooks')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List outgoing webhooks' })
  listWebhooks(@CurrentUser() user: AuthenticatedUser, @Query() query: WebhookQueryDto) {
    return this.integrationsService.listWebhooks(user, query);
  }

  @Post('webhooks')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an outgoing webhook' })
  createWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWebhookDto,
    @Req() request: Request
  ) {
    return this.integrationsService.createWebhook(user, dto, this.getRequestMeta(request));
  }

  @Get('webhooks/:webhookId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an outgoing webhook' })
  getWebhook(@CurrentUser() user: AuthenticatedUser, @Param('webhookId') webhookId: string) {
    return this.integrationsService.getWebhook(user, webhookId);
  }

  @Patch('webhooks/:webhookId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an outgoing webhook' })
  updateWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('webhookId') webhookId: string,
    @Body() dto: UpdateWebhookDto,
    @Req() request: Request
  ) {
    return this.integrationsService.updateWebhook(user, webhookId, dto, this.getRequestMeta(request));
  }

  @Delete('webhooks/:webhookId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an outgoing webhook' })
  deleteWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('webhookId') webhookId: string,
    @Req() request: Request
  ) {
    return this.integrationsService.deleteWebhook(user, webhookId, this.getRequestMeta(request));
  }

  @Post('webhooks/:webhookId/enable')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable an outgoing webhook' })
  enableWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('webhookId') webhookId: string,
    @Req() request: Request
  ) {
    return this.integrationsService.enableWebhook(user, webhookId, this.getRequestMeta(request));
  }

  @Post('webhooks/:webhookId/disable')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable an outgoing webhook' })
  disableWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('webhookId') webhookId: string,
    @Req() request: Request
  ) {
    return this.integrationsService.disableWebhook(user, webhookId, this.getRequestMeta(request));
  }

  @Post('webhooks/:webhookId/rotate-secret')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate webhook signing secret' })
  rotateWebhookSecret(
    @CurrentUser() user: AuthenticatedUser,
    @Param('webhookId') webhookId: string,
    @Body() dto: RotateWebhookSecretDto,
    @Req() request: Request
  ) {
    return this.integrationsService.rotateWebhookSecret(
      user,
      webhookId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Post('webhook-events')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger matching outgoing webhooks for an event' })
  triggerWebhookEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TriggerWebhookEventDto,
    @Req() request: Request
  ) {
    return this.integrationsService.triggerWebhookEvent(user, dto, this.getRequestMeta(request));
  }

  @Post('integrations/omoflow/events')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process an OmoFlow runtime event and map meeting action items into work' })
  processOmoFlowEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OmoFlowRuntimeEventDto,
    @Req() request: Request
  ) {
    return this.integrationsService.processOmoFlowEvent(user, dto, this.getRequestMeta(request));
  }

  @Get('webhook-deliveries')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List webhook deliveries' })
  listWebhookDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WebhookDeliveryQueryDto
  ) {
    return this.integrationsService.listWebhookDeliveries(user, query);
  }

  @Get('webhook-deliveries/:deliveryId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook delivery details' })
  getWebhookDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string
  ) {
    return this.integrationsService.getWebhookDelivery(user, deliveryId);
  }

  @Post('webhook-deliveries/:deliveryId/retry')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  retryWebhookDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
    @Req() request: Request
  ) {
    return this.integrationsService.retryWebhookDelivery(
      user,
      deliveryId,
      this.getRequestMeta(request)
    );
  }

  @Patch('webhook-deliveries/:deliveryId/status')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:integrations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually update webhook delivery status' })
  updateWebhookDeliveryStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: UpdateWebhookDeliveryStatusDto,
    @Req() request: Request
  ) {
    return this.integrationsService.updateWebhookDeliveryStatus(
      user,
      deliveryId,
      dto,
      this.getRequestMeta(request)
    );
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
