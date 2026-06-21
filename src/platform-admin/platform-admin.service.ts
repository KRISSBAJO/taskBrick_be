import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiRequestStatus,
  BillingStatus,
  ComplianceJobStatus,
  ComplianceJobType,
  IntegrationProvider,
  MeetingReminderJobStatus,
  Prisma,
  ProjectStatus,
  ReportExecutionStatus,
  SecurityEventSeverity,
  SecurityEventStatus,
  SsoProviderStatus,
  TenantStatus,
  TrustedDeviceStatus,
  UserStatus,
  WorkflowRunStatus,
  WebhookDeliveryStatus
} from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateFeatureDto } from '../billing/dto/create-feature.dto';
import { CreatePlanDto } from '../billing/dto/create-plan.dto';
import { PlanFeatureDto } from '../billing/dto/plan-feature.dto';
import { ReplacePlanFeaturesDto } from '../billing/dto/replace-plan-features.dto';
import { UpdateFeatureDto } from '../billing/dto/update-feature.dto';
import { UpdatePlanDto } from '../billing/dto/update-plan.dto';
import { UpdatePlanFeatureDto } from '../billing/dto/update-plan-feature.dto';
import { RealtimeGateway } from '../collaboration/realtime.gateway';
import { IntegrationsService } from '../integrations/integrations.service';
import { MailService } from '../mail/mail.service';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { GrantPlatformAdminDto } from './dto/grant-platform-admin.dto';
import { RevokePlatformAdminDto } from './dto/revoke-platform-admin.dto';
import {
  SiteBillingActionDto,
  SiteBillingEventQueryDto,
  SiteBillingQueryDto,
  SiteChangePlanDto,
  SiteSubscriptionQueryDto,
  SiteSubscriptionUpdateDto
} from './dto/site-billing-query.dto';
import {
  SiteLoginHistoryQueryDto,
  SiteSecurityPolicyQueryDto,
  SiteSsoProviderQueryDto,
  SiteTrustedDeviceQueryDto
} from './dto/site-identity-query.dto';
import {
  SiteComplianceDecisionDto,
  SiteComplianceJobQueryDto,
  SiteAiActionQueryDto,
  SiteAiAgentQueryDto,
  SiteAiConversationQueryDto,
  SiteAiSettingsQueryDto,
  SiteAiUsageQueryDto,
  SiteIntegrationSecretRotationDto,
  SiteIntegrationQueryDto,
  SiteMessagingQueryDto,
  SiteMeetingQueryDto,
  SiteMeetingReminderQueryDto,
  SiteApprovalQueryDto,
  SitePlatformSearchQueryDto,
  SiteReportExecutionQueryDto,
  SiteReportExportQueryDto,
  SiteReportingQueryDto,
  SiteWorkflowQueryDto,
  SiteWorkflowRunQueryDto,
  SiteWebhookDeliveryQueryDto,
  SiteWebhookQueryDto
} from './dto/site-operations-query.dto';
import { SiteSessionQueryDto } from './dto/site-session-query.dto';
import { SiteUserSessionActionDto } from './dto/site-user-session-action.dto';
import {
  PlatformAdminQueryDto,
  PlatformAuditQueryDto,
  SiteSecurityEventQueryDto,
  SiteTenantResourceQueryDto,
  SiteTenantQueryDto,
  SiteUserQueryDto,
  SiteTenantUsersQueryDto
} from './dto/site-admin-query.dto';
import { UpdateSiteSecurityEventDto } from './dto/update-site-security-event.dto';
import { UpdateSiteUserStatusDto } from './dto/update-site-user-status.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

type PlatformAdminLevelValue = 'OWNER' | 'ADMIN' | 'SUPPORT' | 'AUDITOR';
type PlatformAdminStatusValue = 'ACTIVE' | 'REVOKED';

type PlatformAdminRow = {
  id: string;
  userId: string;
  level: PlatformAdminLevelValue;
  status: PlatformAdminStatusValue;
  scopes: string[];
  grantedById: string | null;
  revokedById: string | null;
  revokedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
};

type PlatformAuditRow = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  targetTenantId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  actorEmail: string | null;
  actorFirstName: string | null;
  actorLastName: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
};

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      users: true,
      workspaces: true,
      teams: true,
      projects: true,
      auditLogs: true,
      securityEvents: true
    }
  }
} satisfies Prisma.TenantSelect;

