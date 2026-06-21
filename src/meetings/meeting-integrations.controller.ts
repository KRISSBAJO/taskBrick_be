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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CreateMeetingConferenceDto,
  MeetingReminderJobQueryDto,
  ProcessMeetingReminderJobsDto,
  UpdateMeetingIntegrationSettingsDto
} from './dto/meeting-integrations.dto';
import { MeetingIntegrationsService } from './meeting-integrations.service';

@ApiTags('meetings-integrations')
@Controller('meetings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MeetingIntegrationsController {
  constructor(private readonly meetingIntegrationsService: MeetingIntegrationsService) {}

  @Get('integrations/status')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get meeting provider readiness, queue state, and webhook event support' })
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.meetingIntegrationsService.status(user);
  }

  @Get('integrations/settings')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get tenant meeting integration settings' })
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.meetingIntegrationsService.getSettings(user);
  }

  @Patch('integrations/settings')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Update tenant meeting integration settings' })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeetingIntegrationSettingsDto,
    @Req() request: Request
  ) {
    return this.meetingIntegrationsService.updateSettings(user, dto, this.getRequestMeta(request));
  }

  @Get('reminder-jobs')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'List durable meeting reminder jobs' })
  listReminderJobs(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingReminderJobQueryDto) {
    return this.meetingIntegrationsService.listReminderJobs(user, query);
  }

  @Post('reminder-jobs/process')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Process due reminder jobs now' })
  processReminderJobs(@CurrentUser() user: AuthenticatedUser, @Body() dto: ProcessMeetingReminderJobsDto) {
    return this.meetingIntegrationsService.processReminderJobs(user, dto);
  }

  @Post('reminder-jobs/:jobId/retry')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Retry a failed or dead-letter meeting reminder job' })
  retryReminderJob(@CurrentUser() user: AuthenticatedUser, @Param('jobId') jobId: string) {
    return this.meetingIntegrationsService.retryReminderJob(user, jobId);
  }

  @Post(':meetingId/conference')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOkResponse({ description: 'Created or attached a conference link for the meeting' })
  createConference(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingConferenceDto,
    @Req() request: Request
  ) {
    return this.meetingIntegrationsService.createConference(user, meetingId, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']
    };
  }
}
