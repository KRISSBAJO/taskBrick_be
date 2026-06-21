import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, SecurityEventSeverity, TenantStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { IdentitySecurityService } from '../identity-security/identity-security.service';
import { VerifyMfaLoginDto } from '../identity-security/dto/mfa-login.dto';
import { SsoCallbackDto } from '../identity-security/dto/sso-provider.dto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES, permissionKey } from './auth.constants';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

type TenantTransaction = Prisma.TransactionClient;
type LifecycleResponse = {
  success: boolean;
  message: string;
  email?: string;
  tenantSlug?: string;
  requiresEmailVerification?: boolean;
  devLink?: string;
};
type MfaRequiredResponse = {
  requiresMfa: true;
  mfaToken: string;
  methods: string[];
  expiresAt: string;
  message: string;
};
type SessionCreateOptions = {
  authMethod?: string;
  mfaVerifiedAt?: Date | null;
  trustedDeviceId?: string | null;
  trustedDeviceToken?: string;
  deviceName?: string | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly identitySecurityService: IdentitySecurityService,
    private readonly mailService: MailService
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResponseDto | LifecycleResponse> {
    const email = dto.email.toLowerCase().trim();
    const tenantSlug = dto.tenantSlug.toLowerCase().trim();
    await this.assertPasswordMeetsPolicy(dto.password);
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });

    if (existingTenant) {
      throw new ConflictException('Tenant slug is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.passwordHashRounds);
    const requireVerification = this.emailVerificationRequired;

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: tenantSlug
        }
      });

      await this.createTenantDefaults(tx, tenant.id);

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: requireVerification ? null : new Date()
        }
      });

      const ownerRole = await tx.role.findUniqueOrThrow({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: 'Owner'
          }
        }
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id
        }
      });

      return {
        tenant,
        user
      };
    });

    await this.auditService.record({
      tenantId: result.tenant.id,
      actorId: result.user.id,
      action: 'auth.register',
      entityType: 'User',
      entityId: result.user.id,
      newValue: {
        email: result.user.email,
        tenantSlug: result.tenant.slug
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    if (requireVerification) {
      const token = await this.createEmailVerificationToken(result.user.id, result.tenant.id, this.emailVerificationTtlMinutes);
      const verificationUrl = this.authUrl('/verify-email', token);
      const mail = await this.sendVerificationEmail(result.user.email, result.user.firstName, verificationUrl);
      await this.auditService.record({
        tenantId: result.tenant.id,
        actorId: result.user.id,
        action: 'auth.email_verification_requested',
        entityType: 'User',
        entityId: result.user.id,
        newValue: { mailSent: mail.sent },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      await this.recordAuthSecurityEvent({
        tenantId: result.tenant.id,
        actorId: result.user.id,
        type: 'auth.email_verification_requested',
        severity: SecurityEventSeverity.INFO,
        subjectType: 'User',
        subjectId: result.user.id,
        metadata: { email: result.user.email, mailSent: mail.sent },
        meta
      });

      return {
        success: true,
        requiresEmailVerification: true,
        email: result.user.email,
        tenantSlug: result.tenant.slug,
        message: 'Workspace created. Check your email to verify the owner account before signing in.',
        devLink: this.developmentLink(verificationUrl)
      };
    }

    return this.createAuthResponse(result.user.id, result.tenant.id, meta);
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResponseDto | MfaRequiredResponse> {
    const email = dto.email.toLowerCase().trim();
    const tenantSlug = dto.tenantSlug.toLowerCase().trim();

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!this.isTenantLoginAllowed(tenant.status)) {
      await this.identitySecurityService.recordLoginHistory({
        tenantId: tenant.id,
        tenantSlug,
        email,
        method: 'PASSWORD',
        status: 'BLOCKED',
        reason: 'tenant_inactive',
        meta
      });
      throw new UnauthorizedException('Tenant is not active');
    }

    if (!(await this.identitySecurityService.isPasswordLoginAllowed(tenant.id))) {
      await this.identitySecurityService.recordLoginHistory({
        tenantId: tenant.id,
        tenantSlug,
        email,
        method: 'PASSWORD',
        status: 'BLOCKED',
        reason: 'password_login_disabled',
        meta
      });
      throw new UnauthorizedException('Password login is disabled for this tenant');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email
        }
      }
    });

    if (!user || !user.passwordHash) {
      await this.auditService.record({
        tenantId: tenant.id,
        action: 'auth.login_failed',
        entityType: 'User',
        newValue: { email },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      await this.identitySecurityService.recordLoginHistory({
        tenantId: tenant.id,
        tenantSlug,
        email,
        method: 'PASSWORD',
        status: 'FAILED',
        reason: 'invalid_credentials',
        meta
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.identitySecurityService.recordLoginHistory({
        tenantId: tenant.id,
        userId: user.id,
        tenantSlug,
        email,
        method: 'PASSWORD',
        status: 'BLOCKED',
        reason: 'user_inactive',
        meta
      });
      throw new UnauthorizedException('User account is not active');
    }

    if (this.emailVerificationRequired && !user.emailVerifiedAt) {
      await this.recordAuthSecurityEvent({
        tenantId: tenant.id,
        actorId: user.id,
        type: 'auth.email_unverified_login_blocked',
        severity: SecurityEventSeverity.LOW,
        subjectType: 'User',
        subjectId: user.id,
        metadata: { email },
        meta
      });
      await this.identitySecurityService.recordLoginHistory({
        tenantId: tenant.id,
        userId: user.id,
        tenantSlug,
        email,
        method: 'PASSWORD',
        status: 'BLOCKED',
        reason: 'email_unverified',
        meta
      });
      throw new UnauthorizedException('Email verification is required before signing in');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.identitySecurityService.recordLoginHistory({
        tenantId: tenant.id,
        userId: user.id,
        tenantSlug,
        email,
        method: 'PASSWORD',
        status: 'BLOCKED',
        reason: 'account_locked',
        meta
      });
      throw new UnauthorizedException('User account is temporarily locked');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      await this.registerFailedLogin(user.id, tenant.id, email, meta);
      await this.identitySecurityService.recordLoginHistory({
        tenantId: tenant.id,
        userId: user.id,
        tenantSlug,
        email,
        method: 'PASSWORD',
        status: 'FAILED',
        reason: 'invalid_password',
        meta
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    const mfa = await this.identitySecurityService.preparePasswordLoginMfa(user.id, tenant.id, dto.trustedDeviceToken);
    if (mfa.requiresMfa && mfa.challenge) {
      await this.auditService.record({
        tenantId: tenant.id,
        actorId: user.id,
        action: 'auth.mfa_required',
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
      await this.identitySecurityService.recordLoginHistory({
        tenantId: tenant.id,
        userId: user.id,
        tenantSlug,
        email,
        method: 'PASSWORD',
        status: 'MFA_REQUIRED',
        reason: 'active_mfa_factor',
        meta
      });
      return mfa.challenge;
    }

    await this.auditService.record({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'auth.login_success',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.identitySecurityService.recordLoginHistory({
      tenantId: tenant.id,
      userId: user.id,
      tenantSlug,
      email,
      method: 'PASSWORD',
      status: 'SUCCESS',
      reason: mfa.trustedDeviceId ? 'trusted_device' : 'password',
      meta
    });

    return this.createAuthResponse(user.id, tenant.id, meta, {
      authMethod: 'PASSWORD',
      mfaVerifiedAt: mfa.trustedDeviceId ? new Date() : null,
      trustedDeviceId: mfa.trustedDeviceId
    });
  }

  async verifyMfaLogin(dto: VerifyMfaLoginDto, meta: RequestMeta): Promise<AuthResponseDto> {
    const result = await this.identitySecurityService.verifyLoginChallenge(dto, meta);
    return this.createAuthResponse(result.userId, result.tenantId, meta, {
      authMethod: 'PASSWORD',
      mfaVerifiedAt: result.mfaVerifiedAt,
      trustedDeviceId: result.trustedDeviceId,
      trustedDeviceToken: result.trustedDeviceToken,
      deviceName: dto.deviceName
    });
  }

  async completeSsoLogin(dto: SsoCallbackDto, meta: RequestMeta): Promise<AuthResponseDto> {
    const result = await this.identitySecurityService.completeSso(dto, meta);
    return this.createAuthResponse(result.userId, result.tenantId, meta, {
      authMethod: result.authMethod
    });
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh session is no longer active');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { status: true }
    });

    if (!tenant || !this.isTenantLoginAllowed(tenant.status)) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      });
      throw new UnauthorizedException('Tenant is not active');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, session.refreshTokenHash);

    if (!tokenMatches) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      });
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    await this.auditService.record({
      tenantId: session.tenantId,
      actorId: session.userId,
      action: 'auth.refresh',
      entityType: 'AuthSession',
      entityId: session.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return this.rotateSessionTokens(session.id, session.userId, session.tenantId, meta);
  }

  async logout(user: AuthenticatedUser, meta: RequestMeta) {
    await this.prisma.authSession.updateMany({
      where: {
        id: user.sessionId,
        userId: user.id,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'auth.logout',
      entityType: 'AuthSession',
      entityId: user.sessionId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto, meta: RequestMeta): Promise<LifecycleResponse> {
    const tenantSlug = dto.tenantSlug.toLowerCase().trim();
    const email = dto.email.toLowerCase().trim();
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });

    if (tenant) {
      const user = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        select: { id: true, tenantId: true, email: true, firstName: true, status: true, passwordHash: true }
      });

      if (user?.passwordHash && user.status !== UserStatus.DEACTIVATED) {
        const token = await this.createPasswordResetToken(user.id, user.tenantId, this.passwordResetTtlMinutes);
        const resetUrl = this.authUrl('/reset-password', token);
        const mail = await this.sendPasswordResetEmail(user.email, user.firstName, resetUrl);
        await this.auditService.record({
          tenantId: user.tenantId,
          actorId: user.id,
          action: 'auth.password_reset_requested',
          entityType: 'User',
          entityId: user.id,
          newValue: { mailSent: mail.sent },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        });
        await this.recordAuthSecurityEvent({
          tenantId: user.tenantId,
          actorId: user.id,
          type: 'auth.password_reset_requested',
          severity: SecurityEventSeverity.MEDIUM,
          subjectType: 'User',
          subjectId: user.id,
          metadata: { email: user.email, mailSent: mail.sent },
          meta
        });

        return this.genericForgotPasswordResponse(resetUrl);
      }
    }

    if (tenant) {
      await this.auditService.record({
        tenantId: tenant.id,
        action: 'auth.password_reset_requested_unknown',
        entityType: 'User',
        newValue: { email },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
    }

    return this.genericForgotPasswordResponse();
  }

  async resetPassword(dto: ResetPasswordDto, meta: RequestMeta) {
    const tokenHash = this.hashToken(dto.token);
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!token || token.usedAt || token.expiresAt <= new Date() || token.user.status === UserStatus.DEACTIVATED) {
      throw new BadRequestException('Password reset link is invalid or expired');
    }

    await this.assertPasswordMeetsPolicy(dto.password, token.tenantId);
    const passwordHash = await bcrypt.hash(dto.password, this.passwordHashRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          status: token.user.status === UserStatus.INVITED ? UserStatus.ACTIVE : token.user.status,
          emailVerifiedAt: token.user.emailVerifiedAt ?? new Date()
        }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { tenantId: token.tenantId, userId: token.userId, usedAt: null, id: { not: token.id } },
        data: { usedAt: new Date() }
      }),
      this.prisma.authSession.updateMany({
        where: { tenantId: token.tenantId, userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    await this.auditService.record({
      tenantId: token.tenantId,
      actorId: token.userId,
      action: 'auth.password_reset_completed',
      entityType: 'User',
      entityId: token.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.recordAuthSecurityEvent({
      tenantId: token.tenantId,
      actorId: token.userId,
      type: 'auth.password_reset_completed',
      severity: SecurityEventSeverity.HIGH,
      subjectType: 'User',
      subjectId: token.userId,
      metadata: { revokedSessions: true },
      meta
    });

    return { success: true, message: 'Password updated. Sign in with your new password.' };
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto, meta: RequestMeta) {
    const current = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, tenantId: true, passwordHash: true, status: true }
    });

    if (!current?.passwordHash || current.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Password cannot be changed for this account');
    }

    const passwordMatches = await bcrypt.compare(dto.currentPassword, current.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.assertPasswordMeetsPolicy(dto.newPassword, user.tenantId);
    const passwordHash = await bcrypt.hash(dto.newPassword, this.passwordHashRounds);

    const updates: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      })
    ];

    if (dto.revokeOtherSessions !== false) {
      updates.push(
        this.prisma.authSession.updateMany({
          where: {
            tenantId: user.tenantId,
            userId: user.id,
            revokedAt: null,
            id: { not: user.sessionId }
          },
          data: { revokedAt: new Date() }
        })
      );
    }

    await this.prisma.$transaction(updates);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'auth.password_changed',
      entityType: 'User',
      entityId: user.id,
      newValue: { revokedOtherSessions: dto.revokeOtherSessions !== false },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.recordAuthSecurityEvent({
      tenantId: user.tenantId,
      actorId: user.id,
      type: 'auth.password_changed',
      severity: SecurityEventSeverity.MEDIUM,
      subjectType: 'User',
      subjectId: user.id,
      metadata: { revokedOtherSessions: dto.revokeOtherSessions !== false },
      meta
    });

    return { success: true, message: 'Password changed successfully.' };
  }

  async verifyEmail(dto: VerifyEmailDto, meta: RequestMeta): Promise<AuthResponseDto> {
    const token = await this.getUsableEmailVerificationToken(dto.token);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: {
          emailVerifiedAt: token.user.emailVerifiedAt ?? new Date(),
          status: token.user.status === UserStatus.INVITED ? UserStatus.ACTIVE : token.user.status
        }
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: { tenantId: token.tenantId, userId: token.userId, usedAt: null, id: { not: token.id } },
        data: { usedAt: new Date() }
      })
    ]);

    await this.auditService.record({
      tenantId: token.tenantId,
      actorId: token.userId,
      action: 'auth.email_verified',
      entityType: 'User',
      entityId: token.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.recordAuthSecurityEvent({
      tenantId: token.tenantId,
      actorId: token.userId,
      type: 'auth.email_verified',
      severity: SecurityEventSeverity.INFO,
      subjectType: 'User',
      subjectId: token.userId,
      meta
    });

    return this.createAuthResponse(token.userId, token.tenantId, meta);
  }

  async resendVerification(dto: ResendVerificationDto, meta: RequestMeta): Promise<LifecycleResponse> {
    const tenantSlug = dto.tenantSlug.toLowerCase().trim();
    const email = dto.email.toLowerCase().trim();
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });

    if (tenant) {
      const user = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        select: { id: true, tenantId: true, email: true, firstName: true, emailVerifiedAt: true, status: true }
      });

      if (user && !user.emailVerifiedAt && user.status !== UserStatus.DEACTIVATED) {
        const token = await this.createEmailVerificationToken(user.id, user.tenantId, this.emailVerificationTtlMinutes);
        const verificationUrl = this.authUrl('/verify-email', token);
        const mail = await this.sendVerificationEmail(user.email, user.firstName, verificationUrl);
        await this.auditService.record({
          tenantId: user.tenantId,
          actorId: user.id,
          action: 'auth.email_verification_requested',
          entityType: 'User',
          entityId: user.id,
          newValue: { mailSent: mail.sent },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        });
        await this.recordAuthSecurityEvent({
          tenantId: user.tenantId,
          actorId: user.id,
          type: 'auth.email_verification_requested',
          severity: SecurityEventSeverity.INFO,
          subjectType: 'User',
          subjectId: user.id,
          metadata: { email: user.email, mailSent: mail.sent, resend: true },
          meta
        });

        return this.genericVerificationResponse(verificationUrl);
      }
    }

    return this.genericVerificationResponse();
  }

  async acceptInvite(dto: AcceptInviteDto, meta: RequestMeta): Promise<AuthResponseDto> {
    const token = await this.getUsableEmailVerificationToken(dto.token);

    if (token.user.status !== UserStatus.INVITED) {
      throw new BadRequestException('Invite link is not valid for this account');
    }

    await this.assertPasswordMeetsPolicy(dto.password, token.tenantId);
    const passwordHash = await bcrypt.hash(dto.password, this.passwordHashRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          firstName: dto.firstName?.trim() || token.user.firstName,
          lastName: dto.lastName?.trim() || token.user.lastName,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: token.user.emailVerifiedAt ?? new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: { tenantId: token.tenantId, userId: token.userId, usedAt: null, id: { not: token.id } },
        data: { usedAt: new Date() }
      })
    ]);

    await this.auditService.record({
      tenantId: token.tenantId,
      actorId: token.userId,
      action: 'auth.invite_accepted',
      entityType: 'User',
      entityId: token.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.recordAuthSecurityEvent({
      tenantId: token.tenantId,
      actorId: token.userId,
      type: 'auth.invite_accepted',
      severity: SecurityEventSeverity.INFO,
      subjectType: 'User',
      subjectId: token.userId,
      meta
    });

    return this.createAuthResponse(token.userId, token.tenantId, meta);
  }

  async sendInvitation(userId: string, invitedById: string, meta: RequestMeta): Promise<LifecycleResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: { select: { id: true, name: true, slug: true } } }
    });

    if (!user || user.status === UserStatus.DEACTIVATED) {
      throw new BadRequestException('Invited user is not available');
    }

    const token = await this.createEmailVerificationToken(user.id, user.tenantId, this.inviteTtlMinutes);
    const inviteUrl = this.authUrl('/accept-invite', token);
    const mail = await this.sendInviteEmail(user.email, user.firstName, user.tenant.name, inviteUrl);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: invitedById,
      action: 'auth.invite_email_sent',
      entityType: 'User',
      entityId: user.id,
      newValue: { mailSent: mail.sent },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.recordAuthSecurityEvent({
      tenantId: user.tenantId,
      actorId: invitedById,
      type: 'auth.invite_email_sent',
      severity: SecurityEventSeverity.INFO,
      subjectType: 'User',
      subjectId: user.id,
      metadata: { email: user.email, mailSent: mail.sent },
      meta
    });

    return {
      success: true,
      message: 'Invitation sent.',
      email: user.email,
      tenantSlug: user.tenant.slug,
      devLink: this.developmentLink(inviteUrl)
    };
  }

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const user = await this.loadAuthenticatedUser(userId);

    return {
      ...user,
      sessionId: ''
    };
  }

  private async createPasswordResetToken(userId: string, tenantId: string, ttlMinutes: number) {
    await this.prisma.passwordResetToken.updateMany({
      where: { tenantId, userId, usedAt: null },
      data: { usedAt: new Date() }
    });
    const rawToken = this.newOpaqueToken();
    await this.prisma.passwordResetToken.create({
      data: {
        tenantId,
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: this.minutesFromNow(ttlMinutes)
      }
    });
    return rawToken;
  }

  private async recordAuthSecurityEvent(input: {
    tenantId: string;
    actorId?: string | null;
    type: string;
    severity?: SecurityEventSeverity;
    subjectType?: string;
    subjectId?: string | null;
    metadata?: Prisma.InputJsonValue;
    meta: RequestMeta;
  }) {
    try {
      await this.prisma.securityEvent.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId ?? null,
          type: input.type,
          severity: input.severity ?? SecurityEventSeverity.INFO,
          source: 'auth-service',
          subjectType: input.subjectType,
          subjectId: input.subjectId ?? null,
          ipAddress: input.meta.ipAddress,
          userAgent: input.meta.userAgent,
          metadata: input.metadata ?? Prisma.JsonNull
        }
      });
    } catch (error) {
      this.logger.warn(`Unable to record auth security event ${input.type}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private async createEmailVerificationToken(userId: string, tenantId: string, ttlMinutes: number) {
    await this.prisma.emailVerificationToken.updateMany({
      where: { tenantId, userId, usedAt: null },
      data: { usedAt: new Date() }
    });
    const rawToken = this.newOpaqueToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        tenantId,
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: this.minutesFromNow(ttlMinutes)
      }
    });
    return rawToken;
  }

  private async getUsableEmailVerificationToken(rawToken: string) {
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: true }
    });

    if (!token || token.usedAt || token.expiresAt <= new Date() || token.user.status === UserStatus.DEACTIVATED) {
      throw new BadRequestException('Verification link is invalid or expired');
    }

    return token;
  }

  private newOpaqueToken() {
    return randomBytes(48).toString('base64url');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private minutesFromNow(minutes: number) {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private authUrl(path: '/verify-email' | '/reset-password' | '/accept-invite', token: string) {
    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    const url = new URL(path, `${frontendUrl.replace(/\/$/, '')}/`);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private developmentLink(url: string) {
    return this.configService.get<string>('app.nodeEnv') === 'production' ? undefined : url;
  }

  private genericForgotPasswordResponse(devUrl?: string): LifecycleResponse {
    return {
      success: true,
      message: 'If the account exists, a password reset link has been sent.',
      devLink: devUrl ? this.developmentLink(devUrl) : undefined
    };
  }

  private genericVerificationResponse(devUrl?: string): LifecycleResponse {
    return {
      success: true,
      message: 'If the account needs verification, a new verification link has been sent.',
      devLink: devUrl ? this.developmentLink(devUrl) : undefined
    };
  }

  private async sendVerificationEmail(email: string, firstName: string, verificationUrl: string) {
    return this.mailService.send({
      to: email,
      subject: 'Verify your TaskBricks account',
      text: `Hi ${firstName}, verify your TaskBricks account: ${verificationUrl}`,
      html: this.authEmailTemplate({
        title: 'Verify your email',
        intro: `Hi ${this.escapeHtml(firstName)}, confirm this email address to activate your TaskBricks account.`,
        ctaLabel: 'Verify email',
        url: verificationUrl
      })
    });
  }

  private async sendPasswordResetEmail(email: string, firstName: string, resetUrl: string) {
    return this.mailService.send({
      to: email,
      subject: 'Reset your TaskBricks password',
      text: `Hi ${firstName}, reset your TaskBricks password: ${resetUrl}`,
      html: this.authEmailTemplate({
        title: 'Reset your password',
        intro: `Hi ${this.escapeHtml(firstName)}, use this secure link to reset your password. If you did not request this, you can ignore this email.`,
        ctaLabel: 'Reset password',
        url: resetUrl
      })
    });
  }

  private async sendInviteEmail(email: string, firstName: string, tenantName: string, inviteUrl: string) {
    return this.mailService.send({
      to: email,
      subject: `You are invited to ${tenantName} on TaskBricks`,
      text: `Hi ${firstName}, accept your TaskBricks invitation to ${tenantName}: ${inviteUrl}`,
      html: this.authEmailTemplate({
        title: 'Accept your invitation',
        intro: `Hi ${this.escapeHtml(firstName)}, you have been invited to join ${this.escapeHtml(tenantName)} on TaskBricks.`,
        ctaLabel: 'Accept invite',
        url: inviteUrl
      })
    });
  }

  private authEmailTemplate(input: { title: string; intro: string; ctaLabel: string; url: string }) {
    return `
      <div style="font-family:Inter,Arial,sans-serif;background:#fffdf3;padding:32px;color:#111111">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8e0c8;border-radius:18px;overflow:hidden">
          <div style="background:#111111;color:#ffffff;padding:28px">
            <div style="display:inline-block;background:#ffd400;color:#111111;border-radius:10px;padding:8px 10px;font-weight:900">TaskBricks</div>
            <h1 style="margin:22px 0 0;font-size:28px;line-height:1.1">${this.escapeHtml(input.title)}</h1>
          </div>
          <div style="padding:28px">
            <p style="font-size:15px;line-height:1.6;color:#4b473f">${input.intro}</p>
            <a href="${input.url}" style="display:inline-block;margin-top:18px;background:#ffd400;color:#111111;text-decoration:none;font-weight:900;border-radius:12px;padding:14px 18px">${this.escapeHtml(input.ctaLabel)}</a>
            <p style="margin-top:22px;font-size:12px;line-height:1.6;color:#68645b">If the button does not work, copy and paste this URL into your browser:</p>
            <p style="word-break:break-all;font-size:12px;color:#111111">${input.url}</p>
          </div>
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private async createAuthResponse(
    userId: string,
    tenantId: string,
    meta: RequestMeta,
    options: SessionCreateOptions = {}
  ): Promise<AuthResponseDto> {
    const session = await this.prisma.authSession.create({
      data: {
        tenantId,
        userId,
        refreshTokenHash: `pending-${randomUUID()}`,
        expiresAt: await this.refreshExpiresAt(tenantId),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    });

    if (options.authMethod || options.mfaVerifiedAt || options.trustedDeviceId || options.deviceName) {
      await this.updateSessionIdentityMetadata(session.id, options, meta);
    }

    return this.rotateSessionTokens(session.id, userId, tenantId, meta, options);
  }

  private async rotateSessionTokens(
    sessionId: string,
    userId: string,
    tenantId: string,
    meta: RequestMeta,
    options: SessionCreateOptions = {}
  ): Promise<AuthResponseDto> {
    const user = await this.loadAuthenticatedUser(userId);
    const accessToken = await this.signToken({
      sub: userId,
      tenantId,
      email: user.email,
      sessionId,
      type: 'access'
    });
    const refreshToken = await this.signToken(
      {
        sub: userId,
        tenantId,
        email: user.email,
        sessionId,
        type: 'refresh'
      },
      true
    );

    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: await bcrypt.hash(refreshToken, this.passwordHashRounds),
        expiresAt: await this.refreshExpiresAt(tenantId),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    });
    await this.enforceMaxSessions(tenantId, userId, sessionId);

    return {
      accessToken,
      refreshToken,
      user,
      trustedDeviceToken: options.trustedDeviceToken
    };
  }

  private async updateSessionIdentityMetadata(sessionId: string, options: SessionCreateOptions, meta: RequestMeta) {
    try {
      await this.prisma.$executeRaw`
        UPDATE "AuthSession"
        SET "authMethod" = ${options.authMethod ?? 'PASSWORD'}::"AuthLoginMethod",
            "mfaVerifiedAt" = ${options.mfaVerifiedAt ?? null},
            "trustedDeviceId" = ${options.trustedDeviceId ?? null},
            "deviceFingerprint" = ${this.deviceFingerprint(meta)},
            "deviceName" = ${options.deviceName ?? null},
            "updatedAt" = NOW()
        WHERE "id" = ${sessionId}
      `;
    } catch (error) {
      this.logger.warn(`Unable to update session identity metadata: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private deviceFingerprint(meta: RequestMeta) {
    return createHash('sha256').update(`${meta.ipAddress ?? ''}|${meta.userAgent ?? ''}`).digest('hex');
  }

  private async loadAuthenticatedUser(userId: string) {
    const [user, platformAdmin] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      this.loadPlatformAdminProfile(userId)
    ]);

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      locale: user.locale,
      status: user.status,
      roles: user.roles.map((userRole) => userRole.role.name),
      permissions: [
        ...new Set(
          user.roles.flatMap((userRole) =>
            userRole.role.permissions.map(
              (rolePermission) =>
                `${rolePermission.permission.action}:${rolePermission.permission.subject}`
            )
          )
        )
      ],
      isPlatformAdmin: Boolean(platformAdmin),
      platformAdminLevel: platformAdmin?.level ?? null,
      platformAdminScopes: platformAdmin?.scopes ?? []
    };
  }

  private async loadPlatformAdminProfile(userId: string) {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ level: string; scopes: string[] }>>`
        SELECT "level"::text as "level", "scopes"
        FROM "PlatformAdmin"
        WHERE "userId" = ${userId}
          AND "status" = 'ACTIVE'
          AND "revokedAt" IS NULL
        LIMIT 1
      `;
      return rows[0] ?? null;
    } catch (error) {
      this.logger.debug(`Platform admin profile unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
      return null;
    }
  }

  private isTenantLoginAllowed(status: TenantStatus) {
    return status === TenantStatus.ACTIVE || status === TenantStatus.TRIAL;
  }

  private async registerFailedLogin(
    userId: string,
    tenantId: string,
    email: string,
    meta: RequestMeta
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        failedLoginAttempts: true
      }
    });

    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const shouldLock = failedLoginAttempts >= this.maxLoginAttempts;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts,
        lockedUntil: shouldLock ? this.accountLockUntil() : null
      }
    });

    await this.auditService.record({
      tenantId,
      actorId: userId,
      action: shouldLock ? 'auth.account_locked' : 'auth.login_failed',
      entityType: 'User',
      entityId: userId,
      newValue: { email, failedLoginAttempts },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.recordAuthSecurityEvent({
      tenantId,
      actorId: userId,
      type: shouldLock ? 'auth.account_locked' : 'auth.login_failed',
      severity: shouldLock ? SecurityEventSeverity.HIGH : SecurityEventSeverity.LOW,
      subjectType: 'User',
      subjectId: userId,
      metadata: { email, failedLoginAttempts },
      meta
    });
  }

  private async createTenantDefaults(tx: TenantTransaction, tenantId: string) {
    const permissions = new Map<string, string>();

    for (const permission of DEFAULT_PERMISSIONS) {
      const saved = await tx.permission.create({
        data: {
          tenantId,
          action: permission.action,
          subject: permission.subject,
          description: permission.description
        }
      });

      permissions.set(permissionKey(permission), saved.id);
    }

    for (const role of DEFAULT_ROLES) {
      const savedRole = await tx.role.create({
        data: {
          tenantId,
          name: role.name,
          description: role.description,
          isSystem: true
        }
      });

      for (const rolePermission of role.permissions) {
        const permissionId = permissions.get(rolePermission);

        if (permissionId) {
          await tx.rolePermission.create({
            data: {
              roleId: savedRole.id,
              permissionId
            }
          });
        }
      }
    }

    await tx.securityPolicy.create({
      data: {
        tenantId,
        auditRetentionDays: this.configService.get<number>('compliance.auditRetentionDays', 2555),
        ipAllowlist: this.configService.get<string[]>('compliance.ipAllowlist', [])
      }
    });
  }

  private async signToken(payload: JwtPayload, refresh = false) {
    return this.jwtService.signAsync(payload, {
      secret: this.requiredConfig(refresh ? 'jwt.refreshSecret' : 'jwt.accessSecret'),
      expiresIn: this.requiredConfig(
        refresh ? 'jwt.refreshExpiresIn' : 'jwt.accessExpiresIn'
      ) as any
    });
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.requiredConfig('jwt.refreshSecret')
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private requiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }

    return value;
  }

  private async refreshExpiresAt(tenantId: string) {
    const policy = await this.prisma.securityPolicy.findUnique({
      where: { tenantId },
      select: { sessionTtlMinutes: true }
    });
    const minutes = policy?.sessionTtlMinutes ?? 7 * 24 * 60;
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private async enforceMaxSessions(tenantId: string, userId: string, currentSessionId: string) {
    const policy = await this.prisma.securityPolicy.findUnique({
      where: { tenantId },
      select: { maxSessionsPerUser: true }
    });
    if (!policy?.maxSessionsPerUser) return;
    const overflow = await this.prisma.authSession.findMany({
      where: {
        tenantId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        id: { not: currentSessionId }
      },
      select: { id: true },
      orderBy: [{ createdAt: 'desc' }],
      skip: Math.max(policy.maxSessionsPerUser - 1, 0)
    });
    if (overflow.length === 0) return;
    await this.prisma.authSession.updateMany({
      where: { id: { in: overflow.map((session) => session.id) } },
      data: { revokedAt: new Date() }
    });
  }

  private async assertPasswordMeetsPolicy(password: string, tenantId?: string) {
    const policy = tenantId
      ? await this.prisma.securityPolicy.findUnique({
          where: { tenantId },
          select: {
            passwordMinLength: true,
            passwordRequireUpper: true,
            passwordRequireLower: true,
            passwordRequireNumber: true,
            passwordRequireSymbol: true
          }
        })
      : null;

    const minLength = policy?.passwordMinLength ?? 12;
    const requireUpper = policy?.passwordRequireUpper ?? true;
    const requireLower = policy?.passwordRequireLower ?? true;
    const requireNumber = policy?.passwordRequireNumber ?? true;
    const requireSymbol = policy?.passwordRequireSymbol ?? true;

    if (password.length < minLength) {
      throw new BadRequestException('Password does not meet the minimum length policy');
    }
    if (
      (requireUpper && !/[A-Z]/.test(password)) ||
      (requireLower && !/[a-z]/.test(password)) ||
      (requireNumber && !/[0-9]/.test(password)) ||
      (requireSymbol && !/[^A-Za-z0-9]/.test(password))
    ) {
      throw new BadRequestException('Password must include uppercase, lowercase, number, and symbol characters');
    }
  }

  private accountLockUntil() {
    const minutes = this.configService.get<number>('security.accountLockMinutes', 15);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private get passwordHashRounds() {
    return this.configService.get<number>('security.passwordHashRounds', 12);
  }

  private get maxLoginAttempts() {
    return this.configService.get<number>('security.maxLoginAttempts', 5);
  }

  private get emailVerificationRequired() {
    return this.configService.get<boolean>('security.emailVerificationRequired', true);
  }

  private get emailVerificationTtlMinutes() {
    return this.configService.get<number>('security.emailVerificationTtlMinutes', 1440);
  }

  private get passwordResetTtlMinutes() {
    return this.configService.get<number>('security.passwordResetTtlMinutes', 30);
  }

  private get inviteTtlMinutes() {
    return this.configService.get<number>('security.inviteTtlMinutes', 10080);
  }
}
