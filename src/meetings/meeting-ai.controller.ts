import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  ConvertMeetingActionItemsDto,
  LinkMeetingContextDto,
  MeetingAiGenerateDto,
  MeetingAiRoleSummaryDto,
  ScheduleMeetingFollowUpsDto
} from './dto/meeting-ai.dto';
import { MeetingAiService } from './meeting-ai.service';

@ApiTags('meetings-ai')
@Controller('meetings/:meetingId/ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MeetingAiController {
  constructor(private readonly meetingAiService: MeetingAiService) {}

  @Get()
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get stored AI artifacts and health signals for one meeting' })
  @ApiOkResponse({ description: 'Meeting AI state' })
  getState(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string) {
    return this.meetingAiService.getState(user, meetingId);
  }

  @Patch('links')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Link a meeting to project, sprint, task, team, and client context' })
  linkContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: LinkMeetingContextDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.linkContext(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('agenda')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Generate an AI agenda with expected outcomes and facilitation guidance' })
  generateAgenda(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiGenerateDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.generateAgenda(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('preparation-brief')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Generate an AI meeting preparation brief' })
  generatePreparationBrief(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiGenerateDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.generatePreparationBrief(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('suggest-attendees')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Suggest additional attendees from tenant-scoped work context' })
  suggestAttendees(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiGenerateDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.suggestAttendees(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('risk-detection')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Detect AI meeting conflicts, risk signals, and missing decisions' })
  detectRisks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiGenerateDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.detectRisks(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('notes')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Generate AI meeting notes, decisions, open questions, and action items' })
  generateNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiGenerateDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.generateNotes(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('follow-up')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Generate an AI follow-up message from notes and action items' })
  generateFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiGenerateDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.generateFollowUp(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('role-summary')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Generate executive, project-manager, or assignee-specific AI summaries' })
  generateRoleSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiRoleSummaryDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.generateRoleSummary(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('effectiveness-score')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Score meeting effectiveness from agenda, attendance, decisions, and follow-ups' })
  scoreEffectiveness(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiGenerateDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.scoreEffectiveness(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('missed-decisions')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Detect missed or ambiguous decisions from notes and transcript' })
  detectMissedDecisions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: MeetingAiGenerateDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.detectMissedDecisions(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('action-items/convert-tasks')
  @Version('1')
  @RequirePermissions('manage:tasks')
  @ApiOperation({ summary: 'Convert AI meeting action items into TaskBricks tasks' })
  convertActionItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: ConvertMeetingActionItemsDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.convertActionItems(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('action-items/follow-up-reminders')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Schedule follow-up reminders for open AI action items' })
  scheduleFollowUps(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: ScheduleMeetingFollowUpsDto,
    @Req() request: Request
  ) {
    return this.meetingAiService.scheduleFollowUpReminders(user, meetingId, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null
    };
  }
}
