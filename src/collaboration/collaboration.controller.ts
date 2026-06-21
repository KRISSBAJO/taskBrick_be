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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CollaborationService } from './collaboration.service';
import { ConversationMemberDto } from './dto/conversation-member.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@ApiTags('collaboration')
@Controller()
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get('collaboration/status')
  @Version('1')
  @ApiOperation({ summary: 'Collaboration module readiness check' })
  status() {
    return {
      module: 'collaboration',
      status: 'ready'
    };
  }

  @Get('conversations')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List conversations for the authenticated user' })
  @ApiOkResponse({ description: 'Paginated conversations' })
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ConversationQueryDto
  ) {
    return this.collaborationService.listConversations(user, query);
  }

  @Post('conversations')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a direct or group conversation' })
  @ApiCreatedResponse({ description: 'Created conversation' })
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
    @Req() request: Request
  ) {
    return this.collaborationService.createConversation(user, dto, this.getRequestMeta(request));
  }

  @Get('conversations/:conversationId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a conversation by id' })
  getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string
  ) {
    return this.collaborationService.getConversation(user, conversationId);
  }

  @Patch('conversations/:conversationId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a conversation' })
  updateConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateConversationDto,
    @Req() request: Request
  ) {
    return this.collaborationService.updateConversation(
      user,
      conversationId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('conversations/:conversationId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a conversation' })
  deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Req() request: Request
  ) {
    return this.collaborationService.deleteConversation(
      user,
      conversationId,
      this.getRequestMeta(request)
    );
  }

  @Get('conversations/:conversationId/members')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List conversation members' })
  listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string
  ) {
    return this.collaborationService.listMembers(user, conversationId);
  }

  @Post('conversations/:conversationId/members')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a member to a group conversation' })
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: ConversationMemberDto,
    @Req() request: Request
  ) {
    return this.collaborationService.addMember(
      user,
      conversationId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('conversations/:conversationId/members/:userId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a member from a group conversation' })
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.collaborationService.removeMember(
      user,
      conversationId,
      userId,
      this.getRequestMeta(request)
    );
  }

  @Get('conversations/:conversationId/messages')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List conversation messages' })
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.collaborationService.listMessages(user, conversationId, query);
  }

  @Post('conversations/:conversationId/messages')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a conversation message' })
  createMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
    @Req() request: Request
  ) {
    return this.collaborationService.createMessage(
      user,
      conversationId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Get('conversations/:conversationId/messages/pinned')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pinned conversation messages' })
  listPinnedMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string
  ) {
    return this.collaborationService.listPinnedMessages(user, conversationId);
  }

  @Patch('messages/:messageId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a message sent by the current user' })
  updateMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @Req() request: Request
  ) {
    return this.collaborationService.updateMessage(
      user,
      messageId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('messages/:messageId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a message sent by the current user' })
  deleteMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Req() request: Request
  ) {
    return this.collaborationService.deleteMessage(user, messageId, this.getRequestMeta(request));
  }

  @Post('messages/:messageId/pin')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin a message in its conversation' })
  pinMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Req() request: Request
  ) {
    return this.collaborationService.pinMessage(user, messageId, this.getRequestMeta(request));
  }

  @Post('messages/:messageId/unpin')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpin a message in its conversation' })
  unpinMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Req() request: Request
  ) {
    return this.collaborationService.unpinMessage(user, messageId, this.getRequestMeta(request));
  }

  @Post('messages/:messageId/forward')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Forward a message to one or more conversations' })
  forwardMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() dto: ForwardMessageDto,
    @Req() request: Request
  ) {
    return this.collaborationService.forwardMessage(
      user,
      messageId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Post('messages/:messageId/reactions')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a message reaction' })
  addReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Body() dto: MessageReactionDto,
    @Req() request: Request
  ) {
    return this.collaborationService.addReaction(user, messageId, dto, this.getRequestMeta(request));
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a message reaction' })
  removeReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @Req() request: Request
  ) {
    return this.collaborationService.removeReaction(
      user,
      messageId,
      emoji,
      this.getRequestMeta(request)
    );
  }

  @Get('messages/:messageId/read-receipts')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List message read receipts' })
  listReadReceipts(@CurrentUser() user: AuthenticatedUser, @Param('messageId') messageId: string) {
    return this.collaborationService.listReadReceipts(user, messageId);
  }

  @Post('messages/:messageId/read-receipts')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a message as read by the current user' })
  markMessageRead(@CurrentUser() user: AuthenticatedUser, @Param('messageId') messageId: string) {
    return this.collaborationService.markMessageRead(user, messageId);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
