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
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';
import { CreateProjectChangeRequestDto } from './dto/create-project-change-request.dto';
import { CreateProjectDecisionDto } from './dto/create-project-decision.dto';
import { CreateProjectDependencyDto } from './dto/create-project-dependency.dto';
import { CreateProjectRiskDto } from './dto/create-project-risk.dto';
import { CreateProjectStakeholderDto } from './dto/create-project-stakeholder.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdateProjectBudgetDto } from './dto/update-project-budget.dto';
import { UpdateProjectChangeRequestDto } from './dto/update-project-change-request.dto';
import { UpdateProjectDecisionDto } from './dto/update-project-decision.dto';
import { UpdateProjectDependencyDto } from './dto/update-project-dependency.dto';
import { UpdateProjectRiskDto } from './dto/update-project-risk.dto';
import { UpdateProjectStakeholderDto } from './dto/update-project-stakeholder.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Projects module readiness check' })
  status() {
    return {
      module: 'projects',
      status: 'ready'
    };
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List projects in the current tenant' })
  @ApiOkResponse({ description: 'Paginated tenant projects' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ProjectQueryDto) {
    return this.projectsService.list(user, query);
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a project in the current tenant' })
  @ApiCreatedResponse({ description: 'Created project' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto, @Req() request: Request) {
    return this.projectsService.create(user, dto, this.getRequestMeta(request));
  }

  @Get(':projectId/permissions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user project permission matrix' })
  @ApiOkResponse({ description: 'Project action permissions and access source' })
  getPermissions(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.getPermissions(user, projectId);
  }

  @Get(':projectId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a project in the current tenant' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.get(user, projectId);
  }

  @Patch(':projectId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a project in the current tenant' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @Req() request: Request
  ) {
    return this.projectsService.update(user, projectId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an empty project in the current tenant' })
  delete(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Req() request: Request) {
    return this.projectsService.delete(user, projectId, this.getRequestMeta(request));
  }

  @Get(':projectId/members')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  listMembers(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.listMembers(user, projectId);
  }

  @Post(':projectId/members')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
    @Req() request: Request
  ) {
    return this.projectsService.addMember(user, projectId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId/members/:userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.projectsService.removeMember(user, projectId, userId, this.getRequestMeta(request));
  }

  @Get(':projectId/milestones')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  listMilestones(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.listMilestones(user, projectId);
  }

  @Post(':projectId/milestones')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  createMilestone(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: CreateMilestoneDto, @Req() request: Request) {
    return this.projectsService.createMilestone(user, projectId, dto, this.getRequestMeta(request));
  }

  @Patch(':projectId/milestones/:milestoneId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  updateMilestone(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('milestoneId') milestoneId: string, @Body() dto: UpdateMilestoneDto, @Req() request: Request) {
    return this.projectsService.updateMilestone(user, projectId, milestoneId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId/milestones/:milestoneId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  deleteMilestone(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('milestoneId') milestoneId: string, @Req() request: Request) {
    return this.projectsService.deleteMilestone(user, projectId, milestoneId, this.getRequestMeta(request));
  }

  @Get(':projectId/risks')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  listRisks(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.listRisks(user, projectId);
  }

  @Post(':projectId/risks')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  createRisk(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: CreateProjectRiskDto, @Req() request: Request) {
    return this.projectsService.createRisk(user, projectId, dto, this.getRequestMeta(request));
  }

  @Patch(':projectId/risks/:riskId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  updateRisk(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('riskId') riskId: string, @Body() dto: UpdateProjectRiskDto, @Req() request: Request) {
    return this.projectsService.updateRisk(user, projectId, riskId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId/risks/:riskId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  deleteRisk(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('riskId') riskId: string, @Req() request: Request) {
    return this.projectsService.deleteRisk(user, projectId, riskId, this.getRequestMeta(request));
  }

  @Get(':projectId/budgets')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  listBudgets(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.listBudgets(user, projectId);
  }

  @Post(':projectId/budgets')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  createBudget(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: CreateProjectBudgetDto, @Req() request: Request) {
    return this.projectsService.createBudget(user, projectId, dto, this.getRequestMeta(request));
  }

  @Patch(':projectId/budgets/:budgetId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  updateBudget(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('budgetId') budgetId: string, @Body() dto: UpdateProjectBudgetDto, @Req() request: Request) {
    return this.projectsService.updateBudget(user, projectId, budgetId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId/budgets/:budgetId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  deleteBudget(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('budgetId') budgetId: string, @Req() request: Request) {
    return this.projectsService.deleteBudget(user, projectId, budgetId, this.getRequestMeta(request));
  }

  @Get(':projectId/stakeholders')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  listStakeholders(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.listStakeholders(user, projectId);
  }

  @Post(':projectId/stakeholders')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  createStakeholder(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: CreateProjectStakeholderDto, @Req() request: Request) {
    return this.projectsService.createStakeholder(user, projectId, dto, this.getRequestMeta(request));
  }

  @Patch(':projectId/stakeholders/:stakeholderId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  updateStakeholder(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('stakeholderId') stakeholderId: string, @Body() dto: UpdateProjectStakeholderDto, @Req() request: Request) {
    return this.projectsService.updateStakeholder(user, projectId, stakeholderId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId/stakeholders/:stakeholderId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  deleteStakeholder(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('stakeholderId') stakeholderId: string, @Req() request: Request) {
    return this.projectsService.deleteStakeholder(user, projectId, stakeholderId, this.getRequestMeta(request));
  }

  @Get(':projectId/dependencies')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  listDependencies(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.listDependencies(user, projectId);
  }

  @Post(':projectId/dependencies')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  createDependency(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: CreateProjectDependencyDto, @Req() request: Request) {
    return this.projectsService.createDependency(user, projectId, dto, this.getRequestMeta(request));
  }

  @Patch(':projectId/dependencies/:dependencyId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  updateDependency(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('dependencyId') dependencyId: string, @Body() dto: UpdateProjectDependencyDto, @Req() request: Request) {
    return this.projectsService.updateDependency(user, projectId, dependencyId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId/dependencies/:dependencyId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  deleteDependency(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('dependencyId') dependencyId: string, @Req() request: Request) {
    return this.projectsService.deleteDependency(user, projectId, dependencyId, this.getRequestMeta(request));
  }

  @Get(':projectId/decisions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  listDecisions(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.listDecisions(user, projectId);
  }

  @Post(':projectId/decisions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  createDecision(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: CreateProjectDecisionDto, @Req() request: Request) {
    return this.projectsService.createDecision(user, projectId, dto, this.getRequestMeta(request));
  }

  @Patch(':projectId/decisions/:decisionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  updateDecision(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('decisionId') decisionId: string, @Body() dto: UpdateProjectDecisionDto, @Req() request: Request) {
    return this.projectsService.updateDecision(user, projectId, decisionId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId/decisions/:decisionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  deleteDecision(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('decisionId') decisionId: string, @Req() request: Request) {
    return this.projectsService.deleteDecision(user, projectId, decisionId, this.getRequestMeta(request));
  }

  @Get(':projectId/change-requests')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  listChangeRequests(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.projectsService.listChangeRequests(user, projectId);
  }

  @Post(':projectId/change-requests')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  createChangeRequest(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() dto: CreateProjectChangeRequestDto, @Req() request: Request) {
    return this.projectsService.createChangeRequest(user, projectId, dto, this.getRequestMeta(request));
  }

  @Patch(':projectId/change-requests/:changeRequestId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  updateChangeRequest(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('changeRequestId') changeRequestId: string, @Body() dto: UpdateProjectChangeRequestDto, @Req() request: Request) {
    return this.projectsService.updateChangeRequest(user, projectId, changeRequestId, dto, this.getRequestMeta(request));
  }

  @Delete(':projectId/change-requests/:changeRequestId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  deleteChangeRequest(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Param('changeRequestId') changeRequestId: string, @Req() request: Request) {
    return this.projectsService.deleteChangeRequest(user, projectId, changeRequestId, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
