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
import { ApprovalDecisionDto } from './dto/approval-decision.dto';
import { ApprovalDefinitionQueryDto } from './dto/approval-definition-query.dto';
import { ApprovalQueryDto } from './dto/approval-query.dto';
import { CreateApprovalDefinitionDto } from './dto/create-approval-definition.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { ReplaceWorkflowNodesDto } from './dto/replace-workflow-nodes.dto';
import { RunWorkflowDto } from './dto/run-workflow.dto';
import { TriggerWorkflowEventDto } from './dto/trigger-workflow-event.dto';
import { UpdateApprovalDefinitionDto } from './dto/update-approval-definition.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowNodeDto } from './dto/workflow-node.dto';
import { WorkflowQueryDto } from './dto/workflow-query.dto';
import { WorkflowRunQueryDto } from './dto/workflow-run-query.dto';
import { WorkflowsService } from './workflows.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('workflows')
@Controller()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('workflows/status')
  @Version('1')
  @ApiOperation({ summary: 'Workflow automation and approvals module readiness check' })
  status() {
    return { module: 'workflows', status: 'ready' };
  }

  @Get('workflows')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List workflow definitions' })
  @ApiOkResponse({ description: 'Paginated workflows' })
  listWorkflows(@CurrentUser() user: AuthenticatedUser, @Query() query: WorkflowQueryDto) {
    return this.workflowsService.listWorkflows(user, query);
  }

  @Post('workflows')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a workflow definition' })
  @ApiCreatedResponse({ description: 'Created workflow' })
  createWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkflowDto,
    @Req() request: Request
  ) {
    return this.workflowsService.createWorkflow(user, dto, this.getRequestMeta(request));
  }

  @Post('workflow-events')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger active workflows for an entity event' })
  triggerEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TriggerWorkflowEventDto,
    @Req() request: Request
  ) {
    return this.workflowsService.triggerEvent(user, dto, this.getRequestMeta(request));
  }

  @Get('workflows/:workflowId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a workflow definition' })
  getWorkflow(@CurrentUser() user: AuthenticatedUser, @Param('workflowId') workflowId: string) {
    return this.workflowsService.getWorkflow(user, workflowId);
  }

  @Patch('workflows/:workflowId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a workflow definition' })
  updateWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Body() dto: UpdateWorkflowDto,
    @Req() request: Request
  ) {
    return this.workflowsService.updateWorkflow(user, workflowId, dto, this.getRequestMeta(request));
  }

  @Post('workflows/:workflowId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a workflow definition' })
  archiveWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.archiveWorkflow(user, workflowId, this.getRequestMeta(request));
  }

  @Post('workflows/:workflowId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived workflow definition' })
  restoreWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.restoreWorkflow(user, workflowId, this.getRequestMeta(request));
  }

  @Delete('workflows/:workflowId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete or archive a workflow definition' })
  deleteWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.deleteWorkflow(user, workflowId, this.getRequestMeta(request));
  }

  @Post('workflows/:workflowId/nodes')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a workflow node' })
  createNode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Body() dto: WorkflowNodeDto,
    @Req() request: Request
  ) {
    return this.workflowsService.createNode(user, workflowId, dto, this.getRequestMeta(request));
  }

  @Put('workflows/:workflowId/nodes')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace all workflow nodes' })
  replaceNodes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Body() dto: ReplaceWorkflowNodesDto,
    @Req() request: Request
  ) {
    return this.workflowsService.replaceNodes(user, workflowId, dto, this.getRequestMeta(request));
  }

  @Patch('workflows/:workflowId/nodes/:nodeId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a workflow node' })
  updateNode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: WorkflowNodeDto,
    @Req() request: Request
  ) {
    return this.workflowsService.updateNode(user, workflowId, nodeId, dto, this.getRequestMeta(request));
  }

  @Delete('workflows/:workflowId/nodes/:nodeId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a workflow node' })
  deleteNode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Param('nodeId') nodeId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.deleteNode(user, workflowId, nodeId, this.getRequestMeta(request));
  }

  @Post('workflows/:workflowId/run')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run a workflow manually' })
  runWorkflow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workflowId') workflowId: string,
    @Body() dto: RunWorkflowDto,
    @Req() request: Request
  ) {
    return this.workflowsService.runWorkflow(user, workflowId, dto, this.getRequestMeta(request));
  }

  @Get('workflow-runs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List workflow runs' })
  listRuns(@CurrentUser() user: AuthenticatedUser, @Query() query: WorkflowRunQueryDto) {
    return this.workflowsService.listRuns(user, query);
  }

  @Get('workflow-runs/dead-letter')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List failed workflow runs for dead-letter operations review' })
  listDeadLetterRuns(@CurrentUser() user: AuthenticatedUser, @Query() query: WorkflowRunQueryDto) {
    return this.workflowsService.listDeadLetterRuns(user, query);
  }

  @Get('workflow-runs/:runId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a workflow run with logs' })
  getRun(@CurrentUser() user: AuthenticatedUser, @Param('runId') runId: string) {
    return this.workflowsService.getRun(user, runId);
  }

  @Get('workflow-runs/:runId/logs')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List workflow run logs for visual runtime timelines' })
  listRunLogs(@CurrentUser() user: AuthenticatedUser, @Param('runId') runId: string) {
    return this.workflowsService.listRunLogs(user, runId);
  }

  @Post('workflow-runs/:runId/retry')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry a workflow run' })
  retryRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.retryRun(user, runId, this.getRequestMeta(request));
  }

  @Post('workflow-runs/:runId/requeue')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Requeue a failed or cancelled workflow run' })
  requeueRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.requeueRun(user, runId, this.getRequestMeta(request));
  }

  @Post('workflow-runs/:runId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending or running workflow run' })
  cancelRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('runId') runId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.cancelRun(user, runId, this.getRequestMeta(request));
  }

  @Get('approval-definitions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List approval definitions' })
  listApprovalDefinitions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ApprovalDefinitionQueryDto
  ) {
    return this.workflowsService.listApprovalDefinitions(user, query);
  }

  @Post('approval-definitions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an approval definition' })
  createApprovalDefinition(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApprovalDefinitionDto,
    @Req() request: Request
  ) {
    return this.workflowsService.createApprovalDefinition(user, dto, this.getRequestMeta(request));
  }

  @Get('approval-definitions/:definitionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an approval definition' })
  getApprovalDefinition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('definitionId') definitionId: string
  ) {
    return this.workflowsService.getApprovalDefinition(user, definitionId);
  }

  @Patch('approval-definitions/:definitionId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an approval definition' })
  updateApprovalDefinition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('definitionId') definitionId: string,
    @Body() dto: UpdateApprovalDefinitionDto,
    @Req() request: Request
  ) {
    return this.workflowsService.updateApprovalDefinition(user, definitionId, dto, this.getRequestMeta(request));
  }

  @Post('approval-definitions/:definitionId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive an approval definition' })
  archiveApprovalDefinition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('definitionId') definitionId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.archiveApprovalDefinition(user, definitionId, this.getRequestMeta(request));
  }

  @Post('approval-definitions/:definitionId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an approval definition' })
  restoreApprovalDefinition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('definitionId') definitionId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.restoreApprovalDefinition(user, definitionId, this.getRequestMeta(request));
  }

  @Get('approvals')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List approval requests' })
  listApprovals(@CurrentUser() user: AuthenticatedUser, @Query() query: ApprovalQueryDto) {
    return this.workflowsService.listApprovals(user, query);
  }

  @Get('approvals/my-pending')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current user pending approval steps' })
  myPendingApprovals(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.workflowsService.myPendingApprovals(user, query);
  }

  @Post('approvals')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an approval request' })
  createApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApprovalDto,
    @Req() request: Request
  ) {
    return this.workflowsService.createApproval(user, dto, this.getRequestMeta(request));
  }

  @Get('approvals/:approvalId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an approval request' })
  getApproval(@CurrentUser() user: AuthenticatedUser, @Param('approvalId') approvalId: string) {
    return this.workflowsService.getApproval(user, approvalId);
  }

  @Post('approvals/:approvalId/steps/:stepId/approve')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve an approval step' })
  approveStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('approvalId') approvalId: string,
    @Param('stepId') stepId: string,
    @Body() dto: ApprovalDecisionDto,
    @Req() request: Request
  ) {
    return this.workflowsService.approveStep(user, approvalId, stepId, dto, this.getRequestMeta(request));
  }

  @Post('approvals/:approvalId/steps/:stepId/reject')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject an approval step' })
  rejectStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('approvalId') approvalId: string,
    @Param('stepId') stepId: string,
    @Body() dto: ApprovalDecisionDto,
    @Req() request: Request
  ) {
    return this.workflowsService.rejectStep(user, approvalId, stepId, dto, this.getRequestMeta(request));
  }

  @Post('approvals/:approvalId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending approval request' })
  cancelApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param('approvalId') approvalId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.cancelApproval(user, approvalId, this.getRequestMeta(request));
  }

  @Post('approvals/:approvalId/reopen')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reopen a terminal approval request' })
  reopenApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param('approvalId') approvalId: string,
    @Req() request: Request
  ) {
    return this.workflowsService.reopenApproval(user, approvalId, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
