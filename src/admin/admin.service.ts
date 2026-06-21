import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiKeyStatus,
  ComplianceJobStatus,
  ComplianceJobType,
  Prisma,
  ProjectStatus,
  SecurityEventSeverity,
  SecurityEventStatus,
  TenantStatus,
  UserStatus
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyQueryDto } from './dto/api-key-query.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ComplianceDecisionDto } from './dto/compliance-decision.dto';
import { ComplianceJobQueryDto } from './dto/compliance-job-query.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateComplianceJobDto } from './dto/create-compliance-job.dto';
import { CreateSecurityEventDto } from './dto/create-security-event.dto';
import { SecurityEventQueryDto } from './dto/security-event-query.dto';
import { SessionQueryDto } from './dto/session-query.dto';
import { UpdateSecurityEventDto } from './dto/update-security-event.dto';
import { UpdateSecurityPolicyDto } from './dto/update-security-policy.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

interface ComplianceExecutionOutput {
  result: unknown;
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
}

const userSummarySelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true
} satisfies Prisma.UserSelect;

const auditLogSelect = {
  id: true,
  tenantId: true,
  actorId: true,
  action: true,
  entityType: true,
  entityId: true,
  oldValue: true,
  newValue: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true
} satisfies Prisma.AuditLogSelect;

const securityPolicySelect = {
  id: true,
  tenantId: true,
  enforceIpAllowlist: true,
  ipAllowlist: true,
  sessionTtlMinutes: true,
  maxSessionsPerUser: true,
  passwordMinLength: true,
  passwordRequireUpper: true,
  passwordRequireLower: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: true,
  passwordHistoryCount: true,
  mfaRequired: true,
  auditRetentionDays: true,
  dataRetentionDays: true,
  maxUploadBytes: true,
  allowedUploadMimeTypes: true,
  metadata: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.SecurityPolicySelect;

const securityEventSelect = {
  id: true,
  tenantId: true,
  actorId: true,
  type: true,
  severity: true,
  status: true,
  source: true,
  subjectType: true,
  subjectId: true,
  ipAddress: true,
  userAgent: true,
  requestId: true,
  metadata: true,
  resolvedAt: true,
  resolvedById: true,
  createdAt: true,
  updatedAt: true,
  actor: { select: userSummarySelect },
  resolvedBy: { select: userSummarySelect }
} satisfies Prisma.SecurityEventSelect;

const complianceJobSelect = {
  id: true,
  tenantId: true,
  requestedById: true,
  approvedById: true,
  type: true,
  status: true,
  subjectType: true,
  subjectId: true,
  reason: true,
  parameters: true,
  result: true,
  fileName: true,
  fileUrl: true,
  mimeType: true,
  sizeBytes: true,
  error: true,
  requestedAt: true,
  approvedAt: true,
  startedAt: true,
  completedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  requestedBy: { select: userSummarySelect },
  approvedBy: { select: userSummarySelect }
} satisfies Prisma.ComplianceJobSelect;

const sessionSelect = {
  id: true,
  tenantId: true,
  userId: true,
  ipAddress: true,
  userAgent: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSummarySelect }
} satisfies Prisma.AuthSessionSelect;

