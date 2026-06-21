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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AssignLabelDto } from './dto/assign-label.dto';
import { BulkTaskOperationDto } from './dto/bulk-task-operation.dto';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { CreateTaskAttachmentDto } from './dto/create-task-attachment.dto';
import { CreateTaskChecklistItemDto } from './dto/create-task-checklist-item.dto';
import { CreateTaskChecklistDto } from './dto/create-task-checklist.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import { CreateTaskSavedViewDto } from './dto/create-task-saved-view.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CustomFieldQueryDto } from './dto/custom-field-query.dto';
import { SetTaskCustomFieldValueDto } from './dto/set-task-custom-field-value.dto';
import { TaskSavedViewQueryDto } from './dto/task-saved-view-query.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskUserDto } from './dto/task-user.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { UpdateTaskChecklistItemDto } from './dto/update-task-checklist-item.dto';
import { UpdateTaskChecklistDto } from './dto/update-task-checklist.dto';
import { UpdateTaskCommentDto } from './dto/update-task-comment.dto';
import { UpdateTaskSavedViewDto } from './dto/update-task-saved-view.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Tasks module readiness check' })
  status() {
    return {
      module: 'tasks',
      status: 'ready'
    };
  }

  @Get('labels')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant task labels' })
  @ApiOkResponse({ description: 'Tenant labels' })
  listLabels(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.listLabels(user);
  }

  @Post('labels')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tenant task label' })
  @ApiCreatedResponse({ description: 'Created task label' })
  createLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLabelDto,
    @Req() request: Request
  ) {
    return this.tasksService.createLabel(user, dto, this.getRequestMeta(request));
  }

  @Patch('labels/:labelId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tenant task label' })
  updateLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('labelId') labelId: string,
    @Body() dto: UpdateLabelDto,
    @Req() request: Request
  ) {
    return this.tasksService.updateLabel(user, labelId, dto, this.getRequestMeta(request));
  }

  @Delete('labels/:labelId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a tenant task label' })
  deleteLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('labelId') labelId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteLabel(user, labelId, this.getRequestMeta(request));
  }

  @Get('taxonomy')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get task taxonomy metadata, types, statuses, priorities, and supported filters' })
  taxonomy() {
    return this.tasksService.taxonomy();
  }

  @Get('custom-fields')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task, project, or sprint custom field definitions' })
  listCustomFields(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CustomFieldQueryDto
  ) {
    return this.tasksService.listCustomFields(user, query);
  }

  @Post('custom-fields')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a scoped custom field definition' })
  createCustomField(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomFieldDto,
    @Req() request: Request
  ) {
    return this.tasksService.createCustomField(user, dto, this.getRequestMeta(request));
  }

  @Patch('custom-fields/:customFieldId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a custom field definition' })
  updateCustomField(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customFieldId') customFieldId: string,
    @Body() dto: UpdateCustomFieldDto,
    @Req() request: Request
  ) {
    return this.tasksService.updateCustomField(user, customFieldId, dto, this.getRequestMeta(request));
  }

  @Post('custom-fields/:customFieldId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a custom field definition' })
  archiveCustomField(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customFieldId') customFieldId: string,
    @Req() request: Request
  ) {
    return this.tasksService.archiveCustomField(user, customFieldId, this.getRequestMeta(request));
  }

  @Post('custom-fields/:customFieldId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived custom field definition' })
  restoreCustomField(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customFieldId') customFieldId: string,
    @Req() request: Request
  ) {
    return this.tasksService.restoreCustomField(user, customFieldId, this.getRequestMeta(request));
  }

  @Delete('custom-fields/:customFieldId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete or archive a custom field definition' })
  deleteCustomField(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customFieldId') customFieldId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteCustomField(user, customFieldId, this.getRequestMeta(request));
  }

  @Get('saved-views')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List saved task views visible to the current user' })
  listSavedViews(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TaskSavedViewQueryDto
  ) {
    return this.tasksService.listSavedViews(user, query);
  }

  @Post('saved-views')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a saved task view' })
  createSavedView(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskSavedViewDto,
    @Req() request: Request
  ) {
    return this.tasksService.createSavedView(user, dto, this.getRequestMeta(request));
  }

  @Patch('saved-views/:viewId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a saved task view' })
  updateSavedView(
    @CurrentUser() user: AuthenticatedUser,
    @Param('viewId') viewId: string,
    @Body() dto: UpdateTaskSavedViewDto,
    @Req() request: Request
  ) {
    return this.tasksService.updateSavedView(user, viewId, dto, this.getRequestMeta(request));
  }

  @Delete('saved-views/:viewId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a saved task view' })
  deleteSavedView(
    @CurrentUser() user: AuthenticatedUser,
    @Param('viewId') viewId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteSavedView(user, viewId, this.getRequestMeta(request));
  }

  @Post('bulk')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update, archive, restore, or soft-delete tasks' })
  bulkOperation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkTaskOperationDto,
    @Req() request: Request
  ) {
    return this.tasksService.bulkOperation(user, dto, this.getRequestMeta(request));
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tasks in the current tenant' })
  @ApiOkResponse({ description: 'Paginated tenant tasks' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: TaskQueryDto) {
    return this.tasksService.list(user, query);
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a task in a tenant project' })
  @ApiCreatedResponse({ description: 'Created task' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
    @Req() request: Request
  ) {
    return this.tasksService.create(user, dto, this.getRequestMeta(request));
  }

  @Get(':taskId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a tenant task by id' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.get(user, taskId);
  }

  @Patch(':taskId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a tenant task' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @Req() request: Request
  ) {
    return this.tasksService.update(user, taskId, dto, this.getRequestMeta(request));
  }

  @Delete(':taskId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a task without subtasks' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Req() request: Request
  ) {
    return this.tasksService.delete(user, taskId, this.getRequestMeta(request));
  }

  @Post(':taskId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a task' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Req() request: Request
  ) {
    return this.tasksService.archive(user, taskId, this.getRequestMeta(request));
  }

  @Post(':taskId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived or soft-deleted task' })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Req() request: Request
  ) {
    return this.tasksService.restore(user, taskId, this.getRequestMeta(request));
  }

  @Get(':taskId/assignees')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task assignees' })
  listAssignees(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listAssignees(user, taskId);
  }

  @Post(':taskId/assignees')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a user to a task' })
  addAssignee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: TaskUserDto,
    @Req() request: Request
  ) {
    return this.tasksService.addAssignee(user, taskId, dto, this.getRequestMeta(request));
  }

  @Delete(':taskId/assignees/:userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a task assignee' })
  removeAssignee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.tasksService.removeAssignee(user, taskId, userId, this.getRequestMeta(request));
  }

  @Get(':taskId/watchers')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task watchers' })
  listWatchers(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listWatchers(user, taskId);
  }

  @Post(':taskId/watchers')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Watch a task as a user' })
  addWatcher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: TaskUserDto,
    @Req() request: Request
  ) {
    return this.tasksService.addWatcher(user, taskId, dto, this.getRequestMeta(request));
  }

  @Delete(':taskId/watchers/:userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a task watcher' })
  removeWatcher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.tasksService.removeWatcher(user, taskId, userId, this.getRequestMeta(request));
  }

  @Get(':taskId/comments')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task comments' })
  listComments(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listComments(user, taskId);
  }

  @Post(':taskId/comments')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('comment:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a task comment' })
  createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskCommentDto,
    @Req() request: Request
  ) {
    return this.tasksService.createComment(user, taskId, dto, this.getRequestMeta(request));
  }

  @Patch(':taskId/comments/:commentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('comment:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task comment' })
  updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateTaskCommentDto,
    @Req() request: Request
  ) {
    return this.tasksService.updateComment(
      user,
      taskId,
      commentId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete(':taskId/comments/:commentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('comment:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a task comment' })
  deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteComment(user, taskId, commentId, this.getRequestMeta(request));
  }

  @Get(':taskId/attachments')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task attachment metadata' })
  listAttachments(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listAttachments(user, taskId);
  }

  @Post(':taskId/attachments')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create task attachment metadata' })
  createAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskAttachmentDto,
    @Req() request: Request
  ) {
    return this.tasksService.createAttachment(user, taskId, dto, this.getRequestMeta(request));
  }

  @Delete(':taskId/attachments/:attachmentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete task attachment metadata' })
  deleteAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteAttachment(
      user,
      taskId,
      attachmentId,
      this.getRequestMeta(request)
    );
  }

  @Get(':taskId/checklists')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task checklists' })
  listChecklists(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listChecklists(user, taskId);
  }

  @Post(':taskId/checklists')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a task checklist' })
  createChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskChecklistDto,
    @Req() request: Request
  ) {
    return this.tasksService.createChecklist(user, taskId, dto, this.getRequestMeta(request));
  }

  @Patch(':taskId/checklists/:checklistId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task checklist' })
  updateChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: UpdateTaskChecklistDto,
    @Req() request: Request
  ) {
    return this.tasksService.updateChecklist(
      user,
      taskId,
      checklistId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete(':taskId/checklists/:checklistId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a task checklist' })
  deleteChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteChecklist(user, taskId, checklistId, this.getRequestMeta(request));
  }

  @Post(':taskId/checklists/:checklistId/items')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a task checklist item' })
  createChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: CreateTaskChecklistItemDto,
    @Req() request: Request
  ) {
    return this.tasksService.createChecklistItem(
      user,
      taskId,
      checklistId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Patch(':taskId/checklists/:checklistId/items/:itemId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task checklist item' })
  updateChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTaskChecklistItemDto,
    @Req() request: Request
  ) {
    return this.tasksService.updateChecklistItem(
      user,
      taskId,
      checklistId,
      itemId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete(':taskId/checklists/:checklistId/items/:itemId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a task checklist item' })
  deleteChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteChecklistItem(
      user,
      taskId,
      checklistId,
      itemId,
      this.getRequestMeta(request)
    );
  }

  @Get(':taskId/labels')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List labels assigned to a task' })
  listTaskLabels(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listTaskLabels(user, taskId);
  }

  @Post(':taskId/labels')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a label to a task' })
  assignLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: AssignLabelDto,
    @Req() request: Request
  ) {
    return this.tasksService.assignLabel(user, taskId, dto, this.getRequestMeta(request));
  }

  @Delete(':taskId/labels/:labelId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a label from a task' })
  removeTaskLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('labelId') labelId: string,
    @Req() request: Request
  ) {
    return this.tasksService.removeTaskLabel(user, taskId, labelId, this.getRequestMeta(request));
  }

  @Get(':taskId/dependencies')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task dependencies' })
  listDependencies(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listDependencies(user, taskId);
  }

  @Post(':taskId/dependencies')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a task dependency' })
  createDependency(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskDependencyDto,
    @Req() request: Request
  ) {
    return this.tasksService.createDependency(user, taskId, dto, this.getRequestMeta(request));
  }

  @Delete(':taskId/dependencies/:dependencyId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a task dependency' })
  deleteDependency(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('dependencyId') dependencyId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteDependency(
      user,
      taskId,
      dependencyId,
      this.getRequestMeta(request)
    );
  }

  @Get(':taskId/activities')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task activity events' })
  listActivities(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listActivities(user, taskId);
  }

  @Get(':taskId/custom-field-values')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List task custom field values' })
  listCustomFieldValues(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.tasksService.listCustomFieldValues(user, taskId);
  }

  @Put(':taskId/custom-field-values/:customFieldId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set a task custom field value' })
  setCustomFieldValue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('customFieldId') customFieldId: string,
    @Body() dto: SetTaskCustomFieldValueDto,
    @Req() request: Request
  ) {
    return this.tasksService.setCustomFieldValue(
      user,
      taskId,
      customFieldId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete(':taskId/custom-field-values/:customFieldId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a task custom field value' })
  deleteCustomFieldValue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Param('customFieldId') customFieldId: string,
    @Req() request: Request
  ) {
    return this.tasksService.deleteCustomFieldValue(
      user,
      taskId,
      customFieldId,
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
