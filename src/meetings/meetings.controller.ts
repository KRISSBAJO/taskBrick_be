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
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  AddMeetingAttendeeDto,
  AvailabilityQueryDto,
  CancelMeetingDto,
  CreateAgendaItemDto,
  CreateAvailabilityWindowDto,
  CreateBlackoutWindowDto,
  CreateMeetingDto,
  CreateMeetingReminderDto,
  CreateMeetingTypeDto,
  MeetingConflictQueryDto,
  MeetingQueryDto,
  MeetingTypeQueryDto,
  UpdateAgendaItemDto,
  UpdateAvailabilityWindowDto,
  UpdateMeetingAttendeeDto,
  UpdateMeetingDto,
  UpdateMeetingReminderDto,
  UpdateMeetingTypeDto
} from './dto/meeting.dto';
import { MeetingsService } from './meetings.service';

@ApiTags('meetings')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Meetings module readiness check' })
  status() {
    return { module: 'meetings', status: 'ready' };
  }

  @Get('taxonomy')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:meetings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get meeting statuses, categories, locations, attendee roles, and reminder channels' })
  taxonomy() {
    return this.meetingsService.taxonomy();
  }

  @Get('types')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:meetings')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Paginated meeting types' })
  listTypes(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingTypeQueryDto) {
    return this.meetingsService.listMeetingTypes(user, query);
  }

  @Post('types')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Created meeting type' })
  createType(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMeetingTypeDto, @Req() request: Request) {
    return this.meetingsService.createMeetingType(user, dto, this.getRequestMeta(request));
  }

  @Patch('types/:typeId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  updateType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateMeetingTypeDto,
    @Req() request: Request
  ) {
    return this.meetingsService.updateMeetingType(user, typeId, dto, this.getRequestMeta(request));
  }

  @Get('availability')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:meetings')
  @ApiBearerAuth()
  listAvailability(@CurrentUser() user: AuthenticatedUser, @Query() query: AvailabilityQueryDto) {
    return this.meetingsService.listAvailability(user, query);
  }

  @Post('availability/windows')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  createAvailabilityWindow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAvailabilityWindowDto,
    @Req() request: Request
  ) {
    return this.meetingsService.createAvailabilityWindow(user, dto, this.getRequestMeta(request));
  }

  @Patch('availability/windows/:windowId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  updateAvailabilityWindow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('windowId') windowId: string,
    @Body() dto: UpdateAvailabilityWindowDto,
    @Req() request: Request
  ) {
    return this.meetingsService.updateAvailabilityWindow(user, windowId, dto, this.getRequestMeta(request));
  }

  @Delete('availability/windows/:windowId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  deleteAvailabilityWindow(@CurrentUser() user: AuthenticatedUser, @Param('windowId') windowId: string, @Req() request: Request) {
    return this.meetingsService.deleteAvailabilityWindow(user, windowId, this.getRequestMeta(request));
  }

  @Post('availability/blackouts')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  createBlackoutWindow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlackoutWindowDto,
    @Req() request: Request
  ) {
    return this.meetingsService.createBlackoutWindow(user, dto, this.getRequestMeta(request));
  }

  @Delete('availability/blackouts/:blackoutId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  deleteBlackoutWindow(@CurrentUser() user: AuthenticatedUser, @Param('blackoutId') blackoutId: string, @Req() request: Request) {
    return this.meetingsService.deleteBlackoutWindow(user, blackoutId, this.getRequestMeta(request));
  }

  @Get('conflicts')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:meetings')
  @ApiBearerAuth()
  checkConflicts(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingConflictQueryDto) {
    return this.meetingsService.checkConflicts(user, query);
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:meetings')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Paginated tenant meetings visible to the current user' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: MeetingQueryDto) {
    return this.meetingsService.listMeetings(user, query);
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  @ApiCreatedResponse({ description: 'Created meeting' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMeetingDto, @Req() request: Request) {
    return this.meetingsService.createMeeting(user, dto, this.getRequestMeta(request));
  }

  @Get(':meetingId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:meetings')
  @ApiBearerAuth()
  get(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string) {
    return this.meetingsService.getMeeting(user, meetingId);
  }

  @Patch(':meetingId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateMeetingDto,
    @Req() request: Request
  ) {
    return this.meetingsService.updateMeeting(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post(':meetingId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: CancelMeetingDto,
    @Req() request: Request
  ) {
    return this.meetingsService.cancelMeeting(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Post(':meetingId/start')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  start(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string, @Req() request: Request) {
    return this.meetingsService.startMeeting(user, meetingId, this.getRequestMeta(request));
  }

  @Post(':meetingId/complete')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  complete(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string, @Req() request: Request) {
    return this.meetingsService.completeMeeting(user, meetingId, this.getRequestMeta(request));
  }

  @Post(':meetingId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  archive(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string, @Req() request: Request) {
    return this.meetingsService.archiveMeeting(user, meetingId, this.getRequestMeta(request));
  }

  @Post(':meetingId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  restore(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string, @Req() request: Request) {
    return this.meetingsService.restoreMeeting(user, meetingId, this.getRequestMeta(request));
  }

  @Get(':meetingId/attendees')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:meetings')
  @ApiBearerAuth()
  listAttendees(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string) {
    return this.meetingsService.listAttendees(user, meetingId);
  }

  @Post(':meetingId/attendees')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  addAttendee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: AddMeetingAttendeeDto,
    @Req() request: Request
  ) {
    return this.meetingsService.addAttendee(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Patch(':meetingId/attendees/:attendeeId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  updateAttendee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('attendeeId') attendeeId: string,
    @Body() dto: UpdateMeetingAttendeeDto,
    @Req() request: Request
  ) {
    return this.meetingsService.updateAttendee(user, meetingId, attendeeId, dto, this.getRequestMeta(request));
  }

  @Delete(':meetingId/attendees/:attendeeId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  removeAttendee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('attendeeId') attendeeId: string,
    @Req() request: Request
  ) {
    return this.meetingsService.removeAttendee(user, meetingId, attendeeId, this.getRequestMeta(request));
  }

  @Post(':meetingId/agenda')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  createAgendaItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateAgendaItemDto,
    @Req() request: Request
  ) {
    return this.meetingsService.createAgendaItem(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Patch(':meetingId/agenda/:itemId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  updateAgendaItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateAgendaItemDto,
    @Req() request: Request
  ) {
    return this.meetingsService.updateAgendaItem(user, meetingId, itemId, dto, this.getRequestMeta(request));
  }

  @Delete(':meetingId/agenda/:itemId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  deleteAgendaItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @Req() request: Request
  ) {
    return this.meetingsService.deleteAgendaItem(user, meetingId, itemId, this.getRequestMeta(request));
  }

  @Post(':meetingId/reminders')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  createReminder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingReminderDto,
    @Req() request: Request
  ) {
    return this.meetingsService.createReminder(user, meetingId, dto, this.getRequestMeta(request));
  }

  @Patch(':meetingId/reminders/:reminderId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  updateReminder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('reminderId') reminderId: string,
    @Body() dto: UpdateMeetingReminderDto,
    @Req() request: Request
  ) {
    return this.meetingsService.updateReminder(user, meetingId, reminderId, dto, this.getRequestMeta(request));
  }

  @Delete(':meetingId/reminders/:reminderId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:meetings')
  @ApiBearerAuth()
  deleteReminder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('meetingId') meetingId: string,
    @Param('reminderId') reminderId: string,
    @Req() request: Request
  ) {
    return this.meetingsService.deleteReminder(user, meetingId, reminderId, this.getRequestMeta(request));
  }

  @Get(':meetingId/activity')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:meetings')
  @ApiBearerAuth()
  listActivity(@CurrentUser() user: AuthenticatedUser, @Param('meetingId') meetingId: string) {
    return this.meetingsService.listActivity(user, meetingId);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null
    };
  }
}
