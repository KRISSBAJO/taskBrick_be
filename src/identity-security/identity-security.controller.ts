import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DisableMfaDto, EnableTotpDto, RegenerateBackupCodesDto, SetupTotpDto } from './dto/mfa-management.dto';
import { SsoDiscoveryQueryDto, SsoStartQueryDto, UpdateTenantLoginPolicyDto, UpsertSsoProviderDto } from './dto/sso-provider.dto';
import { IdentitySecurityService } from './identity-security.service';

@ApiTags('identity-security')
@Controller('identity-security')
export class IdentitySecurityController {
  constructor(private readonly identitySecurityService: IdentitySecurityService) {}

  @Get('overview')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get MFA, trusted devices, and login history for the authenticated user' })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.identitySecurityService.overview(user);
  }

  @Post('mfa/totp/setup')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start TOTP MFA setup and return an otpauth URI' })
  setupTotp(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetupTotpDto, @Req() request: Request) {
    return this.identitySecurityService.setupTotp(user, dto, this.getRequestMeta(request));
  }

  @Post('mfa/totp/enable')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify TOTP setup and enable MFA' })
  enableTotp(@CurrentUser() user: AuthenticatedUser, @Body() dto: EnableTotpDto, @Req() request: Request) {
    return this.identitySecurityService.enableTotp(user, dto, this.getRequestMeta(request));
  }

  @Post('mfa/disable')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA for the authenticated user' })
  disableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: DisableMfaDto, @Req() request: Request) {
    return this.identitySecurityService.disableMfa(user, dto, this.getRequestMeta(request));
  }

  @Post('mfa/backup-codes/regenerate')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate one-time MFA backup codes' })
  regenerateBackupCodes(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegenerateBackupCodesDto, @Req() request: Request) {
    return this.identitySecurityService.regenerateBackupCodes(user, dto, this.getRequestMeta(request));
  }

  @Delete('trusted-devices/:deviceId')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one trusted device' })
  revokeTrustedDevice(@CurrentUser() user: AuthenticatedUser, @Param('deviceId') deviceId: string, @Req() request: Request) {
    return this.identitySecurityService.revokeTrustedDevice(user, deviceId, this.getRequestMeta(request));
  }

  @Get('sso-providers')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tenant SSO providers' })
  listSsoProviders(@CurrentUser() user: AuthenticatedUser) {
    return this.identitySecurityService.listSsoProviders(user);
  }

  @Post('sso-providers')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update a tenant SSO provider' })
  upsertSsoProvider(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertSsoProviderDto, @Req() request: Request) {
    return this.identitySecurityService.upsertSsoProvider(user, dto, this.getRequestMeta(request));
  }

  @Patch('login-policy')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:security')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant login methods, SSO requirement, and MFA requirement' })
  updateLoginPolicy(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateTenantLoginPolicyDto, @Req() request: Request) {
    return this.identitySecurityService.updateTenantLoginPolicy(user, dto, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}

@ApiTags('auth-sso')
@Controller('auth/sso')
export class AuthSsoController {
  constructor(private readonly identitySecurityService: IdentitySecurityService) {}

  @Get('discovery')
  @Version('1')
  @ApiOperation({ summary: 'Discover tenant login methods by email domain or tenant slug' })
  discovery(@Query() query: SsoDiscoveryQueryDto) {
    return this.identitySecurityService.discoverLogin(query.email, query.tenantSlug);
  }

  @Get('start')
  @Version('1')
  @ApiOperation({ summary: 'Create an OAuth/OIDC authorization URL for a tenant SSO provider' })
  start(@Query() query: SsoStartQueryDto, @Req() request: Request) {
    return this.identitySecurityService.startSso(query, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
