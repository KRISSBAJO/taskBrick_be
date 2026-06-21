import { Body, Controller, Get, Post, Req, UseGuards, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyMfaLoginDto } from '../identity-security/dto/mfa-login.dto';
import { SsoCallbackDto } from '../identity-security/dto/sso-provider.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Auth module readiness check' })
  status() {
    return {
      module: 'auth',
      status: 'ready'
    };
  }

  @Post('register')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a tenant owner and bootstrap a new tenant' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.getRequestMeta(request));
  }

  @Post('verify-email')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify an email address with a single-use token' })
  @ApiOkResponse({ type: AuthResponseDto })
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request) {
    return this.authService.verifyEmail(dto, this.getRequestMeta(request));
  }

  @Post('resend-verification')
  @Version('1')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend email verification without revealing account existence' })
  @ApiOkResponse({ description: 'Generic resend response' })
  resendVerification(@Body() dto: ResendVerificationDto, @Req() request: Request) {
    return this.authService.resendVerification(dto, this.getRequestMeta(request));
  }

  @Post('accept-invite')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Accept an invitation, set password, and activate account' })
  @ApiOkResponse({ type: AuthResponseDto })
  acceptInvite(@Body() dto: AcceptInviteDto, @Req() request: Request) {
    return this.authService.acceptInvite(dto, this.getRequestMeta(request));
  }

  @Post('login')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with tenant slug, email, and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive account' })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getRequestMeta(request));
  }

  @Post('mfa/verify-login')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Complete login by verifying MFA challenge' })
  @ApiOkResponse({ type: AuthResponseDto })
  verifyMfaLogin(@Body() dto: VerifyMfaLoginDto, @Req() request: Request) {
    return this.authService.verifyMfaLogin(dto, this.getRequestMeta(request));
  }

  @Post('sso/callback')
  @Version('1')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({ summary: 'Complete OAuth/OIDC SSO login and issue application tokens' })
  @ApiOkResponse({ type: AuthResponseDto })
  ssoCallback(@Body() dto: SsoCallbackDto, @Req() request: Request) {
    return this.authService.completeSsoLogin(dto, this.getRequestMeta(request));
  }

  @Post('refresh')
  @Version('1')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked refresh token' })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, this.getRequestMeta(request));
  }

  @Post('logout')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current auth session' })
  @ApiOkResponse({ schema: { example: { success: true } } })
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request
  ) {
    return this.authService.logout(user, this.getRequestMeta(request));
  }

  @Post('forgot-password')
  @Version('1')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset link without account enumeration' })
  @ApiOkResponse({ description: 'Generic forgot password response' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.authService.forgotPassword(dto, this.getRequestMeta(request));
  }

  @Post('reset-password')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password using a single-use reset token' })
  @ApiOkResponse({ schema: { example: { success: true, message: 'Password updated. Sign in with your new password.' } } })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request) {
    return this.authService.resetPassword(dto, this.getRequestMeta(request));
  }

  @Post('change-password')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  @ApiOkResponse({ schema: { example: { success: true, message: 'Password changed successfully.' } } })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request
  ) {
    return this.authService.changePassword(user, dto, this.getRequestMeta(request));
  }

  @Get('me')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile and permissions' })
  @ApiOkResponse({ description: 'Current authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
