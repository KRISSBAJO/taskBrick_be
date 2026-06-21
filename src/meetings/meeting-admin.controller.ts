import { Body, Controller, Get, Patch, Query, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  MeetingAdminLogQueryDto,
  MeetingAdminRangeQueryDto,
  UpdateMeetingPolicyDto
} from './dto/meeting-admin.dto';
import { MeetingAdminService } from './meeting-admin.service';

@ApiTags('meetings-admin')
@Controller('meetings/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MeetingAdminController {
  constructor(private readonly meetingAdminService: MeetingAdminService) {}

  @Get('overview')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Get tenant meeting policy, analytics, reminders, integrations, AI usage, and audit overview' })
  overview(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingAdminRangeQueryDto) {
    return this.meetingAdminService.overview(user, query);
  }

  @Get('policy')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get tenant meeting governance policy' })
  getPolicy(@CurrentUser() user: AuthenticatedUser) {
    return this.meetingAdminService.getPolicy(user);
  }

  @Patch('policy')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Update tenant meeting governance policy' })
  updatePolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeetingPolicyDto,
    @Req() request: Request
  ) {
    return this.meetingAdminService.updatePolicy(user, dto, this.getRequestMeta(request));
  }

  @Get('analytics')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get tenant meeting analytics' })
  analytics(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingAdminRangeQueryDto) {
    return this.meetingAdminService.analytics(user, query);
  }

  @Get('integration-health')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get tenant meeting integration health' })
  integrationHealth(@CurrentUser() user: AuthenticatedUser) {
    return this.meetingAdminService.integrationHealth(user);
  }

  @Get('reminder-delivery')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get tenant meeting reminder delivery summary' })
  reminderDelivery(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingAdminRangeQueryDto) {
    return this.meetingAdminService.reminderDelivery(user, query);
  }

  @Get('reminder-logs')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Search tenant meeting reminder delivery logs' })
  reminderLogs(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingAdminLogQueryDto) {
    return this.meetingAdminService.reminderLogs(user, query);
  }

  @Get('ai-usage')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get tenant meeting AI usage and cost summary' })
  aiUsage(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingAdminRangeQueryDto) {
    return this.meetingAdminService.aiUsage(user, query);
  }

  @Get('audit')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Search tenant meeting audit trail' })
  auditTrail(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingAdminLogQueryDto) {
    return this.meetingAdminService.auditTrail(user, query);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null
    };
  }
}