const siteUserSelect = {
  id: true,
  tenantId: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
  tenant: { select: { id: true, name: true, slug: true, status: true } },
  roles: { select: { role: { select: { id: true, name: true, description: true, isSystem: true } } } }
} satisfies Prisma.UserSelect;

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly observabilityService: ObservabilityService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly integrationsService: IntegrationsService
  ) {}

  status() {
    return {
      module: 'site-admin',
      status: 'ready',
      boundary: 'platform',
      capabilities: [
        'platform-admin-guard',
        'tenant-directory',
        'tenant-suspend-reactivate',
        'global-security-events',
        'platform-audit-log',
        'platform-admin-grants',
        'platform-integrations',
        'platform-observability',
        'platform-realtime-oversight',
        'platform-compliance-governance',
        'platform-cross-tenant-search',
        'platform-workflow-automation-runtime',
        'platform-ai-agent-operations',
        'platform-reporting-analytics',
        'platform-hardening-qa'
      ]
    };
  }

  async me(user: AuthenticatedUser) {
    const [profile] = await this.prisma.$queryRaw<PlatformAdminRow[]>`
      SELECT pa."id",
             pa."userId",
             pa."level"::text as "level",
             pa."status"::text as "status",
             pa."scopes",
             pa."grantedById",
             pa."revokedById",
             pa."revokedAt",
             pa."notes",
             pa."createdAt",
             pa."updatedAt",
             u."email",
             u."firstName",
             u."lastName",
             u."tenantId",
             t."name" as "tenantName",
             t."slug" as "tenantSlug"
      FROM "PlatformAdmin" pa
      JOIN "User" u ON u."id" = pa."userId"
      JOIN "Tenant" t ON t."id" = u."tenantId"
      WHERE pa."userId" = ${user.id}
        AND pa."status" = 'ACTIVE'
        AND pa."revokedAt" IS NULL
      LIMIT 1
    `;

    if (!profile) {
      throw new NotFoundException('Platform admin profile not found');
    }

    return {
      id: profile.id,
      userId: profile.userId,
      level: profile.level,
      status: profile.status,
      scopes: profile.scopes,
      tenantMembership: {
        tenantId: profile.tenantId,
        tenantName: profile.tenantName,
        tenantSlug: profile.tenantSlug
      },
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }

  async overview() {
    const now = new Date();
    const [
      tenantCounts,
      userCounts,
      activeSessions,
      openSecurityEvents,
      securityEvents,
      platformAdmins,
      platformAuditLogs,
      recentTenants,
      recentEvents
    ] = await Promise.all([
      this.prisma.tenant.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.authSession.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
      this.prisma.securityEvent.count({ where: { status: SecurityEventStatus.OPEN } }),
      this.prisma.securityEvent.count(),
      this.rawCount(`SELECT COUNT(*)::int as count FROM "PlatformAdmin" WHERE "status" = 'ACTIVE'`),
      this.rawCount('SELECT COUNT(*)::int as count FROM "PlatformAuditLog"'),
      this.prisma.tenant.findMany({
        select: tenantSelect,
        orderBy: { createdAt: 'desc' },
        take: 6
      }),
      this.prisma.securityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          actor: { select: { id: true, email: true, firstName: true, lastName: true } }
        }
      })
    ]);

    return {
      tenants: this.groupCounts(tenantCounts),
      users: this.groupCounts(userCounts),
      sessions: { active: activeSessions },
      securityEvents: { total: securityEvents, open: openSecurityEvents },
      platformAdmins,
      platformAuditLogs,
      recentTenants,
      recentEvents
    };
  }

  async listTenants(query: SiteTenantQueryDto) {
    const where: Prisma.TenantWhereInput = {
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        select: tenantSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.tenant.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async listUsers(query: SiteUserQueryDto) {
    const where: Prisma.UserWhereInput = {
      tenantId: query.tenantId,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: siteUserSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.user.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...siteUserSelect,
        failedLoginAttempts: true,
        avatarUrl: true,
        timezone: true,
        locale: true,
        platformAdminProfile: {
          select: {
            id: true,
            level: true,
            status: true,
            scopes: true,
            revokedAt: true,
            createdAt: true,
            updatedAt: true
          }
        },
        authSessions: {
          select: {
            id: true,
            tenantId: true,
            userId: true,
            ipAddress: true,
            userAgent: true,
            authMethod: true,
            mfaVerifiedAt: true,
            deviceName: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
            updatedAt: true,
            trustedDevice: { select: { id: true, name: true, status: true, lastUsedAt: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        mfaFactors: {
          select: {
            id: true,
            type: true,
            status: true,
            label: true,
            lastUsedAt: true,
            enabledAt: true,
            disabledAt: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        trustedDevices: {
          select: {
            id: true,
            status: true,
            name: true,
            ipAddress: true,
            userAgent: true,
            lastUsedAt: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        ssoAccounts: {
          select: {
            id: true,
            providerType: true,
            email: true,
            displayName: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            provider: { select: { id: true, name: true, type: true, status: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        teamMemberships: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            team: {
              select: {
                id: true,
                name: true,
                workspace: { select: { id: true, name: true, slug: true } },
                _count: { select: { projects: true, members: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        projectMembers: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                key: true,
                name: true,
                status: true,
                visibility: true,
                progress: true,
                workspace: { select: { id: true, name: true, slug: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        assignedTasks: {
          select: {
            id: true,
            task: {
              select: {
                id: true,
                key: true,
                title: true,
                type: true,
                status: true,
                priority: true,
                dueDate: true,
                updatedAt: true,
                project: { select: { id: true, key: true, name: true } }
              }
            }
          },
          take: 20
        },
        loginHistory: {
          select: {
            id: true,
            tenantId: true,
            tenantSlug: true,
            email: true,
            method: true,
            status: true,
            reason: true,
            ipAddress: true,
            userAgent: true,
            suspicious: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        emailVerificationTokens: {
          select: { id: true, expiresAt: true, usedAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        passwordResetTokens: {
          select: { id: true, expiresAt: true, usedAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            authSessions: true,
            mfaFactors: true,
            trustedDevices: true,
            ssoAccounts: true,
            teamMemberships: true,
            projectMembers: true,
            assignedTasks: true,
            comments: true,
            uploadedFileAssets: true,
            aiUsageLogs: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [securityEvents, tenantAuditLogs, platformAuditLogs] = await Promise.all([
      this.prisma.securityEvent.findMany({
        where: {
          OR: [{ actorId: userId }, { subjectType: 'User', subjectId: userId }]
        },
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          actor: { select: { id: true, email: true, firstName: true, lastName: true } },
          resolvedBy: { select: { id: true, email: true, firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      this.prisma.auditLog.findMany({
        where: { tenantId: user.tenantId, actorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      this.prisma.$queryRaw<PlatformAuditRow[]>(Prisma.sql`
        SELECT pal."id",
               pal."actorId",
               pal."action",
               pal."entityType",
               pal."entityId",
               pal."targetTenantId",
               pal."oldValue",
               pal."newValue",
               pal."ipAddress",
               pal."userAgent",
               pal."createdAt",
               actor."email" as "actorEmail",
               actor."firstName" as "actorFirstName",
               actor."lastName" as "actorLastName",
               tenant."name" as "tenantName",
               tenant."slug" as "tenantSlug"
        FROM "PlatformAuditLog" pal
        LEFT JOIN "User" actor ON actor."id" = pal."actorId"
        LEFT JOIN "Tenant" tenant ON tenant."id" = pal."targetTenantId"
        WHERE pal."actorId" = ${userId}
           OR (pal."entityType" = 'User' AND pal."entityId" = ${userId})
        ORDER BY pal."createdAt" DESC
        LIMIT 20
      `)
    ]);

    return {
      user,
      securityEvents,
      tenantAuditLogs,
      platformAuditLogs: platformAuditLogs.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        targetTenantId: row.targetTenantId,
        oldValue: row.oldValue,
        newValue: row.newValue,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        actor: row.actorId
          ? {
              id: row.actorId,
              email: row.actorEmail,
              firstName: row.actorFirstName,
              lastName: row.actorLastName
            }
          : null,
        targetTenant: row.targetTenantId
          ? {
              id: row.targetTenantId,
              name: row.tenantName,
              slug: row.tenantSlug
            }
          : null
      }))
    };
  }

  async updateUserStatus(
    actor: AuthenticatedUser,
    userId: string,
    dto: UpdateSiteUserStatusDto,
    meta: RequestMeta
  ) {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        tenant: { select: { id: true, name: true, slug: true, status: true } }
      }
    });

    if (!before) {
      throw new NotFoundException('User not found');
    }

    if (before.status === dto.status) {
      return this.getUser(userId);
    }

    const after = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: dto.status,
        lockedUntil: dto.status === UserStatus.SUSPENDED ? new Date('9999-12-31T00:00:00.000Z') : null,
        failedLoginAttempts: dto.status === UserStatus.ACTIVE ? 0 : undefined
      },
      select: siteUserSelect
    });

    const revokesAccess = dto.status === UserStatus.SUSPENDED || dto.status === UserStatus.DEACTIVATED;
    if (revokesAccess) {
      await Promise.all([
        this.prisma.authSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() }
        }),
        this.prisma.trustedDevice.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt: new Date() }
        })
      ]);
    }

    await Promise.all([
      this.auditService.record({
        tenantId: before.tenantId,
        actorId: actor.id,
        action: 'platform.user_status_changed',
        entityType: 'User',
        entityId: userId,
        oldValue: { status: before.status },
        newValue: { status: dto.status, reason: dto.reason ?? null, revokedAccess: revokesAccess },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId: before.tenantId,
          actorId: actor.id,
          type: 'platform.user_status_changed',
          severity: revokesAccess ? SecurityEventSeverity.HIGH : SecurityEventSeverity.MEDIUM,
          source: 'site-admin',
          subjectType: 'User',
          subjectId: userId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: {
            email: before.email,
            beforeStatus: before.status,
            afterStatus: dto.status,
            reason: dto.reason ?? null
          }
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action: 'platform.user_status_changed',
        entityType: 'User',
        entityId: userId,
        targetTenantId: before.tenantId,
        oldValue: { status: before.status },
        newValue: { status: dto.status, email: before.email, reason: dto.reason ?? null },
        meta
      })
    ]);

    return after;
  }

  async revokeUserSessions(
    actor: AuthenticatedUser,
    userId: string,
    dto: SiteUserSessionActionDto,
    meta: RequestMeta
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, email: true, firstName: true, lastName: true, status: true }
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    const result = await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await Promise.all([
      this.auditService.record({
        tenantId: target.tenantId,
        actorId: actor.id,
        action: 'platform.user_sessions_revoked',
        entityType: 'User',
        entityId: userId,
        newValue: { email: target.email, sessionsRevoked: result.count, reason: dto.reason ?? null },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId: target.tenantId,
          actorId: actor.id,
          type: 'platform.user_sessions_revoked',
          severity: SecurityEventSeverity.HIGH,
          source: 'site-admin',
          subjectType: 'User',
          subjectId: userId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: { email: target.email, sessionsRevoked: result.count, reason: dto.reason ?? null }
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action: 'platform.user_sessions_revoked',
        entityType: 'User',
        entityId: userId,
        targetTenantId: target.tenantId,
        oldValue: null,
        newValue: { email: target.email, sessionsRevoked: result.count, reason: dto.reason ?? null },
        meta
      })
    ]);

    return { success: true, sessionsRevoked: result.count };
  }

  async resendUserVerification(actor: AuthenticatedUser, userId: string, meta: RequestMeta) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerifiedAt: true,
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (target.status === UserStatus.DEACTIVATED || target.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('Reactivate the user before sending an invite or verification email');
    }

    if (target.emailVerifiedAt && target.status !== UserStatus.INVITED) {
      return { success: true, sent: false, skipped: true, message: 'User email is already verified.' };
    }

    const path = target.status === UserStatus.INVITED ? '/accept-invite' : '/verify-email';
    const token = await this.createEmailVerificationToken(target.id, target.tenantId, 1440);
    const url = this.authUrl(path, token);
    const subject =
      path === '/accept-invite'
        ? `You are invited to ${target.tenant.name} on TaskBricks`
        : 'Verify your TaskBricks account';
    const ctaLabel = path === '/accept-invite' ? 'Accept invitation' : 'Verify email';
    const mail = await this.mailService.send({
      to: target.email,
      subject,
      text: `Hi ${target.firstName}, ${ctaLabel.toLowerCase()}: ${url}`,
      html: this.authEmailTemplate({
        title: ctaLabel,
        intro:
          path === '/accept-invite'
            ? `Hi ${this.escapeHtml(target.firstName)}, accept your invitation to ${this.escapeHtml(target.tenant.name)}.`
            : `Hi ${this.escapeHtml(target.firstName)}, confirm this email address to activate your TaskBricks account.`,
        ctaLabel,
        url
      })
    });

    await Promise.all([
      this.auditService.record({
        tenantId: target.tenantId,
        actorId: actor.id,
        action: path === '/accept-invite' ? 'platform.user_invite_resent' : 'platform.user_verification_resent',
        entityType: 'User',
        entityId: userId,
        newValue: { email: target.email, mailSent: mail.sent, provider: mail.provider },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId: target.tenantId,
          actorId: actor.id,
          type: path === '/accept-invite' ? 'platform.user_invite_resent' : 'platform.user_verification_resent',
          severity: SecurityEventSeverity.MEDIUM,
          source: 'site-admin',
          subjectType: 'User',
          subjectId: userId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: { email: target.email, mailSent: mail.sent, provider: mail.provider }
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action: path === '/accept-invite' ? 'platform.user_invite_resent' : 'platform.user_verification_resent',
        entityType: 'User',
        entityId: userId,
        targetTenantId: target.tenantId,
        oldValue: null,
        newValue: { email: target.email, mailSent: mail.sent, provider: mail.provider },
        meta
      })
    ]);

    return {
      success: true,
      sent: mail.sent,
      provider: mail.provider,
      skipped: mail.skipped ?? false,
      message: mail.sent ? 'Email queued for delivery.' : 'Mail provider did not send the message.',
      devLink: this.developmentLink(url)
    };
  }

  async identitySecurityOverview() {
    const now = new Date();
    const [
      usersByStatus,
      activeMfaFactors,
      pendingMfaFactors,
      trustedDevicesByStatus,
      loginStatusCounts,
      loginMethodCounts,
      suspiciousLogins,
      activeSsoProviders,
      domainDiscoveryPolicies,
      mfaRequiredPolicies,
      ssoRequiredPolicies,
      recentSuspiciousLogins,
      riskyTenants
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.userMfaFactor.count({ where: { status: 'ACTIVE' } }),
      this.prisma.userMfaFactor.count({ where: { status: 'PENDING' } }),
      this.prisma.trustedDevice.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.loginHistory.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.loginHistory.groupBy({ by: ['method'], _count: { _all: true } }),
      this.prisma.loginHistory.count({ where: { suspicious: true, createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.ssoProvider.count({ where: { status: SsoProviderStatus.ACTIVE } }),
      this.prisma.securityPolicy.count({ where: { domainDiscoveryEnabled: true } }),
      this.prisma.securityPolicy.count({ where: { mfaRequired: true } }),
      this.prisma.securityPolicy.count({ where: { ssoRequired: true } }),
      this.prisma.loginHistory.findMany({
        where: { suspicious: true },
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 12
      }),
      this.prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          securityPolicy: {
            select: {
              mfaRequired: true,
              ssoRequired: true,
              domainDiscoveryEnabled: true,
              allowedLoginMethods: true
            }
          },
          _count: {
            select: {
              users: true,
              authSessions: true,
              trustedDevices: true,
              mfaFactors: true,
              ssoProviders: true,
              securityEvents: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 12
      })
    ]);

    return {
      users: this.groupCounts(usersByStatus),
      mfa: { activeFactors: activeMfaFactors, pendingFactors: pendingMfaFactors, requiredPolicies: mfaRequiredPolicies },
      trustedDevices: this.groupCounts(trustedDevicesByStatus),
      loginHistory: {
        byStatus: this.groupCounts(loginStatusCounts),
        byMethod: this.groupCounts(loginMethodCounts),
        suspiciousLast7Days: suspiciousLogins
      },
      sso: {
        activeProviders: activeSsoProviders,
        requiredPolicies: ssoRequiredPolicies,
        domainDiscoveryPolicies
      },
      recentSuspiciousLogins,
      riskyTenants: riskyTenants.map((tenant) => ({
        ...tenant,
        riskScore:
          (tenant.securityPolicy?.mfaRequired ? 0 : 25) +
          (tenant.securityPolicy?.ssoRequired ? 0 : 20) +
          (tenant.securityPolicy?.domainDiscoveryEnabled ? 0 : 15) +
          Math.min(40, tenant._count.securityEvents * 5)
      }))
    };
  }

  async listLoginHistory(query: SiteLoginHistoryQueryDto) {
    const where: Prisma.LoginHistoryWhereInput = {
      tenantId: query.tenantId,
      userId: query.userId,
      method: query.method,
      status: query.status,
      suspicious: query.suspicious === undefined ? undefined : query.suspicious === 'true',
      ipAddress: query.ipAddress ? { contains: query.ipAddress, mode: 'insensitive' } : undefined,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { tenantSlug: { contains: query.search, mode: 'insensitive' } },
              { reason: { contains: query.search, mode: 'insensitive' } },
              { userAgent: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.loginHistory.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.loginHistory.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listTrustedDevices(query: SiteTrustedDeviceQueryDto) {
    const where: Prisma.TrustedDeviceWhereInput = {
      tenantId: query.tenantId,
      userId: query.userId,
      status: query.status,
      ipAddress: query.ipAddress ? { contains: query.ipAddress, mode: 'insensitive' } : undefined,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { userAgent: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.trustedDevice.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          userId: true,
          status: true,
          name: true,
          ipAddress: true,
          userAgent: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          updatedAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          _count: { select: { sessions: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.trustedDevice.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async revokeTrustedDevice(
    actor: AuthenticatedUser,
    deviceId: string,
    dto: SiteBillingActionDto,
    meta: RequestMeta
  ) {
    const before = await this.prisma.trustedDevice.findUnique({
      where: { id: deviceId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });
    if (!before) throw new NotFoundException('Trusted device not found');
    if (before.status === TrustedDeviceStatus.REVOKED) return before;

    const after = await this.prisma.trustedDevice.update({
      where: { id: deviceId },
      data: { status: TrustedDeviceStatus.REVOKED, revokedAt: new Date() },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        tenant: { select: { id: true, name: true, slug: true, status: true } }
      }
    });

    await Promise.all([
      this.prisma.authSession.updateMany({
        where: { trustedDeviceId: deviceId, revokedAt: null },
        data: { revokedAt: new Date() }
      }),
      this.auditService.record({
        tenantId: before.tenantId,
        actorId: actor.id,
        action: 'platform.trusted_device_revoked',
        entityType: 'TrustedDevice',
        entityId: deviceId,
        oldValue: { status: before.status },
        newValue: { status: after.status, reason: dto.reason ?? null },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId: before.tenantId,
          actorId: actor.id,
          type: 'platform.trusted_device_revoked',
          severity: SecurityEventSeverity.HIGH,
          source: 'site-admin',
          subjectType: 'TrustedDevice',
          subjectId: deviceId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: { userId: before.userId, email: before.user.email, reason: dto.reason ?? null }
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action: 'platform.trusted_device_revoked',
        entityType: 'TrustedDevice',
        entityId: deviceId,
        targetTenantId: before.tenantId,
        oldValue: { status: before.status },
        newValue: { status: after.status, userId: before.userId, reason: dto.reason ?? null },
        meta
      })
    ]);

    return after;
  }

  async listSsoProviders(query: SiteSsoProviderQueryDto) {
    const where: Prisma.SsoProviderWhereInput = {
      tenantId: query.tenantId,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { issuerUrl: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ssoProvider.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          type: true,
          status: true,
          name: true,
          issuerUrl: true,
          authorizationUrl: true,
          tokenUrl: true,
          userInfoUrl: true,
          redirectUri: true,
          clientId: true,
          scopes: true,
          allowedDomains: true,
          buttonLabel: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          _count: { select: { accounts: true, loginStates: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.ssoProvider.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSecurityPolicies(query: SiteSecurityPolicyQueryDto) {
    const where: Prisma.SecurityPolicyWhereInput = {
      tenantId: query.tenantId,
      ...(query.search
        ? {
            tenant: {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { slug: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.securityPolicy.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.securityPolicy.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async sendAdminPasswordReset(actor: AuthenticatedUser, userId: string, meta: RequestMeta) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        status: true,
        passwordHash: true,
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.status === UserStatus.DEACTIVATED || target.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('Reactivate the user before sending a password recovery email');
    }
    if (!target.passwordHash) {
      throw new BadRequestException('This user does not have password login enabled');
    }

    const token = await this.createPasswordResetToken(target.id, target.tenantId, 60);
    const resetUrl = this.authUrl('/reset-password', token);
    const mail = await this.mailService.send({
      to: target.email,
      subject: 'Reset your TaskBricks password',
      text: `Hi ${target.firstName}, reset your TaskBricks password: ${resetUrl}`,
      html: this.authEmailTemplate({
        title: 'Reset your password',
        intro: `Hi ${this.escapeHtml(target.firstName)}, a site administrator started a secure password recovery for your TaskBricks account.`,
        ctaLabel: 'Reset password',
        url: resetUrl
      })
    });

    await Promise.all([
      this.auditService.record({
        tenantId: target.tenantId,
        actorId: actor.id,
        action: 'platform.password_reset_sent',
        entityType: 'User',
        entityId: userId,
        newValue: { email: target.email, mailSent: mail.sent, provider: mail.provider },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId: target.tenantId,
          actorId: actor.id,
          type: 'platform.password_reset_sent',
          severity: SecurityEventSeverity.HIGH,
          source: 'site-admin',
          subjectType: 'User',
          subjectId: userId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: { email: target.email, mailSent: mail.sent, provider: mail.provider }
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action: 'platform.password_reset_sent',
        entityType: 'User',
        entityId: userId,
        targetTenantId: target.tenantId,
        newValue: { email: target.email, mailSent: mail.sent, provider: mail.provider },
        meta
      })
    ]);

    return {
      success: true,
      sent: mail.sent,
      provider: mail.provider,
      skipped: mail.skipped ?? false,
      message: mail.sent ? 'Password recovery email queued.' : 'Mail provider did not send the message.',
      devLink: this.developmentLink(resetUrl)
    };
  }

  async listSessions(query: SiteSessionQueryDto) {
    const now = new Date();
    const activeFilter = query.active === undefined ? undefined : query.active === 'true';
    const where: Prisma.AuthSessionWhereInput = {
      tenantId: query.tenantId,
      userId: query.userId,
      authMethod: query.authMethod,
      ipAddress: query.ipAddress ? { contains: query.ipAddress, mode: 'insensitive' } : undefined,
      deviceName: query.device ? { contains: query.device, mode: 'insensitive' } : undefined,
      ...(activeFilter === true ? { revokedAt: null, expiresAt: { gt: now } } : {}),
      ...(activeFilter === false ? { OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }] } : {}),
      ...(query.search
        ? {
            OR: [
              { ipAddress: { contains: query.search, mode: 'insensitive' } },
              { userAgent: { contains: query.search, mode: 'insensitive' } },
              { deviceName: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const [data, total, active, revoked, byMethod] = await Promise.all([
      this.prisma.authSession.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          authMethod: true,
          mfaVerifiedAt: true,
          trustedDeviceId: true,
          deviceFingerprint: true,
          deviceName: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          updatedAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          trustedDevice: { select: { id: true, name: true, status: true, lastUsedAt: true, revokedAt: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.authSession.count({ where }),
      this.prisma.authSession.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
      this.prisma.authSession.count({ where: { revokedAt: { not: null } } }),
      this.prisma.authSession.groupBy({ by: ['authMethod'], _count: { _all: true } })
    ]);

    return {
      ...this.paginate(data, total, query),
      summary: { active, revoked, byMethod: this.groupCounts(byMethod) }
    };
  }

  async revokeSession(actor: AuthenticatedUser, sessionId: string, dto: SiteUserSessionActionDto, meta: RequestMeta) {
    const before = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });
    if (!before) throw new NotFoundException('Session not found');
    if (before.revokedAt) return before;

    const after = await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        trustedDevice: { select: { id: true, name: true, status: true } }
      }
    });

    await Promise.all([
      this.auditService.record({
        tenantId: before.tenantId,
        actorId: actor.id,
        action: 'platform.session_revoked',
        entityType: 'AuthSession',
        entityId: sessionId,
        oldValue: { revokedAt: before.revokedAt },
        newValue: { revokedAt: after.revokedAt, userId: before.userId, reason: dto.reason ?? null },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId: before.tenantId,
          actorId: actor.id,
          type: 'platform.session_revoked',
          severity: SecurityEventSeverity.HIGH,
          source: 'site-admin',
          subjectType: 'AuthSession',
          subjectId: sessionId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: { userId: before.userId, email: before.user.email, reason: dto.reason ?? null }
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action: 'platform.session_revoked',
        entityType: 'AuthSession',
        entityId: sessionId,
        targetTenantId: before.tenantId,
        oldValue: { revokedAt: before.revokedAt },
        newValue: { revokedAt: after.revokedAt, userId: before.userId, reason: dto.reason ?? null },
        meta
      })
    ]);

    return after;
  }

  async billingOverview() {
    const now = new Date();
    const [
      planCount,
      featureCount,
      subscriptionCounts,
      invoiceCounts,
      usageCount,
      billingEventCounts,
      revenue,
      recentSubscriptions,
      recentBillingEvents,
      tenantHealth
    ] = await Promise.all([
      this.prisma.plan.count({ where: { archivedAt: null } }),
      this.prisma.feature.count({ where: { isActive: true } }),
      this.prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.invoice.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.usageRecord.count({ where: { periodStart: { lte: now }, periodEnd: { gte: now } } }),
      this.prisma.billingEvent.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.invoice.aggregate({ where: { status: { in: ['paid', 'PAID'] } }, _sum: { total: true, amount: true } }),
      this.prisma.subscription.findMany({
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          plan: { select: { id: true, name: true, slug: true, price: true, currency: true, interval: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      }),
      this.prisma.billingEvent.findMany({
        include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      this.prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          billing: {
            include: {
              plan: { select: { id: true, name: true, slug: true, price: true, currency: true, interval: true } }
            }
          },
          _count: { select: { users: true, projects: true, usageRecords: true, billingEvents: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 12
      })
    ]);

    return {
      plans: planCount,
      features: featureCount,
      subscriptions: this.groupCounts(subscriptionCounts),
      invoices: this.groupCounts(invoiceCounts),
      usageRecords: usageCount,
      billingEvents: this.groupCounts(billingEventCounts),
      revenue: Number(revenue._sum.total ?? revenue._sum.amount ?? 0),
      recentSubscriptions,
      recentBillingEvents,
      tenantHealth: tenantHealth.map((tenant) => ({
        ...tenant,
        health:
          tenant.billing?.status === BillingStatus.ACTIVE || tenant.billing?.status === BillingStatus.TRIALING
            ? 'HEALTHY'
            : tenant.billing?.status ?? 'NO_SUBSCRIPTION'
      }))
    };
  }

  async listBillingPlans(query: SiteBillingQueryDto) {
    const where: Prisma.PlanWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        include: {
          features: { include: { feature: true }, orderBy: { createdAt: 'asc' } },
          _count: { select: { subscriptions: true, features: true } }
        },
        orderBy: [{ isActive: 'desc' }, { price: 'asc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.plan.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createBillingPlan(actor: AuthenticatedUser, dto: CreatePlanDto, meta: RequestMeta) {
    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price ?? 0,
        currency: (dto.currency ?? 'USD').toUpperCase(),
        interval: dto.interval ?? 'month',
        isActive: dto.isActive ?? true,
        trialDays: dto.trialDays,
        seatLimit: dto.seatLimit,
        providerPriceId: dto.providerPriceId,
        metadata: dto.metadata === undefined ? undefined : this.toJsonValue(dto.metadata)
      },
      include: {
        features: { include: { feature: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { subscriptions: true, features: true } }
      }
    });
    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_created', 'Plan', plan.id, null, plan, meta);
    return plan;
  }

  async updateBillingPlan(actor: AuthenticatedUser, planId: string, dto: UpdatePlanDto, meta: RequestMeta) {
    const before = await this.getPlanForPlatform(planId);
    const after = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        currency: dto.currency?.toUpperCase(),
        interval: dto.interval,
        isActive: dto.isActive,
        trialDays: dto.trialDays,
        seatLimit: dto.seatLimit,
        providerPriceId: dto.providerPriceId,
        metadata: dto.metadata === undefined ? undefined : this.toJsonValue(dto.metadata)
      },
      include: {
        features: { include: { feature: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { subscriptions: true, features: true } }
      }
    });
    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_updated', 'Plan', planId, before, after, meta);
    return after;
  }

  async archiveBillingPlan(actor: AuthenticatedUser, planId: string, meta: RequestMeta) {
    const before = await this.getPlanForPlatform(planId);
    const after = await this.prisma.plan.update({
      where: { id: planId },
      data: { archivedAt: new Date(), isActive: false },
      include: {
        features: { include: { feature: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { subscriptions: true, features: true } }
      }
    });
    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_archived', 'Plan', planId, before, after, meta);
    return after;
  }

  async restoreBillingPlan(actor: AuthenticatedUser, planId: string, meta: RequestMeta) {
    const before = await this.getPlanForPlatform(planId);
    const after = await this.prisma.plan.update({
      where: { id: planId },
      data: { archivedAt: null, isActive: true },
      include: {
        features: { include: { feature: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { subscriptions: true, features: true } }
      }
    });
    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_restored', 'Plan', planId, before, after, meta);
    return after;
  }

  async syncBillingPlanToStripe(actor: AuthenticatedUser, planId: string, meta: RequestMeta) {
    const secretKey = this.configService.get<string>('billing.stripeSecretKey');
    if (!secretKey) throw new BadRequestException('Stripe is not configured');
    const before = await this.getPlanForPlatform(planId);
    if (!before.isActive || before.archivedAt) {
      throw new BadRequestException('Only active plans can be synced to Stripe');
    }
    if (before.currency.toUpperCase() === 'NGN') {
      throw new BadRequestException('NGN plans should use Paystack, not Stripe');
    }

    const metadata = this.asRecord(before.metadata);
    let productId = typeof metadata.stripeProductId === 'string' ? metadata.stripeProductId : undefined;
    if (!productId) {
      const product = await this.createStripeProduct(secretKey, before);
      productId = this.stringField(product, 'id');
      if (!productId) throw new BadRequestException('Stripe product sync did not return a product id');
    }

    const price = await this.createStripePrice(secretKey, before, productId);
    const priceId = this.stringField(price, 'id');
    if (!priceId) throw new BadRequestException('Stripe price sync did not return a price id');

    const after = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        providerPriceId: priceId,
        metadata: this.toJsonValue({
          ...metadata,
          stripeProductId: productId,
          stripePriceId: priceId,
          stripeSyncedAt: new Date().toISOString(),
          stripeCurrency: before.currency.toUpperCase(),
          stripeInterval: before.interval
        })
      },
      include: {
        features: { include: { feature: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { subscriptions: true, features: true } }
      }
    });

    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_synced_to_stripe', 'Plan', planId, before, {
      planId,
      stripeProductId: productId,
      stripePriceId: priceId
    }, meta);

    return after;
  }

  async replaceBillingPlanFeatures(actor: AuthenticatedUser, planId: string, dto: ReplacePlanFeaturesDto, meta: RequestMeta) {
    const before = await this.getPlanForPlatform(planId);
    const featureIds = [...new Set(dto.features.map((feature) => feature.featureId))];
    if (featureIds.length !== dto.features.length) throw new BadRequestException('Duplicate feature assignment in request');
    await this.ensureFeaturesExist(featureIds);
    await this.prisma.$transaction([
      this.prisma.planFeature.deleteMany({ where: { planId } }),
      ...dto.features.map((feature) =>
        this.prisma.planFeature.create({
          data: {
            planId,
            featureId: feature.featureId,
            limit: feature.limit,
            enabled: feature.enabled ?? true,
            config: feature.config === undefined ? undefined : this.toJsonValue(feature.config)
          }
        })
      )
    ]);
    const after = await this.getPlanForPlatform(planId);
    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_features_replaced', 'Plan', planId, before, after, meta);
    return after;
  }

  async assignBillingPlanFeature(actor: AuthenticatedUser, planId: string, dto: PlanFeatureDto, meta: RequestMeta) {
    const before = await this.getPlanForPlatform(planId);
    await this.ensureFeaturesExist([dto.featureId]);
    await this.prisma.planFeature.upsert({
      where: { planId_featureId: { planId, featureId: dto.featureId } },
      update: {
        limit: dto.limit,
        enabled: dto.enabled ?? true,
        config: dto.config === undefined ? undefined : this.toJsonValue(dto.config)
      },
      create: {
        planId,
        featureId: dto.featureId,
        limit: dto.limit,
        enabled: dto.enabled ?? true,
        config: dto.config === undefined ? undefined : this.toJsonValue(dto.config)
      }
    });
    const after = await this.getPlanForPlatform(planId);
    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_feature_assigned', 'Plan', planId, before, after, meta);
    return after;
  }

  async updateBillingPlanFeature(actor: AuthenticatedUser, planId: string, featureId: string, dto: UpdatePlanFeatureDto, meta: RequestMeta) {
    const before = await this.getPlanForPlatform(planId);
    await this.prisma.planFeature.update({
      where: { planId_featureId: { planId, featureId } },
      data: {
        limit: dto.limit,
        enabled: dto.enabled,
        config: dto.config === undefined ? undefined : this.toJsonValue(dto.config)
      }
    });
    const after = await this.getPlanForPlatform(planId);
    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_feature_updated', 'Plan', planId, before, after, meta);
    return after;
  }

  async removeBillingPlanFeature(actor: AuthenticatedUser, planId: string, featureId: string, meta: RequestMeta) {
    const before = await this.getPlanForPlatform(planId);
    await this.prisma.planFeature.delete({ where: { planId_featureId: { planId, featureId } } });
    const after = await this.getPlanForPlatform(planId);
    await this.recordBillingCatalogAction(actor, 'platform.billing_plan_feature_removed', 'Plan', planId, before, after, meta);
    return after;
  }

  async listBillingFeatures(query: SiteBillingQueryDto) {
    const where: Prisma.FeatureWhereInput = {
      ...(query.search
        ? {
            OR: [
              { key: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.feature.findMany({
        where,
        include: { plans: { include: { plan: true }, orderBy: { createdAt: 'desc' } } },
        orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { key: 'asc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.feature.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createBillingFeature(actor: AuthenticatedUser, dto: CreateFeatureDto, meta: RequestMeta) {
    const feature = await this.prisma.feature.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit: dto.unit,
        defaultLimit: dto.defaultLimit,
        metered: dto.metered ?? false,
        isActive: dto.isActive ?? true
      },
      include: { plans: { include: { plan: true }, orderBy: { createdAt: 'desc' } } }
    });
    await this.recordBillingCatalogAction(actor, 'platform.billing_feature_created', 'Feature', feature.id, null, feature, meta);
    return feature;
  }

  async updateBillingFeature(actor: AuthenticatedUser, featureId: string, dto: UpdateFeatureDto, meta: RequestMeta) {
    const before = await this.getFeatureForPlatform(featureId);
    const after = await this.prisma.feature.update({
      where: { id: featureId },
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit: dto.unit,
        defaultLimit: dto.defaultLimit,
        metered: dto.metered,
        isActive: dto.isActive
      },
      include: { plans: { include: { plan: true }, orderBy: { createdAt: 'desc' } } }
    });
    await this.recordBillingCatalogAction(actor, 'platform.billing_feature_updated', 'Feature', featureId, before, after, meta);
    return after;
  }

  async setBillingFeatureActive(actor: AuthenticatedUser, featureId: string, isActive: boolean, meta: RequestMeta) {
    const before = await this.getFeatureForPlatform(featureId);
    const after = await this.prisma.feature.update({
      where: { id: featureId },
      data: { isActive },
      include: { plans: { include: { plan: true }, orderBy: { createdAt: 'desc' } } }
    });
    await this.recordBillingCatalogAction(
      actor,
      isActive ? 'platform.billing_feature_enabled' : 'platform.billing_feature_disabled',
      'Feature',
      featureId,
      before,
      after,
      meta
    );
    return after;
  }

  async listBillingSubscriptions(query: SiteSubscriptionQueryDto) {
    const where: Prisma.SubscriptionWhereInput = {
      tenantId: query.tenantId,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { providerCustomerId: { contains: query.search, mode: 'insensitive' } },
              { providerSubscriptionId: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } },
              { plan: { name: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          plan: { include: { features: { include: { feature: true } } } },
          _count: { select: { invoices: true, usageRecords: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.subscription.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listBillingInvoices(query: SiteBillingQueryDto & { status?: string }) {
    const where: Prisma.InvoiceWhereInput = {
      tenantId: query.tenantId,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { providerInvoiceId: { contains: query.search, mode: 'insensitive' } },
              { subscription: { tenant: { name: { contains: query.search, mode: 'insensitive' } } } },
              { subscription: { tenant: { slug: { contains: query.search, mode: 'insensitive' } } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: {
          subscription: {
            include: {
              tenant: { select: { id: true, name: true, slug: true, status: true } },
              plan: { select: { id: true, name: true, slug: true, price: true, currency: true, interval: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.invoice.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listBillingUsageRecords(query: SiteBillingQueryDto) {
    const where: Prisma.UsageRecordWhereInput = {
      tenantId: query.tenantId,
      ...(query.search
        ? {
            OR: [
              { featureKey: { contains: query.search, mode: 'insensitive' } },
              { unit: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.usageRecord.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          subscription: { select: { id: true, status: true, plan: { select: { id: true, name: true, slug: true } } } },
          feature: true
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.usageRecord.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listBillingEvents(query: SiteBillingEventQueryDto) {
    const where: Prisma.BillingEventWhereInput = {
      tenantId: query.tenantId,
      status: query.status,
      provider: query.provider,
      type: query.type,
      ...(query.search
        ? {
            OR: [
              { eventId: { contains: query.search, mode: 'insensitive' } },
              { type: { contains: query.search, mode: 'insensitive' } },
              { provider: { contains: query.search, mode: 'insensitive' } },
              { error: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.billingEvent.findMany({
        where,
        include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.billingEvent.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listBillingEntitlements(query: SiteBillingQueryDto) {
    const where: Prisma.SubscriptionWhereInput = {
      tenantId: query.tenantId,
      ...(query.search
        ? {
            OR: [
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } },
              { plan: { name: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [subscriptions, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true, _count: { select: { users: true } } } },
          plan: { include: { features: { include: { feature: true } } } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.subscription.count({ where })
    ]);
    const data = subscriptions.map((subscription) => ({
      tenant: subscription.tenant,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        seatCount: subscription.seatCount,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt
      },
      plan: subscription.plan,
      entitlements: subscription.plan.features.map((planFeature) => ({
        key: planFeature.feature.key,
        name: planFeature.feature.name,
        enabled: planFeature.enabled,
        limit: planFeature.limit ?? planFeature.feature.defaultLimit,
        metered: planFeature.feature.metered,
        unit: planFeature.feature.unit
      })),
      seatUsage: {
        used: subscription.tenant._count.users,
        limit: subscription.plan.seatLimit ?? subscription.seatCount
      }
    }));
    return this.paginate(data, total, query);
  }

  async updateSiteSubscription(
    actor: AuthenticatedUser,
    subscriptionId: string,
    dto: SiteSubscriptionUpdateDto,
    meta: RequestMeta
  ) {
    const before = await this.getSubscriptionForPlatform(subscriptionId);
    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId }, select: { id: true, isActive: true, archivedAt: true } });
      if (!plan || !plan.isActive || plan.archivedAt) throw new BadRequestException('Plan is not active');
    }
    const after = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: dto.planId,
        status: dto.status,
        seatCount: dto.seatCount,
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
        trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : undefined
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        plan: { include: { features: { include: { feature: true } } } }
      }
    });

    await this.recordBillingPlatformAction(actor, after.tenantId, 'platform.billing_subscription_updated', 'Subscription', subscriptionId, before, { dto }, meta);
    return after;
  }

  async changeSiteSubscriptionPlan(
    actor: AuthenticatedUser,
    subscriptionId: string,
    dto: SiteChangePlanDto,
    meta: RequestMeta
  ) {
    const before = await this.getSubscriptionForPlatform(subscriptionId);
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
      select: { id: true, isActive: true, archivedAt: true, interval: true }
    });
    if (!plan || !plan.isActive || plan.archivedAt) throw new BadRequestException('Plan is not active');
    const now = new Date();
    const after = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: dto.planId,
        status: BillingStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: this.addPlanInterval(now, plan.interval),
        metadata: { ...(before.metadata as Record<string, unknown> | null), previousPlanId: before.planId }
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        plan: { include: { features: { include: { feature: true } } } }
      }
    });
    await this.recordBillingPlatformAction(actor, after.tenantId, 'platform.billing_subscription_plan_changed', 'Subscription', subscriptionId, before, { planId: dto.planId, reason: dto.reason ?? null }, meta);
    return after;
  }

  async cancelSiteSubscription(actor: AuthenticatedUser, subscriptionId: string, dto: SiteBillingActionDto, meta: RequestMeta) {
    const before = await this.getSubscriptionForPlatform(subscriptionId);
    const after = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: BillingStatus.CANCELLED, canceledAt: new Date(), cancelAtPeriodEnd: false },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        plan: { include: { features: { include: { feature: true } } } }
      }
    });
    await this.recordBillingPlatformAction(actor, after.tenantId, 'platform.billing_subscription_cancelled', 'Subscription', subscriptionId, before, { status: after.status, reason: dto.reason ?? null }, meta);
    return after;
  }

  async resumeSiteSubscription(actor: AuthenticatedUser, subscriptionId: string, dto: SiteBillingActionDto, meta: RequestMeta) {
    const before = await this.getSubscriptionForPlatform(subscriptionId);
    const after = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: BillingStatus.ACTIVE, canceledAt: null, cancelAtPeriodEnd: false },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        plan: { include: { features: { include: { feature: true } } } }
      }
    });
    await this.recordBillingPlatformAction(actor, after.tenantId, 'platform.billing_subscription_resumed', 'Subscription', subscriptionId, before, { status: after.status, reason: dto.reason ?? null }, meta);
    return after;
  }

  async startSiteSubscriptionTrial(actor: AuthenticatedUser, tenantId: string, dto: SiteChangePlanDto, meta: RequestMeta) {
    const tenant = await this.getTenantSummary(tenantId);
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
      select: { id: true, isActive: true, archivedAt: true, trialDays: true, interval: true }
    });
    if (!plan || !plan.isActive || plan.archivedAt) throw new BadRequestException('Plan is not active');
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + (plan.trialDays ?? 14) * 24 * 60 * 60 * 1000);
    const before = await this.prisma.subscription.findUnique({ where: { tenantId } });
    const after = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        status: BillingStatus.TRIALING,
        provider: before?.provider ?? 'manual',
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        canceledAt: null,
        cancelAtPeriodEnd: false
      },
      create: {
        tenantId,
        planId: plan.id,
        status: BillingStatus.TRIALING,
        provider: 'manual',
        seatCount: Math.max(1, tenant._count.users),
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        plan: { include: { features: { include: { feature: true } } } }
      }
    });
    await this.recordBillingPlatformAction(actor, tenantId, 'platform.billing_trial_started', 'Subscription', after.id, before, { planId: plan.id, trialEndsAt, reason: dto.reason ?? null }, meta);
    return after;
  }

  async integrationsOverview() {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [
      integrations,
      webhooks,
      deliveries,
      recentFailures,
      omoflowIntegrations,
      providerCatalog
    ] = await Promise.all([
      this.prisma.integration.groupBy({ by: ['provider', 'status'], _count: { _all: true } }),
      this.prisma.webhook.groupBy({ by: ['enabled'], _count: { _all: true } }),
      this.prisma.webhookDelivery.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.webhookDelivery.findMany({
        where: { status: WebhookDeliveryStatus.FAILED },
        include: {
          webhook: {
            select: {
              id: true,
              name: true,
              url: true,
              tenant: { select: { id: true, name: true, slug: true, status: true } }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      }),
      this.prisma.integration.findMany({
        where: {
          provider: IntegrationProvider.CUSTOM,
          OR: [
            { name: { contains: 'omoflow', mode: 'insensitive' } },
            { externalAccountId: { contains: 'omoflow', mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          provider: true,
          enabled: true,
          status: true,
          lastSyncAt: true,
          lastError: true,
          scopes: true,
          updatedAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          _count: { select: { logs: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 12
      }),
      Promise.resolve(Object.values(IntegrationProvider).map((provider) => ({
        provider,
        label: provider === IntegrationProvider.CUSTOM ? 'OmoFlow / Custom' : provider,
        category: ['SLACK', 'TEAMS', 'GOOGLE', 'MICROSOFT', 'ZOOM'].includes(provider) ? 'collaboration' :
          ['GITHUB', 'GITLAB', 'BITBUCKET'].includes(provider) ? 'developer' :
          ['STRIPE', 'PAYPAL'].includes(provider) ? 'billing' :
          ['OPENAI', 'ANTHROPIC'].includes(provider) ? 'ai' : 'workflow'
      })))
    ]);

    const deliveriesLast24h = await this.prisma.webhookDelivery.count({ where: { createdAt: { gte: since } } });

    return {
      integrations: integrations.reduce<Record<string, Record<string, number>>>((acc, row) => {
        acc[row.provider] ??= {};
        acc[row.provider][row.status] = row._count._all;
        return acc;
      }, {}),
      webhooks: this.groupCounts(webhooks),
      deliveries: this.groupCounts(deliveries),
      deliveriesLast24h,
      recentFailures,
      omoflowIntegrations,
      providerCatalog
    };
  }

  async listSiteIntegrations(query: SiteIntegrationQueryDto) {
    const where: Prisma.IntegrationWhereInput = {
      tenantId: query.tenantId,
      provider: query.provider,
      status: query.status,
      enabled: this.booleanQuery(query.enabled),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { externalAccountId: { contains: query.search, mode: 'insensitive' } },
              { lastError: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.integration.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          provider: true,
          name: true,
          config: true,
          externalAccountId: true,
          scopes: true,
          enabled: true,
          status: true,
          lastSyncAt: true,
          lastError: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          _count: { select: { logs: true } }
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.integration.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async rotateSiteIntegrationSecret(
    actor: AuthenticatedUser,
    integrationId: string,
    dto: SiteIntegrationSecretRotationDto,
    meta: RequestMeta
  ) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
      select: { id: true, tenantId: true, name: true, provider: true }
    });
    if (!integration) throw new NotFoundException('Integration not found');

    const key = dto.key?.trim() || 'apiKey';
    const value = dto.value || randomBytes(32).toString('base64url');
    const result = await this.integrationsService.rotateIntegrationSecret(
      this.platformTenantActor(actor, integration.tenantId),
      integrationId,
      { key, value },
      { ipAddress: meta.ipAddress, userAgent: meta.userAgent }
    );
    await this.recordPlatformAudit({
      actorId: actor.id,
      action: 'platform.integration_secret_rotated',
      entityType: 'Integration',
      entityId: integrationId,
      targetTenantId: integration.tenantId,
      oldValue: null,
      newValue: { provider: integration.provider, name: integration.name, key, reason: dto.reason ?? null },
      meta
    });
    return { integration: result, generatedSecret: dto.value ? undefined : value };
  }

  async listSiteWebhooks(query: SiteWebhookQueryDto) {
    const where: Prisma.WebhookWhereInput = {
      tenantId: query.tenantId,
      enabled: this.booleanQuery(query.enabled),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { url: { contains: query.search, mode: 'insensitive' } },
              { lastError: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhook.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          url: true,
          signingAlgorithm: true,
          events: true,
          enabled: true,
          failureCount: true,
          lastDeliveryAt: true,
          lastError: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          _count: { select: { deliveries: true } }
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.webhook.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSiteWebhookDeliveries(query: SiteWebhookDeliveryQueryDto) {
    const where: Prisma.WebhookDeliveryWhereInput = {
      tenantId: query.tenantId,
      webhookId: query.webhookId,
      eventType: query.eventType,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { eventType: { contains: query.search, mode: 'insensitive' } },
              { lastError: { contains: query.search, mode: 'insensitive' } },
              { webhook: { name: { contains: query.search, mode: 'insensitive' } } },
              { webhook: { url: { contains: query.search, mode: 'insensitive' } } },
              { webhook: { tenant: { name: { contains: query.search, mode: 'insensitive' } } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhookDelivery.findMany({
        where,
        include: {
          webhook: {
            select: {
              id: true,
              name: true,
              url: true,
              enabled: true,
              events: true,
              tenant: { select: { id: true, name: true, slug: true, status: true } }
            }
          }
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.webhookDelivery.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async retrySiteWebhookDelivery(actor: AuthenticatedUser, deliveryId: string, meta: RequestMeta) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, tenantId: true, status: true, attempts: true }
    });
    if (!delivery) throw new NotFoundException('Webhook delivery not found');
    const result = await this.integrationsService.retryWebhookDelivery(
      this.platformTenantActor(actor, delivery.tenantId),
      deliveryId,
      { ipAddress: meta.ipAddress, userAgent: meta.userAgent }
    );
    await this.recordPlatformAudit({
      actorId: actor.id,
      action: 'platform.webhook_delivery_retry',
      entityType: 'WebhookDelivery',
      entityId: deliveryId,
      targetTenantId: delivery.tenantId,
      oldValue: { status: delivery.status, attempts: delivery.attempts },
      newValue: { retried: true },
      meta
    });
    return result;
  }

  async rotateSiteWebhookSecret(
    actor: AuthenticatedUser,
    webhookId: string,
    dto: SiteIntegrationSecretRotationDto,
    meta: RequestMeta
  ) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { id: true, tenantId: true, name: true, url: true }
    });
    if (!webhook) throw new NotFoundException('Webhook not found');
    const result = await this.integrationsService.rotateWebhookSecret(
      this.platformTenantActor(actor, webhook.tenantId),
      webhookId,
      { secret: dto.value },
      { ipAddress: meta.ipAddress, userAgent: meta.userAgent }
    );
    await this.recordPlatformAudit({
      actorId: actor.id,
      action: 'platform.webhook_secret_rotated',
      entityType: 'Webhook',
      entityId: webhookId,
      targetTenantId: webhook.tenantId,
      oldValue: null,
      newValue: { name: webhook.name, reason: dto.reason ?? null },
      meta
    });
    return result;
  }

  async observabilityOverview() {
    const metrics = this.observabilityService.metricsJson();
    const dbLatency = await this.observabilityService.measureDatabaseLatency();
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [
      workflowRuns,
      webhookDeliveries,
      complianceJobs,
      activeSessions,
      openSecurityEvents,
      recentApiSecurityEvents
    ] = await Promise.all([
      this.prisma.workflowRun.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.webhookDelivery.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.complianceJob.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.authSession.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
      this.prisma.securityEvent.count({ where: { status: SecurityEventStatus.OPEN } }),
      this.prisma.securityEvent.findMany({
        where: { createdAt: { gte: since }, OR: [{ type: { contains: 'api', mode: 'insensitive' } }, { source: { contains: 'api', mode: 'insensitive' } }] },
        include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12
      })
    ]);
    const recentRequests = Array.isArray(metrics.recentRequests) ? metrics.recentRequests as Array<Record<string, unknown>> : [];
    const slowEndpoints = recentRequests
      .filter((request) => Number(request.durationMs ?? 0) >= 1000)
      .sort((a, b) => Number(b.durationMs ?? 0) - Number(a.durationMs ?? 0))
      .slice(0, 10);
    const errors = metrics.http && typeof metrics.http === 'object' && 'errors' in metrics.http
      ? metrics.http.errors as Record<string, number>
      : {};

    return {
      live: {
        status: 'ok',
        uptimeSeconds: metrics.uptimeSeconds,
        startedAt: metrics.startedAt,
        environment: metrics.environment,
        service: metrics.service
      },
      ready: {
        status: dbLatency < 500 ? 'ok' : 'degraded',
        database: { status: 'up', latencyMs: dbLatency },
        realtime: this.realtimeGateway.getRuntimeSnapshot()
      },
      api: {
        errors,
        errorRateSignals: Object.values(errors).reduce((sum, count) => sum + Number(count), 0),
        recentRequests,
        slowEndpoints
      },
      queues: {
        workflows: this.groupCounts(workflowRuns),
        webhooks: this.groupCounts(webhookDeliveries),
        compliance: this.groupCounts(complianceJobs),
        metrics: metrics.jobs ?? {}
      },
      workers: {
        workflowWorker: 'registered',
        webhookDispatcher: 'on-demand',
        complianceRunner: 'site-admin-controlled'
      },
      sessions: { active: activeSessions },
      securityEvents: { open: openSecurityEvents, recentApiSecurityEvents }
    };
  }

  async realtimeMessagingOverview() {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [
      conversations,
      groupConversations,
      messages24h,
      readReceipts24h,
      pinnedMessages,
      reactionCounts,
      rateLimitEvents,
      recentRooms
    ] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { isGroup: true } }),
      this.prisma.message.count({ where: { createdAt: { gte: since } } }),
      this.prisma.messageReadReceipt.count({ where: { readAt: { gte: since } } }),
      this.prisma.message.count({ where: { pinnedAt: { not: null } } }),
      this.prisma.messageReaction.count(),
      this.prisma.securityEvent.findMany({
        where: {
          createdAt: { gte: since },
          OR: [
            { type: { contains: 'rate', mode: 'insensitive' } },
            { type: { contains: 'abuse', mode: 'insensitive' } },
            { source: { contains: 'throttle', mode: 'insensitive' } }
          ]
        },
        include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12
      }),
      this.prisma.conversation.findMany({
        include: {
          members: { select: { id: true, userId: true } },
          messages: { select: { id: true, senderId: true, createdAt: true, pinnedAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { members: true, messages: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 12
      })
    ]);

    return {
      realtime: this.realtimeGateway.getRuntimeSnapshot(),
      conversations: { total: conversations, group: groupConversations, direct: conversations - groupConversations },
      messages: { last24h: messages24h, pinned: pinnedMessages, reactions: reactionCounts, readReceiptsLast24h: readReceipts24h },
      deliveryHealth: {
        readReceiptRatio: messages24h ? Math.round((readReceipts24h / messages24h) * 100) : 0,
        privateContentPolicy: 'metadata_only'
      },
      abuseAndRateLimit: { events: rateLimitEvents.length, recentEvents: rateLimitEvents },
      recentRooms
    };
  }

  async listSiteConversations(query: SiteMessagingQueryDto) {
    const where: Prisma.ConversationWhereInput = {
      tenantId: query.tenantId,
      id: query.conversationId,
      createdAt: this.dateFilter(query.from, query.to),
      members: query.userId ? { some: { userId: query.userId } } : undefined,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        include: {
          members: { select: { id: true, userId: true } },
          messages: { select: { id: true, senderId: true, createdAt: true, updatedAt: true, pinnedAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { members: true, messages: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.conversation.count({ where })
    ]);
    const tenants = await this.tenantMap(data.map((conversation) => conversation.tenantId));
    return this.paginate(data.map((conversation) => ({ ...conversation, tenant: tenants.get(conversation.tenantId) ?? null })), total, query);
  }

  async listSiteMessageActivity(query: SiteMessagingQueryDto) {
    const where: Prisma.MessageWhereInput = {
      conversationId: query.conversationId,
      senderId: query.userId,
      createdAt: this.dateFilter(query.from, query.to),
      conversation: { tenantId: query.tenantId },
      ...(query.search
        ? {
            OR: [
              { conversation: { title: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          parentMessageId: true,
          forwardedFromMessageId: true,
          pinnedAt: true,
          attachments: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          conversation: {
            select: {
              id: true,
              tenantId: true,
              title: true,
              isGroup: true
            }
          },
          _count: { select: { reactions: true, readReceipts: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.message.count({ where })
    ]);
    const tenants = await this.tenantMap(data.map((message) => message.conversation.tenantId));
    return this.paginate(data.map((message) => ({
      ...message,
      conversation: {
        ...message.conversation,
        tenant: tenants.get(message.conversation.tenantId) ?? null
      },
      bodyRedacted: true,
      attachmentCount: Array.isArray(message.attachments) ? message.attachments.length : message.attachments ? 1 : 0
    })), total, query);
  }

  async meetingOperationsOverview(query: SiteMeetingQueryDto) {
    const where: Prisma.MeetingWhereInput = {
      tenantId: query.tenantId,
      status: query.status,
      startAt: this.dateFilter(query.from, query.to)
    };
    const aiWhere: Prisma.AiUsageLogWhereInput = {
      tenantId: query.tenantId,
      requestType: { startsWith: 'meeting.', mode: 'insensitive' },
      createdAt: this.dateFilter(query.from, query.to)
    };
    const [
      meetingsByStatus,
      bookingPages,
      bookingRequests,
      reminderStatus,
      policyRows,
      aiUsage,
      failedReminderTenants,
      topTenants
    ] = await Promise.all([
      this.prisma.meeting.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.bookingPage.count({ where: { tenantId: query.tenantId, isActive: true } }),
      this.prisma.bookingRequest.groupBy({
        by: ['status'],
        where: { tenantId: query.tenantId, createdAt: this.dateFilter(query.from, query.to) },
        _count: { _all: true }
      }),
      this.prisma.meetingReminderJob.groupBy({
        by: ['status'],
        where: { tenantId: query.tenantId, scheduledFor: this.dateFilter(query.from, query.to) },
        _count: { _all: true }
      }),
      this.prisma.meetingIntegrationSettings.findMany({
        where: { tenantId: query.tenantId },
        select: {
          publicBookingEnabled: true,
          calendarSyncEnabled: true,
          whatsappRemindersEnabled: true,
          aiMeetingProcessingEnabled: true
        }
      }),
      this.prisma.aiUsageLog.aggregate({
        where: aiWhere,
        _count: { _all: true },
        _sum: { totalTokens: true, estimatedCost: true }
      }),
      this.prisma.meetingReminderJob.groupBy({
        by: ['tenantId', 'status'],
        where: {
          tenantId: query.tenantId,
          status: { in: [MeetingReminderJobStatus.FAILED, MeetingReminderJobStatus.DEAD_LETTER] },
          scheduledFor: this.dateFilter(query.from, query.to)
        },
        _count: { _all: true },
        orderBy: { _count: { tenantId: 'desc' } },
        take: 12
      }),
      this.prisma.meeting.groupBy({
        by: ['tenantId'],
        where,
        _count: { _all: true },
        orderBy: { _count: { tenantId: 'desc' } },
        take: 12
      })
    ]);

    const tenantIds = [
      ...topTenants.map((row) => row.tenantId),
      ...failedReminderTenants.map((row) => row.tenantId)
    ];
    const tenants = await this.tenantMap(tenantIds);

    return {
      privacy: {
        policy: 'metadata_only',
        redacted: ['title', 'description', 'notes', 'comments', 'attendees', 'liveNotes']
      },
      meetings: this.groupCounts(meetingsByStatus),
      booking: {
        activePages: bookingPages,
        requests: this.groupCounts(bookingRequests)
      },
      reminderDelivery: this.groupCounts(reminderStatus),
      policies: {
        tenantsWithSettings: policyRows.length,
        publicBookingEnabled: policyRows.filter((row) => row.publicBookingEnabled).length,
        calendarSyncEnabled: policyRows.filter((row) => row.calendarSyncEnabled).length,
        whatsappEnabled: policyRows.filter((row) => row.whatsappRemindersEnabled).length,
        aiMeetingEnabled: policyRows.filter((row) => row.aiMeetingProcessingEnabled).length
      },
      aiUsage: {
        requests: aiUsage._count._all,
        totalTokens: aiUsage._sum.totalTokens ?? 0,
        estimatedCost: Number(aiUsage._sum.estimatedCost ?? 0)
      },
      topTenants: topTenants.map((row) => ({
        tenant: tenants.get(row.tenantId) ?? null,
        meetings: row._count._all
      })),
      deliveryPressure: failedReminderTenants.map((row) => ({
        tenant: tenants.get(row.tenantId) ?? null,
        status: row.status,
        failures: row._count._all
      }))
    };
  }

  async listSiteMeetingTenants(query: SiteMeetingQueryDto) {
    const tenantsWhere: Prisma.TenantWhereInput = {
      id: query.tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [tenants, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where: tenantsWhere,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          meetingIntegrationSettings: {
            select: {
              publicBookingEnabled: true,
              calendarSyncEnabled: true,
              emailRemindersEnabled: true,
              whatsappRemindersEnabled: true,
              aiMeetingProcessingEnabled: true,
              defaultMeetingVisibility: true,
              updatedAt: true
            }
          },
          _count: { select: { users: true, projects: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.tenant.count({ where: tenantsWhere })
    ]);
    const tenantIds = tenants.map((tenant) => tenant.id);
    const [meetingCounts, reminderCounts, aiCounts] = await Promise.all([
      this.prisma.meeting.groupBy({
        by: ['tenantId', 'status'],
        where: { tenantId: { in: tenantIds }, status: query.status, startAt: this.dateFilter(query.from, query.to) },
        _count: { _all: true }
      }),
      this.prisma.meetingReminderJob.groupBy({
        by: ['tenantId', 'status'],
        where: { tenantId: { in: tenantIds }, scheduledFor: this.dateFilter(query.from, query.to) },
        _count: { _all: true }
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['tenantId'],
        where: {
          tenantId: { in: tenantIds },
          requestType: { startsWith: 'meeting.', mode: 'insensitive' },
          createdAt: this.dateFilter(query.from, query.to)
        },
        _count: { _all: true },
        _sum: { totalTokens: true, estimatedCost: true }
      })
    ]);

    return this.paginate(
      tenants.map((tenant) => ({
        tenant,
        meetings: this.groupCountsForTenant(meetingCounts, tenant.id, 'status'),
        reminderDelivery: this.groupCountsForTenant(reminderCounts, tenant.id, 'status'),
        aiUsage: this.aiUsageForTenant(aiCounts, tenant.id),
        privacy: 'content_redacted'
      })),
      total,
      query
    );
  }

  async listSiteMeetingReminderLogs(query: SiteMeetingReminderQueryDto) {
    const where: Prisma.MeetingReminderJobWhereInput = {
      tenantId: query.tenantId,
      status: query.status,
      scheduledFor: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { provider: { contains: query.search, mode: 'insensitive' } },
              { lastError: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.meetingReminderJob.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          channel: true,
          provider: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          scheduledFor: true,
          nextAttemptAt: true,
          sentAt: true,
          failedAt: true,
          deadLetterAt: true,
          lastError: true,
          meeting: { select: { id: true, status: true, startAt: true } }
        },
        orderBy: [{ scheduledFor: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.meetingReminderJob.count({ where })
    ]);
    const tenants = await this.tenantMap(data.map((row) => row.tenantId));
    return this.paginate(
      data.map((row) => ({
        ...row,
        tenant: tenants.get(row.tenantId) ?? null,
        meeting: { ...row.meeting, contentRedacted: true }
      })),
      total,
      query
    );
  }

  async complianceOverview() {
    const [jobsByStatus, jobsByType, policies, recentJobs, recentAudit] = await Promise.all([
      this.prisma.complianceJob.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.complianceJob.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.securityPolicy.findMany({
        include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      this.prisma.complianceJob.findMany({
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          approvedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        },
        orderBy: { requestedAt: 'desc' },
        take: 12
      }),
      this.prisma.auditLog.findMany({
        where: { action: { contains: 'compliance', mode: 'insensitive' } },
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 12
      })
    ]);
    const boundaryChecks = policies.map((policy) => ({
      tenant: policy.tenant,
      auditRetentionDays: policy.auditRetentionDays,
      dataRetentionDays: policy.dataRetentionDays,
      domainDiscoveryEnabled: policy.domainDiscoveryEnabled,
      mfaRequired: policy.mfaRequired,
      evidence:
        policy.auditRetentionDays >= 365 &&
        (policy.dataRetentionDays === null || policy.dataRetentionDays >= 30)
          ? 'PASS'
          : 'REVIEW'
    }));
    return {
      jobs: { byStatus: this.groupCounts(jobsByStatus), byType: this.groupCounts(jobsByType) },
      policies: { reviewed: policies.length, boundaryChecks },
      recentJobs,
      evidenceTrail: recentAudit
    };
  }

  async listSiteComplianceJobs(query: SiteComplianceJobQueryDto) {
    const where: Prisma.ComplianceJobWhereInput = {
      tenantId: query.tenantId,
      type: query.type,
      status: query.status,
      subjectType: query.subjectType,
      subjectId: query.subjectId,
      requestedAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { subjectType: { contains: query.search, mode: 'insensitive' } },
              { subjectId: { contains: query.search, mode: 'insensitive' } },
              { reason: { contains: query.search, mode: 'insensitive' } },
              { fileName: { contains: query.search, mode: 'insensitive' } },
              { error: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.complianceJob.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          approvedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        },
        orderBy: { requestedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.complianceJob.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async approveSiteComplianceJob(actor: AuthenticatedUser, jobId: string, dto: SiteComplianceDecisionDto, meta: RequestMeta) {
    return this.transitionSiteComplianceJob(actor, jobId, ComplianceJobStatus.APPROVED, 'platform.compliance_job_approved', dto, meta);
  }

  async rejectSiteComplianceJob(actor: AuthenticatedUser, jobId: string, dto: SiteComplianceDecisionDto, meta: RequestMeta) {
    return this.transitionSiteComplianceJob(actor, jobId, ComplianceJobStatus.REJECTED, 'platform.compliance_job_rejected', dto, meta);
  }

  async cancelSiteComplianceJob(actor: AuthenticatedUser, jobId: string, dto: SiteComplianceDecisionDto, meta: RequestMeta) {
    return this.transitionSiteComplianceJob(actor, jobId, ComplianceJobStatus.CANCELLED, 'platform.compliance_job_cancelled', dto, meta);
  }

  async runSiteComplianceJob(actor: AuthenticatedUser, jobId: string, meta: RequestMeta) {
    const job = await this.getComplianceJobForPlatform(jobId);
    const terminalStatuses: ComplianceJobStatus[] = [
      ComplianceJobStatus.COMPLETED,
      ComplianceJobStatus.FAILED,
      ComplianceJobStatus.CANCELLED,
      ComplianceJobStatus.EXPIRED
    ];
    const approvalRequiredTypes: ComplianceJobType[] = [
      ComplianceJobType.DATA_DELETION,
      ComplianceJobType.RETENTION_PURGE
    ];
    if (terminalStatuses.includes(job.status)) {
      return job;
    }
    if (approvalRequiredTypes.includes(job.type) && job.status !== ComplianceJobStatus.APPROVED) {
      throw new BadRequestException('This compliance job requires approval before execution');
    }
    await this.prisma.complianceJob.update({
      where: { id: jobId },
      data: { status: ComplianceJobStatus.RUNNING, startedAt: new Date(), error: null }
    });

    try {
      const output = await this.executeSiteComplianceJob(job);
      const completed = await this.prisma.complianceJob.update({
        where: { id: jobId },
        data: {
          status: ComplianceJobStatus.COMPLETED,
          result: this.toJsonValue(output.result),
          fileName: output.fileName,
          fileUrl: output.fileUrl,
          mimeType: output.mimeType,
          sizeBytes: output.sizeBytes,
          completedAt: new Date()
        },
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          approvedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        }
      });
      await this.recordCompliancePlatformAction(actor, completed.tenantId, 'platform.compliance_job_run', completed.id, { status: job.status }, { status: completed.status, type: completed.type, fileName: completed.fileName }, meta);
      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Compliance job failed';
      const failed = await this.prisma.complianceJob.update({
        where: { id: jobId },
        data: { status: ComplianceJobStatus.FAILED, error: message, completedAt: new Date() },
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          approvedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        }
      });
      await this.recordCompliancePlatformAction(actor, failed.tenantId, 'platform.compliance_job_failed', failed.id, { status: job.status }, { status: failed.status, error: message }, meta);
      return failed;
    }
  }

  async platformSearch(query: SitePlatformSearchQueryDto) {
    const term = query.search?.trim() ?? '';
    const category = query.category ?? 'ALL';
    const perTypeLimit = Math.max(5, Math.min(20, Math.ceil(query.limit / 3)));
    const include = (name: NonNullable<SitePlatformSearchQueryDto['category']>) => category === 'ALL' || category === name;

    const [tenants, users, projects, tasks, events, auditLogs, platformAuditLogs] = await Promise.all([
      include('TENANTS')
        ? this.prisma.tenant.findMany({
            where: {
              id: query.tenantId,
              ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { slug: { contains: term, mode: 'insensitive' } }] } : {})
            },
            select: { id: true, name: true, slug: true, status: true, createdAt: true, updatedAt: true, _count: { select: { users: true, projects: true } } },
            orderBy: { updatedAt: 'desc' },
            take: perTypeLimit
          })
        : Promise.resolve([]),
      include('USERS')
        ? this.prisma.user.findMany({
            where: {
              tenantId: query.tenantId,
              ...(term
                ? {
                    OR: [
                      { email: { contains: term, mode: 'insensitive' } },
                      { firstName: { contains: term, mode: 'insensitive' } },
                      { lastName: { contains: term, mode: 'insensitive' } }
                    ]
                  }
                : {})
            },
            select: { id: true, tenantId: true, email: true, firstName: true, lastName: true, status: true, emailVerifiedAt: true, updatedAt: true, tenant: { select: { id: true, name: true, slug: true, status: true } } },
            orderBy: { updatedAt: 'desc' },
            take: perTypeLimit
          })
        : Promise.resolve([]),
      include('PROJECTS')
        ? this.prisma.project.findMany({
            where: {
              tenantId: query.tenantId,
              ...(term
                ? {
                    OR: [
                      { key: { contains: term, mode: 'insensitive' } },
                      { name: { contains: term, mode: 'insensitive' } },
                      { description: { contains: term, mode: 'insensitive' } }
                    ]
                  }
                : {})
            },
            select: { id: true, tenantId: true, key: true, name: true, status: true, visibility: true, progress: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: perTypeLimit
          })
        : Promise.resolve([]),
      include('TASKS')
        ? this.prisma.task.findMany({
            where: {
              tenantId: query.tenantId,
              deletedAt: null,
              ...(term
                ? {
                    OR: [
                      { key: { contains: term, mode: 'insensitive' } },
                      { title: { contains: term, mode: 'insensitive' } },
                      { description: { contains: term, mode: 'insensitive' } }
                    ]
                  }
                : {})
            },
            select: { id: true, tenantId: true, projectId: true, key: true, title: true, type: true, status: true, priority: true, updatedAt: true, project: { select: { id: true, key: true, name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: perTypeLimit
          })
        : Promise.resolve([]),
      include('EVENTS')
        ? this.prisma.securityEvent.findMany({
            where: {
              tenantId: query.tenantId,
              ...(term
                ? {
                    OR: [
                      { type: { contains: term, mode: 'insensitive' } },
                      { source: { contains: term, mode: 'insensitive' } },
                      { subjectType: { contains: term, mode: 'insensitive' } },
                      { subjectId: { contains: term, mode: 'insensitive' } }
                    ]
                  }
                : {})
            },
            select: { id: true, tenantId: true, type: true, severity: true, status: true, source: true, subjectType: true, subjectId: true, createdAt: true, tenant: { select: { id: true, name: true, slug: true, status: true } } },
            orderBy: { createdAt: 'desc' },
            take: perTypeLimit
          })
        : Promise.resolve([]),
      include('AUDIT')
        ? this.prisma.auditLog.findMany({
            where: {
              tenantId: query.tenantId,
              ...(term
                ? {
                    OR: [
                      { action: { contains: term, mode: 'insensitive' } },
                      { entityType: { contains: term, mode: 'insensitive' } },
                      { entityId: { contains: term, mode: 'insensitive' } }
                    ]
                  }
                : {})
            },
            select: { id: true, tenantId: true, action: true, entityType: true, entityId: true, actorId: true, createdAt: true, tenant: { select: { id: true, name: true, slug: true, status: true } } },
            orderBy: { createdAt: 'desc' },
            take: perTypeLimit
          })
        : Promise.resolve([]),
      include('AUDIT')
        ? this.prisma.platformAuditLog.findMany({
            where: {
              targetTenantId: query.tenantId,
              ...(term
                ? {
                    OR: [
                      { action: { contains: term, mode: 'insensitive' } },
                      { entityType: { contains: term, mode: 'insensitive' } },
                      { entityId: { contains: term, mode: 'insensitive' } }
                    ]
                  }
                : {})
            },
            select: {
              id: true,
              action: true,
              entityType: true,
              entityId: true,
              targetTenantId: true,
              createdAt: true,
              targetTenant: { select: { id: true, name: true, slug: true, status: true } },
              actor: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: perTypeLimit
          })
        : Promise.resolve([])
    ]);

    const tenantLookup = await this.tenantMap([
      ...projects.map((item) => item.tenantId),
      ...tasks.map((item) => item.tenantId)
    ]);
    const results = [
      ...tenants.map((tenant) => ({
        id: tenant.id,
        type: 'TENANT',
        title: tenant.name,
        subtitle: `@${tenant.slug} / ${tenant.status}`,
        url: `/site-admin/tenants/${tenant.id}`,
        tenant,
        updatedAt: tenant.updatedAt,
        metadata: tenant._count
      })),
      ...users.map((person) => ({
        id: person.id,
        type: 'USER',
        title: `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || person.email,
        subtitle: `${person.email} / ${person.status}`,
        url: `/site-admin/users/${person.id}`,
        tenant: person.tenant,
        updatedAt: person.updatedAt,
        metadata: { emailVerified: Boolean(person.emailVerifiedAt) }
      })),
      ...projects.map((project) => ({
        id: project.id,
        type: 'PROJECT',
        title: project.name,
        subtitle: `${project.key} / ${project.status} / ${project.progress}%`,
        url: `/site-admin/tenants/${project.tenantId}/projects`,
        tenant: tenantLookup.get(project.tenantId) ?? null,
        updatedAt: project.updatedAt,
        metadata: { projectId: project.id, visibility: project.visibility }
      })),
      ...tasks.map((task) => ({
        id: task.id,
        type: 'TASK',
        title: task.title,
        subtitle: `${task.key} / ${task.status} / ${task.priority}`,
        url: `/site-admin/tenants/${task.tenantId}/tasks`,
        tenant: tenantLookup.get(task.tenantId) ?? null,
        updatedAt: task.updatedAt,
        metadata: { taskType: task.type, project: task.project }
      })),
      ...events.map((event) => ({
        id: event.id,
        type: 'SECURITY_EVENT',
        title: event.type,
        subtitle: `${event.severity} / ${event.status} / ${event.source ?? 'platform'}`,
        url: `/site-admin/security?event=${event.id}`,
        tenant: event.tenant,
        updatedAt: event.createdAt,
        metadata: { subjectType: event.subjectType, subjectId: event.subjectId }
      })),
      ...auditLogs.map((log) => ({
        id: log.id,
        type: 'AUDIT_LOG',
        title: log.action,
        subtitle: `${log.entityType} / ${log.entityId ?? 'n/a'}`,
        url: `/site-admin/audit?audit=${log.id}`,
        tenant: log.tenant,
        updatedAt: log.createdAt,
        metadata: { actorId: log.actorId }
      })),
      ...platformAuditLogs.map((log) => ({
        id: log.id,
        type: 'PLATFORM_AUDIT',
        title: log.action,
        subtitle: `${log.entityType} / ${log.entityId ?? 'n/a'}`,
        url: `/site-admin/audit?platformAudit=${log.id}`,
        tenant: log.targetTenant,
        updatedAt: log.createdAt,
        metadata: { actor: log.actor }
      }))
    ]
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, query.limit);

    const facets = results.reduce<Record<string, number>>((acc, result) => {
      acc[result.type] = (acc[result.type] ?? 0) + 1;
      return acc;
    }, {});
    return {
      ...this.paginate(results, results.length, query),
      facets,
      query: { search: term, category, tenantId: query.tenantId }
    };
  }

  async workflowAutomationOverview() {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [workflows, runs, runs24h, definitions, approvals, errorLogs, recentFailedRuns] = await Promise.all([
      this.prisma.workflow.groupBy({ by: ['triggerType'], _count: { _all: true } }),
      this.prisma.workflowRun.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.workflowRun.count({ where: { createdAt: { gte: since } } }),
      this.prisma.approvalDefinition.groupBy({ by: ['isActive'], _count: { _all: true } }),
      this.prisma.approval.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.workflowRunLog.count({ where: { level: 'ERROR' } }),
      this.prisma.workflowRun.findMany({
        where: { status: WorkflowRunStatus.FAILED },
        select: {
          id: true,
          tenantId: true,
          workflowId: true,
          status: true,
          entityType: true,
          entityId: true,
          error: true,
          createdAt: true,
          updatedAt: true,
          workflow: { select: { id: true, name: true, entityType: true, triggerType: true, eventType: true } },
          logs: { select: { id: true, level: true, message: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 2 }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      })
    ]);
    const tenants = await this.tenantMap(recentFailedRuns.map((run) => run.tenantId));
    return {
      workflows: { byTrigger: this.groupCounts(workflows) },
      runs: { byStatus: this.groupCounts(runs), last24h: runs24h, deadLetter: this.groupCounts(runs).FAILED ?? 0 },
      approvals: { byStatus: this.groupCounts(approvals) },
      definitions: this.groupCounts(definitions),
      runtimeLogs: { errorLogs },
      recentFailedRuns: recentFailedRuns.map((run) => ({ ...run, tenant: tenants.get(run.tenantId) ?? null }))
    };
  }

  async listSiteWorkflows(query: SiteWorkflowQueryDto) {
    const where: Prisma.WorkflowWhereInput = {
      tenantId: query.tenantId,
      entityType: query.entityType,
      triggerType: query.triggerType,
      isActive: this.booleanQuery(query.active),
      ...(query.search
        ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }, { eventType: { contains: query.search, mode: 'insensitive' } }] }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workflow.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          entityType: true,
          triggerType: true,
          eventType: true,
          isActive: true,
          archivedAt: true,
          lastRunAt: true,
          createdAt: true,
          updatedAt: true,
          nodes: { select: { id: true, name: true, type: true, actionType: true, enabled: true, sortOrder: true }, orderBy: { sortOrder: 'asc' }, take: 8 },
          _count: { select: { runs: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.workflow.count({ where })
    ]);
    const tenants = await this.tenantMap(data.map((workflow) => workflow.tenantId));
    return this.paginate(data.map((workflow) => ({ ...workflow, tenant: tenants.get(workflow.tenantId) ?? null })), total, query);
  }

  async listSiteWorkflowRuns(query: SiteWorkflowRunQueryDto) {
    const where: Prisma.WorkflowRunWhereInput = {
      id: query.runId,
      tenantId: query.tenantId,
      workflowId: query.workflowId,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? { OR: [{ entityType: { contains: query.search, mode: 'insensitive' } }, { entityId: { contains: query.search, mode: 'insensitive' } }, { error: { contains: query.search, mode: 'insensitive' } }, { workflow: { name: { contains: query.search, mode: 'insensitive' } } }] }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workflowRun.findMany({
        where,
        select: {
          id: true,
          workflowId: true,
          tenantId: true,
          entityType: true,
          entityId: true,
          eventType: true,
          triggerType: true,
          idempotencyKey: true,
          status: true,
          error: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          workflow: { select: { id: true, name: true, entityType: true, triggerType: true, eventType: true } },
          logs: { select: { id: true, runId: true, nodeId: true, level: true, message: true, startedAt: true, finishedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 4 },
          approvals: { select: { id: true, title: true, status: true, currentStep: true, createdAt: true, updatedAt: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.workflowRun.count({ where })
    ]);
    const tenants = await this.tenantMap(data.map((run) => run.tenantId));
    return this.paginate(data.map((run) => ({ ...run, tenant: tenants.get(run.tenantId) ?? null })), total, query);
  }

  async retrySiteWorkflowRun(actor: AuthenticatedUser, runId: string, meta: RequestMeta) {
    const before = await this.prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!before) throw new NotFoundException('Workflow run not found');
    if (before.status === WorkflowRunStatus.RUNNING) throw new BadRequestException('Workflow run is already running');
    const after = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: WorkflowRunStatus.PENDING, error: null, startedAt: null, completedAt: null },
      select: {
        id: true,
        workflowId: true,
        tenantId: true,
        entityType: true,
        entityId: true,
        eventType: true,
        triggerType: true,
        status: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        workflow: { select: { id: true, name: true, entityType: true, triggerType: true, eventType: true } }
      }
    });
    await this.prisma.workflowRunLog.create({ data: { runId, level: 'WARN', message: 'Workflow run retry requested from site admin', data: this.toJsonValue({ previousStatus: before.status }) } });
    await this.recordSiteOperation(actor, after.tenantId, 'platform.workflow_run_retry', 'WorkflowRun', runId, { status: before.status }, { status: after.status }, meta);
    const tenants = await this.tenantMap([after.tenantId]);
    return { ...after, tenant: tenants.get(after.tenantId) ?? null };
  }

  async cancelSiteWorkflowRun(actor: AuthenticatedUser, runId: string, meta: RequestMeta) {
    const before = await this.prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!before) throw new NotFoundException('Workflow run not found');
    if (([WorkflowRunStatus.COMPLETED, WorkflowRunStatus.FAILED, WorkflowRunStatus.CANCELLED] as WorkflowRunStatus[]).includes(before.status)) {
      throw new BadRequestException('Workflow run is already terminal');
    }
    const after = await this.prisma.workflowRun.update({
      where: { id: runId },
      data: { status: WorkflowRunStatus.CANCELLED, completedAt: new Date() },
      select: {
        id: true,
        workflowId: true,
        tenantId: true,
        entityType: true,
        entityId: true,
        eventType: true,
        triggerType: true,
        status: true,
        error: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        workflow: { select: { id: true, name: true, entityType: true, triggerType: true, eventType: true } }
      }
    });
    await this.prisma.workflowRunLog.create({ data: { runId, level: 'WARN', message: 'Workflow run cancelled from site admin', data: this.toJsonValue({ previousStatus: before.status }) } });
    await this.recordSiteOperation(actor, after.tenantId, 'platform.workflow_run_cancelled', 'WorkflowRun', runId, { status: before.status }, { status: after.status }, meta);
    const tenants = await this.tenantMap([after.tenantId]);
    return { ...after, tenant: tenants.get(after.tenantId) ?? null };
  }

  async listSiteApprovalDefinitions(query: SiteApprovalQueryDto) {
    const where: Prisma.ApprovalDefinitionWhereInput = {
      tenantId: query.tenantId,
      entityType: query.entityType,
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.approvalDefinition.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          entityType: true,
          isActive: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
          steps: { select: { id: true, stepOrder: true, title: true, approverId: true, approverRole: true, required: true, escalationHours: true }, orderBy: { stepOrder: 'asc' } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.approvalDefinition.count({ where })
    ]);
    const tenants = await this.tenantMap(data.map((item) => item.tenantId));
    return this.paginate(data.map((item) => ({ ...item, tenant: tenants.get(item.tenantId) ?? null })), total, query);
  }

  async listSiteApprovals(query: SiteApprovalQueryDto) {
    const where: Prisma.ApprovalWhereInput = {
      tenantId: query.tenantId,
      entityType: query.entityType,
      status: query.status,
      ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }, { entityId: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.approval.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          definitionId: true,
          workflowRunId: true,
          entityType: true,
          entityId: true,
          title: true,
          description: true,
          status: true,
          requestedById: true,
          currentStep: true,
          dueDate: true,
          decidedAt: true,
          createdAt: true,
          updatedAt: true,
          steps: { select: { id: true, stepOrder: true, title: true, approverId: true, required: true, status: true, decidedAt: true, dueDate: true }, orderBy: { stepOrder: 'asc' } },
          workflowRun: { select: { id: true, status: true, workflow: { select: { id: true, name: true } } } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.approval.count({ where })
    ]);
    const tenants = await this.tenantMap(data.map((item) => item.tenantId));
    return this.paginate(data.map((item) => ({ ...item, tenant: tenants.get(item.tenantId) ?? null })), total, query);
  }

  async listSiteWorkflowRunLogs(query: SiteWorkflowRunQueryDto) {
    const where: Prisma.WorkflowRunLogWhereInput = {
      runId: query.runId,
      run: {
        tenantId: query.tenantId,
        workflowId: query.workflowId,
        status: query.status,
        createdAt: this.dateFilter(query.from, query.to)
      },
      ...(query.search ? { OR: [{ level: { contains: query.search, mode: 'insensitive' } }, { message: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workflowRunLog.findMany({
        where,
        select: {
          id: true,
          runId: true,
          nodeId: true,
          level: true,
          message: true,
          data: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
          run: { select: { id: true, tenantId: true, status: true, workflow: { select: { id: true, name: true } } } },
          node: { select: { id: true, name: true, type: true, actionType: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.workflowRunLog.count({ where })
    ]);
    const tenants = await this.tenantMap(data.map((item) => item.run.tenantId));
    return this.paginate(data.map((item) => ({ ...item, tenant: tenants.get(item.run.tenantId) ?? null })), total, query);
  }

  async aiOperationsOverview() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [settings, agentsByProvider, conversationsByStatus, actionsByStatus, usageByStatus, usageSummary, safetyEvents, recentActions] = await Promise.all([
      this.prisma.aiTenantSettings.groupBy({ by: ['enabled'], _count: { _all: true } }),
      this.prisma.aiAgent.groupBy({ by: ['provider'], _count: { _all: true } }),
      this.prisma.aiConversation.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.aiAction.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.aiUsageLog.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.aiUsageLog.aggregate({ where: { createdAt: { gte: since } }, _sum: { totalTokens: true, estimatedCost: true }, _avg: { latencyMs: true } }),
      this.prisma.securityEvent.findMany({
        where: { OR: [{ type: { contains: 'ai', mode: 'insensitive' } }, { source: { contains: 'ai', mode: 'insensitive' } }] },
        include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      this.prisma.aiAction.findMany({
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          agent: { select: { id: true, name: true, provider: true, model: true } },
          requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      })
    ]);
    return {
      settings: this.groupCounts(settings),
      agents: { byProvider: this.groupCounts(agentsByProvider) },
      conversations: { byStatus: this.groupCounts(conversationsByStatus) },
      actions: { byStatus: this.groupCounts(actionsByStatus) },
      usage: {
        byStatus: this.groupCounts(usageByStatus),
        last30dTokens: usageSummary._sum.totalTokens ?? 0,
        last30dCost: Number(usageSummary._sum.estimatedCost ?? 0),
        averageLatencyMs: Math.round(usageSummary._avg.latencyMs ?? 0)
      },
      safety: { events: safetyEvents.length, recentEvents: safetyEvents },
      recentActions
    };
  }

  async listSiteAiSettings(query: SiteAiSettingsQueryDto) {
    const where: Prisma.AiTenantSettingsWhereInput = {
      tenantId: query.tenantId,
      enabled: this.booleanQuery(query.enabled),
      ...(query.provider ? { allowedProviders: { has: query.provider } } : {}),
      ...(query.search ? { OR: [{ tenant: { name: { contains: query.search, mode: 'insensitive' } } }, { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }, { defaultProvider: { contains: query.search, mode: 'insensitive' } }, { defaultModel: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiTenantSettings.findMany({ where, include: { tenant: { select: { id: true, name: true, slug: true, status: true } } }, orderBy: { updatedAt: 'desc' }, skip: this.skip(query), take: query.limit }),
      this.prisma.aiTenantSettings.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSiteAiAgents(query: SiteAiAgentQueryDto) {
    const where: Prisma.AiAgentWhereInput = {
      tenantId: query.tenantId,
      provider: query.provider,
      model: query.model,
      enabled: this.booleanQuery(query.enabled),
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }, { type: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiAgent.findMany({
        where,
        include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, createdBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }, _count: { select: { conversations: true, actions: true, usageLogs: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.aiAgent.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSiteAiConversations(query: SiteAiConversationQueryDto) {
    const where: Prisma.AiConversationWhereInput = {
      tenantId: query.tenantId,
      agentId: query.agentId,
      status: query.status,
      ...(query.search ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { contextType: { contains: query.search, mode: 'insensitive' } }, { contextId: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiConversation.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          agentId: true,
          userId: true,
          title: true,
          status: true,
          contextType: true,
          contextId: true,
          summary: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          agent: { select: { id: true, name: true, provider: true, model: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          _count: { select: { messages: true, actions: true, usageLogs: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.aiConversation.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSiteAiActions(query: SiteAiActionQueryDto) {
    const where: Prisma.AiActionWhereInput = {
      tenantId: query.tenantId,
      agentId: query.agentId,
      status: query.status,
      type: query.type,
      ...(query.search ? { OR: [{ type: { contains: query.search, mode: 'insensitive' } }, { entityType: { contains: query.search, mode: 'insensitive' } }, { entityId: { contains: query.search, mode: 'insensitive' } }, { error: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiAction.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          agent: { select: { id: true, name: true, provider: true, model: true } },
          conversation: { select: { id: true, title: true, status: true } },
          requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        },
        orderBy: { updatedAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.aiAction.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSiteAiUsage(query: SiteAiUsageQueryDto) {
    const where: Prisma.AiUsageLogWhereInput = {
      tenantId: query.tenantId,
      provider: query.provider,
      model: query.model,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search ? { OR: [{ provider: { contains: query.search, mode: 'insensitive' } }, { model: { contains: query.search, mode: 'insensitive' } }, { requestType: { contains: query.search, mode: 'insensitive' } }, { error: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiUsageLog.findMany({
        where,
        include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }, agent: { select: { id: true, name: true, provider: true, model: true } } },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.aiUsageLog.count({ where })
    ]);
    return this.paginate(data.map((item) => ({ ...item, estimatedCost: item.estimatedCost === null ? null : Number(item.estimatedCost) })), total, query);
  }

  async reportingAnalyticsOverview() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [dashboards, reportsByStatus, reportsByType, executions, exportsByStatus, projectStatus, taskStatus, budgets, exportsRecent, executionsRecent] = await Promise.all([
      this.prisma.dashboard.groupBy({ by: ['visibility'], _count: { _all: true } }),
      this.prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.report.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.reportExecution.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.reportExport.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.task.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      this.prisma.projectBudget.aggregate({ _sum: { planned: true, actual: true } }),
      this.prisma.reportExport.findMany({ include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, report: { select: { id: true, name: true, type: true } }, execution: { select: { id: true, status: true, rowCount: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.reportExecution.findMany({ where: { createdAt: { gte: since } }, include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, report: { select: { id: true, name: true, type: true, status: true } } }, orderBy: { createdAt: 'desc' }, take: 10 })
    ]);
    const completedTasks = await this.prisma.task.count({ where: { completedAt: { gte: since }, deletedAt: null } });
    const completedSprints = await this.prisma.sprint.findMany({
      where: { completedAt: { gte: since } },
      select: { id: true, name: true, completedAt: true, project: { select: { id: true, key: true, name: true, tenantId: true } }, tasks: { select: { storyPoints: true, status: true } } },
      orderBy: { completedAt: 'desc' },
      take: 20
    });
    const velocity = completedSprints.map((sprint) => ({
      id: sprint.id,
      name: sprint.name,
      completedAt: sprint.completedAt,
      project: sprint.project,
      storyPoints: sprint.tasks.reduce((sum, task) => sum + (task.storyPoints ?? 0), 0),
      completedTasks: sprint.tasks.filter((task) => task.status === 'DONE').length
    }));
    return {
      dashboards: this.groupCounts(dashboards),
      reports: { byStatus: this.groupCounts(reportsByStatus), byType: this.groupCounts(reportsByType) },
      executions: this.groupCounts(executions),
      exports: this.groupCounts(exportsByStatus),
      tenantHealth: { projects: this.groupCounts(projectStatus), tasks: this.groupCounts(taskStatus), completedTasksLast30d: completedTasks },
      budget: { planned: Number(budgets._sum.planned ?? 0), actual: Number(budgets._sum.actual ?? 0) },
      velocity,
      recentExports: exportsRecent,
      recentExecutions: executionsRecent
    };
  }

  async listSiteDashboards(query: SiteReportingQueryDto) {
    const where: Prisma.DashboardWhereInput = {
      tenantId: query.tenantId,
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.dashboard.findMany({ where, include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, owner: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }, _count: { select: { widgets: true } } }, orderBy: { updatedAt: 'desc' }, skip: this.skip(query), take: query.limit }),
      this.prisma.dashboard.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSiteReports(query: SiteReportingQueryDto) {
    const where: Prisma.ReportWhereInput = {
      tenantId: query.tenantId,
      type: query.type,
      status: query.status,
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({ where, include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, createdBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }, _count: { select: { executions: true, exports: true } } }, orderBy: { updatedAt: 'desc' }, skip: this.skip(query), take: query.limit }),
      this.prisma.report.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSiteReportExecutions(query: SiteReportExecutionQueryDto) {
    const where: Prisma.ReportExecutionWhereInput = {
      tenantId: query.tenantId,
      reportId: query.reportId,
      type: query.type,
      status: query.status,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search ? { OR: [{ type: { contains: query.search, mode: 'insensitive' } }, { error: { contains: query.search, mode: 'insensitive' } }, { report: { name: { contains: query.search, mode: 'insensitive' } } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.reportExecution.findMany({ where, include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, report: { select: { id: true, name: true, type: true, status: true } }, requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } }, orderBy: { createdAt: 'desc' }, skip: this.skip(query), take: query.limit }),
      this.prisma.reportExecution.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async listSiteReportExports(query: SiteReportExportQueryDto) {
    const where: Prisma.ReportExportWhereInput = {
      tenantId: query.tenantId,
      reportId: query.reportId,
      status: query.status,
      ...(query.search ? { OR: [{ fileName: { contains: query.search, mode: 'insensitive' } }, { error: { contains: query.search, mode: 'insensitive' } }, { report: { name: { contains: query.search, mode: 'insensitive' } } }] } : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.reportExport.findMany({ where, include: { tenant: { select: { id: true, name: true, slug: true, status: true } }, report: { select: { id: true, name: true, type: true } }, execution: { select: { id: true, status: true, rowCount: true } }, requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } }, orderBy: { createdAt: 'desc' }, skip: this.skip(query), take: query.limit }),
      this.prisma.reportExport.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async hardeningQaOverview() {
    const [platformAdmins, openEvents, recentPlatformAudit, tenants, users, apiKeys, complianceJobs, failedWorkflowRuns, failedAiUsage, failedReportExecutions] = await Promise.all([
      this.rawCount(`SELECT COUNT(*)::int as count FROM "PlatformAdmin" WHERE "status" = 'ACTIVE'`),
      this.prisma.securityEvent.count({ where: { status: SecurityEventStatus.OPEN } }),
      this.prisma.platformAuditLog.findMany({ include: { targetTenant: { select: { id: true, name: true, slug: true, status: true } }, actor: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } }, orderBy: { createdAt: 'desc' }, take: 12 }),
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.apiKey.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.complianceJob.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.workflowRun.count({ where: { status: WorkflowRunStatus.FAILED } }),
      this.prisma.aiUsageLog.count({ where: { status: AiRequestStatus.FAILED } }),
      this.prisma.reportExecution.count({ where: { status: ReportExecutionStatus.FAILED } })
    ]);
    return {
      checks: {
        siteAdminGuard: 'enabled',
        tenantIsolation: 'platform-admin-guarded',
        auditCoverage: recentPlatformAudit.length > 0 ? 'active' : 'needs-events',
        paginationMaxLimit: 100,
        swaggerBoundary: 'site-admin-tagged',
        productionLogging: 'request-id-and-interceptors'
      },
      data: {
        platformAdmins,
        tenants,
        users,
        openSecurityEvents: openEvents,
        apiKeys: this.groupCounts(apiKeys),
        complianceJobs: this.groupCounts(complianceJobs),
        failedWorkflowRuns,
        failedAiUsage,
        failedReportExecutions
      },
      qaMatrix: [
        { area: 'Site Admin endpoint tests', status: 'planned', evidence: 'Build verifies route registration; e2e specs still recommended.' },
        { area: 'Guard tests', status: 'partial', evidence: 'PlatformAdminGuard protects all new routes.' },
        { area: 'Tenant isolation tests', status: 'partial', evidence: 'Queries preserve tenant IDs and expose tenant metadata for inspection.' },
        { area: 'Audit coverage tests', status: 'partial', evidence: 'Mutating site-admin operations write platform audit records.' },
        { area: 'UI permission checks', status: 'active', evidence: 'Action buttons are role-aware in operation pages.' },
        { area: 'Pagination limits', status: 'active', evidence: 'Shared PaginationQueryDto maxes at 100 and frontend caps request limits.' }
      ],
      recentPlatformAudit
    };
  }

  async getTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: tenantSelect
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const [
      userCounts,
      projectCounts,
      projectVisibilityCounts,
      taskStatusCounts,
      taskPriorityCounts,
      taskTypeCounts,
      activeSessions,
      revokedSessions,
      openSecurityEvents,
      totalSecurityEvents,
      workspaceCount,
      teamCount,
      sprintCount,
      boardCount,
      milestoneCount,
      openRiskCount,
      budgetTotals,
      fileCount,
      integrationCount,
      webhookCount,
      apiKeyCount,
      aiAgentCount,
      reportCount,
      dashboardCount,
      auditLogCount,
      platformAuditLogCount,
      mfaFactorCount,
      trustedDeviceCount,
      ssoProviderCount,
      projects,
      recentUsers,
      recentTasks,
      recentSecurityEvents
    ] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true }
      }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true }
      }),
      this.prisma.project.groupBy({
        by: ['visibility'],
        where: { tenantId },
        _count: { _all: true }
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { _all: true }
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { tenantId, deletedAt: null },
        _count: { _all: true }
      }),
      this.prisma.task.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null },
        _count: { _all: true }
      }),
      this.prisma.authSession.count({
        where: { tenantId, revokedAt: null, expiresAt: { gt: new Date() } }
      }),
      this.prisma.authSession.count({
        where: { tenantId, revokedAt: { not: null } }
      }),
      this.prisma.securityEvent.count({ where: { tenantId, status: SecurityEventStatus.OPEN } }),
      this.prisma.securityEvent.count({ where: { tenantId } }),
      this.prisma.workspace.count({ where: { tenantId } }),
      this.prisma.team.count({ where: { tenantId } }),
      this.prisma.sprint.count({ where: { project: { tenantId } } }),
      this.prisma.board.count({ where: { tenantId } }),
      this.prisma.milestone.count({ where: { project: { tenantId } } }),
      this.prisma.projectRisk.count({ where: { project: { tenantId }, isOpen: true } }),
      this.prisma.projectBudget.aggregate({
        where: { project: { tenantId } },
        _sum: { planned: true, actual: true }
      }),
      this.prisma.fileAsset.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.integration.count({ where: { tenantId } }),
      this.prisma.webhook.count({ where: { tenantId } }),
      this.prisma.apiKey.count({ where: { tenantId, revokedAt: null } }),
      this.prisma.aiAgent.count({ where: { tenantId, archivedAt: null } }),
      this.prisma.report.count({ where: { tenantId, archivedAt: null } }),
      this.prisma.dashboard.count({ where: { tenantId, archivedAt: null } }),
      this.prisma.auditLog.count({ where: { tenantId } }),
      this.prisma.platformAuditLog.count({ where: { targetTenantId: tenantId } }),
      this.prisma.userMfaFactor.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.trustedDevice.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.ssoProvider.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.project.findMany({
        where: { tenantId },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          status: true,
          visibility: true,
          progress: true,
          startDate: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          workspace: { select: { id: true, name: true, slug: true } },
          team: { select: { id: true, name: true } },
          _count: {
            select: {
              members: true,
              tasks: true,
              sprints: true,
              boards: true,
              milestones: true,
              risks: true,
              budgets: true,
              documents: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      this.prisma.user.findMany({
        where: { tenantId },
        select: siteUserSelect,
        orderBy: { createdAt: 'desc' },
        take: 8
      }),
      this.prisma.task.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          id: true,
          key: true,
          title: true,
          type: true,
          status: true,
          priority: true,
          storyPoints: true,
          dueDate: true,
          updatedAt: true,
          project: { select: { id: true, key: true, name: true } },
          _count: { select: { assignees: true, comments: true, checklists: true, attachments: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 12
      }),
      this.prisma.securityEvent.findMany({
        where: { tenantId },
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          source: true,
          subjectType: true,
          subjectId: true,
          createdAt: true,
          actor: { select: { id: true, email: true, firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 8
      })
    ]);

    const taskCounts = this.groupCounts(taskStatusCounts);
    const openTasks = Object.entries(taskCounts).reduce((sum, [status, count]) => {
      return ['DONE', 'CANCELLED'].includes(status) ? sum : sum + count;
    }, 0);
    const overdueTasks = await this.prisma.task.count({
      where: {
        tenantId,
        deletedAt: null,
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'CANCELLED'] }
      }
    });
    const overdueProjects = await this.prisma.project.count({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'ARCHIVED'] }
      }
    });
    const plannedBudget = Number(budgetTotals._sum.planned ?? 0);
    const actualBudget = Number(budgetTotals._sum.actual ?? 0);

    return {
      tenant,
      users: this.groupCounts(userCounts),
      sessions: { active: activeSessions, revoked: revokedSessions },
      securityEvents: { open: openSecurityEvents, total: totalSecurityEvents },
      indices: {
        workspace: {
          workspaces: workspaceCount,
          teams: teamCount,
          integrations: integrationCount,
          webhooks: webhookCount,
          files: fileCount,
          aiAgents: aiAgentCount,
          reports: reportCount,
          dashboards: dashboardCount
        },
        projects: {
          total: tenant._count.projects,
          byStatus: this.groupCounts(projectCounts),
          byVisibility: this.groupCounts(projectVisibilityCounts),
          overdue: overdueProjects
        },
        tasks: {
          total: Object.values(taskCounts).reduce((sum, count) => sum + count, 0),
          open: openTasks,
          overdue: overdueTasks,
          byStatus: taskCounts,
          byPriority: this.groupCounts(taskPriorityCounts),
          byType: this.groupCounts(taskTypeCounts)
        },
        delivery: {
          sprints: sprintCount,
          boards: boardCount,
          milestones: milestoneCount,
          openRisks: openRiskCount,
          plannedBudget,
          actualBudget,
          budgetVariance: plannedBudget - actualBudget
        },
        security: {
          activeSessions,
          revokedSessions,
          openSecurityEvents,
          totalSecurityEvents,
          apiKeys: apiKeyCount,
          auditLogs: auditLogCount,
          platformAuditLogs: platformAuditLogCount,
          mfaFactors: mfaFactorCount,
          trustedDevices: trustedDeviceCount,
          ssoProviders: ssoProviderCount
        }
      },
      projects,
      recentUsers,
      recentTasks,
      recentSecurityEvents
    };
  }

  async updateTenantStatus(
    actor: AuthenticatedUser,
    tenantId: string,
    dto: UpdateTenantStatusDto,
    meta: RequestMeta
  ) {
    const before = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, status: true }
    });

    if (!before) {
      throw new NotFoundException('Tenant not found');
    }

    if (before.status === dto.status) {
      return before;
    }

    const after = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: dto.status },
      select: tenantSelect
    });

    if (dto.status === TenantStatus.SUSPENDED || dto.status === TenantStatus.CANCELLED) {
      await this.prisma.authSession.updateMany({
        where: { tenantId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }

    await Promise.all([
      this.auditService.record({
        tenantId,
        actorId: actor.id,
        action: 'platform.tenant_status_changed',
        entityType: 'Tenant',
        entityId: tenantId,
        oldValue: { status: before.status },
        newValue: { status: dto.status, reason: dto.reason },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId,
          actorId: actor.id,
          type: 'platform.tenant_status_changed',
          severity: dto.status === TenantStatus.ACTIVE ? SecurityEventSeverity.MEDIUM : SecurityEventSeverity.HIGH,
          source: 'site-admin',
          subjectType: 'Tenant',
          subjectId: tenantId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: {
            beforeStatus: before.status,
            afterStatus: dto.status,
            reason: dto.reason ?? null
          }
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action: 'platform.tenant_status_changed',
        entityType: 'Tenant',
        entityId: tenantId,
        targetTenantId: tenantId,
        oldValue: { status: before.status },
        newValue: { status: dto.status, reason: dto.reason ?? null },
        meta
      })
    ]);

    return after;
  }

  async listTenantUsers(tenantId: string, query: SiteTenantUsersQueryDto) {
    await this.assertTenantExists(tenantId);
    const where: Prisma.UserWhereInput = {
      tenantId,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: siteUserSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.user.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async listTenantProjects(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const where: Prisma.ProjectWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { key: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total, statusCounts, visibilityCounts, overdue] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          key: true,
          name: true,
          description: true,
          status: true,
          visibility: true,
          progress: true,
          startDate: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          workspace: { select: { id: true, name: true, slug: true } },
          team: { select: { id: true, name: true } },
          _count: {
            select: {
              members: true,
              tasks: true,
              sprints: true,
              boards: true,
              milestones: true,
              risks: true,
              budgets: true,
              documents: true
            }
          }
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.project.count({ where }),
      this.prisma.project.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.project.groupBy({ by: ['visibility'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.project.count({
        where: { tenantId, dueDate: { lt: new Date() }, status: { notIn: ['COMPLETED', 'ARCHIVED'] } }
      })
    ]);

    return this.resourceResponse(tenant, 'projects', data, total, query, {
      total,
      overdue,
      byStatus: this.groupCounts(statusCounts),
      byVisibility: this.groupCounts(visibilityCounts)
    });
  }

  async listTenantWorkspaces(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const where: Prisma.WorkspaceWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workspace.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { projects: true, teams: true, customFields: true } }
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.workspace.count({ where })
    ]);
    return this.resourceResponse(tenant, 'workspaces', data, total, query, { total });
  }

  async listTenantTeams(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const where: Prisma.TeamWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { workspace: { name: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          workspaceId: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          workspace: { select: { id: true, name: true, slug: true } },
          _count: { select: { members: true, projects: true } }
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.team.count({ where })
    ]);
    return this.resourceResponse(tenant, 'teams', data, total, query, { total });
  }

  async listTenantSessions(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const now = new Date();
    const where: Prisma.AuthSessionWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { ipAddress: { contains: query.search, mode: 'insensitive' } },
              { userAgent: { contains: query.search, mode: 'insensitive' } },
              { deviceName: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
              { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
              { user: { lastName: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total, active, revoked, expired] = await Promise.all([
      this.prisma.authSession.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          authMethod: true,
          mfaVerifiedAt: true,
          deviceName: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          trustedDevice: { select: { id: true, name: true, status: true, lastUsedAt: true } }
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.authSession.count({ where }),
      this.prisma.authSession.count({ where: { tenantId, revokedAt: null, expiresAt: { gt: now } } }),
      this.prisma.authSession.count({ where: { tenantId, revokedAt: { not: null } } }),
      this.prisma.authSession.count({ where: { tenantId, revokedAt: null, expiresAt: { lte: now } } })
    ]);
    return this.resourceResponse(tenant, 'sessions', data, total, query, { total, active, revoked, expired });
  }

  async listTenantSecurity(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const where: Prisma.SecurityEventWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { type: { contains: query.search, mode: 'insensitive' } },
              { source: { contains: query.search, mode: 'insensitive' } },
              { subjectType: { contains: query.search, mode: 'insensitive' } },
              { subjectId: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total, severityCounts, statusCounts, policy, apiKeys, ssoProviders, mfaFactors, trustedDevices] =
      await Promise.all([
        this.prisma.securityEvent.findMany({
          where,
          include: {
            actor: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
            resolvedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
          },
          orderBy: [{ createdAt: 'desc' }],
          skip: this.skip(query),
          take: query.limit
        }),
        this.prisma.securityEvent.count({ where }),
        this.prisma.securityEvent.groupBy({ by: ['severity'], where: { tenantId }, _count: { _all: true } }),
        this.prisma.securityEvent.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
        this.prisma.securityPolicy.findUnique({ where: { tenantId } }),
        this.prisma.apiKey.count({ where: { tenantId, status: 'ACTIVE' } }),
        this.prisma.ssoProvider.count({ where: { tenantId, status: 'ACTIVE' } }),
        this.prisma.userMfaFactor.count({ where: { tenantId, status: 'ACTIVE' } }),
        this.prisma.trustedDevice.count({ where: { tenantId, status: 'ACTIVE' } })
      ]);
    return this.resourceResponse(tenant, 'security', data, total, query, {
      total,
      open: statusCounts.find((row) => row.status === SecurityEventStatus.OPEN)?._count._all ?? 0,
      bySeverity: this.groupCounts(severityCounts),
      byStatus: this.groupCounts(statusCounts),
      apiKeys,
      ssoProviders,
      mfaFactors,
      trustedDevices,
      mfaRequired: policy?.mfaRequired ?? false,
      ssoRequired: policy?.ssoRequired ?? false
    });
  }

  async listTenantBilling(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const [subscription, invoices, usageRecords, billingEvents, usageTotal, eventTotal] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { tenantId },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              currency: true,
              interval: true,
              seatLimit: true
            }
          }
        }
      }),
      this.prisma.invoice.findMany({
        where: { tenantId },
        orderBy: [{ createdAt: 'desc' }],
        take: Math.min(query.limit, 20)
      }),
      this.prisma.usageRecord.findMany({
        where: {
          tenantId,
          ...(query.search
            ? {
                OR: [
                  { featureKey: { contains: query.search, mode: 'insensitive' } },
                  { unit: { contains: query.search, mode: 'insensitive' } }
                ]
              }
            : {})
        },
        include: { feature: { select: { id: true, key: true, name: true, category: true, unit: true } } },
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.billingEvent.findMany({
        where: { tenantId },
        orderBy: [{ createdAt: 'desc' }],
        take: 20
      }),
      this.prisma.usageRecord.count({ where: { tenantId } }),
      this.prisma.billingEvent.count({ where: { tenantId } })
    ]);
    const data = [
      ...(subscription ? [{ kind: 'subscription', ...subscription }] : []),
      ...invoices.map((invoice) => ({ kind: 'invoice', ...invoice })),
      ...usageRecords.map((record) => ({ kind: 'usage', ...record })),
      ...billingEvents.map((event) => ({ kind: 'billingEvent', ...event }))
    ];
    return this.resourceResponse(tenant, 'billing', data, Math.max(usageTotal, data.length), query, {
      subscriptionStatus: subscription?.status ?? 'NONE',
      plan: subscription?.plan?.name ?? null,
      seats: subscription?.seatCount ?? 0,
      invoices: invoices.length,
      usageRecords: usageTotal,
      billingEvents: eventTotal
    });
  }

  async listTenantIntegrations(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const integrationWhere: Prisma.IntegrationWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { externalAccountId: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [integrations, total, providerCounts, statusCounts, webhooks, deliveries] = await Promise.all([
      this.prisma.integration.findMany({
        where: integrationWhere,
        select: {
          id: true,
          tenantId: true,
          provider: true,
          name: true,
          externalAccountId: true,
          scopes: true,
          enabled: true,
          status: true,
          lastSyncAt: true,
          lastError: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { logs: true } }
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.integration.count({ where: integrationWhere }),
      this.prisma.integration.groupBy({ by: ['provider'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.integration.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.webhook.findMany({
        where: { tenantId },
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          url: true,
          events: true,
          enabled: true,
          failureCount: true,
          lastDeliveryAt: true,
          lastError: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { deliveries: true } }
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 20
      }),
      this.prisma.webhookDelivery.findMany({
        where: { tenantId },
        select: {
          id: true,
          tenantId: true,
          webhookId: true,
          eventType: true,
          status: true,
          attempts: true,
          nextAttemptAt: true,
          lastError: true,
          responseStatus: true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20
      })
    ]);
    const data = [
      ...integrations.map((item) => ({ kind: 'integration', ...item })),
      ...webhooks.map((item) => ({ kind: 'webhook', ...item })),
      ...deliveries.map((item) => ({ kind: 'webhookDelivery', ...item }))
    ];
    return this.resourceResponse(tenant, 'integrations', data, total, query, {
      total,
      webhooks: webhooks.length,
      recentDeliveries: deliveries.length,
      byProvider: this.groupCounts(providerCounts),
      byStatus: this.groupCounts(statusCounts)
    });
  }

  async listTenantFiles(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const where: Prisma.FileAssetWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { fileName: { contains: query.search, mode: 'insensitive' } },
              { provider: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
              { scope: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total, scopeCounts, providerCounts, bytes] = await Promise.all([
      this.prisma.fileAsset.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          uploadedById: true,
          scope: true,
          entityType: true,
          entityId: true,
          fileName: true,
          fileUrl: true,
          storageKey: true,
          provider: true,
          mimeType: true,
          sizeBytes: true,
          visibility: true,
          archivedAt: true,
          deletedAt: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.fileAsset.count({ where }),
      this.prisma.fileAsset.groupBy({ by: ['scope'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.fileAsset.groupBy({ by: ['provider'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.fileAsset.aggregate({ where: { tenantId, deletedAt: null }, _sum: { sizeBytes: true } })
    ]);
    return this.resourceResponse(tenant, 'files', data, total, query, {
      total,
      active: await this.prisma.fileAsset.count({ where: { tenantId, deletedAt: null, archivedAt: null } }),
      archived: await this.prisma.fileAsset.count({ where: { tenantId, archivedAt: { not: null } } }),
      deleted: await this.prisma.fileAsset.count({ where: { tenantId, deletedAt: { not: null } } }),
      bytes: bytes._sum.sizeBytes ?? 0,
      byScope: this.groupCounts(scopeCounts),
      byProvider: this.groupCounts(providerCounts)
    });
  }

  async listTenantAiUsage(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const usageWhere: Prisma.AiUsageLogWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { provider: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { requestType: { contains: query.search, mode: 'insensitive' } },
              { error: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [settings, agents, usageLogs, total, statusCounts, tokenTotals, actionCounts, conversationCounts] =
      await Promise.all([
        this.prisma.aiTenantSettings.findUnique({ where: { tenantId } }),
        this.prisma.aiAgent.findMany({
          where: { tenantId, archivedAt: null },
          select: {
            id: true,
            tenantId: true,
            createdById: true,
            name: true,
            description: true,
            type: true,
            provider: true,
            model: true,
            tools: true,
            enabled: true,
            archivedAt: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { conversations: true, actions: true, usageLogs: true } }
          },
          orderBy: [{ updatedAt: 'desc' }],
          take: 20
        }),
        this.prisma.aiUsageLog.findMany({
          where: usageWhere,
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
            agent: { select: { id: true, name: true, provider: true, model: true } }
          },
          orderBy: [{ createdAt: 'desc' }],
          skip: this.skip(query),
          take: query.limit
        }),
        this.prisma.aiUsageLog.count({ where: usageWhere }),
        this.prisma.aiUsageLog.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
        this.prisma.aiUsageLog.aggregate({
          where: { tenantId },
          _sum: { inputTokens: true, outputTokens: true, totalTokens: true, estimatedCost: true }
        }),
        this.prisma.aiAction.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
        this.prisma.aiConversation.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } })
      ]);
    const data = [
      ...(settings ? [{ kind: 'settings', ...settings }] : []),
      ...agents.map((item) => ({ kind: 'agent', ...item })),
      ...usageLogs.map((item) => ({ kind: 'usage', ...item }))
    ];
    return this.resourceResponse(tenant, 'ai', data, total, query, {
      enabled: settings?.enabled ?? false,
      agents: agents.length,
      usageLogs: total,
      inputTokens: tokenTotals._sum.inputTokens ?? 0,
      outputTokens: tokenTotals._sum.outputTokens ?? 0,
      totalTokens: tokenTotals._sum.totalTokens ?? 0,
      estimatedCost: Number(tokenTotals._sum.estimatedCost ?? 0),
      byUsageStatus: this.groupCounts(statusCounts),
      byActionStatus: this.groupCounts(actionCounts),
      byConversationStatus: this.groupCounts(conversationCounts)
    });
  }

  async listTenantReports(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const reportWhere: Prisma.ReportWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { type: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [reports, total, dashboards, executions, exports, statusCounts, dashboardVisibility] = await Promise.all([
      this.prisma.report.findMany({
        where: reportWhere,
        select: {
          id: true,
          tenantId: true,
          createdById: true,
          name: true,
          description: true,
          type: true,
          status: true,
          schedule: true,
          timezone: true,
          recipients: true,
          cacheTtlSeconds: true,
          lastRunAt: true,
          nextRunAt: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          _count: { select: { executions: true, exports: true } }
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.report.count({ where: reportWhere }),
      this.prisma.dashboard.findMany({
        where: { tenantId, archivedAt: null },
        select: {
          id: true,
          tenantId: true,
          ownerId: true,
          name: true,
          description: true,
          visibility: true,
          isDefault: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          _count: { select: { widgets: true } }
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 20
      }),
      this.prisma.reportExecution.findMany({
        where: { tenantId },
        select: {
          id: true,
          tenantId: true,
          reportId: true,
          requestedById: true,
          type: true,
          status: true,
          error: true,
          rowCount: true,
          startedAt: true,
          completedAt: true,
          durationMs: true,
          createdAt: true,
          updatedAt: true,
          report: { select: { id: true, name: true, type: true, status: true } }
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20
      }),
      this.prisma.reportExport.findMany({
        where: { tenantId },
        select: {
          id: true,
          tenantId: true,
          reportId: true,
          executionId: true,
          requestedById: true,
          format: true,
          status: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          sizeBytes: true,
          expiresAt: true,
          error: true,
          createdAt: true,
          updatedAt: true,
          report: { select: { id: true, name: true, type: true } },
          execution: { select: { id: true, status: true, rowCount: true } }
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20
      }),
      this.prisma.report.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.dashboard.groupBy({ by: ['visibility'], where: { tenantId }, _count: { _all: true } })
    ]);
    const data = [
      ...reports.map((item) => ({ kind: 'report', ...item })),
      ...dashboards.map((item) => ({ kind: 'dashboard', ...item })),
      ...executions.map((item) => ({ kind: 'execution', ...item })),
      ...exports.map((item) => ({ kind: 'export', ...item }))
    ];
    return this.resourceResponse(tenant, 'reports', data, total, query, {
      reports: total,
      dashboards: dashboards.length,
      executions: executions.length,
      exports: exports.length,
      byReportStatus: this.groupCounts(statusCounts),
      byDashboardVisibility: this.groupCounts(dashboardVisibility)
    });
  }

  async listTenantActivity(tenantId: string, query: SiteTenantResourceQueryDto) {
    const tenant = await this.getTenantSummary(tenantId);
    const auditWhere: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } },
              { entityId: { contains: query.search, mode: 'insensitive' } },
              { ipAddress: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [auditLogs, total, platformRows, securityEvents, actionCounts] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: auditWhere,
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit
      }),
      this.prisma.auditLog.count({ where: auditWhere }),
      this.prisma.$queryRaw<PlatformAuditRow[]>(Prisma.sql`
        SELECT pal."id",
               pal."actorId",
               pal."action",
               pal."entityType",
               pal."entityId",
               pal."targetTenantId",
               pal."oldValue",
               pal."newValue",
               pal."ipAddress",
               pal."userAgent",
               pal."createdAt",
               actor."email" as "actorEmail",
               actor."firstName" as "actorFirstName",
               actor."lastName" as "actorLastName",
               tenant."name" as "tenantName",
               tenant."slug" as "tenantSlug"
        FROM "PlatformAuditLog" pal
        LEFT JOIN "User" actor ON actor."id" = pal."actorId"
        LEFT JOIN "Tenant" tenant ON tenant."id" = pal."targetTenantId"
        WHERE pal."targetTenantId" = ${tenantId}
        ORDER BY pal."createdAt" DESC
        LIMIT 20
      `),
      this.prisma.securityEvent.findMany({
        where: { tenantId },
        select: {
          id: true,
          type: true,
          severity: true,
          status: true,
          source: true,
          subjectType: true,
          subjectId: true,
          createdAt: true
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20
      }),
      this.prisma.auditLog.groupBy({ by: ['action'], where: { tenantId }, _count: { _all: true } })
    ]);
    const platformAuditLogs = platformRows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      targetTenantId: row.targetTenantId,
      oldValue: row.oldValue,
      newValue: row.newValue,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
      actor: row.actorId
        ? { id: row.actorId, email: row.actorEmail, firstName: row.actorFirstName, lastName: row.actorLastName }
        : null,
      targetTenant: row.targetTenantId ? { id: row.targetTenantId, name: row.tenantName, slug: row.tenantSlug } : null
    }));
    const data = [
      ...auditLogs.map((item) => ({ kind: 'tenantAudit', ...item })),
      ...platformAuditLogs.map((item) => ({ kind: 'platformAudit', ...item })),
      ...securityEvents.map((item) => ({ kind: 'securityEvent', ...item }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return this.resourceResponse(tenant, 'activity', data, total, query, {
      tenantAuditLogs: total,
      platformAuditLogs: platformAuditLogs.length,
      securityEvents: securityEvents.length,
      byAction: this.groupCounts(actionCounts)
    });
  }

  async listSecurityEvents(query: SiteSecurityEventQueryDto) {
    const where: Prisma.SecurityEventWhereInput = {
      tenantId: query.tenantId,
      severity: query.severity,
      status: query.status,
      type: query.type,
      ...(query.search
        ? {
            OR: [
              { type: { contains: query.search, mode: 'insensitive' } },
              { source: { contains: query.search, mode: 'insensitive' } },
              { subjectType: { contains: query.search, mode: 'insensitive' } },
              { subjectId: { contains: query.search, mode: 'insensitive' } },
              { tenant: { name: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { slug: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.securityEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: this.skip(query),
        take: query.limit,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          actor: { select: { id: true, email: true, firstName: true, lastName: true } },
          resolvedBy: { select: { id: true, email: true, firstName: true, lastName: true } }
        }
      }),
      this.prisma.securityEvent.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async updateSecurityEvent(
    actor: AuthenticatedUser,
    eventId: string,
    dto: UpdateSiteSecurityEventDto,
    meta: RequestMeta
  ) {
    const before = await this.prisma.securityEvent.findUnique({
      where: { id: eventId },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        actor: { select: { id: true, email: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });

    if (!before) {
      throw new NotFoundException('Security event not found');
    }

    const statusChanged = dto.status !== undefined;
    const terminal = dto.status === SecurityEventStatus.RESOLVED || dto.status === SecurityEventStatus.DISMISSED;
    const data: Prisma.SecurityEventUpdateInput = {
      status: dto.status,
      severity: dto.severity,
      metadata: dto.metadata === undefined ? undefined : (dto.metadata as Prisma.InputJsonValue)
    };

    if (statusChanged) {
      data.resolvedAt = terminal ? new Date() : null;
      data.resolvedBy = terminal ? { connect: { id: actor.id } } : { disconnect: true };
    }

    const after = await this.prisma.securityEvent.update({
      where: { id: eventId },
      data,
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        actor: { select: { id: true, email: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });

    await this.recordPlatformAudit({
      actorId: actor.id,
      action: 'platform.security_event_updated',
      entityType: 'SecurityEvent',
      entityId: eventId,
      targetTenantId: before.tenantId,
      oldValue: {
        status: before.status,
        severity: before.severity,
        metadata: before.metadata
      },
      newValue: {
        status: after.status,
        severity: after.severity,
        metadata: after.metadata
      },
      meta
    });

    return after;
  }

  async listPlatformAuditLogs(query: PlatformAuditQueryDto) {
    const where = this.platformAuditWhere(query);
    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<PlatformAuditRow[]>(Prisma.sql`
        SELECT pal."id",
               pal."actorId",
               pal."action",
               pal."entityType",
               pal."entityId",
               pal."targetTenantId",
               pal."oldValue",
               pal."newValue",
               pal."ipAddress",
               pal."userAgent",
               pal."createdAt",
               actor."email" as "actorEmail",
               actor."firstName" as "actorFirstName",
               actor."lastName" as "actorLastName",
               tenant."name" as "tenantName",
               tenant."slug" as "tenantSlug"
        FROM "PlatformAuditLog" pal
        LEFT JOIN "User" actor ON actor."id" = pal."actorId"
        LEFT JOIN "Tenant" tenant ON tenant."id" = pal."targetTenantId"
        WHERE ${where}
        ORDER BY pal."createdAt" DESC
        LIMIT ${query.limit}
        OFFSET ${this.skip(query)}
      `),
      this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int as count
        FROM "PlatformAuditLog" pal
        LEFT JOIN "User" actor ON actor."id" = pal."actorId"
        LEFT JOIN "Tenant" tenant ON tenant."id" = pal."targetTenantId"
        WHERE ${where}
      `)
    ]);

    return this.paginate(
      rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        targetTenantId: row.targetTenantId,
        oldValue: row.oldValue,
        newValue: row.newValue,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        actor: row.actorId
          ? {
              id: row.actorId,
              email: row.actorEmail,
              firstName: row.actorFirstName,
              lastName: row.actorLastName
            }
          : null,
        targetTenant: row.targetTenantId
          ? {
              id: row.targetTenantId,
              name: row.tenantName,
              slug: row.tenantSlug
            }
          : null
      })),
      countRows[0]?.count ?? 0,
      query
    );
  }

  async listPlatformAdmins(query: PlatformAdminQueryDto) {
    const where = this.platformAdminWhere(query);
    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<PlatformAdminRow[]>(Prisma.sql`
        SELECT pa."id",
               pa."userId",
               pa."level"::text as "level",
               pa."status"::text as "status",
               pa."scopes",
               pa."grantedById",
               pa."revokedById",
               pa."revokedAt",
               pa."notes",
               pa."createdAt",
               pa."updatedAt",
               u."email",
               u."firstName",
               u."lastName",
               u."tenantId",
               t."name" as "tenantName",
               t."slug" as "tenantSlug"
        FROM "PlatformAdmin" pa
        JOIN "User" u ON u."id" = pa."userId"
        JOIN "Tenant" t ON t."id" = u."tenantId"
        WHERE ${where}
        ORDER BY pa."createdAt" DESC
        LIMIT ${query.limit}
        OFFSET ${this.skip(query)}
      `),
      this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int as count
        FROM "PlatformAdmin" pa
        JOIN "User" u ON u."id" = pa."userId"
        JOIN "Tenant" t ON t."id" = u."tenantId"
        WHERE ${where}
      `)
    ]);

    return this.paginate(rows.map((row) => this.serializePlatformAdmin(row)), countRows[0]?.count ?? 0, query);
  }

  async grantPlatformAdmin(
    actor: AuthenticatedUser,
    dto: GrantPlatformAdminDto,
    meta: RequestMeta
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        email: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (dto.level === 'OWNER' && actor.platformAdminLevel !== 'OWNER') {
      throw new BadRequestException('Only a platform owner can grant platform owner access');
    }

    const scopes = this.normalizeScopes(dto.scopes);
    const [existing] = await this.prisma.$queryRaw<Array<{ id: string; level: string; status: string; scopes: string[] }>>`
      SELECT "id", "level"::text as "level", "status"::text as "status", "scopes"
      FROM "PlatformAdmin"
      WHERE "userId" = ${dto.userId}
      LIMIT 1
    `;

    const profileId = existing?.id ?? randomUUID();

    if (existing) {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE "PlatformAdmin"
        SET "level" = ${dto.level}::"PlatformAdminLevel",
            "status" = 'ACTIVE'::"PlatformAdminStatus",
            "scopes" = ${this.textArray(scopes)},
            "grantedById" = ${actor.id},
            "revokedById" = NULL,
            "revokedAt" = NULL,
            "notes" = ${dto.notes ?? null},
            "updatedAt" = NOW()
        WHERE "id" = ${profileId}
      `);
    } else {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "PlatformAdmin" (
          "id",
          "userId",
          "level",
          "status",
          "scopes",
          "grantedById",
          "notes",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${profileId},
          ${dto.userId},
          ${dto.level}::"PlatformAdminLevel",
          'ACTIVE'::"PlatformAdminStatus",
          ${this.textArray(scopes)},
          ${actor.id},
          ${dto.notes ?? null},
          NOW(),
          NOW()
        )
      `);
    }

    await this.recordPlatformAudit({
      actorId: actor.id,
      action: existing ? 'platform.admin_updated' : 'platform.admin_granted',
      entityType: 'PlatformAdmin',
      entityId: profileId,
      targetTenantId: target.tenantId,
      oldValue: existing ?? null,
      newValue: {
        userId: dto.userId,
        email: target.email,
        level: dto.level,
        scopes,
        notes: dto.notes ?? null
      },
      meta
    });

    await this.prisma.securityEvent.create({
      data: {
        tenantId: target.tenantId,
        actorId: actor.id,
        type: existing ? 'platform.admin_updated' : 'platform.admin_granted',
        severity: SecurityEventSeverity.HIGH,
        source: 'site-admin',
        subjectType: 'User',
        subjectId: target.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: {
          email: target.email,
          level: dto.level,
          scopes
        }
      }
    });

    return this.getPlatformAdmin(profileId);
  }

  async revokePlatformAdmin(
    actor: AuthenticatedUser,
    platformAdminId: string,
    dto: RevokePlatformAdminDto,
    meta: RequestMeta
  ) {
    const before = await this.getPlatformAdminRow(platformAdminId);

    if (!before) {
      throw new NotFoundException('Platform admin profile not found');
    }

    if (before.status === 'REVOKED') {
      return this.serializePlatformAdmin(before);
    }

    if (before.level === 'OWNER') {
      const owners = await this.rawCount(
        `SELECT COUNT(*)::int as count FROM "PlatformAdmin" WHERE "level" = 'OWNER' AND "status" = 'ACTIVE' AND "revokedAt" IS NULL`
      );
      if (owners <= 1) {
        throw new BadRequestException('At least one active platform owner is required');
      }
    }

    await this.prisma.$executeRaw`
      UPDATE "PlatformAdmin"
      SET "status" = 'REVOKED'::"PlatformAdminStatus",
          "revokedById" = ${actor.id},
          "revokedAt" = NOW(),
          "notes" = ${dto.reason ?? before.notes},
          "updatedAt" = NOW()
      WHERE "id" = ${platformAdminId}
    `;

    await this.recordPlatformAudit({
      actorId: actor.id,
      action: 'platform.admin_revoked',
      entityType: 'PlatformAdmin',
      entityId: platformAdminId,
      targetTenantId: before.tenantId,
      oldValue: this.serializePlatformAdmin(before),
      newValue: { status: 'REVOKED', reason: dto.reason ?? null },
      meta
    });

    await this.prisma.securityEvent.create({
      data: {
        tenantId: before.tenantId,
        actorId: actor.id,
        type: 'platform.admin_revoked',
        severity: SecurityEventSeverity.HIGH,
        source: 'site-admin',
        subjectType: 'User',
        subjectId: before.userId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: {
          email: before.email,
          level: before.level,
          reason: dto.reason ?? null
        }
      }
    });

    const after = await this.getPlatformAdminRow(platformAdminId);
    return after ? this.serializePlatformAdmin(after) : null;
  }

  private async getPlatformAdmin(platformAdminId: string) {
    const row = await this.getPlatformAdminRow(platformAdminId);
    if (!row) {
      throw new NotFoundException('Platform admin profile not found');
    }
    return this.serializePlatformAdmin(row);
  }

  private async getPlatformAdminRow(platformAdminId: string) {
    const [row] = await this.prisma.$queryRaw<PlatformAdminRow[]>`
      SELECT pa."id",
             pa."userId",
             pa."level"::text as "level",
             pa."status"::text as "status",
             pa."scopes",
             pa."grantedById",
             pa."revokedById",
             pa."revokedAt",
             pa."notes",
             pa."createdAt",
             pa."updatedAt",
             u."email",
             u."firstName",
             u."lastName",
             u."tenantId",
             t."name" as "tenantName",
             t."slug" as "tenantSlug"
      FROM "PlatformAdmin" pa
      JOIN "User" u ON u."id" = pa."userId"
      JOIN "Tenant" t ON t."id" = u."tenantId"
      WHERE pa."id" = ${platformAdminId}
      LIMIT 1
    `;
    return row ?? null;
  }

  private serializePlatformAdmin(row: PlatformAdminRow) {
    return {
      id: row.id,
      userId: row.userId,
      level: row.level,
      status: row.status,
      scopes: row.scopes,
      grantedById: row.grantedById,
      revokedById: row.revokedById,
      revokedAt: row.revokedAt,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: {
        id: row.userId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        tenantId: row.tenantId,
        tenant: {
          id: row.tenantId,
          name: row.tenantName,
          slug: row.tenantSlug
        }
      }
    };
  }

  private platformAdminWhere(query: PlatformAdminQueryDto) {
    const where: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (query.level) where.push(Prisma.sql`pa."level" = ${query.level}::"PlatformAdminLevel"`);
    if (query.status) where.push(Prisma.sql`pa."status" = ${query.status}::"PlatformAdminStatus"`);
    if (query.search) {
      const search = `%${query.search}%`;
      where.push(Prisma.sql`(
        u."email" ILIKE ${search}
        OR u."firstName" ILIKE ${search}
        OR u."lastName" ILIKE ${search}
        OR t."name" ILIKE ${search}
        OR t."slug" ILIKE ${search}
      )`);
    }
    return Prisma.join(where, ' AND ');
  }

  private platformAuditWhere(query: PlatformAuditQueryDto) {
    const where: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (query.actorId) where.push(Prisma.sql`pal."actorId" = ${query.actorId}`);
    if (query.tenantId) where.push(Prisma.sql`pal."targetTenantId" = ${query.tenantId}`);
    if (query.action) where.push(Prisma.sql`pal."action" = ${query.action}`);
    if (query.search) {
      const search = `%${query.search}%`;
      where.push(Prisma.sql`(
        pal."action" ILIKE ${search}
        OR pal."entityType" ILIKE ${search}
        OR pal."entityId" ILIKE ${search}
        OR actor."email" ILIKE ${search}
        OR tenant."name" ILIKE ${search}
        OR tenant."slug" ILIKE ${search}
      )`);
    }
    return Prisma.join(where, ' AND ');
  }

  private async assertTenantExists(tenantId: string) {
    const exists = await this.prisma.tenant.count({ where: { id: tenantId } });
    if (!exists) {
      throw new NotFoundException('Tenant not found');
    }
  }

  private async getTenantSummary(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            workspaces: true,
            teams: true,
            projects: true,
            auditLogs: true,
            securityEvents: true
          }
        }
      }
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  private resourceResponse<T>(
    tenant: Awaited<ReturnType<PlatformAdminService['getTenantSummary']>>,
    section: string,
    data: T[],
    total: number,
    query: { page: number; limit: number },
    summary: Record<string, unknown>
  ) {
    return {
      tenant,
      section,
      summary,
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }

  private async createEmailVerificationToken(userId: string, tenantId: string, ttlMinutes: number) {
    await this.prisma.emailVerificationToken.updateMany({
      where: { tenantId, userId, usedAt: null },
      data: { usedAt: new Date() }
    });

    const rawToken = randomBytes(48).toString('base64url');
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

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private minutesFromNow(minutes: number) {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private async createPasswordResetToken(userId: string, tenantId: string, ttlMinutes: number) {
    await this.prisma.passwordResetToken.updateMany({
      where: { tenantId, userId, usedAt: null },
      data: { usedAt: new Date() }
    });

    const rawToken = randomBytes(48).toString('base64url');
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

  private authUrl(path: '/verify-email' | '/accept-invite' | '/reset-password', token: string) {
    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    const url = new URL(path, `${frontendUrl.replace(/\/$/, '')}/`);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private developmentLink(url: string) {
    return this.configService.get<string>('app.nodeEnv') === 'production' ? undefined : url;
  }

  private authEmailTemplate(input: { title: string; intro: string; ctaLabel: string; url: string }) {
    return `
      <div style="font-family:Inter,Arial,sans-serif;background:#f7f6f1;padding:32px;color:#111111">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ded8c8;border-radius:22px;padding:28px">
          <div style="display:inline-block;background:#ffd400;border:1px solid #d8b300;border-radius:14px;padding:10px 12px;font-weight:800">TaskBricks</div>
          <h1 style="font-size:26px;line-height:1.2;margin:24px 0 10px">${this.escapeHtml(input.title)}</h1>
          <p style="font-size:15px;line-height:1.7;color:#5f574c;margin:0 0 24px">${input.intro}</p>
          <a href="${input.url}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;border-radius:16px;padding:14px 18px;font-weight:800">${this.escapeHtml(input.ctaLabel)}</a>
          <p style="font-size:12px;line-height:1.6;color:#8a8375;margin-top:24px">If the button does not work, paste this link into your browser:<br>${this.escapeHtml(input.url)}</p>
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

  private async getSubscriptionForPlatform(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        plan: { include: { features: { include: { feature: true } } } }
      }
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  private async getPlanForPlatform(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        features: { include: { feature: true }, orderBy: { createdAt: 'asc' } },
        _count: { select: { subscriptions: true, features: true } }
      }
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  private async getFeatureForPlatform(featureId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: featureId },
      include: { plans: { include: { plan: true }, orderBy: { createdAt: 'desc' } } }
    });
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  private async ensureFeaturesExist(featureIds: string[]) {
    if (featureIds.length === 0) return;
    const found = await this.prisma.feature.findMany({
      where: { id: { in: featureIds } },
      select: { id: true }
    });
    if (found.length !== featureIds.length) {
      throw new BadRequestException('One or more features do not exist');
    }
  }

  private async createStripeProduct(
    secretKey: string,
    plan: Prisma.PlanGetPayload<{
      include: {
        features: { include: { feature: true } };
        _count: { select: { subscriptions: true; features: true } };
      };
    }>
  ) {
    const params = new URLSearchParams();
    params.set('name', plan.name);
    if (plan.description) params.set('description', plan.description);
    params.set('metadata[taskbricksPlanId]', plan.id);
    params.set('metadata[taskbricksPlanSlug]', plan.slug);

    const response = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException({
        message: 'Stripe product could not be created',
        stripe: body
      });
    }
    return body;
  }

  private async createStripePrice(
    secretKey: string,
    plan: Prisma.PlanGetPayload<{
      include: {
        features: { include: { feature: true } };
        _count: { select: { subscriptions: true; features: true } };
      };
    }>,
    productId: string
  ) {
    const params = new URLSearchParams();
    params.set('product', productId);
    params.set('currency', plan.currency.toLowerCase());
    params.set('unit_amount', `${Math.round(Number(plan.price) * 100)}`);
    params.set('recurring[interval]', plan.interval);
    params.set('metadata[taskbricksPlanId]', plan.id);
    params.set('metadata[taskbricksPlanSlug]', plan.slug);

    const response = await fetch('https://api.stripe.com/v1/prices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new BadRequestException({
        message: 'Stripe price could not be created',
        stripe: body
      });
    }
    return body;
  }

  private stringField(value: Record<string, unknown>, key: string) {
    const field = value[key];
    return typeof field === 'string' && field.length > 0 ? field : undefined;
  }

  private async recordBillingCatalogAction(
    actor: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: unknown,
    newValue: unknown,
    meta: RequestMeta
  ) {
    await this.recordPlatformAudit({
      actorId: actor.id,
      action,
      entityType,
      entityId,
      oldValue: oldValue === null ? undefined : this.toJsonValue(oldValue),
      newValue: this.toJsonValue(newValue),
      meta
    });
  }

  private async recordBillingPlatformAction(
    actor: AuthenticatedUser,
    tenantId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: unknown,
    newValue: unknown,
    meta: RequestMeta
  ) {
    await Promise.all([
      this.auditService.record({
        tenantId,
        actorId: actor.id,
        action,
        entityType,
        entityId,
        oldValue: oldValue === null ? undefined : this.toJsonValue(oldValue),
        newValue: this.toJsonValue(newValue),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId,
          actorId: actor.id,
          type: action,
          severity: SecurityEventSeverity.MEDIUM,
          source: 'site-admin',
          subjectType: entityType,
          subjectId: entityId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: this.toJsonValue(newValue)
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action,
        entityType,
        entityId,
        targetTenantId: tenantId,
        oldValue,
        newValue,
        meta
      })
    ]);
  }

  private addPlanInterval(start: Date, interval: string) {
    const next = new Date(start);
    if (interval === 'year') {
      next.setFullYear(next.getFullYear() + 1);
      return next;
    }
    if (interval === 'week') {
      next.setDate(next.getDate() + 7);
      return next;
    }
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private booleanQuery(value?: string) {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private platformTenantActor(actor: AuthenticatedUser, tenantId: string): AuthenticatedUser {
    return {
      ...actor,
      tenantId,
      roles: [...new Set([...(actor.roles ?? []), 'Site Admin'])],
      permissions: [...new Set([...(actor.permissions ?? []), 'manage:all', 'manage:integrations', 'manage:security', 'manage:compliance'])]
    };
  }

  private async tenantMap(tenantIds: string[]) {
    const ids = [...new Set(tenantIds.filter(Boolean))];
    if (ids.length === 0) {
      return new Map<string, { id: string; name: string; slug: string; status: TenantStatus }>();
    }
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, status: true }
    });
    return new Map(tenants.map((tenant) => [tenant.id, tenant]));
  }

  private async getComplianceJobForPlatform(jobId: string) {
    const job = await this.prisma.complianceJob.findUnique({
      where: { id: jobId },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        approvedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
      }
    });
    if (!job) throw new NotFoundException('Compliance job not found');
    return job;
  }

  private async transitionSiteComplianceJob(
    actor: AuthenticatedUser,
    jobId: string,
    status: ComplianceJobStatus,
    action: string,
    dto: SiteComplianceDecisionDto,
    meta: RequestMeta
  ) {
    const before = await this.getComplianceJobForPlatform(jobId);
    const terminalStatuses: ComplianceJobStatus[] = [
      ComplianceJobStatus.COMPLETED,
      ComplianceJobStatus.FAILED,
      ComplianceJobStatus.CANCELLED,
      ComplianceJobStatus.EXPIRED
    ];
    if (terminalStatuses.includes(before.status)) {
      throw new BadRequestException('Compliance job is already terminal');
    }
    const decisionStatuses: ComplianceJobStatus[] = [ComplianceJobStatus.APPROVED, ComplianceJobStatus.REJECTED];
    const decisionSourceStatuses: ComplianceJobStatus[] = [ComplianceJobStatus.REQUESTED, ComplianceJobStatus.QUEUED];
    if (decisionStatuses.includes(status) && !decisionSourceStatuses.includes(before.status)) {
      throw new BadRequestException('Only requested or queued jobs can be approved or rejected');
    }

    const after = await this.prisma.complianceJob.update({
      where: { id: jobId },
      data: {
        status,
        approvedById: decisionStatuses.includes(status) ? actor.id : undefined,
        approvedAt: decisionStatuses.includes(status) ? new Date() : undefined,
        completedAt: status === ComplianceJobStatus.CANCELLED ? new Date() : undefined,
        reason: dto.reason ?? before.reason
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        requestedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        approvedBy: { select: { id: true, email: true, firstName: true, lastName: true, status: true } }
      }
    });
    await this.recordCompliancePlatformAction(actor, after.tenantId, action, after.id, { status: before.status }, { status: after.status, reason: dto.reason ?? null }, meta);
    return after;
  }

  private async executeSiteComplianceJob(job: {
    id: string;
    tenantId: string;
    type: ComplianceJobType;
    status: ComplianceJobStatus;
    subjectType: string | null;
    subjectId: string | null;
    parameters: Prisma.JsonValue | null;
  }): Promise<{ result: unknown; fileName?: string; fileUrl?: string; mimeType?: string; sizeBytes?: number }> {
    if (job.type === ComplianceJobType.DATA_EXPORT) {
      const parameters = this.asRecord(job.parameters);
      const counts = await this.platformExportCounts(job.tenantId);
      const payload = {
        generatedAt: new Date().toISOString(),
        tenantId: job.tenantId,
        counts,
        includeRecords: false,
        note: 'Platform exports intentionally return counts and evidence metadata. Tenant-scoped detailed exports remain under tenant compliance controls.',
        parameters
      };
      const serialized = JSON.stringify(payload);
      return {
        result: payload,
        fileName: `taskbricks-platform-export-${job.tenantId}-${new Date().toISOString().slice(0, 10)}.json`,
        fileUrl: `inline://site-admin/compliance-jobs/${job.id}`,
        mimeType: 'application/json',
        sizeBytes: Buffer.byteLength(serialized)
      };
    }

    if (job.type === ComplianceJobType.DATA_DELETION) {
      if (job.status !== ComplianceJobStatus.APPROVED) throw new BadRequestException('Data deletion requires approval');
      const parameters = this.asRecord(job.parameters);
      const execute = parameters.execute === true;
      const subjectType = (job.subjectType ?? '').trim().toUpperCase();
      if (!subjectType || !job.subjectId) throw new BadRequestException('Data deletion subject is missing');
      if (!execute) {
        return {
          result: {
            dryRun: true,
            subjectType,
            subjectId: job.subjectId,
            message: 'No records were modified. Set parameters.execute=true only after documented approval.'
          }
        };
      }
      if (subjectType === 'USER') {
        await this.prisma.$transaction([
          this.prisma.user.update({ where: { id: job.subjectId }, data: { status: UserStatus.DEACTIVATED, email: `deleted-${job.subjectId}@taskbricks.local` } }),
          this.prisma.authSession.updateMany({ where: { tenantId: job.tenantId, userId: job.subjectId, revokedAt: null }, data: { revokedAt: new Date() } })
        ]);
        return { result: { dryRun: false, deactivated: true, subjectType, subjectId: job.subjectId } };
      }
      if (subjectType === 'PROJECT') {
        await this.prisma.project.update({ where: { id: job.subjectId }, data: { status: ProjectStatus.ARCHIVED } });
        return { result: { dryRun: false, archived: true, subjectType, subjectId: job.subjectId } };
      }
      if (subjectType === 'TENANT') {
        if (job.subjectId !== job.tenantId) throw new BadRequestException('Tenant deletion subject must match job tenant');
        await this.prisma.tenant.update({ where: { id: job.tenantId }, data: { status: TenantStatus.CANCELLED } });
        return { result: { dryRun: false, cancelled: true, subjectType, subjectId: job.subjectId } };
      }
      throw new BadRequestException('Unsupported data deletion subjectType');
    }

    if (job.type === ComplianceJobType.RETENTION_PURGE) {
      if (job.status !== ComplianceJobStatus.APPROVED) throw new BadRequestException('Retention purge requires approval');
      const parameters = this.asRecord(job.parameters);
      const execute = parameters.execute === true;
      const retentionDays = Math.max(1, Number(parameters.retentionDays ?? 2555));
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const purgeable = {
        auditLogs: await this.prisma.auditLog.count({ where: { tenantId: job.tenantId, createdAt: { lt: cutoff } } }),
        securityEvents: await this.prisma.securityEvent.count({ where: { tenantId: job.tenantId, createdAt: { lt: cutoff } } }),
        sessions: await this.prisma.authSession.count({ where: { tenantId: job.tenantId, updatedAt: { lt: cutoff }, OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: cutoff } }] } })
      };
      if (!execute) return { result: { dryRun: true, cutoff, retentionDays, purgeable } };
      const [auditLogs, securityEvents, sessions] = await this.prisma.$transaction([
        this.prisma.auditLog.deleteMany({ where: { tenantId: job.tenantId, createdAt: { lt: cutoff } } }),
        this.prisma.securityEvent.deleteMany({ where: { tenantId: job.tenantId, createdAt: { lt: cutoff } } }),
        this.prisma.authSession.deleteMany({ where: { tenantId: job.tenantId, updatedAt: { lt: cutoff }, OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: cutoff } }] } })
      ]);
      return {
        result: {
          dryRun: false,
          cutoff,
          retentionDays,
          deleted: { auditLogs: auditLogs.count, securityEvents: securityEvents.count, sessions: sessions.count }
        }
      };
    }

    throw new BadRequestException('Unsupported compliance job type');
  }

  private async platformExportCounts(tenantId: string) {
    const [users, workspaces, teams, projects, tasks, files, conversations, messages, integrations, webhooks, auditLogs, securityEvents, complianceJobs] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.workspace.count({ where: { tenantId } }),
        this.prisma.team.count({ where: { tenantId } }),
        this.prisma.project.count({ where: { tenantId } }),
        this.prisma.task.count({ where: { tenantId } }),
        this.prisma.fileAsset.count({ where: { tenantId } }),
        this.prisma.conversation.count({ where: { tenantId } }),
        this.prisma.message.count({ where: { conversation: { tenantId } } }),
        this.prisma.integration.count({ where: { tenantId } }),
        this.prisma.webhook.count({ where: { tenantId } }),
        this.prisma.auditLog.count({ where: { tenantId } }),
        this.prisma.securityEvent.count({ where: { tenantId } }),
        this.prisma.complianceJob.count({ where: { tenantId } })
      ]);
    return { users, workspaces, teams, projects, tasks, files, conversations, messages, integrations, webhooks, auditLogs, securityEvents, complianceJobs };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private async recordCompliancePlatformAction(
    actor: AuthenticatedUser,
    tenantId: string,
    action: string,
    jobId: string,
    oldValue: unknown,
    newValue: unknown,
    meta: RequestMeta
  ) {
    await Promise.all([
      this.auditService.record({
        tenantId,
        actorId: actor.id,
        action,
        entityType: 'ComplianceJob',
        entityId: jobId,
        oldValue: this.toJsonValue(oldValue),
        newValue: this.toJsonValue(newValue),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId,
          actorId: actor.id,
          type: action,
          severity: SecurityEventSeverity.HIGH,
          source: 'site-admin',
          subjectType: 'ComplianceJob',
          subjectId: jobId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: this.toJsonValue(newValue)
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action,
        entityType: 'ComplianceJob',
        entityId: jobId,
        targetTenantId: tenantId,
        oldValue,
        newValue,
        meta
      })
    ]);
  }

  private async recordSiteOperation(
    actor: AuthenticatedUser,
    tenantId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: unknown,
    newValue: unknown,
    meta: RequestMeta
  ) {
    await Promise.all([
      this.auditService.record({
        tenantId,
        actorId: actor.id,
        action,
        entityType,
        entityId,
        oldValue: this.toJsonValue(oldValue),
        newValue: this.toJsonValue(newValue),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }),
      this.prisma.securityEvent.create({
        data: {
          tenantId,
          actorId: actor.id,
          type: action,
          severity: SecurityEventSeverity.MEDIUM,
          source: 'site-admin',
          subjectType: entityType,
          subjectId: entityId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          requestId: meta.requestId,
          metadata: this.toJsonValue(newValue)
        }
      }),
      this.recordPlatformAudit({
        actorId: actor.id,
        action,
        entityType,
        entityId,
        targetTenantId: tenantId,
        oldValue,
        newValue,
        meta
      })
    ]);
  }

  private async recordPlatformAudit(input: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    targetTenantId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    meta: RequestMeta;
  }) {
    await this.prisma.$executeRaw`
      INSERT INTO "PlatformAuditLog" (
        "id",
        "actorId",
        "action",
        "entityType",
        "entityId",
        "targetTenantId",
        "oldValue",
        "newValue",
        "ipAddress",
        "userAgent",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.actorId ?? null},
        ${input.action},
        ${input.entityType},
        ${input.entityId ?? null},
        ${input.targetTenantId ?? null},
        ${JSON.stringify(input.oldValue ?? null)}::jsonb,
        ${JSON.stringify(input.newValue ?? null)}::jsonb,
        ${input.meta.ipAddress ?? null},
        ${input.meta.userAgent ?? null},
        NOW()
      )
    `;
  }

  private async rawCount(sql: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
    return rows[0]?.count ?? 0;
  }

  private normalizeScopes(scopes?: string[]) {
    return [...new Set((scopes ?? []).map((scope) => scope.trim()).filter(Boolean))];
  }

  private textArray(values: string[]) {
    if (values.length === 0) {
      return Prisma.sql`ARRAY[]::text[]`;
    }
    return Prisma.sql`ARRAY[${Prisma.join(values)}]::text[]`;
  }

  private groupCounts<T extends { _count: { _all: number } }>(rows: Array<T>) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      const key = Object.entries(row).find(([name]) => name !== '_count')?.[1];
      if (['string', 'number', 'boolean'].includes(typeof key)) {
        acc[String(key)] = row._count._all;
      }
      return acc;
    }, {});
  }

  private groupCountsForTenant<T extends { tenantId: string; _count: { _all: number } }>(
    rows: Array<T>,
    tenantId: string,
    keyName: keyof T
  ) {
    return rows
      .filter((row) => row.tenantId === tenantId)
      .reduce<Record<string, number>>((acc, row) => {
        const key = row[keyName];
        if (['string', 'number', 'boolean'].includes(typeof key)) {
          acc[String(key)] = row._count._all;
        }
        return acc;
      }, {});
  }

  private aiUsageForTenant(
    rows: Array<{
      tenantId: string;
      _count: { _all: number };
      _sum: { totalTokens: number | null; estimatedCost: Prisma.Decimal | null };
    }>,
    tenantId: string
  ) {
    const row = rows.find((item) => item.tenantId === tenantId);
    return {
      requests: row?._count._all ?? 0,
      totalTokens: row?._sum.totalTokens ?? 0,
      estimatedCost: Number(row?._sum.estimatedCost ?? 0)
    };
  }

  private skip(query: { page: number; limit: number }) {
    return (query.page - 1) * query.limit;
  }

  private paginate<T>(data: T[], total: number, query: { page: number; limit: number }) {
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }
}
