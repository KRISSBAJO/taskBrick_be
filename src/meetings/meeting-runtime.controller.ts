import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Version
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  AssignMeetingActionItemDto,
  CreateMeetingChecklistItemDto,
  CreateMeetingCommentDto,
  CreateMeetingDecisionDto,
  SendMeetingFollowUpDto,
  SyncMeetingRuntimeDto,
  UpdateLiveMeetingNotesDto,
  UpdateMeetingChecklistItemDto,
  UpdateMeetingCommentDto,
  UpdateMeetingDecisionDto,
  UpdateMeetingAttendanceDto
} from './dto/meeting-runtime.dto';
import { MeetingRuntimeService } from './meeting-runtime.service';

@ApiTags('meetings-runtime')
@Controller('meetings/:meetingId')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MeetingRuntimeController {
  constructor(private readonly meetingRuntimeService: MeetingRuntimeService) {}

  @Get('workspace')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Get the live meeting command-center workspace' })
  @ApiOkResponse({ description: 'Meeting workspace with notes, agenda, attendees, comments, decisions, files, tasks, reminders, and activity' })
  getWorkspace(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string) {
    return this.meetingRuntimeService.getWorkspace(user, meetingId);
  }

  @Patch('live-notes')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Update live meeting notes with optimistic versioning and realtime broadcast' })
  updateLiveNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateLiveMeetingNotesDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.updateLiveNotes(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('comments')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiCreatedResponse({ description: 'Created meeting comment' })
  createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingCommentDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.createComment(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Patch('comments/:commentId')
  @Version('1')
  @RequirePermissions('read:meetings')
  updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateMeetingCommentDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.updateComment(user, meetingId, commentId, dto, this.getRequestMeta(request));
  }

  @Delete('comments/:commentId')
  @Version('1')
  @RequirePermissions('read:meetings')
  deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('commentId') commentId: string,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.deleteComment(user, meetingId, commentId, this.getRequestMeta(request));
  }

  @Post('decisions')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiCreatedResponse({ description: 'Created meeting decision' })
  createDecision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingDecisionDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.createDecision(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Patch('decisions/:decisionId')
  @Version('1')
  @RequirePermissions('read:meetings')
  updateDecision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('decisionId') decisionId: string,
    @Body() dto: UpdateMeetingDecisionDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.updateDecision(user, meetingId, decisionId, dto, this.getRequestMeta(request));
  }

  @Delete('decisions/:decisionId')
  @Version('1')
  @RequirePermissions('manage:meetings')
  deleteDecision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('decisionId') decisionId: string,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.deleteDecision(user, meetingId, decisionId, this.getRequestMeta(request));
  }

  @Post('checklist')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiCreatedResponse({ description: 'Created meeting checklist item' })
  createChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingChecklistItemDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.createChecklistItem(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Patch('checklist/:itemId')
  @Version('1')
  @RequirePermissions('read:meetings')
  updateChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMeetingChecklistItemDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.updateChecklistItem(user, meetingId, itemId, dto, this.getRequestMeta(request));
  }

  @Delete('checklist/:itemId')
  @Version('1')
  @RequirePermissions('manage:meetings')
  deleteChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.deleteChecklistItem(user, meetingId, itemId, this.getRequestMeta(request));
  }

  @Patch('attendance/:attendeeId')
  @Version('1')
  @RequirePermissions('read:meetings')
  @ApiOperation({ summary: 'Update attendance status for a meeting attendee' })
  updateAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('attendeeId') attendeeId: string,
    @Body() dto: UpdateMeetingAttendanceDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.updateAttendance(user, meetingId, attendeeId, dto, this.getRequestMeta(request));
  }

  @Post('no-show')
  @Version('1')
  @RequirePermissions('manage:meetings')
  markNoShow(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string, @Req() request: Request) {
    return this.meetingRuntimeService.markNoShow(user, meetingId, this.getRequestMeta(request));
  }

  @Post('action-items/assign')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Assign a live meeting action item as a real TaskBricks task' })
  assignActionItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: AssignMeetingActionItemDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.assignActionItem(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('follow-up')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Queue email/WhatsApp meeting follow-up delivery jobs' })
  sendFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: SendMeetingFollowUpDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.sendFollowUp(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post('omoflow/sync')
  @Version('1')
  @RequirePermissions('manage:meetings')
  @ApiOperation({ summary: 'Record an OmoFlow runtime sync request for notes/action/attendance handoff' })
  syncOmoFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: SyncMeetingRuntimeDto,
    @Req() request: Request
  ) {
    return this.meetingRuntimeService.syncOmoFlowRuntime(user, meetingId, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null
    };
  }
}
