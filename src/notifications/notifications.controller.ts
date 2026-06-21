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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationDeliveryQueryDto } from './dto/notification-delivery-query.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications/status')
  @Version('1')
  @ApiOperation({ summary: 'Notifications module readiness check' })
  status() {
    return {
      module: 'notifications',
      status: 'ready'
    };
  }

  @Get('notifications')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiOkResponse({ description: 'Paginated notifications' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) {
    return this.notificationsService.list(user, query);
  }

  @Post('notifications')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create notifications for tenant users' })
  @ApiCreatedResponse({ description: 'Created notifications and delivery records' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNotificationDto,
    @Req() request: Request
  ) {
    return this.notificationsService.create(user, dto, this.getRequestMeta(request));
  }

  @Get('notifications/unread-count')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user unread notification count' })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user);
  }

  @Patch('notifications/read-all')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all current user notifications as read' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user);
  }

  @Delete('notifications/read')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user read notifications' })
  deleteRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.deleteRead(user);
  }

  @Get('notifications/:notificationId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a notification' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('notificationId') notificationId: string) {
    return this.notificationsService.get(user, notificationId);
  }

  @Patch('notifications/:notificationId/read')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('notificationId') notificationId: string) {
    return this.notificationsService.markRead(user, notificationId);
  }

  @Patch('notifications/:notificationId/unread')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark one notification as unread' })
  markUnread(@CurrentUser() user: AuthenticatedUser, @Param('notificationId') notificationId: string) {
    return this.notificationsService.markUnread(user, notificationId);
  }

  @Delete('notifications/:notificationId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete one current user notification' })
  delete(@CurrentUser() user: AuthenticatedUser, @Param('notificationId') notificationId: string) {
    return this.notificationsService.delete(user, notificationId);
  }

  @Get('notification-preferences')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user notification preferences' })
  listPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listPreferences(user);
  }

  @Patch('notification-preferences')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user notification preferences' })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto
  ) {
    return this.notificationsService.updatePreferences(user, dto);
  }

  @Get('notification-templates')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List notification templates' })
  listTemplates(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.notificationsService.listTemplates(user, query);
  }

  @Post('notification-templates')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a notification template' })
  createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNotificationTemplateDto,
    @Req() request: Request
  ) {
    return this.notificationsService.createTemplate(user, dto, this.getRequestMeta(request));
  }

  @Patch('notification-templates/:templateId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a notification template' })
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateNotificationTemplateDto,
    @Req() request: Request
  ) {
    return this.notificationsService.updateTemplate(
      user,
      templateId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('notification-templates/:templateId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a notification template' })
  deleteTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId') templateId: string,
    @Req() request: Request
  ) {
    return this.notificationsService.deleteTemplate(user, templateId, this.getRequestMeta(request));
  }

  @Get('notification-deliveries')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List notification delivery records' })
  listDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationDeliveryQueryDto
  ) {
    return this.notificationsService.listDeliveries(user, query);
  }

  @Patch('notification-deliveries/:deliveryId/status')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification delivery status' })
  updateDeliveryStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: UpdateDeliveryStatusDto,
    @Req() request: Request
  ) {
    return this.notificationsService.updateDeliveryStatus(
      user,
      deliveryId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Post('notification-deliveries/:deliveryId/retry')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry a failed or pending notification delivery' })
  retryDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId') deliveryId: string,
    @Req() request: Request
  ) {
    return this.notificationsService.retryDelivery(user, deliveryId, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
