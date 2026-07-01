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
import { QaTaskLinkType } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  AddQaTestPlanItemDto,
  CreateQaDefectDto,
  CreateQaEvidenceDto,
  CreateQaExecutionDto,
  CreateQaTestCaseDto,
  CreateQaTestPlanDto,
  CreateQaTestRunDto,
  ImportJunitResultsDto,
  LinkQaTestCaseTaskDto,
  QaListQueryDto,
  QaTestCaseQueryDto,
  QaTestRunQueryDto,
  UpdateQaProjectSettingsDto,
  UpdateQaTestCaseDto,
  UpdateQaTestExecutionDto,
  UpdateQaTestPlanDto
} from './dto/qa.dto';
import { QaService } from './qa.service';

const qaJsonResponseSchema = {
  type: 'object',
  additionalProperties: true
} as const;

function QaOkResponse() {
  return ApiOkResponse({ schema: qaJsonResponseSchema });
}

function QaCreatedResponse(description: string) {
  return ApiCreatedResponse({ description, schema: qaJsonResponseSchema });
}

@ApiTags('qa')
@Controller('qa')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'QA and test management module readiness check' })
  @QaOkResponse()
  status() {
    return this.qaService.status();
  }

  @Get('taxonomy')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get QA taxonomy values for cases, plans, runs, executions, and evidence' })
  @QaOkResponse()
  taxonomy() {
    return this.qaService.taxonomy();
  }

  @Get('projects/:projectId/summary')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get QA health summary for a project' })
  @QaOkResponse()
  getProjectSummary(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.qaService.getProjectSummary(user, projectId);
  }

  @Get('projects/:projectId/settings')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project QA gate settings' })
  @QaOkResponse()
  getProjectSettings(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.qaService.getProjectSettings(user, projectId);
  }

  @Patch('projects/:projectId/settings')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update project QA gate settings' })
  @QaOkResponse()
  updateProjectSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateQaProjectSettingsDto,
    @Req() request: Request
  ) {
    return this.qaService.updateProjectSettings(user, projectId, dto, this.getRequestMeta(request));
  }

  @Get('tasks/:taskId/summary')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked QA cases, runs, evidence, and status summary for a task' })
  @QaOkResponse()
  getTaskSummary(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return this.qaService.getTaskSummary(user, taskId);
  }

  @Get('test-cases')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List QA test cases' })
  @QaOkResponse()
  listTestCases(@CurrentUser() user: AuthenticatedUser, @Query() query: QaTestCaseQueryDto) {
    return this.qaService.listTestCases(user, query);
  }

  @Post('test-cases')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a QA test case' })
  @QaCreatedResponse('Created QA test case')
  createTestCase(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQaTestCaseDto,
    @Req() request: Request
  ) {
    return this.qaService.createTestCase(user, dto, this.getRequestMeta(request));
  }

  @Get('test-cases/:testCaseId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a QA test case' })
  @QaOkResponse()
  getTestCase(@CurrentUser() user: AuthenticatedUser, @Param('testCaseId') testCaseId: string) {
    return this.qaService.getTestCase(user, testCaseId);
  }

  @Patch('test-cases/:testCaseId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a QA test case' })
  @QaOkResponse()
  updateTestCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: UpdateQaTestCaseDto,
    @Req() request: Request
  ) {
    return this.qaService.updateTestCase(user, testCaseId, dto, this.getRequestMeta(request));
  }

  @Delete('test-cases/:testCaseId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a QA test case' })
  @QaOkResponse()
  archiveTestCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testCaseId') testCaseId: string,
    @Req() request: Request
  ) {
    return this.qaService.archiveTestCase(user, testCaseId, this.getRequestMeta(request));
  }

  @Post('test-cases/:testCaseId/task-links')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a QA test case to a task' })
  @QaCreatedResponse('Linked QA test case to task')
  linkTestCaseToTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: LinkQaTestCaseTaskDto,
    @Req() request: Request
  ) {
    return this.qaService.linkTestCaseToTask(user, testCaseId, dto, this.getRequestMeta(request));
  }

  @Delete('test-cases/:testCaseId/task-links/:taskId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink a QA test case from a task' })
  @QaOkResponse()
  unlinkTestCaseFromTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testCaseId') testCaseId: string,
    @Param('taskId') taskId: string,
    @Query('linkType') linkType: QaTaskLinkType | undefined,
    @Req() request: Request
  ) {
    return this.qaService.unlinkTestCaseFromTask(user, testCaseId, taskId, this.getRequestMeta(request), linkType);
  }

  @Get('test-plans')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List QA test plans' })
  @QaOkResponse()
  listPlans(@CurrentUser() user: AuthenticatedUser, @Query() query: QaListQueryDto) {
    return this.qaService.listPlans(user, query);
  }

  @Post('test-plans')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a QA test plan' })
  @QaCreatedResponse('Created QA test plan')
  createPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQaTestPlanDto,
    @Req() request: Request
  ) {
    return this.qaService.createPlan(user, dto, this.getRequestMeta(request));
  }

  @Get('test-plans/:planId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a QA test plan' })
  @QaOkResponse()
  getPlan(@CurrentUser() user: AuthenticatedUser, @Param('planId') planId: string) {
    return this.qaService.getPlan(user, planId);
  }

  @Patch('test-plans/:planId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a QA test plan' })
  @QaOkResponse()
  updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: UpdateQaTestPlanDto,
    @Req() request: Request
  ) {
    return this.qaService.updatePlan(user, planId, dto, this.getRequestMeta(request));
  }

  @Post('test-plans/:planId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a QA test plan' })
  @QaOkResponse()
  archivePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Req() request: Request
  ) {
    return this.qaService.archivePlan(user, planId, this.getRequestMeta(request));
  }

  @Post('test-plans/:planId/items')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a QA test case to a test plan' })
  @QaCreatedResponse('Added QA test case to test plan')
  addPlanItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: AddQaTestPlanItemDto,
    @Req() request: Request
  ) {
    return this.qaService.addPlanItem(user, planId, dto, this.getRequestMeta(request));
  }

  @Delete('test-plans/:planId/items/:testCaseId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a QA test case from a test plan' })
  @QaOkResponse()
  removePlanItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('planId') planId: string,
    @Param('testCaseId') testCaseId: string,
    @Req() request: Request
  ) {
    return this.qaService.removePlanItem(user, planId, testCaseId, this.getRequestMeta(request));
  }

  @Get('test-runs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List QA test runs' })
  @QaOkResponse()
  listRuns(@CurrentUser() user: AuthenticatedUser, @Query() query: QaTestRunQueryDto) {
    return this.qaService.listRuns(user, query);
  }

  @Post('test-runs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('execute:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create and optionally seed a QA test run' })
  @QaCreatedResponse('Created QA test run')
  createRun(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQaTestRunDto,
    @Req() request: Request
  ) {
    return this.qaService.createRun(user, dto, this.getRequestMeta(request));
  }

  @Get('test-runs/:runId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a QA test run with executions and evidence' })
  @QaOkResponse()
  getRun(@CurrentUser() user: AuthenticatedUser, @Param('runId') runId: string) {
    return this.qaService.getRun(user, runId);
  }

  @Post('test-runs/:runId/complete')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('execute:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a QA test run' })
  @QaCreatedResponse('Completed QA test run')
  completeRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Req() request: Request
  ) {
    return this.qaService.completeRun(user, runId, this.getRequestMeta(request));
  }

  @Post('test-runs/:runId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('execute:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a QA test run' })
  @QaCreatedResponse('Cancelled QA test run')
  cancelRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Req() request: Request
  ) {
    return this.qaService.cancelRun(user, runId, this.getRequestMeta(request));
  }

  @Post('test-runs/:runId/executions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('execute:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a manual QA execution inside a test run' })
  @QaCreatedResponse('Created QA execution')
  createExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Body() dto: CreateQaExecutionDto,
    @Req() request: Request
  ) {
    return this.qaService.createExecution(user, runId, dto, this.getRequestMeta(request));
  }

  @Patch('test-runs/:runId/executions/:executionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('execute:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a QA execution result' })
  @QaOkResponse()
  updateExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Param('executionId') executionId: string,
    @Body() dto: UpdateQaTestExecutionDto,
    @Req() request: Request
  ) {
    return this.qaService.updateExecution(user, runId, executionId, dto, this.getRequestMeta(request));
  }

  @Post('test-runs/:runId/executions/:executionId/evidence')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('execute:tests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach evidence to a QA execution' })
  @QaCreatedResponse('Attached QA evidence')
  addEvidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Param('executionId') executionId: string,
    @Body() dto: CreateQaEvidenceDto,
    @Req() request: Request
  ) {
    return this.qaService.addEvidence(user, runId, executionId, dto, this.getRequestMeta(request));
  }

  @Post('test-runs/:runId/executions/:executionId/create-defect')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a bug task from a failed QA execution' })
  @QaCreatedResponse('Created defect task from QA execution')
  createDefectFromExecution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Param('executionId') executionId: string,
    @Body() dto: CreateQaDefectDto,
    @Req() request: Request
  ) {
    return this.qaService.createDefectFromExecution(user, runId, executionId, dto, this.getRequestMeta(request));
  }

  @Post('imports/junit')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:test_automation')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import automated JUnit XML test results into a QA run' })
  @QaCreatedResponse('Imported JUnit results into QA run')
  importJunit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportJunitResultsDto,
    @Req() request: Request
  ) {
    return this.qaService.importJunit(user, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null
    };
  }
}
