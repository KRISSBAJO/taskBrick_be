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
import { AiService } from './ai.service';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AiActionQueryDto } from './dto/ai-action-query.dto';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';
import { AiUsageQueryDto } from './dto/ai-usage-query.dto';
import { ChatDto } from './dto/chat.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { CreateAiActionDto } from './dto/create-ai-action.dto';
import { CreateAiConversationDto } from './dto/create-conversation.dto';
import { KnowledgeSearchDto } from './dto/knowledge-search.dto';
import { ProjectAiDto } from './dto/project-ai.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { UpdateAiConversationDto } from './dto/update-conversation.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'AI module readiness and provider configuration status' })
  status() {
    return this.aiService.status();
  }

  @Get('settings')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant AI settings' })
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.getSettings(user);
  }

  @Patch('settings')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current tenant AI controls' })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAiSettingsDto,
    @Req() request: Request
  ) {
    return this.aiService.updateSettings(user, dto, this.getRequestMeta(request));
  }

  @Get('agents')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant AI agents' })
  @ApiOkResponse({ description: 'Paginated AI agents' })
  listAgents(@CurrentUser() user: AuthenticatedUser, @Query() query: AgentQueryDto) {
    return this.aiService.listAgents(user, query);
  }

  @Post('agents')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tenant AI agent' })
  @ApiCreatedResponse({ description: 'Created AI agent' })
  createAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAgentDto,
    @Req() request: Request
  ) {
    return this.aiService.createAgent(user, dto, this.getRequestMeta(request));
  }

  @Get('agents/:agentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an AI agent' })
  getAgent(@CurrentUser() user: AuthenticatedUser, @Param('agentId') agentId: string) {
    return this.aiService.getAgent(user, agentId);
  }

  @Patch('agents/:agentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an AI agent' })
  updateAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Body() dto: UpdateAgentDto,
    @Req() request: Request
  ) {
    return this.aiService.updateAgent(user, agentId, dto, this.getRequestMeta(request));
  }

  @Post('agents/:agentId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive an AI agent' })
  archiveAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Req() request: Request
  ) {
    return this.aiService.archiveAgent(user, agentId, this.getRequestMeta(request));
  }

  @Post('agents/:agentId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived AI agent' })
  restoreAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Req() request: Request
  ) {
    return this.aiService.restoreAgent(user, agentId, this.getRequestMeta(request));
  }

  @Delete('agents/:agentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete or archive an AI agent' })
  deleteAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('agentId') agentId: string,
    @Req() request: Request
  ) {
    return this.aiService.deleteAgent(user, agentId, this.getRequestMeta(request));
  }

  @Get('conversations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List AI conversations' })
  listConversations(@CurrentUser() user: AuthenticatedUser, @Query() query: ConversationQueryDto) {
    return this.aiService.listConversations(user, query);
  }

  @Post('conversations')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an AI conversation' })
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAiConversationDto,
    @Req() request: Request
  ) {
    return this.aiService.createConversation(user, dto, this.getRequestMeta(request));
  }

  @Get('conversations/:conversationId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an AI conversation with messages' })
  getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string
  ) {
    return this.aiService.getConversation(user, conversationId);
  }

  @Patch('conversations/:conversationId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an AI conversation' })
  updateConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateAiConversationDto,
    @Req() request: Request
  ) {
    return this.aiService.updateConversation(
      user,
      conversationId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Post('conversations/:conversationId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive an AI conversation' })
  archiveConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Req() request: Request
  ) {
    return this.aiService.archiveConversation(user, conversationId, this.getRequestMeta(request));
  }

  @Post('conversations/:conversationId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an AI conversation' })
  restoreConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Req() request: Request
  ) {
    return this.aiService.restoreConversation(user, conversationId, this.getRequestMeta(request));
  }

  @Post('conversations/:conversationId/messages')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message and optionally generate an AI response' })
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @Req() request: Request
  ) {
    return this.aiService.sendMessage(user, conversationId, dto, this.getRequestMeta(request));
  }

  @Post('conversations/:conversationId/summarize')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate and store an AI conversation summary' })
  summarizeConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Req() request: Request
  ) {
    return this.aiService.summarizeConversation(user, conversationId, this.getRequestMeta(request));
  }

  @Post('chat')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or continue an AI chat' })
  chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChatDto, @Req() request: Request) {
    return this.aiService.chat(user, dto, this.getRequestMeta(request));
  }

  @Post('project-summary')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate an AI project summary from tenant-scoped data' })
  projectSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProjectAiDto,
    @Req() request: Request
  ) {
    return this.aiService.projectSummary(user, dto, this.getRequestMeta(request));
  }

  @Post('sprint-planning')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate sprint planning recommendations' })
  sprintPlanning(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProjectAiDto,
    @Req() request: Request
  ) {
    return this.aiService.sprintPlanning(user, dto, this.getRequestMeta(request));
  }

  @Post('risk-detection')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detect project risk signals from tenant-scoped data' })
  riskDetection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProjectAiDto,
    @Req() request: Request
  ) {
    return this.aiService.riskDetection(user, dto, this.getRequestMeta(request));
  }

  @Post('knowledge-search')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search tenant-scoped work knowledge for AI grounding' })
  knowledgeSearch(@CurrentUser() user: AuthenticatedUser, @Body() dto: KnowledgeSearchDto) {
    return this.aiService.knowledgeSearch(user, dto);
  }

  @Get('actions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List AI actions' })
  listActions(@CurrentUser() user: AuthenticatedUser, @Query() query: AiActionQueryDto) {
    return this.aiService.listActions(user, query);
  }

  @Post('actions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an auditable AI action' })
  createAction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAiActionDto,
    @Req() request: Request
  ) {
    return this.aiService.createAction(user, dto, this.getRequestMeta(request));
  }

  @Post('actions/:actionId/run')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run an AI action' })
  runAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionId') actionId: string,
    @Req() request: Request
  ) {
    return this.aiService.runAction(user, actionId, this.getRequestMeta(request));
  }

  @Post('actions/:actionId/cancel')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending AI action' })
  cancelAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionId') actionId: string,
    @Req() request: Request
  ) {
    return this.aiService.cancelAction(user, actionId, this.getRequestMeta(request));
  }

  @Get('usage')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant AI usage logs' })
  listUsage(@CurrentUser() user: AuthenticatedUser, @Query() query: AiUsageQueryDto) {
    return this.aiService.listUsage(user, query);
  }

  @Get('usage/summary')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:ai')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Summarize AI usage by provider, model, and status' })
  usageSummary(@CurrentUser() user: AuthenticatedUser, @Query() query: AiUsageQueryDto) {
    return this.aiService.usageSummary(user, query);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
