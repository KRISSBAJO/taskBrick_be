import { Body, Controller, Get, Patch, Req, UseGuards, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Tenants module readiness check' })
  status() {
    return {
      module: 'tenants',
      status: 'ready'
    };
  }

  @Get('current')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current tenant from the authenticated user context' })
  @ApiOkResponse({ description: 'Current tenant with summary counts' })
  current(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.getCurrentTenant(user);
  }

  @Patch('current')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current tenant settings' })
  @ApiOkResponse({ description: 'Updated current tenant' })
  updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTenantDto,
    @Req() request: Request
  ) {
    return this.tenantsService.updateCurrentTenant(user, dto, {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    });
  }
}
