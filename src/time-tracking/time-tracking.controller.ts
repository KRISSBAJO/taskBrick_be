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
import { AssignUserSkillDto } from './dto/assign-user-skill.dto';
import { CreateResourceAllocationDto } from './dto/create-resource-allocation.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { RejectTimesheetDto } from './dto/reject-timesheet.dto';
import { ResourceAllocationQueryDto } from './dto/resource-allocation-query.dto';
import { ResourceReportQueryDto } from './dto/resource-report-query.dto';
import { SkillQueryDto } from './dto/skill-query.dto';
import { StartTimerDto } from './dto/start-timer.dto';
import { StopTimerDto } from './dto/stop-timer.dto';
import { TimeEntryQueryDto } from './dto/time-entry-query.dto';
import { TimesheetEntriesDto } from './dto/timesheet-entries.dto';
import { TimesheetQueryDto } from './dto/timesheet-query.dto';
import { UpdateResourceAllocationDto } from './dto/update-resource-allocation.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import { UserSkillQueryDto } from './dto/user-skill-query.dto';
import { TimeTrackingService } from './time-tracking.service';

@ApiTags('time-tracking')
@Controller()
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get('time-tracking/status')
  @Version('1')
  @ApiOperation({ summary: 'Time tracking and resource planning module readiness check' })
  status() {
    return { module: 'time-tracking', status: 'ready' };
  }

  @Get('time-entries')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List time entries' })
  @ApiOkResponse({ description: 'Paginated time entries' })
  listTimeEntries(@CurrentUser() user: AuthenticatedUser, @Query() query: TimeEntryQueryDto) {
    return this.timeTrackingService.listTimeEntries(user, query);
  }

  @Post('time-entries')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a time entry' })
  @ApiCreatedResponse({ description: 'Created time entry' })
  createTimeEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTimeEntryDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.createTimeEntry(user, dto, this.getRequestMeta(request));
  }

  @Get('time-entries/:entryId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a time entry' })
  getTimeEntry(@CurrentUser() user: AuthenticatedUser, @Param('entryId') entryId: string) {
    return this.timeTrackingService.getTimeEntry(user, entryId);
  }

  @Patch('time-entries/:entryId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft or rejected time entry' })
  updateTimeEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateTimeEntryDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.updateTimeEntry(user, entryId, dto, this.getRequestMeta(request));
  }

  @Delete('time-entries/:entryId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a draft or rejected time entry' })
  deleteTimeEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entryId') entryId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.deleteTimeEntry(user, entryId, this.getRequestMeta(request));
  }

  @Get('time-timers/current')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user running timer' })
  getCurrentTimer(@CurrentUser() user: AuthenticatedUser) {
    return this.timeTrackingService.getCurrentTimer(user);
  }

  @Post('time-timers/start')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a timer for the current user' })
  startTimer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartTimerDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.startTimer(user, dto, this.getRequestMeta(request));
  }

  @Patch('time-timers/current')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user running timer' })
  updateCurrentTimer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartTimerDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.updateCurrentTimer(user, dto, this.getRequestMeta(request));
  }

  @Post('time-timers/stop')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stop the current timer and create a time entry' })
  stopTimer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StopTimerDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.stopTimer(user, dto, this.getRequestMeta(request));
  }

  @Delete('time-timers/current')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Discard the current timer without creating a time entry' })
  discardTimer(@CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.timeTrackingService.discardTimer(user, this.getRequestMeta(request));
  }

  @Get('timesheets')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List timesheets' })
  listTimesheets(@CurrentUser() user: AuthenticatedUser, @Query() query: TimesheetQueryDto) {
    return this.timeTrackingService.listTimesheets(user, query);
  }

  @Post('timesheets')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a timesheet and optionally attach draft entries' })
  createTimesheet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTimesheetDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.createTimesheet(user, dto, this.getRequestMeta(request));
  }

  @Get('timesheets/:timesheetId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a timesheet with entries and totals' })
  getTimesheet(@CurrentUser() user: AuthenticatedUser, @Param('timesheetId') timesheetId: string) {
    return this.timeTrackingService.getTimesheet(user, timesheetId);
  }

  @Patch('timesheets/:timesheetId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an editable timesheet' })
  updateTimesheet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Body() dto: UpdateTimesheetDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.updateTimesheet(user, timesheetId, dto, this.getRequestMeta(request));
  }

  @Post('timesheets/:timesheetId/entries')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach draft entries to a timesheet' })
  addTimesheetEntries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Body() dto: TimesheetEntriesDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.addTimesheetEntries(user, timesheetId, dto, this.getRequestMeta(request));
  }

  @Delete('timesheets/:timesheetId/entries/:entryId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detach an entry from a timesheet' })
  removeTimesheetEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Param('entryId') entryId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.removeTimesheetEntry(user, timesheetId, entryId, this.getRequestMeta(request));
  }

  @Post('timesheets/:timesheetId/submit')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a timesheet for approval' })
  submitTimesheet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.submitTimesheet(user, timesheetId, this.getRequestMeta(request));
  }

  @Post('timesheets/:timesheetId/approve')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a submitted timesheet' })
  approveTimesheet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.approveTimesheet(user, timesheetId, this.getRequestMeta(request));
  }

  @Post('timesheets/:timesheetId/reject')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a submitted timesheet' })
  rejectTimesheet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Body() dto: RejectTimesheetDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.rejectTimesheet(user, timesheetId, dto, this.getRequestMeta(request));
  }

  @Post('timesheets/:timesheetId/reopen')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reopen a submitted, rejected, or approved timesheet' })
  reopenTimesheet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.reopenTimesheet(user, timesheetId, this.getRequestMeta(request));
  }

  @Delete('timesheets/:timesheetId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a timesheet' })
  cancelTimesheet(
    @CurrentUser() user: AuthenticatedUser,
    @Param('timesheetId') timesheetId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.cancelTimesheet(user, timesheetId, this.getRequestMeta(request));
  }

  @Get('skills')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant skills' })
  listSkills(@CurrentUser() user: AuthenticatedUser, @Query() query: SkillQueryDto) {
    return this.timeTrackingService.listSkills(user, query);
  }

  @Post('skills')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tenant skill' })
  createSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSkillDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.createSkill(user, dto, this.getRequestMeta(request));
  }

  @Get('skills/:skillId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a tenant skill' })
  getSkill(@CurrentUser() user: AuthenticatedUser, @Param('skillId') skillId: string) {
    return this.timeTrackingService.getSkill(user, skillId);
  }

  @Patch('skills/:skillId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tenant skill' })
  updateSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateSkillDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.updateSkill(user, skillId, dto, this.getRequestMeta(request));
  }

  @Post('skills/:skillId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a skill' })
  archiveSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('skillId') skillId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.archiveSkill(user, skillId, this.getRequestMeta(request));
  }

  @Post('skills/:skillId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived skill' })
  restoreSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('skillId') skillId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.restoreSkill(user, skillId, this.getRequestMeta(request));
  }

  @Delete('skills/:skillId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an unassigned skill' })
  deleteSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('skillId') skillId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.deleteSkill(user, skillId, this.getRequestMeta(request));
  }

  @Get('user-skills')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user skill assignments' })
  listUserSkills(@CurrentUser() user: AuthenticatedUser, @Query() query: UserSkillQueryDto) {
    return this.timeTrackingService.listUserSkills(user, query);
  }

  @Post('user-skills')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a skill to a user' })
  assignUserSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignUserSkillDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.assignUserSkill(user, dto, this.getRequestMeta(request));
  }

  @Patch('user-skills/:userSkillId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user skill assignment' })
  updateUserSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userSkillId') userSkillId: string,
    @Body() dto: UpdateUserSkillDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.updateUserSkill(user, userSkillId, dto, this.getRequestMeta(request));
  }

  @Delete('user-skills/:userSkillId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a user skill assignment' })
  deleteUserSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userSkillId') userSkillId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.deleteUserSkill(user, userSkillId, this.getRequestMeta(request));
  }

  @Get('resource-allocations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List resource allocations' })
  listAllocations(@CurrentUser() user: AuthenticatedUser, @Query() query: ResourceAllocationQueryDto) {
    return this.timeTrackingService.listAllocations(user, query);
  }

  @Post('resource-allocations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a resource allocation' })
  createAllocation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateResourceAllocationDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.createAllocation(user, dto, this.getRequestMeta(request));
  }

  @Get('resource-allocations/:allocationId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a resource allocation' })
  getAllocation(@CurrentUser() user: AuthenticatedUser, @Param('allocationId') allocationId: string) {
    return this.timeTrackingService.getAllocation(user, allocationId);
  }

  @Patch('resource-allocations/:allocationId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a resource allocation' })
  updateAllocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('allocationId') allocationId: string,
    @Body() dto: UpdateResourceAllocationDto,
    @Req() request: Request
  ) {
    return this.timeTrackingService.updateAllocation(user, allocationId, dto, this.getRequestMeta(request));
  }

  @Delete('resource-allocations/:allocationId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a resource allocation' })
  deleteAllocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('allocationId') allocationId: string,
    @Req() request: Request
  ) {
    return this.timeTrackingService.deleteAllocation(user, allocationId, this.getRequestMeta(request));
  }

  @Get('resource-planning/capacity')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get resource capacity report' })
  capacityReport(@CurrentUser() user: AuthenticatedUser, @Query() query: ResourceReportQueryDto) {
    return this.timeTrackingService.capacityReport(user, query);
  }

  @Get('resource-planning/utilization')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get utilization report' })
  utilizationReport(@CurrentUser() user: AuthenticatedUser, @Query() query: ResourceReportQueryDto) {
    return this.timeTrackingService.utilizationReport(user, query);
  }

  @Get('resource-planning/availability')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get availability report' })
  availabilityReport(@CurrentUser() user: AuthenticatedUser, @Query() query: ResourceReportQueryDto) {
    return this.timeTrackingService.availabilityReport(user, query);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
