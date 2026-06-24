import { Body, Controller, Get, Post, Query, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AccountService } from './account.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';

@ApiTags('account')
@Controller('account')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('overview')
  @Version('1')
  @ApiOperation({ summary: 'Get account center overview for the authenticated user' })
  @ApiOkResponse({ description: 'Account overview with tenant, workspace, security, and notification counts' })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.accountService.overview(user);
  }

  @Get('workspaces')
  @Version('1')
  @ApiOperation({ summary: 'List workspaces visible in the account center' })
  @ApiOkResponse({ description: 'Paginated account workspace list' })
  workspaces(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.accountService.workspaces(user, query);
  }

  @Get('guest-workspaces')
  @Version('1')
  @ApiOperation({ summary: 'List invited project spaces for the current account' })
  @ApiOkResponse({ description: 'Paginated guest workspace/project memberships' })
  guestWorkspaces(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.accountService.guestWorkspaces(user, query);
  }

  @Get('help')
  @Version('1')
  @ApiOperation({ summary: 'Get account support categories and available support channels' })
  @ApiOkResponse({ description: 'Account help and support metadata' })
  help() {
    return this.accountService.help();
  }

  @Post('support-requests')
  @Version('1')
  @ApiOperation({ summary: 'Create an account support request and notify tenant admins' })
  @ApiCreatedResponse({ description: 'Support request received' })
  createSupportRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportRequestDto,
    @Req() request: Request
  ) {
    return this.accountService.createSupportRequest(user, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