const apiKeySelect = {
  id: true,
  tenantId: true,
  createdById: true,
  name: true,
  prefix: true,
  scopes: true,
  status: true,
  metadata: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: userSummarySelect }
} satisfies Prisma.ApiKeySelect;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService
  ) {}

  status() {
    return {
      module: 'admin',
      status: 'ready',
      capabilities: [
        'audit-log-search',
        'security-events',
        'security-policy',
        'session-management',
        'compliance-jobs',
        'api-key-management',
        'security-checks'
      ]
    };
  }

  async overview(user: AuthenticatedUser) {
    const now = new Date();
    const [tenant, users, activeSessions, revokedSessions, auditLogs, openEvents, complianceJobs, apiKeys] =
      await this.prisma.$transaction([
        this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: { id: true, name: true, slug: true, status: true, createdAt: true, updatedAt: true }
        }),
        this.prisma.user.groupBy({
          by: ['status'],
          where: { tenantId: user.tenantId },
          _count: { _all: true }
        }),
        this.prisma.authSession.count({
          where: { tenantId: user.tenantId, revokedAt: null, expiresAt: { gt: now } }
        }),
        this.prisma.authSession.count({
          where: { tenantId: user.tenantId, revokedAt: { not: null } }
        }),
        this.prisma.auditLog.count({ where: { tenantId: user.tenantId } }),
        this.prisma.securityEvent.count({
          where: { tenantId: user.tenantId, status: SecurityEventStatus.OPEN }
        }),
        this.prisma.complianceJob.groupBy({
          by: ['status'],
          where: { tenantId: user.tenantId },
          _count: { _all: true }
        }),
        this.prisma.apiKey.groupBy({
          by: ['status'],
          where: { tenantId: user.tenantId },
          _count: { _all: true }
        })
      ]);

    if (!tenant) throw new NotFoundException('Tenant not found');

    return {
      tenant,
      users: this.groupCounts(users),
      sessions: { active: activeSessions, revoked: revokedSessions },
      auditLogs,
      securityEvents: { open: openEvents },
      complianceJobs: this.groupCounts(complianceJobs),
      apiKeys: this.groupCounts(apiKeys),
      securityChecks: this.securityChecks()
    };
  }

  async listAuditLogs(user: AuthenticatedUser, query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: user.tenantId,
      action: query.action,
      actorId: query.actorId,
      entityType: query.entityType,
      entityId: query.entityId,
      ipAddress: query.ipAddress,
      createdAt: this.dateFilter(query.from, query.to),
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
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        select: auditLogSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.auditLog.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async getAuditLog(user: AuthenticatedUser, auditLogId: string) {
    const auditLog = await this.prisma.auditLog.findFirst({
      where: { id: auditLogId, tenantId: user.tenantId },
      select: auditLogSelect
    });
    if (!auditLog) throw new NotFoundException('Audit log not found');
    return auditLog;
  }

  async getSecurityPolicy(user: AuthenticatedUser) {
    return this.getOrCreateSecurityPolicy(user.tenantId);
  }

  async updateSecurityPolicy(user: AuthenticatedUser, dto: UpdateSecurityPolicyDto, meta: RequestMeta) {
    const before = await this.getOrCreateSecurityPolicy(user.tenantId);
    const nextIpAllowlist = dto.ipAllowlist === undefined ? before.ipAllowlist : this.normalizeStringArray(dto.ipAllowlist);
    const enforceIpAllowlist = dto.enforceIpAllowlist ?? before.enforceIpAllowlist;
    if (enforceIpAllowlist && nextIpAllowlist.length === 0) {
      throw new BadRequestException('At least one IP or CIDR entry is required when IP allowlist enforcement is enabled');
    }

    const policy = await this.prisma.securityPolicy.update({
      where: { tenantId: user.tenantId },
      data: {
        enforceIpAllowlist: dto.enforceIpAllowlist,
        ipAllowlist: dto.ipAllowlist === undefined ? undefined : nextIpAllowlist,
        sessionTtlMinutes: dto.sessionTtlMinutes,
        maxSessionsPerUser: dto.maxSessionsPerUser,
        passwordMinLength: dto.passwordMinLength,
        passwordRequireUpper: dto.passwordRequireUpper,
        passwordRequireLower: dto.passwordRequireLower,
        passwordRequireNumber: dto.passwordRequireNumber,
        passwordRequireSymbol: dto.passwordRequireSymbol,
        passwordHistoryCount: dto.passwordHistoryCount,
        mfaRequired: dto.mfaRequired,
        auditRetentionDays: dto.auditRetentionDays,
        dataRetentionDays: dto.dataRetentionDays,
        maxUploadBytes: dto.maxUploadBytes,
        allowedUploadMimeTypes:
          dto.allowedUploadMimeTypes === undefined
            ? undefined
            : this.normalizeStringArray(dto.allowedUploadMimeTypes),
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: securityPolicySelect
    });
    await this.recordAudit(user, 'security_policy.update', 'SecurityPolicy', policy.id, before, policy, meta);
    await this.createSecurityEventInternal(user.tenantId, user.id, 'security_policy.updated', SecurityEventSeverity.MEDIUM, {
      source: 'admin-api',
      subjectType: 'SecurityPolicy',
      subjectId: policy.id,
      metadata: { enforceIpAllowlist: policy.enforceIpAllowlist },
      meta
    });
    return policy;
  }

  async listSessions(user: AuthenticatedUser, query: SessionQueryDto) {
    const where: Prisma.AuthSessionWhereInput = {
      tenantId: user.tenantId,
      userId: query.userId,
      ipAddress: query.ipAddress,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.activeOnly
        ? { revokedAt: null, expiresAt: { gt: new Date() } }
        : query.revoked === true
          ? { revokedAt: { not: null } }
          : query.revoked === false
            ? { revokedAt: null }
            : {}),
      ...(query.search
        ? {
            OR: [
              { ipAddress: { contains: query.search, mode: 'insensitive' } },
              { userAgent: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.authSession.findMany({
        where,
        select: sessionSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.authSession.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async getSession(user: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, tenantId: user.tenantId },
      select: sessionSelect
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async revokeSession(user: AuthenticatedUser, sessionId: string, meta: RequestMeta) {
    const session = await this.getSession(user, sessionId);
    if (session.revokedAt) return session;
    const updated = await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
      select: sessionSelect
    });
    await this.recordAudit(user, 'session.revoke', 'AuthSession', sessionId, { revokedAt: session.revokedAt }, {
      revokedAt: updated.revokedAt,
      userId: updated.userId
    }, meta);
    await this.createSecurityEventInternal(user.tenantId, user.id, 'session.revoked', SecurityEventSeverity.MEDIUM, {
      source: 'admin-api',
      subjectType: 'AuthSession',
      subjectId: sessionId,
      metadata: { targetUserId: updated.userId },
      meta
    });
    return updated;
  }

  async revokeUserSessions(user: AuthenticatedUser, userId: string, meta: RequestMeta) {
    await this.assertUserBelongsToTenant(user.tenantId, userId);
    const result = await this.prisma.authSession.updateMany({
      where: { tenantId: user.tenantId, userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    await this.recordAudit(user, 'session.revoke_user', 'User', userId, undefined, {
      revokedSessions: result.count
    }, meta);
    await this.createSecurityEventInternal(user.tenantId, user.id, 'user.sessions_revoked', SecurityEventSeverity.HIGH, {
      source: 'admin-api',
      subjectType: 'User',
      subjectId: userId,
      metadata: { revokedSessions: result.count },
      meta
    });
    return { success: true, revokedSessions: result.count };
  }

  async listSecurityEvents(user: AuthenticatedUser, query: SecurityEventQueryDto) {
    const where: Prisma.SecurityEventWhereInput = {
      tenantId: user.tenantId,
      type: query.type,
      severity: query.severity,
      status: query.status,
      actorId: query.actorId,
      subjectType: query.subjectType,
      subjectId: query.subjectId,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { type: { contains: query.search, mode: 'insensitive' } },
              { source: { contains: query.search, mode: 'insensitive' } },
              { subjectType: { contains: query.search, mode: 'insensitive' } },
              { subjectId: { contains: query.search, mode: 'insensitive' } },
              { ipAddress: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.securityEvent.findMany({
        where,
        select: securityEventSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.securityEvent.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createSecurityEvent(user: AuthenticatedUser, dto: CreateSecurityEventDto, meta: RequestMeta) {
    const event = await this.prisma.securityEvent.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.id,
        type: this.normalizeKey(dto.type),
        severity: dto.severity ?? SecurityEventSeverity.INFO,
        source: dto.source ?? 'admin-api',
        subjectType: dto.subjectType ? this.normalizeKey(dto.subjectType) : undefined,
        subjectId: dto.subjectId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: this.toJson(dto.metadata)
      },
      select: securityEventSelect
    });
    await this.recordAudit(user, 'security_event.create', 'SecurityEvent', event.id, undefined, {
      type: event.type,
      severity: event.severity
    }, meta);
    return event;
  }

  async getSecurityEvent(user: AuthenticatedUser, eventId: string) {
    const event = await this.prisma.securityEvent.findFirst({
      where: { id: eventId, tenantId: user.tenantId },
      select: securityEventSelect
    });
    if (!event) throw new NotFoundException('Security event not found');
    return event;
  }

  async updateSecurityEvent(user: AuthenticatedUser, eventId: string, dto: UpdateSecurityEventDto, meta: RequestMeta) {
    const before = await this.getSecurityEvent(user, eventId);
    const terminal = dto.status === SecurityEventStatus.RESOLVED || dto.status === SecurityEventStatus.DISMISSED;
    const event = await this.prisma.securityEvent.update({
      where: { id: eventId },
      data: {
        status: dto.status,
        severity: dto.severity,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata),
        resolvedAt: terminal ? new Date() : undefined,
        resolvedById: terminal ? user.id : undefined
      },
      select: securityEventSelect
    });
    await this.recordAudit(user, 'security_event.update', 'SecurityEvent', event.id, {
      status: before.status,
      severity: before.severity
    }, {
      status: event.status,
      severity: event.severity
    }, meta);
    return event;
  }

  async listComplianceJobs(user: AuthenticatedUser, query: ComplianceJobQueryDto) {
    const where: Prisma.ComplianceJobWhereInput = {
      tenantId: user.tenantId,
      type: query.type,
      status: query.status,
      subjectType: query.subjectType ? this.normalizeKey(query.subjectType) : undefined,
      subjectId: query.subjectId,
      requestedAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { subjectType: { contains: query.search, mode: 'insensitive' } },
              { subjectId: { contains: query.search, mode: 'insensitive' } },
              { reason: { contains: query.search, mode: 'insensitive' } },
              { fileName: { contains: query.search, mode: 'insensitive' } },
              { error: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.complianceJob.findMany({
        where,
        select: complianceJobSelect,
        orderBy: [{ requestedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.complianceJob.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createComplianceJob(user: AuthenticatedUser, dto: CreateComplianceJobDto, meta: RequestMeta) {
    if (dto.type === ComplianceJobType.DATA_DELETION && (!dto.subjectType || !dto.subjectId)) {
      throw new BadRequestException('Data deletion jobs require subjectType and subjectId');
    }
    const job = await this.prisma.complianceJob.create({
      data: {
        tenantId: user.tenantId,
        requestedById: user.id,
        type: dto.type,
        subjectType: dto.subjectType ? this.normalizeKey(dto.subjectType) : undefined,
        subjectId: dto.subjectId,
        reason: dto.reason,
        parameters: this.toJson(dto.parameters),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined
      },
      select: complianceJobSelect
    });
    await this.recordAudit(user, 'compliance_job.create', 'ComplianceJob', job.id, undefined, {
      type: job.type,
      status: job.status,
      subjectType: job.subjectType,
      subjectId: job.subjectId
    }, meta);
    return job;
  }

  async getComplianceJob(user: AuthenticatedUser, jobId: string) {
    const job = await this.prisma.complianceJob.findFirst({
      where: { id: jobId, tenantId: user.tenantId },
      select: complianceJobSelect
    });
    if (!job) throw new NotFoundException('Compliance job not found');
    return job;
  }

  async approveComplianceJob(user: AuthenticatedUser, jobId: string, dto: ComplianceDecisionDto, meta: RequestMeta) {
    const before = await this.getComplianceJob(user, jobId);
    const approvableStatuses: ComplianceJobStatus[] = [ComplianceJobStatus.REQUESTED, ComplianceJobStatus.QUEUED];
    if (!approvableStatuses.includes(before.status)) {
      throw new BadRequestException('Only requested or queued jobs can be approved');
    }
    const job = await this.prisma.complianceJob.update({
      where: { id: jobId },
      data: {
        status: ComplianceJobStatus.APPROVED,
        approvedById: user.id,
        approvedAt: new Date(),
        reason: dto.reason ?? before.reason
      },
      select: complianceJobSelect
    });
    await this.recordAudit(user, 'compliance_job.approve', 'ComplianceJob', job.id, {
      status: before.status
    }, {
      status: job.status,
      reason: job.reason
    }, meta);
    return job;
  }

  async rejectComplianceJob(user: AuthenticatedUser, jobId: string, dto: ComplianceDecisionDto, meta: RequestMeta) {
    const before = await this.getComplianceJob(user, jobId);
    const rejectableStatuses: ComplianceJobStatus[] = [ComplianceJobStatus.REQUESTED, ComplianceJobStatus.QUEUED];
    if (!rejectableStatuses.includes(before.status)) {
      throw new BadRequestException('Only requested or queued jobs can be rejected');
    }
    const job = await this.prisma.complianceJob.update({
      where: { id: jobId },
      data: { status: ComplianceJobStatus.REJECTED, approvedById: user.id, approvedAt: new Date(), reason: dto.reason ?? before.reason },
      select: complianceJobSelect
    });
    await this.recordAudit(user, 'compliance_job.reject', 'ComplianceJob', job.id, {
      status: before.status
    }, {
      status: job.status,
      reason: job.reason
    }, meta);
    return job;
  }

  async cancelComplianceJob(user: AuthenticatedUser, jobId: string, meta: RequestMeta) {
    const before = await this.getComplianceJob(user, jobId);
    const terminalStatuses: ComplianceJobStatus[] = [
      ComplianceJobStatus.COMPLETED,
      ComplianceJobStatus.FAILED,
      ComplianceJobStatus.CANCELLED,
      ComplianceJobStatus.EXPIRED
    ];
    if (terminalStatuses.includes(before.status)) {
      throw new BadRequestException('Compliance job is already terminal');
    }
    const job = await this.prisma.complianceJob.update({
      where: { id: jobId },
      data: { status: ComplianceJobStatus.CANCELLED, completedAt: new Date() },
      select: complianceJobSelect
    });
    await this.recordAudit(user, 'compliance_job.cancel', 'ComplianceJob', job.id, {
      status: before.status
    }, {
      status: job.status
    }, meta);
    return job;
  }

  async runComplianceJob(user: AuthenticatedUser, jobId: string, meta: RequestMeta) {
    const job = await this.getComplianceJob(user, jobId);
    const terminalStatuses: ComplianceJobStatus[] = [
      ComplianceJobStatus.COMPLETED,
      ComplianceJobStatus.FAILED,
      ComplianceJobStatus.CANCELLED,
      ComplianceJobStatus.EXPIRED
    ];
    if (terminalStatuses.includes(job.status)) {
      return job;
    }
    const approvalRequiredTypes: ComplianceJobType[] = [
      ComplianceJobType.DATA_DELETION,
      ComplianceJobType.RETENTION_PURGE
    ];
    if (
      approvalRequiredTypes.includes(job.type) &&
      job.status !== ComplianceJobStatus.APPROVED
    ) {
      throw new ForbiddenException('This compliance job requires approval before execution');
    }

    await this.prisma.complianceJob.update({
      where: { id: jobId },
      data: { status: ComplianceJobStatus.RUNNING, startedAt: new Date(), error: null }
    });

    try {
      const output = await this.executeComplianceJob(user, job);
      const updated = await this.prisma.complianceJob.update({
        where: { id: jobId },
        data: {
          status: ComplianceJobStatus.COMPLETED,
          result: this.toJson(output.result),
          fileName: output.fileName,
          fileUrl: output.fileUrl,
          mimeType: output.mimeType,
          sizeBytes: output.sizeBytes,
          completedAt: new Date()
        },
        select: complianceJobSelect
      });
      await this.recordAudit(user, 'compliance_job.run', 'ComplianceJob', job.id, {
        status: job.status
      }, {
        status: updated.status,
        type: updated.type,
        fileName: updated.fileName
      }, meta);
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Compliance job failed';
      const failed = await this.prisma.complianceJob.update({
        where: { id: jobId },
        data: { status: ComplianceJobStatus.FAILED, error: message, completedAt: new Date() },
        select: complianceJobSelect
      });
      await this.recordAudit(user, 'compliance_job.fail', 'ComplianceJob', job.id, {
        status: job.status
      }, {
        status: failed.status,
        error: message
      }, meta);
      return failed;
    }
  }

  async listApiKeys(user: AuthenticatedUser, query: ApiKeyQueryDto) {
    const where: Prisma.ApiKeyWhereInput = {
      tenantId: user.tenantId,
      status: query.status,
      createdById: query.createdById,
      scopes: query.scope ? { has: query.scope } : undefined,
      createdAt: this.dateFilter(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { prefix: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.apiKey.findMany({
        where,
        select: apiKeySelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.apiKey.count({ where })
    ]);
    return this.paginate(data, total, query);
  }

  async createApiKey(user: AuthenticatedUser, dto: CreateApiKeyDto, meta: RequestMeta) {
    const prefix = randomBytes(5).toString('hex');
    const secret = randomBytes(32).toString('base64url');
    const token = `tbk_${prefix}_${secret}`;
    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId: user.tenantId,
        createdById: user.id,
        name: dto.name.trim(),
        keyHash: this.sha256(token),
        prefix,
        scopes: this.normalizeStringArray(dto.scopes),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        metadata: this.toJson(dto.metadata)
      },
      select: apiKeySelect
    });
    await this.recordAudit(user, 'api_key.create', 'ApiKey', apiKey.id, undefined, {
      name: apiKey.name,
      scopes: apiKey.scopes,
      prefix: apiKey.prefix
    }, meta);
    await this.createSecurityEventInternal(user.tenantId, user.id, 'api_key.created', SecurityEventSeverity.MEDIUM, {
      source: 'admin-api',
      subjectType: 'ApiKey',
      subjectId: apiKey.id,
      metadata: { prefix: apiKey.prefix, scopes: apiKey.scopes },
      meta
    });
    return { ...apiKey, token };
  }

  async getApiKey(user: AuthenticatedUser, apiKeyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: apiKeyId, tenantId: user.tenantId },
      select: apiKeySelect
    });
    if (!apiKey) throw new NotFoundException('API key not found');
    return apiKey;
  }

  async revokeApiKey(user: AuthenticatedUser, apiKeyId: string, meta: RequestMeta) {
    const before = await this.getApiKey(user, apiKeyId);
    if (before.status === ApiKeyStatus.REVOKED) return before;
    const apiKey = await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { status: ApiKeyStatus.REVOKED, revokedAt: new Date() },
      select: apiKeySelect
    });
    await this.recordAudit(user, 'api_key.revoke', 'ApiKey', apiKey.id, {
      status: before.status
    }, {
      status: apiKey.status
    }, meta);
    await this.createSecurityEventInternal(user.tenantId, user.id, 'api_key.revoked', SecurityEventSeverity.HIGH, {
      source: 'admin-api',
      subjectType: 'ApiKey',
      subjectId: apiKey.id,
      metadata: { prefix: apiKey.prefix },
      meta
    });
    return apiKey;
  }

  securityChecks() {
    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');
    const corsOrigins = this.configService.get<string[]>('app.corsOrigins', []);
    const swaggerEnabled = this.configService.get<boolean>('app.swaggerEnabled', true);
    const requestBodyLimit = this.configService.get<string>('app.requestBodyLimit', '1mb');
    const requestTimeoutMs = this.configService.get<number>('app.requestTimeoutMs', 30000);
    return {
      nodeEnv,
      swaggerProductionSafe: nodeEnv !== 'production' || !swaggerEnabled,
      corsConfigured: nodeEnv !== 'production' || corsOrigins.length > 0,
      corsOrigins,
      requestBodyLimit,
      requestTimeoutMs,
      helmetEnabled: true,
      validationPipe: {
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      },
      rateLimit: {
        ttlSeconds: this.configService.get<number>('rateLimit.ttlSeconds', 60),
        defaultMax: this.configService.get<number>('rateLimit.max', 300),
        authMax: this.configService.get<number>('rateLimit.authMax', 20)
      },
      secretsConfigured: {
        jwtAccess: Boolean(this.configService.get<string>('jwt.accessSecret')),
        jwtRefresh: Boolean(this.configService.get<string>('jwt.refreshSecret')),
        encryption: Boolean(this.configService.get<string>('security.encryptionKey')),
        webhookSigning: Boolean(this.configService.get<string>('integrations.webhookSigningSecret'))
      }
    };
  }

  private async getOrCreateSecurityPolicy(tenantId: string) {
    const existing = await this.prisma.securityPolicy.findUnique({
      where: { tenantId },
      select: securityPolicySelect
    });
    if (existing) return existing;
    return this.prisma.securityPolicy.create({
      data: {
        tenantId,
        auditRetentionDays: this.configService.get<number>('compliance.auditRetentionDays', 2555),
        ipAllowlist: this.configService.get<string[]>('compliance.ipAllowlist', [])
      },
      select: securityPolicySelect
    });
  }

  private async executeComplianceJob(
    user: AuthenticatedUser,
    job: Prisma.ComplianceJobGetPayload<{ select: typeof complianceJobSelect }>
  ): Promise<ComplianceExecutionOutput> {
    switch (job.type) {
      case ComplianceJobType.DATA_EXPORT:
        return this.executeDataExport(user, job);
      case ComplianceJobType.DATA_DELETION:
        return this.executeDataDeletion(user, job);
      case ComplianceJobType.RETENTION_PURGE:
        return this.executeRetentionPurge(user, job);
      default:
        throw new BadRequestException('Unsupported compliance job type');
    }
  }

  private async executeDataExport(
    user: AuthenticatedUser,
    job: Prisma.ComplianceJobGetPayload<{ select: typeof complianceJobSelect }>
  ) {
    const parameters = this.asRecord(job.parameters);
    const includeRecords = parameters.includeRecords === true;
    const limit = Math.min(this.numberValue(parameters.limit) ?? 100, 500);
    const [tenant, counts] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { id: true, name: true, slug: true, status: true, createdAt: true, updatedAt: true }
      }),
      this.exportCounts(user.tenantId)
    ]);
    const records = includeRecords
      ? await this.exportRecords(user.tenantId, limit)
      : undefined;
    const payload = {
      generatedAt: new Date().toISOString(),
      tenant,
      counts,
      records,
      note: includeRecords ? 'Records are capped by the requested export limit.' : 'Set includeRecords=true to include capped records.'
    };
    const serialized = JSON.stringify(payload);
    const fileName = `taskbricks-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    return {
      result: payload,
      fileName,
      fileUrl: `inline://compliance-jobs/${job.id}`,
      mimeType: 'application/json',
      sizeBytes: Buffer.byteLength(serialized)
    };
  }

  private async executeDataDeletion(
    user: AuthenticatedUser,
    job: Prisma.ComplianceJobGetPayload<{ select: typeof complianceJobSelect }>
  ) {
    if (job.status !== ComplianceJobStatus.APPROVED) {
      throw new ForbiddenException('Data deletion requires an approved job');
    }
    const parameters = this.asRecord(job.parameters);
    const execute = parameters.execute === true;
    const subjectType = this.normalizeKey(job.subjectType ?? '');
    if (!job.subjectId || !subjectType) throw new BadRequestException('Data deletion subject is missing');

    if (!execute) {
      return {
        result: {
          dryRun: true,
          message: 'No records were modified. Re-run with parameters.execute=true after approval to execute.',
          subjectType,
          subjectId: job.subjectId
        }
      };
    }

    if (subjectType === 'USER') {
      await this.assertUserBelongsToTenant(user.tenantId, job.subjectId);
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: job.subjectId },
          data: { status: UserStatus.DEACTIVATED, email: `deleted-${job.subjectId}@taskbricks.local` }
        }),
        this.prisma.authSession.updateMany({
          where: { tenantId: user.tenantId, userId: job.subjectId, revokedAt: null },
          data: { revokedAt: new Date() }
        })
      ]);
      return { result: { deleted: false, deactivated: true, subjectType, subjectId: job.subjectId } };
    }

    if (subjectType === 'PROJECT') {
      await this.assertProjectBelongsToTenant(user.tenantId, job.subjectId);
      await this.prisma.project.update({
        where: { id: job.subjectId },
        data: { status: ProjectStatus.ARCHIVED }
      });
      return { result: { deleted: false, archived: true, subjectType, subjectId: job.subjectId } };
    }

    if (subjectType === 'TENANT') {
      if (job.subjectId !== user.tenantId) throw new ForbiddenException('Cannot modify another tenant');
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { status: TenantStatus.CANCELLED }
      });
      return { result: { deleted: false, cancelled: true, subjectType, subjectId: job.subjectId } };
    }

    throw new BadRequestException('Unsupported data deletion subjectType');
  }

  private async executeRetentionPurge(
    user: AuthenticatedUser,
    job: Prisma.ComplianceJobGetPayload<{ select: typeof complianceJobSelect }>
  ) {
    if (job.status !== ComplianceJobStatus.APPROVED) {
      throw new ForbiddenException('Retention purge requires an approved job');
    }
    const policy = await this.getOrCreateSecurityPolicy(user.tenantId);
    const parameters = this.asRecord(job.parameters);
    const retentionDays = this.numberValue(parameters.retentionDays) ?? policy.auditRetentionDays;
    const execute = parameters.execute === true;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const [auditLogs, securityEvents, sessions] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where: { tenantId: user.tenantId, createdAt: { lt: cutoff } } }),
      this.prisma.securityEvent.count({ where: { tenantId: user.tenantId, createdAt: { lt: cutoff } } }),
      this.prisma.authSession.count({
        where: {
          tenantId: user.tenantId,
          updatedAt: { lt: cutoff },
          OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: cutoff } }]
        }
      })
    ]);

    if (!execute) {
      return {
        result: {
          dryRun: true,
          cutoff,
          retentionDays,
          purgeable: { auditLogs, securityEvents, sessions }
        }
      };
    }

    const [deletedAuditLogs, deletedSecurityEvents, deletedSessions] = await this.prisma.$transaction([
      this.prisma.auditLog.deleteMany({ where: { tenantId: user.tenantId, createdAt: { lt: cutoff } } }),
      this.prisma.securityEvent.deleteMany({ where: { tenantId: user.tenantId, createdAt: { lt: cutoff } } }),
      this.prisma.authSession.deleteMany({
        where: {
          tenantId: user.tenantId,
          updatedAt: { lt: cutoff },
          OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: cutoff } }]
        }
      })
    ]);

    return {
      result: {
        dryRun: false,
        cutoff,
        retentionDays,
        deleted: {
          auditLogs: deletedAuditLogs.count,
          securityEvents: deletedSecurityEvents.count,
          sessions: deletedSessions.count
        }
      }
    };
  }

  private async exportCounts(tenantId: string) {
    const [users, workspaces, teams, projects, tasks, auditLogs, securityEvents, complianceJobs] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.workspace.count({ where: { tenantId } }),
        this.prisma.team.count({ where: { tenantId } }),
        this.prisma.project.count({ where: { tenantId } }),
        this.prisma.task.count({ where: { tenantId } }),
        this.prisma.auditLog.count({ where: { tenantId } }),
        this.prisma.securityEvent.count({ where: { tenantId } }),
        this.prisma.complianceJob.count({ where: { tenantId } })
      ]);
    return { users, workspaces, teams, projects, tasks, auditLogs, securityEvents, complianceJobs };
  }

  private async exportRecords(tenantId: string, limit: number) {
    const [users, workspaces, teams, projects, tasks, auditLogs, securityEvents] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { tenantId },
        select: userSummarySelect,
        take: limit,
        orderBy: [{ createdAt: 'asc' }]
      }),
      this.prisma.workspace.findMany({
        where: { tenantId },
        select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
        take: limit,
        orderBy: [{ createdAt: 'asc' }]
      }),
      this.prisma.team.findMany({
        where: { tenantId },
        select: { id: true, name: true, workspaceId: true, createdAt: true, updatedAt: true },
        take: limit,
        orderBy: [{ createdAt: 'asc' }]
      }),
      this.prisma.project.findMany({
        where: { tenantId },
        select: { id: true, key: true, name: true, status: true, workspaceId: true, teamId: true, createdAt: true, updatedAt: true },
        take: limit,
        orderBy: [{ createdAt: 'asc' }]
      }),
      this.prisma.task.findMany({
        where: { tenantId },
        select: { id: true, projectId: true, key: true, title: true, status: true, priority: true, createdAt: true, updatedAt: true },
        take: limit,
        orderBy: [{ createdAt: 'asc' }]
      }),
      this.prisma.auditLog.findMany({
        where: { tenantId },
        select: auditLogSelect,
        take: limit,
        orderBy: [{ createdAt: 'desc' }]
      }),
      this.prisma.securityEvent.findMany({
        where: { tenantId },
        select: securityEventSelect,
        take: limit,
        orderBy: [{ createdAt: 'desc' }]
      })
    ]);
    return { users, workspaces, teams, projects, tasks, auditLogs, securityEvents };
  }

  private async createSecurityEventInternal(
    tenantId: string,
    actorId: string | null,
    type: string,
    severity: SecurityEventSeverity,
    input: {
      source?: string;
      subjectType?: string;
      subjectId?: string;
      metadata?: Record<string, unknown>;
      meta?: RequestMeta;
    }
  ) {
    await this.prisma.securityEvent.create({
      data: {
        tenantId,
        actorId,
        type,
        severity,
        source: input.source,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        ipAddress: input.meta?.ipAddress,
        userAgent: input.meta?.userAgent,
        requestId: input.meta?.requestId,
        metadata: this.toJson(input.metadata)
      }
    });
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const exists = await this.prisma.user.count({ where: { id: userId, tenantId } });
    if (!exists) throw new NotFoundException('User not found');
  }

  private async assertProjectBelongsToTenant(tenantId: string, projectId: string) {
    const exists = await this.prisma.project.count({ where: { id: projectId, tenantId } });
    if (!exists) throw new NotFoundException('Project not found');
  }

  private async recordAudit(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValue: unknown,
    newValue: unknown,
    meta: RequestMeta
  ) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType,
      entityId,
      oldValue: this.toJson(oldValue),
      newValue: this.toJson(newValue),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private normalizeStringArray(values?: string[]) {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }

  private normalizeKey(value: string) {
    return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private numberValue(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return value as Prisma.InputJsonValue;
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private groupCounts<T extends { _count: { _all: number } }>(items: Array<T>) {
    return Object.fromEntries(
      items.map((item) => {
        const key = 'status' in item ? String(item.status) : 'unknown';
        return [key, item._count._all];
      })
    );
  }

  private paginate<T>(data: T[], total: number, query: PaginationQueryDto) {
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
