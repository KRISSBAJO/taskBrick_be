import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards, Version } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { AuthService } from './auth.service';
import { AUTH_REFRESH_COOKIE, AUTH_TRUSTED_DEVICE_COOKIE } from './auth.constants';
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

const AUTH_CLIENT_HEADER = 'x-taskbricks-client';
const nativeClientHints = new Set(['mobile', 'native', 'desktop']);
const nativeAuthClientHeader = {
  name: 'X-TaskBricks-Client',
  required: false,
  description: 'Set to "mobile" or "native" for non-browser clients that need refresh and trusted-device tokens in JSON responses.'
} as const;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private static readonly refreshCookieMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
  private static readonly trustedDeviceCookieMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

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
  @ApiHeader(nativeAuthClientHeader)
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(@Body() dto: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.withAuthCookies(request, response, await this.authService.register(dto, this.getRequestMeta(request)));
  }

  @Post('verify-email')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify an email address with a single-use token' })
  @ApiHeader(nativeAuthClientHeader)
  @ApiOkResponse({ type: AuthResponseDto })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.withAuthCookies(request, response, await this.authService.verifyEmail(dto, this.getRequestMeta(request)));
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
  @ApiHeader(nativeAuthClientHeader)
  @ApiOkResponse({ type: AuthResponseDto })
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.withAuthCookies(request, response, await this.authService.acceptInvite(dto, this.getRequestMeta(request)));
  }

  @Post('login')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with tenant slug, email, and password' })
  @ApiHeader(nativeAuthClientHeader)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive account' })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const trustedDeviceToken = dto.trustedDeviceToken ?? this.readCookie(request, AUTH_TRUSTED_DEVICE_COOKIE);
    return this.withAuthCookies(
      request,
      response,
      await this.authService.login({ ...dto, trustedDeviceToken }, this.getRequestMeta(request))
    );
  }

  @Post('mfa/verify-login')
  @Version('1')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Complete login by verifying MFA challenge' })
  @ApiHeader(nativeAuthClientHeader)
  @ApiOkResponse({ type: AuthResponseDto })
  async verifyMfaLogin(@Body() dto: VerifyMfaLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.withAuthCookies(request, response, await this.authService.verifyMfaLogin(dto, this.getRequestMeta(request)));
  }

  @Post('sso/callback')
  @Version('1')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({ summary: 'Complete OAuth/OIDC SSO login and issue application tokens' })
  @ApiHeader(nativeAuthClientHeader)
  @ApiOkResponse({ type: AuthResponseDto })
  async ssoCallback(@Body() dto: SsoCallbackDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.withAuthCookies(request, response, await this.authService.completeSsoLogin(dto, this.getRequestMeta(request)));
  }

  @Post('refresh')
  @Version('1')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiHeader(nativeAuthClientHeader)
  @ApiBody({ type: RefreshTokenDto, required: false })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or revoked refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = dto?.refreshToken ?? this.readCookie(request, AUTH_REFRESH_COOKIE);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return this.withAuthCookies(request, response, await this.authService.refresh(refreshToken, this.getRequestMeta(request)));
  }

  @Post('logout')
  @Version('1')
  @ApiOperation({ summary: 'Revoke the current auth session' })
  @ApiHeader(nativeAuthClientHeader)
  @ApiBody({ type: RefreshTokenDto, required: false })
  @ApiOkResponse({ schema: { example: { success: true } } })
  async logout(@Body() dto: RefreshTokenDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = dto?.refreshToken ?? this.readCookie(request, AUTH_REFRESH_COOKIE);
    this.clearAuthCookies(response);
    return this.authService.logoutByRefreshToken(refreshToken, this.getRequestMeta(request));
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
    return this.authService.getMe(user.id);
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }

  private withAuthCookies<T>(request: Request, response: Response, result: T): T {
    if (!this.isAuthResponse(result)) {
      return result;
    }

    if (this.isNativeClient(request)) {
      return result;
    }

    this.setAuthCookies(response, result);
    return this.browserAuthResponse(result) as T;
  }

  private isAuthResponse(value: unknown): value is AuthResponseDto {
    return Boolean(
      value &&
      typeof value === 'object' &&
      'accessToken' in value &&
      'user' in value
    );
  }

  private setAuthCookies(response: Response, auth: AuthResponseDto) {
    const options = this.authCookieOptions();

    if (auth.refreshToken) {
      response.cookie(AUTH_REFRESH_COOKIE, auth.refreshToken, {
        ...options,
        maxAge: AuthController.refreshCookieMaxAgeMs
      });
    }

    if (auth.trustedDeviceToken) {
      response.cookie(AUTH_TRUSTED_DEVICE_COOKIE, auth.trustedDeviceToken, {
        ...options,
        maxAge: AuthController.trustedDeviceCookieMaxAgeMs
      });
    }
  }

  private clearAuthCookies(response: Response) {
    const options = this.authCookieOptions();
    response.clearCookie(AUTH_REFRESH_COOKIE, options);
    response.clearCookie(AUTH_TRUSTED_DEVICE_COOKIE, options);
  }

  private browserAuthResponse(auth: AuthResponseDto): AuthResponseDto {
    return {
      accessToken: auth.accessToken,
      user: auth.user
    };
  }

  private authCookieOptions(): CookieOptions {
    const secure =
      this.configService.get<string>('app.nodeEnv', 'development') === 'production' ||
      this.configService.get<boolean>('security.cookieSecure', false);
    const domain = this.configService.get<string>('security.cookieDomain');

    return {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      path: '/',
      ...(domain ? { domain } : {})
    };
  }

  private readCookie(request: Request, name: string) {
    const header = request.headers.cookie;
    if (!header) return undefined;

    for (const part of header.split(';')) {
      const [rawName, ...rawValue] = part.trim().split('=');
      if (rawName !== name) continue;

      const value = rawValue.join('=');
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }

    return undefined;
  }

  private isNativeClient(request: Request) {
    const headerValue = this.normalizeClientHint(request.header(AUTH_CLIENT_HEADER));
    const queryValue = this.normalizeClientHint(request.query?.client ?? request.query?.clientType ?? request.query?.platform);
    return nativeClientHints.has(headerValue) || nativeClientHints.has(queryValue);
  }

  private normalizeClientHint(value: unknown) {
    const rawValue = Array.isArray(value) ? value[0] : value;
    return `${rawValue ?? ''}`.trim().toLowerCase();
  }
}
