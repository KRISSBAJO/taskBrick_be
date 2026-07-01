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
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Teams module readiness check' })
  status() {
    return {
      module: 'teams',
      status: 'ready'
    };
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List teams in the current tenant' })
  @ApiOkResponse({ description: 'Paginated tenant teams' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TeamQueryDto
  ) {
    return this.teamsService.list(user, query);
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a team in the current tenant' })
  @ApiCreatedResponse({ description: 'Created team' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTeamDto,
    @Req() request: Request
  ) {
    return this.teamsService.create(user, dto, this.getRequestMeta(request));
  }

  @Get(':teamId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a team in the current tenant' })
  @ApiOkResponse({ description: 'Tenant team' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string
  ) {
    return this.teamsService.get(user, teamId);
  }

  @Patch(':teamId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a team in the current tenant' })
  @ApiOkResponse({ description: 'Updated team' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @Req() request: Request
  ) {
    return this.teamsService.update(user, teamId, dto, this.getRequestMeta(request));
  }

  @Delete(':teamId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete or soft-delete a team in the current tenant' })
  @ApiOkResponse({ schema: { example: { success: true, mode: 'soft_deleted' } } })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Req() request: Request
  ) {
    return this.teamsService.delete(user, teamId, this.getRequestMeta(request));
  }

  @Get(':teamId/members')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List members of a tenant team' })
  @ApiOkResponse({ description: 'Team members' })
  listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string
  ) {
    return this.teamsService.listMembers(user, teamId);
  }

  @Post(':teamId/members')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or update a team member' })
  @ApiCreatedResponse({ description: 'Team member' })
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
    @Req() request: Request
  ) {
    return this.teamsService.addMember(user, teamId, dto, this.getRequestMeta(request));
  }

  @Post(':teamId/invite')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a user and add them to a team atomically' })
  @ApiCreatedResponse({ description: 'Invited team member' })
  inviteMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Body() dto: InviteTeamMemberDto,
    @Req() request: Request
  ) {
    return this.teamsService.inviteMember(user, teamId, dto, this.getRequestMeta(request));
  }

  @Post(':teamId/members/:userId/resend-invite')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend a pending team invitation or notify an active user' })
  @ApiCreatedResponse({ schema: { example: { success: true, delivery: 'email' } } })
  resendMemberInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.teamsService.resendMemberInvite(
      user,
      teamId,
      userId,
      this.getRequestMeta(request)
    );
  }

  @Delete(':teamId/members/:userId/invite')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending team invitation' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  cancelMemberInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.teamsService.cancelMemberInvitation(
      user,
      teamId,
      userId,
      this.getRequestMeta(request)
    );
  }

  @Delete(':teamId/members/:userId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:teams')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a team member' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.teamsService.removeMember(
      user,
      teamId,
      userId,
      this.getRequestMeta(request)
    );
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
