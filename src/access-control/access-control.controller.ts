import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { AccessControlService } from './access-control.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('access-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('manage:roles')
@Controller()
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('permissions')
  @Version('1')
  @ApiOperation({ summary: 'List permissions available in the current tenant' })
  @ApiOkResponse({ description: 'Tenant permissions' })
  listPermissions(@CurrentUser() user: AuthenticatedUser) {
    return this.accessControlService.listPermissions(user);
  }

  @Get('roles')
  @Version('1')
  @ApiOperation({ summary: 'List roles in the current tenant' })
  @ApiOkResponse({ description: 'Tenant roles with permissions' })
  listRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.accessControlService.listRoles(user);
  }

  @Post('roles')
  @Version('1')
  @ApiOperation({ summary: 'Create a custom role in the current tenant' })
  @ApiCreatedResponse({ description: 'Created role' })
  createRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
    @Req() request: Request
  ) {
    return this.accessControlService.createRole(user, dto, this.getRequestMeta(request));
  }

  @Patch('roles/:roleId')
  @Version('1')
  @ApiOperation({ summary: 'Update a custom role in the current tenant' })
  @ApiOkResponse({ description: 'Updated role' })
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: Request
  ) {
    return this.accessControlService.updateRole(
      user,
      roleId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete('roles/:roleId')
  @Version('1')
  @ApiOperation({ summary: 'Delete an unassigned custom role' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  deleteRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId') roleId: string,
    @Req() request: Request
  ) {
    return this.accessControlService.deleteRole(user, roleId, this.getRequestMeta(request));
  }

  @Post('roles/assignments')
  @Version('1')
  @ApiOperation({ summary: 'Assign a role to a tenant user' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  assignRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignRoleDto,
    @Req() request: Request
  ) {
    return this.accessControlService.assignRole(user, dto, this.getRequestMeta(request));
  }

  @Delete('roles/:roleId/users/:userId')
  @Version('1')
  @ApiOperation({ summary: 'Remove a role from a tenant user' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  removeRoleFromUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @Req() request: Request
  ) {
    return this.accessControlService.removeRoleFromUser(
      user,
      roleId,
      userId,
      this.getRequestMeta(request)
    );
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
