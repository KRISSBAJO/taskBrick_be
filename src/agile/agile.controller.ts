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
import { AgileService } from './agile.service';
import { CompleteSprintDto } from './dto/complete-sprint.dto';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateRetrospectiveDto } from './dto/create-retrospective.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { ReorderBoardColumnsDto } from './dto/reorder-board-columns.dto';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { SprintTaskBulkDto } from './dto/sprint-task-bulk.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateRetrospectiveDto } from './dto/update-retrospective.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { UpdateTaskOrderDto } from './dto/update-task-order.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@ApiTags('agile')
@Controller('agile')
export class AgileController {
  constructor(private readonly agileService: AgileService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Agile module readiness check' })
  status() {
    return {
      module: 'agile',
      status: 'ready'
    };
  }

  @Get('sprints')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List sprints in the current tenant' })
  @ApiOkResponse({ description: 'Paginated sprint list' })
  listSprints(@CurrentUser() user: AuthenticatedUser, @Query() query: SprintQueryDto) {
    return this.agileService.listSprints(user, query);
  }

  @Post('sprints')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a sprint' })
  @ApiCreatedResponse({ description: 'Created sprint' })
  createSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSprintDto,
    @Req() request: Request
  ) {
    return this.agileService.createSprint(user, dto, this.getRequestMeta(request));
  }

