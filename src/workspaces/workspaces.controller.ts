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
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Workspaces module readiness check' })
  status() {
    return {
      module: 'workspaces',
      status: 'ready'
    };
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:workspaces')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List workspaces in the current tenant' })
  @ApiOkResponse({ description: 'Paginated tenant workspaces' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto
  ) {
    return this.workspacesService.list(user, query);
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:workspaces')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a workspace in the current tenant' })
  @ApiCreatedResponse({ description: 'Created workspace' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
    @Req() request: Request
  ) {
    return this.workspacesService.create(user, dto, this.getRequestMeta(request));
  }

  @Get(':workspaceId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:workspaces')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a workspace in the current tenant' })
  @ApiOkResponse({ description: 'Tenant workspace' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string
  ) {
    return this.workspacesService.get(user, workspaceId);
  }

  @Patch(':workspaceId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:workspaces')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a workspace in the current tenant' })
  @ApiOkResponse({ description: 'Updated workspace' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
    @Req() request: Request
  ) {
    return this.workspacesService.update(
      user,
      workspaceId,
      dto,
      this.getRequestMeta(request)
    );
  }

  @Delete(':workspaceId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:workspaces')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an empty workspace in the current tenant' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId') workspaceId: string,
    @Req() request: Request
  ) {
    return this.workspacesService.delete(user, workspaceId, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
