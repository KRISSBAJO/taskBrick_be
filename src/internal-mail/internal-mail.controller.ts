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
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateInternalMailDto } from './dto/create-internal-mail.dto';
import { InternalMailMailboxQueryDto } from './dto/internal-mail-mailbox-query.dto';
import { InternalMailQueryDto } from './dto/internal-mail-query.dto';
import {
  CreateInternalMailboxAliasDto,
  CreateInternalMailboxDto,
  RegenerateInternalMailboxAddressDto,
  UpdateInternalMailboxDto,
  UpsertInternalMailboxMemberDto,
} from './dto/manage-internal-mailbox.dto';
import { ReplyInternalMailDto } from './dto/reply-internal-mail.dto';
import {
  InternalMailBooleanStateDto,
  MoveInternalMailDto,
  SnoozeInternalMailDto,
} from './dto/update-internal-mail-state.dto';
import { InternalMailService } from './internal-mail.service';

@ApiTags('internal-mail')
@Controller('internal-mail')
export class InternalMailController {
  constructor(private readonly internalMailService: InternalMailService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Internal mail module readiness check' })
  status() {
    return this.internalMailService.status();
  }

  @Get('folders')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user internal mail folder counts' })
  @ApiOkResponse({ description: 'Mailbox folder summary' })
  folders(@CurrentUser() user: AuthenticatedUser) {
    return this.internalMailService.folderSummary(user);
  }

  @Get('mailboxes')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search tenant-internal mailbox identities and aliases' })
  @ApiOkResponse({ description: 'Paginated internal mailbox identities' })
  listMailboxes(@CurrentUser() user: AuthenticatedUser, @Query() query: InternalMailMailboxQueryDto) {
    return this.internalMailService.listMailboxes(user, query);
  }

  @Post('mailboxes')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a tenant internal mailbox identity' })
  @ApiCreatedResponse({ description: 'Created internal mailbox identity' })
  createMailbox(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInternalMailboxDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.createMailbox(user, dto, this.getRequestMeta(request));
  }

  @Patch('mailboxes/:mailboxId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update, suspend, reactivate, or transfer a tenant internal mailbox' })
  @ApiOkResponse({ description: 'Updated internal mailbox identity' })
  updateMailbox(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: UpdateInternalMailboxDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.updateMailbox(user, mailboxId, dto, this.getRequestMeta(request));
  }

  @Post('mailboxes/:mailboxId/aliases')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an alias to a tenant internal mailbox' })
  @ApiCreatedResponse({ description: 'Created mailbox alias' })
  createMailboxAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: CreateInternalMailboxAliasDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.createAlias(user, mailboxId, dto, this.getRequestMeta(request));
  }

  @Post('mailboxes/:mailboxId/regenerate-address')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate a tenant internal mailbox primary address and keep the previous address as an alias' })
  @ApiOkResponse({ description: 'Regenerated mailbox identity' })
  regenerateMailboxAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: RegenerateInternalMailboxAddressDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.regenerateAddress(user, mailboxId, dto, this.getRequestMeta(request));
  }

  @Post('mailboxes/:mailboxId/members')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or update a shared mailbox member' })
  @ApiCreatedResponse({ description: 'Shared mailbox member upserted' })
  upsertMailboxMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mailboxId') mailboxId: string,
    @Body() dto: UpsertInternalMailboxMemberDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.addMailboxMember(user, mailboxId, dto, this.getRequestMeta(request));
  }

  @Delete('mailboxes/:mailboxId/members/:userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a shared mailbox member' })
  @ApiOkResponse({ description: 'Shared mailbox member removed' })
  removeMailboxMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mailboxId') mailboxId: string,
    @Param('userId') userId: string,
    @Req() request: Request,
  ) {
    return this.internalMailService.removeMailboxMember(user, mailboxId, userId, this.getRequestMeta(request));
  }

  @Get('threads')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List internal mail threads for the current user' })
  @ApiOkResponse({ description: 'Paginated internal mail threads' })
  listThreads(@CurrentUser() user: AuthenticatedUser, @Query() query: InternalMailQueryDto) {
    return this.internalMailService.listThreads(user, query);
  }

  @Post('threads')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compose and send or save an internal mail thread' })
  @ApiCreatedResponse({ description: 'Created internal mail thread' })
  createThread(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInternalMailDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.createThread(user, dto, this.getRequestMeta(request));
  }

  @Get('threads/:threadId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one internal mail thread with messages' })
  getThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Query('markRead') markRead?: string,
  ) {
    return this.internalMailService.getThread(user, threadId, markRead === 'true');
  }

  @Post('threads/:threadId/reply')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to an internal mail thread' })
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() dto: ReplyInternalMailDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.reply(user, threadId, dto, this.getRequestMeta(request));
  }

  @Post('threads/:threadId/send-draft')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send an existing internal mail draft' })
  @ApiOkResponse({ description: 'Draft sent as an internal mail thread' })
  sendDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Req() request: Request,
  ) {
    return this.internalMailService.sendDraft(user, threadId, this.getRequestMeta(request));
  }

  @Patch('threads/:threadId/read')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark internal mail thread as read' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('threadId') threadId: string) {
    return this.internalMailService.markRead(user, threadId);
  }

  @Patch('threads/:threadId/unread')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark internal mail thread as unread' })
  markUnread(@CurrentUser() user: AuthenticatedUser, @Param('threadId') threadId: string) {
    return this.internalMailService.markUnread(user, threadId);
  }

  @Patch('threads/:threadId/star')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Star or unstar an internal mail thread' })
  setStar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() dto: InternalMailBooleanStateDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.setStar(user, threadId, dto.value, this.getRequestMeta(request));
  }

  @Patch('threads/:threadId/flag')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Flag or unflag an internal mail thread' })
  setFlag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() dto: InternalMailBooleanStateDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.setFlag(user, threadId, dto.value, this.getRequestMeta(request));
  }

  @Patch('threads/:threadId/pin')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin or unpin an internal mail thread' })
  setPin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() dto: InternalMailBooleanStateDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.setPin(user, threadId, dto.value, this.getRequestMeta(request));
  }

  @Patch('threads/:threadId/snooze')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Snooze or unsnooze an internal mail thread' })
  snooze(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() dto: SnoozeInternalMailDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.snooze(user, threadId, dto, this.getRequestMeta(request));
  }

  @Patch('threads/:threadId/move')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move an internal mail thread to a folder' })
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body() dto: MoveInternalMailDto,
    @Req() request: Request,
  ) {
    return this.internalMailService.move(user, threadId, dto, this.getRequestMeta(request));
  }

  @Patch('threads/:threadId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive an internal mail thread' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Req() request: Request,
  ) {
    return this.internalMailService.archive(user, threadId, this.getRequestMeta(request));
  }

  @Patch('threads/:threadId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an internal mail thread to inbox' })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Req() request: Request,
  ) {
    return this.internalMailService.restore(user, threadId, this.getRequestMeta(request));
  }

  @Delete('threads/:threadId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move an internal mail thread to deleted items' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Req() request: Request,
  ) {
    return this.internalMailService.delete(user, threadId, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
