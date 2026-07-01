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
import { BulkInviteUsersDto } from './dto/bulk-invite-users.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Users module readiness check' })
  status() {
    return {
      module: 'users',
      status: 'ready'
    };
  }

  @Patch('me/profile')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ description: 'Updated user profile' })
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyProfileDto,
    @Req() request: Request
  ) {
    return this.usersService.updateMyProfile(user, dto, this.getRequestMeta(request));
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users in the current tenant' })
  @ApiOkResponse({ description: 'Paginated tenant users' })
  listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto
  ) {
    return this.usersService.listUsers(user, query);
  }

  @Post('invite')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a user into the current tenant' })
  @ApiCreatedResponse({ description: 'Invited user' })
  inviteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteUserDto,
    @Req() request: Request
  ) {
    return this.usersService.inviteUser(user, dto, this.getRequestMeta(request));
  }

  @Post('bulk-invite')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk invite tenant users from a CSV or directory import' })
  @ApiCreatedResponse({ description: 'Bulk user import summary' })
  bulkInviteUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkInviteUsersDto,
    @Req() request: Request
  ) {
    return this.usersService.bulkInviteUsers(user, dto, this.getRequestMeta(request));
  }

  @Post(':userId/resend-invite')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend a pending tenant user invitation' })
  @ApiOkResponse({ description: 'Invitation delivery result' })
  resendInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.usersService.resendInvitation(user, userId, this.getRequestMeta(request));
  }

  @Post(':userId/reinvite')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a cancelled tenant user invitation' })
  @ApiOkResponse({ description: 'Invitation delivery result' })
  reinviteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.usersService.reinviteUser(user, userId, this.getRequestMeta(request));
  }

  @Delete(':userId/invite')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending tenant user invitation' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  cancelInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.usersService.cancelInvitation(user, userId, this.getRequestMeta(request));
  }

  @Get(':userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user in the current tenant' })
  @ApiOkResponse({ description: 'Tenant user' })
  getUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string
  ) {
    return this.usersService.getUser(user, userId);
  }

  @Patch(':userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user in the current tenant' })
  @ApiOkResponse({ description: 'Updated tenant user' })
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
    @Req() request: Request
  ) {
    return this.usersService.updateUser(user, userId, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      origin: request.header('origin'),
      referer: request.header('referer'),
      userAgent: request.header('user-agent')
    };
  }
}