  @Get('sprints/:sprintId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a sprint' })
  getSprint(@CurrentUser() user: AuthenticatedUser, @Param('sprintId') sprintId: string) {
    return this.agileService.getSprint(user, sprintId);
  }

  @Patch('sprints/:sprintId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a sprint' })
  updateSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Body() dto: UpdateSprintDto,
    @Req() request: Request
  ) {
    return this.agileService.updateSprint(user, sprintId, dto, this.getRequestMeta(request));
  }

  @Delete('sprints/:sprintId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an empty sprint' })
  deleteSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Req() request: Request
  ) {
    return this.agileService.deleteSprint(user, sprintId, this.getRequestMeta(request));
  }

  @Post('sprints/:sprintId/start')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a sprint and enforce one active sprint per project' })
  startSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Req() request: Request
  ) {
    return this.agileService.startSprint(user, sprintId, this.getRequestMeta(request));
  }

  @Post('sprints/:sprintId/complete')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a sprint and optionally move incomplete tasks' })
  completeSprint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Body() dto: CompleteSprintDto,
    @Req() request: Request
  ) {
    return this.agileService.completeSprint(user, sprintId, dto, this.getRequestMeta(request));
  }

  @Get('sprints/:sprintId/tasks')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List sprint tasks' })
  listSprintTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.agileService.listSprintTasks(user, sprintId, query);
  }

  @Post('sprints/:sprintId/tasks')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add tasks to a sprint' })
  addSprintTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Body() dto: SprintTaskBulkDto,
    @Req() request: Request
  ) {
    return this.agileService.addSprintTasks(user, sprintId, dto, this.getRequestMeta(request));
  }

  @Delete('sprints/:sprintId/tasks/:taskId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a task from a sprint' })
  removeSprintTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Param('taskId') taskId: string,
    @Req() request: Request
  ) {
    return this.agileService.removeSprintTask(user, sprintId, taskId, this.getRequestMeta(request));
  }

  @Get('sprints/:sprintId/burndown')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sprint burndown data' })
  getSprintBurndown(@CurrentUser() user: AuthenticatedUser, @Param('sprintId') sprintId: string) {
    return this.agileService.getSprintBurndown(user, sprintId);
  }

  @Get('sprints/:sprintId/retrospectives')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List sprint retrospectives' })
  listRetrospectives(@CurrentUser() user: AuthenticatedUser, @Param('sprintId') sprintId: string) {
    return this.agileService.listRetrospectives(user, sprintId);
  }

  @Post('sprints/:sprintId/retrospectives')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a sprint retrospective' })
  createRetrospective(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Body() dto: CreateRetrospectiveDto,
    @Req() request: Request
  ) {
    return this.agileService.createRetrospective(user, sprintId, dto, this.getRequestMeta(request));
  }

  @Patch('sprints/:sprintId/retrospectives/:retrospectiveId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a sprint retrospective' })
  updateRetrospective(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Param('retrospectiveId') retrospectiveId: string,
    @Body() dto: UpdateRetrospectiveDto,
    @Req() request: Request
  ) {
    return this.agileService.updateRetrospective(
      user,
      sprintId,
      retrospectiveId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('sprints/:sprintId/retrospectives/:retrospectiveId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a sprint retrospective' })
  deleteRetrospective(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sprintId') sprintId: string,
    @Param('retrospectiveId') retrospectiveId: string,
    @Req() request: Request
  ) {
    return this.agileService.deleteRetrospective(
      user,
      sprintId,
      retrospectiveId,
      this.getRequestMeta(request)
    );
  }

  @Get('projects/:projectId/backlog')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project backlog tasks' })
  getBacklog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.agileService.getBacklog(user, projectId, query);
  }

  @Get('projects/:projectId/board')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the default project board with grouped tasks' })
  getProjectBoard(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.agileService.getProjectBoard(user, projectId);
  }

  @Get('projects/:projectId/boards')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List project boards' })
  listProjectBoards(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.agileService.listProjectBoards(user, projectId);
  }

  @Post('projects/:projectId/boards')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a project board' })
  createBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateBoardDto,
    @Req() request: Request
  ) {
    return this.agileService.createBoard(user, projectId, dto, this.getRequestMeta(request));
  }

  @Patch('boards/:boardId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a board' })
  updateBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
    @Req() request: Request
  ) {
    return this.agileService.updateBoard(user, boardId, dto, this.getRequestMeta(request));
  }

  @Delete('boards/:boardId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a non-default board' })
  deleteBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Req() request: Request
  ) {
    return this.agileService.deleteBoard(user, boardId, this.getRequestMeta(request));
  }

  @Post('boards/:boardId/columns')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a board column' })
  createBoardColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Body() dto: CreateBoardColumnDto,
    @Req() request: Request
  ) {
    return this.agileService.createBoardColumn(user, boardId, dto, this.getRequestMeta(request));
  }

  @Patch('boards/:boardId/columns/reorder')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Persist board column ordering transactionally' })
  reorderBoardColumns(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Body() dto: ReorderBoardColumnsDto,
    @Req() request: Request
  ) {
    return this.agileService.reorderBoardColumns(user, boardId, dto, this.getRequestMeta(request));
  }

  @Patch('boards/:boardId/columns/:columnId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a board column' })
  updateBoardColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateBoardColumnDto,
    @Req() request: Request
  ) {
    return this.agileService.updateBoardColumn(
      user,
      boardId,
      columnId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('boards/:boardId/columns/:columnId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an empty board column' })
  deleteBoardColumn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Req() request: Request
  ) {
    return this.agileService.deleteBoardColumn(
      user,
      boardId,
      columnId,
      this.getRequestMeta(request)
    );
  }

  @Patch('tasks/:taskId/status')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update task status with WIP limit enforcement' })
  updateTaskStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
    @Req() request: Request
  ) {
    return this.agileService.updateTaskStatus(user, taskId, dto, this.getRequestMeta(request));
  }

  @Patch('tasks/:taskId/order')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Persist task board ordering' })
  updateTaskOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskOrderDto,
    @Req() request: Request
  ) {
    return this.agileService.updateTaskOrder(user, taskId, dto, this.getRequestMeta(request));
  }

  @Get('projects/:projectId/velocity')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project sprint velocity' })
  getProjectVelocity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string
  ) {
    return this.agileService.getProjectVelocity(user, projectId, limit ? Number(limit) : 6);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
