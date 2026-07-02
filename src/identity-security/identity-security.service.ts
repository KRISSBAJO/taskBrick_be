import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SecurityEventSeverity, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { buildPublicUrl } from '../common/url/public-url.util';
import { PrismaService } from '../prisma/prisma.service';
import { DisableMfaDto, EnableTotpDto, RegenerateBackupCodesDto, SetupTotpDto } from './dto/mfa-management.dto';
import { VerifyMfaLoginDto } from './dto/mfa-login.dto';
import { SsoCallbackDto, SsoStartQueryDto, UpdateTenantLoginPolicyDto, UpsertSsoProviderDto } from './dto/sso-provider.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

type IdentityPolicy = {
  mfaRequired: boolean;
  allowedLoginMethods: string[];
  ssoRequired: boolean;
  domainDiscoveryEnabled: boolean;
  trustedDeviceTtlDays: number;
};

type MfaFactorRow = {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  status: string;
  label: string | null;
  secretEncrypted: unknown;
  lastUsedAt: Date | null;
  enabledAt: Date | null;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TrustedDeviceRow = {
  id: string;
  tenantId: string;
  userId: string;
  status: string;
  name: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SsoProviderRow = {
  id: string;
  tenantId: string;
  type: string;
  status: string;
  name: string;
  issuerUrl: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userInfoUrl: string | null;
  redirectUri: string | null;
  clientId: string | null;
  clientSecretEncrypted: unknown;
  scopes: string[];
  allowedDomains: string[];
  buttonLabel: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

@Injectable()
export class IdentitySecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async getTenantIdentityPolicy(tenantId: string): Promise<IdentityPolicy> {
    const rows = await this.prisma.$queryRaw<IdentityPolicy[]>`
      SELECT "mfaRequired",
             "allowedLoginMethods"::text[] as "allowedLoginMethods",
             "ssoRequired",
             "domainDiscoveryEnabled",
             "trustedDeviceTtlDays"
      FROM "SecurityPolicy"
      WHERE "tenantId" = ${tenantId}
      LIMIT 1
    `;
    return rows[0] ?? {
      mfaRequired: false,
      allowedLoginMethods: ['PASSWORD'],
      ssoRequired: false,
      domainDiscoveryEnabled: false,
      trustedDeviceTtlDays: 30
    };
  }

  async isPasswordLoginAllowed(tenantId: string) {
    const policy = await this.getTenantIdentityPolicy(tenantId);
    return !policy.ssoRequired && policy.allowedLoginMethods.includes('PASSWORD');
  }

  async preparePasswordLoginMfa(userId: string, tenantId: string, trustedDeviceToken?: string) {
    const activeFactor = await this.getActiveTotpFactor(userId, tenantId);
    if (!activeFactor) {
      return { requiresMfa: false, trustedDeviceId: null };
    }

    if (trustedDeviceToken) {
      const trustedDevice = await this.validateTrustedDevice(userId, tenantId, trustedDeviceToken);
      if (trustedDevice) {
        return { requiresMfa: false, trustedDeviceId: trustedDevice.id };
      }
    }

    const mfaToken = this.newOpaqueToken('mfa');
    await this.prisma.$executeRaw`
      INSERT INTO "MfaChallenge" (
        "id",
        "tenantId",
        "userId",
        "tokenHash",
        "expiresAt",
        "ipAddress",
        "userAgent"
      )
      VALUES (
        ${randomUUID()},
        ${tenantId},
        ${userId},
        ${this.hashToken(mfaToken)},
        ${new Date(Date.now() + 5 * 60 * 1000)},
        ${null},
        ${null}
      )
    `;

    return {
      requiresMfa: true,
      trustedDeviceId: null,
      challenge: {
        requiresMfa: true as const,
        mfaToken,
        methods: ['TOTP', 'BACKUP_CODE'],
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        message: 'MFA verification is required to complete sign in.'
      }
    };
  }

  async verifyLoginChallenge(dto: VerifyMfaLoginDto, meta: RequestMeta) {
    const [challenge] = await this.prisma.$queryRaw<Array<{
      id: string;
      tenantId: string;
      userId: string;
      expiresAt: Date;
      usedAt: Date | null;
    }>>`
      SELECT "id", "tenantId", "userId", "expiresAt", "usedAt"
      FROM "MfaChallenge"
      WHERE "tokenHash" = ${this.hashToken(dto.mfaToken)}
      LIMIT 1
    `;

    if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) {
      throw new UnauthorizedException('MFA challenge is invalid or expired');
    }

    const valid = await this.verifyUserMfaCode(challenge.userId, challenge.tenantId, dto.code);
    if (!valid) {
      await this.recordLoginHistory({
        tenantId: challenge.tenantId,
        userId: challenge.userId,
        email: await this.emailForUser(challenge.userId),
        tenantSlug: null,
        method: 'PASSWORD',
        status: 'MFA_FAILED',
        reason: 'invalid_mfa_code',
        meta
      });
      throw new UnauthorizedException('MFA code is invalid');
    }

    await this.prisma.$executeRaw`
      UPDATE "MfaChallenge"
      SET "usedAt" = NOW()
      WHERE "id" = ${challenge.id}
    `;

    let trustedDeviceToken: string | undefined;
    let trustedDeviceId: string | null = null;
    if (dto.rememberDevice) {
      const trusted = await this.createTrustedDevice(
        challenge.userId,
        challenge.tenantId,
        dto.deviceName,
        meta
      );
      trustedDeviceToken = trusted.rawToken;
      trustedDeviceId = trusted.id;
    }

    await this.recordLoginHistory({
      tenantId: challenge.tenantId,
      userId: challenge.userId,
      email: await this.emailForUser(challenge.userId),
      tenantSlug: null,
      method: 'PASSWORD',
      status: 'SUCCESS',
      reason: 'mfa_verified',
      meta
    });

    return {
      tenantId: challenge.tenantId,
      userId: challenge.userId,
      trustedDeviceId,
      trustedDeviceToken,
      mfaVerifiedAt: new Date()
    };
  }

  async overview(user: AuthenticatedUser) {
    const [factors, backupCounts, devices, loginHistory] = await Promise.all([
      this.listMfaFactors(user.id, user.tenantId),
      this.backupCodeCounts(user.id, user.tenantId),
      this.listTrustedDevices(user.id, user.tenantId),
      this.listLoginHistory(user.id, user.tenantId, 25)
    ]);

    return {
      mfa: {
        enabled: factors.some((factor) => factor.status === 'ACTIVE'),
        factors,
        backupCodes: backupCounts
      },
      trustedDevices: devices,
      loginHistory
    };
  }

  async setupTotp(user: AuthenticatedUser, dto: SetupTotpDto, meta: RequestMeta) {
    const secret = this.generateBase32Secret();
    const label = dto.label?.trim() || user.email;
    const encrypted = this.encryptSecret(secret);
    const factorId = randomUUID();

    await this.prisma.$executeRaw`
      INSERT INTO "UserMfaFactor" (
        "id",
        "tenantId",
        "userId",
        "type",
        "status",
        "label",
        "secretEncrypted",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${factorId},
        ${user.tenantId},
        ${user.id},
        'TOTP'::"MfaFactorType",
        'PENDING'::"MfaFactorStatus",
        ${label},
        ${JSON.stringify(encrypted)}::jsonb,
        NOW(),
        NOW()
      )
    `;

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'mfa.totp_setup_started',
      entityType: 'UserMfaFactor',
      entityId: factorId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return {
      factorId,
      secret,
      otpauthUrl: this.otpauthUrl(label, user.email, secret),
      issuer: this.totpIssuer
    };
  }

  async enableTotp(user: AuthenticatedUser, dto: EnableTotpDto, meta: RequestMeta) {
    const factor = await this.getMfaFactor(user.id, user.tenantId, dto.factorId);
    if (!factor || factor.status !== 'PENDING') {
      throw new BadRequestException('MFA setup is not available');
    }

    const secret = this.decryptSecret(factor.secretEncrypted);
    if (!secret || !this.verifyTotp(secret, dto.code)) {
      throw new BadRequestException('TOTP code is invalid');
    }

    const backupCodes = this.generateBackupCodes();
    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE "UserMfaFactor"
        SET "status" = 'DISABLED'::"MfaFactorStatus",
            "disabledAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "tenantId" = ${user.tenantId}
          AND "userId" = ${user.id}
          AND "status" = 'ACTIVE'
      `,
      this.prisma.$executeRaw`
        UPDATE "UserMfaFactor"
        SET "status" = 'ACTIVE'::"MfaFactorStatus",
            "enabledAt" = NOW(),
            "lastUsedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${dto.factorId}
      `,
      this.prisma.$executeRaw`
        UPDATE "UserBackupCode"
        SET "usedAt" = COALESCE("usedAt", NOW())
        WHERE "tenantId" = ${user.tenantId}
          AND "userId" = ${user.id}
          AND "usedAt" IS NULL
      `,
      ...backupCodes.map((code) => this.prisma.$executeRaw`
        INSERT INTO "UserBackupCode" ("id", "tenantId", "userId", "codeHash", "createdAt")
        VALUES (${randomUUID()}, ${user.tenantId}, ${user.id}, ${this.hashBackupCode(code)}, NOW())
      `)
    ]);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'mfa.totp_enabled',
      entityType: 'UserMfaFactor',
      entityId: dto.factorId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    await this.createSecurityEvent(user.tenantId, user.id, 'mfa.enabled', SecurityEventSeverity.HIGH, meta);

    return {
      success: true,
      backupCodes
    };
  }

  async disableMfa(user: AuthenticatedUser, dto: DisableMfaDto, meta: RequestMeta) {
    if (dto.currentPassword) {
      const current = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true }
      });
      if (!current?.passwordHash || !(await bcrypt.compare(dto.currentPassword, current.passwordHash))) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    } else if (dto.code) {
      const valid = await this.verifyUserMfaCode(user.id, user.tenantId, dto.code, false);
      if (!valid) throw new UnauthorizedException('MFA code is invalid');
    } else {
      throw new BadRequestException('Current password or MFA code is required');
    }

    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE "UserMfaFactor"
        SET "status" = 'DISABLED'::"MfaFactorStatus",
            "disabledAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "tenantId" = ${user.tenantId}
          AND "userId" = ${user.id}
          AND "status" != 'DISABLED'
      `,
      this.prisma.$executeRaw`
        UPDATE "TrustedDevice"
        SET "status" = 'REVOKED'::"TrustedDeviceStatus",
            "revokedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "tenantId" = ${user.tenantId}
          AND "userId" = ${user.id}
          AND "status" = 'ACTIVE'
      `
    ]);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'mfa.disabled',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await this.createSecurityEvent(user.tenantId, user.id, 'mfa.disabled', SecurityEventSeverity.HIGH, meta);
    return { success: true };
  }

  async regenerateBackupCodes(user: AuthenticatedUser, dto: RegenerateBackupCodesDto, meta: RequestMeta) {
    const valid = await this.verifyUserMfaCode(user.id, user.tenantId, dto.code, false);
    if (!valid) throw new UnauthorizedException('MFA code is invalid');

    const backupCodes = this.generateBackupCodes();
    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE "UserBackupCode"
        SET "usedAt" = COALESCE("usedAt", NOW())
        WHERE "tenantId" = ${user.tenantId}
          AND "userId" = ${user.id}
          AND "usedAt" IS NULL
      `,
      ...backupCodes.map((code) => this.prisma.$executeRaw`
        INSERT INTO "UserBackupCode" ("id", "tenantId", "userId", "codeHash", "createdAt")
        VALUES (${randomUUID()}, ${user.tenantId}, ${user.id}, ${this.hashBackupCode(code)}, NOW())
      `)
    ]);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'mfa.backup_codes_regenerated',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    return { backupCodes };
  }

  async listTrustedDevices(userId: string, tenantId: string) {
    return this.prisma.$queryRaw<TrustedDeviceRow[]>`
      SELECT "id", "tenantId", "userId", "status"::text as "status", "name", "ipAddress", "userAgent",
             "lastUsedAt", "expiresAt", "revokedAt", "createdAt", "updatedAt"
      FROM "TrustedDevice"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
      ORDER BY "lastUsedAt" DESC NULLS LAST, "createdAt" DESC
      LIMIT 50
    `;
  }

  async revokeTrustedDevice(user: AuthenticatedUser, deviceId: string, meta: RequestMeta) {
    await this.prisma.$executeRaw`
      UPDATE "TrustedDevice"
      SET "status" = 'REVOKED'::"TrustedDeviceStatus",
          "revokedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = ${deviceId}
        AND "tenantId" = ${user.tenantId}
        AND "userId" = ${user.id}
    `;
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'trusted_device.revoked',
      entityType: 'TrustedDevice',
      entityId: deviceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    return { success: true };
  }

  async listLoginHistory(userId: string, tenantId: string, limit = 50) {
    return this.prisma.$queryRaw`
      SELECT "id", "tenantId", "userId", "tenantSlug", "email", "method"::text as "method",
             "status"::text as "status", "reason", "ipAddress", "userAgent", "deviceFingerprint",
             "suspicious", "metadata", "createdAt"
      FROM "LoginHistory"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT ${Math.min(Math.max(limit, 1), 100)}
    `;
  }

  async listSsoProviders(user: AuthenticatedUser) {
    const rows = await this.getSsoProviders(user.tenantId);
    return rows.map((row) => this.serializeSsoProvider(row));
  }

  async upsertSsoProvider(user: AuthenticatedUser, dto: UpsertSsoProviderDto, meta: RequestMeta) {
    const id = randomUUID();
    const defaults = this.providerDefaults(dto.type);
    const metadata = { jitProvisioningEnabled: dto.jitProvisioningEnabled ?? true };
    const secretEnvelope = dto.clientSecret ? this.encryptSecret(dto.clientSecret) : undefined;

    await this.prisma.$executeRaw`
      INSERT INTO "SsoProvider" (
        "id", "tenantId", "type", "status", "name", "issuerUrl", "authorizationUrl", "tokenUrl",
        "userInfoUrl", "redirectUri", "clientId", "clientSecretEncrypted", "scopes", "allowedDomains",
        "buttonLabel", "metadata", "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${user.tenantId},
        ${dto.type}::"SsoProviderType",
        ${dto.status ?? 'DISABLED'}::"SsoProviderStatus",
        ${dto.name.trim()},
        ${dto.issuerUrl ?? defaults.issuerUrl},
        ${dto.authorizationUrl ?? defaults.authorizationUrl},
        ${dto.tokenUrl ?? defaults.tokenUrl},
        ${dto.userInfoUrl ?? defaults.userInfoUrl},
        ${dto.redirectUri ?? this.defaultSsoRedirectUri()},
        ${dto.clientId ?? null},
        ${secretEnvelope ? JSON.stringify(secretEnvelope) : null}::jsonb,
        ${this.textArray(dto.scopes?.length ? dto.scopes : defaults.scopes)},
        ${this.textArray(this.normalizeDomains(dto.allowedDomains))},
        ${dto.buttonLabel ?? defaults.buttonLabel},
        ${JSON.stringify(metadata)}::jsonb,
        ${user.id},
        ${user.id},
        NOW(),
        NOW()
      )
      ON CONFLICT ("tenantId", "type", "name")
      DO UPDATE SET
        "status" = EXCLUDED."status",
        "issuerUrl" = EXCLUDED."issuerUrl",
        "authorizationUrl" = EXCLUDED."authorizationUrl",
        "tokenUrl" = EXCLUDED."tokenUrl",
        "userInfoUrl" = EXCLUDED."userInfoUrl",
        "redirectUri" = EXCLUDED."redirectUri",
        "clientId" = EXCLUDED."clientId",
        "clientSecretEncrypted" = COALESCE(EXCLUDED."clientSecretEncrypted", "SsoProvider"."clientSecretEncrypted"),
        "scopes" = EXCLUDED."scopes",
        "allowedDomains" = EXCLUDED."allowedDomains",
        "buttonLabel" = EXCLUDED."buttonLabel",
        "metadata" = EXCLUDED."metadata",
        "updatedById" = EXCLUDED."updatedById",
        "updatedAt" = NOW()
    `;

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'sso_provider.upsert',
      entityType: 'SsoProvider',
      newValue: { type: dto.type, name: dto.name, status: dto.status ?? 'DISABLED' },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return this.listSsoProviders(user);
  }

  async updateTenantLoginPolicy(user: AuthenticatedUser, dto: UpdateTenantLoginPolicyDto, meta: RequestMeta) {
    await this.ensureSecurityPolicy(user.tenantId);
    await this.prisma.$executeRaw`
      UPDATE "SecurityPolicy"
      SET "allowedLoginMethods" = COALESCE(${dto.allowedLoginMethods ? this.authLoginMethodArray(dto.allowedLoginMethods) : null}, "allowedLoginMethods"),
          "ssoRequired" = COALESCE(${dto.ssoRequired ?? null}, "ssoRequired"),
          "domainDiscoveryEnabled" = COALESCE(${dto.domainDiscoveryEnabled ?? null}, "domainDiscoveryEnabled"),
          "mfaRequired" = COALESCE(${dto.mfaRequired ?? null}, "mfaRequired"),
          "trustedDeviceTtlDays" = COALESCE(${dto.trustedDeviceTtlDays ?? null}, "trustedDeviceTtlDays"),
          "updatedAt" = NOW()
      WHERE "tenantId" = ${user.tenantId}
    `;
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'identity.login_policy_updated',
      entityType: 'SecurityPolicy',
      newValue: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    return this.getTenantIdentityPolicy(user.tenantId);
  }

  async discoverLogin(email?: string, tenantSlug?: string) {
    const domain = email?.split('@')[1]?.toLowerCase();
    const tenant = tenantSlug
      ? await this.prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, name: true, slug: true } })
      : domain
        ? await this.findTenantBySsoDomain(domain)
        : null;

    if (!tenant) {
      return { tenant: null, loginMethods: ['PASSWORD'], providers: [] };
    }

    const [policy, providers] = await Promise.all([
      this.getTenantIdentityPolicy(tenant.id),
      this.getSsoProviders(tenant.id, true)
    ]);

    return {
      tenant,
      loginMethods: policy.allowedLoginMethods,
      ssoRequired: policy.ssoRequired,
      mfaRequired: policy.mfaRequired,
      providers: providers.map((provider) => this.serializeSsoProvider(provider))
    };
  }

  async startSso(query: SsoStartQueryDto, meta: RequestMeta) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: query.tenantSlug },
      select: { id: true, slug: true, status: true }
    });
    if (!tenant || !['ACTIVE', 'TRIAL'].includes(tenant.status)) {
      throw new UnauthorizedException('Tenant is not active');
    }

    const [provider] = await this.prisma.$queryRaw<SsoProviderRow[]>`
      SELECT *, "type"::text as "type", "status"::text as "status"
      FROM "SsoProvider"
      WHERE "id" = ${query.providerId}
        AND "tenantId" = ${tenant.id}
        AND "status" = 'ACTIVE'
      LIMIT 1
    `;
    if (!provider) throw new NotFoundException('SSO provider not found');
    if (provider.type === 'SAML') throw new BadRequestException('SAML assertion processing is not enabled in this phase');
    if (!provider.clientId) throw new BadRequestException('SSO provider client ID is not configured');

    const state = this.newOpaqueToken('sso');
    const codeVerifier = this.newOpaqueToken('pkce');
    const redirectUri = query.redirectUri ?? provider.redirectUri ?? this.defaultSsoRedirectUri();
    await this.prisma.$executeRaw`
      INSERT INTO "SsoLoginState" (
        "id", "tenantId", "providerId", "stateHash", "codeVerifier", "redirectUri",
        "expiresAt", "ipAddress", "userAgent", "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${tenant.id},
        ${provider.id},
        ${this.hashToken(state)},
        ${codeVerifier},
        ${redirectUri},
        ${new Date(Date.now() + 10 * 60 * 1000)},
        ${meta.ipAddress ?? null},
        ${meta.userAgent ?? null},
        NOW()
      )
    `;

    const url = new URL(provider.authorizationUrl ?? this.providerDefaults(provider.type).authorizationUrl);
    url.searchParams.set('client_id', provider.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', (provider.scopes?.length ? provider.scopes : this.providerDefaults(provider.type).scopes).join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', this.base64Url(createHash('sha256').update(codeVerifier).digest()));
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('prompt', 'select_account');

    return { authorizationUrl: url.toString(), stateExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() };
  }

  async completeSso(dto: SsoCallbackDto, meta: RequestMeta) {
    const [state] = await this.prisma.$queryRaw<Array<{
      id: string;
      tenantId: string;
      providerId: string;
      codeVerifier: string | null;
      redirectUri: string;
      expiresAt: Date;
      usedAt: Date | null;
    }>>`
      SELECT "id", "tenantId", "providerId", "codeVerifier", "redirectUri", "expiresAt", "usedAt"
      FROM "SsoLoginState"
      WHERE "stateHash" = ${this.hashToken(dto.state)}
      LIMIT 1
    `;
    if (!state || state.usedAt || state.expiresAt <= new Date()) {
      throw new UnauthorizedException('SSO state is invalid or expired');
    }

    const provider = await this.getSsoProviderById(state.providerId, state.tenantId);
    if (!provider || provider.status !== 'ACTIVE') throw new UnauthorizedException('SSO provider is not active');

    const token = await this.exchangeOauthCode(provider, dto.code, state.redirectUri, state.codeVerifier);
    const profile = await this.fetchOauthProfile(provider, token.access_token);
    const email = profile.email?.toLowerCase();
    if (!email) throw new UnauthorizedException('SSO provider did not return an email address');
    this.assertDomainAllowed(email, provider);

    const user = await this.findOrProvisionSsoUser(state.tenantId, provider, profile);
    await this.prisma.$executeRaw`
      UPDATE "SsoLoginState" SET "usedAt" = NOW(), "userId" = ${user.id} WHERE "id" = ${state.id}
    `;
    await this.linkSsoAccount(state.tenantId, user.id, provider, profile);
    await this.recordLoginHistory({
      tenantId: state.tenantId,
      userId: user.id,
      email,
      tenantSlug: null,
      method: provider.type,
      status: 'SUCCESS',
      reason: 'sso_callback',
      meta
    });

    return {
      tenantId: state.tenantId,
      userId: user.id,
      authMethod: provider.type
    };
  }

  async recordLoginHistory(input: {
    tenantId?: string | null;
    userId?: string | null;
    tenantSlug?: string | null;
    email: string;
    method: string;
    status: string;
    reason?: string | null;
    meta: RequestMeta;
  }) {
    const suspicious = await this.isSuspiciousLogin(input.userId, input.tenantId, input.meta.ipAddress);
    await this.prisma.$executeRaw`
      INSERT INTO "LoginHistory" (
        "id", "tenantId", "userId", "tenantSlug", "email", "method", "status", "reason",
        "ipAddress", "userAgent", "deviceFingerprint", "suspicious", "metadata", "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.tenantId ?? null},
        ${input.userId ?? null},
        ${input.tenantSlug ?? null},
        ${input.email.toLowerCase()},
        ${input.method}::"AuthLoginMethod",
        ${input.status}::"LoginAttemptStatus",
        ${input.reason ?? null},
        ${input.meta.ipAddress ?? null},
        ${input.meta.userAgent ?? null},
        ${this.deviceFingerprint(input.meta)},
        ${suspicious},
        ${JSON.stringify({ source: 'auth' })}::jsonb,
        NOW()
      )
    `;
    if (suspicious && input.tenantId) {
      await this.createSecurityEvent(
        input.tenantId,
        input.userId ?? null,
        'auth.suspicious_login',
        SecurityEventSeverity.HIGH,
        input.meta
      );
    }
  }

  private async getActiveTotpFactor(userId: string, tenantId: string) {
    const [factor] = await this.prisma.$queryRaw<MfaFactorRow[]>`
      SELECT *, "type"::text as "type", "status"::text as "status"
      FROM "UserMfaFactor"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
        AND "type" = 'TOTP'
        AND "status" = 'ACTIVE'
      ORDER BY "enabledAt" DESC NULLS LAST
      LIMIT 1
    `;
    return factor ?? null;
  }

  private async getMfaFactor(userId: string, tenantId: string, factorId: string) {
    const [factor] = await this.prisma.$queryRaw<MfaFactorRow[]>`
      SELECT *, "type"::text as "type", "status"::text as "status"
      FROM "UserMfaFactor"
      WHERE "id" = ${factorId}
        AND "tenantId" = ${tenantId}
        AND "userId" = ${userId}
      LIMIT 1
    `;
    return factor ?? null;
  }

  private async listMfaFactors(userId: string, tenantId: string) {
    const rows = await this.prisma.$queryRaw<MfaFactorRow[]>`
      SELECT *, "type"::text as "type", "status"::text as "status"
      FROM "UserMfaFactor"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
      ORDER BY "createdAt" DESC
    `;
    return rows.map(({ secretEncrypted: _secret, ...factor }) => factor);
  }

  private async verifyUserMfaCode(userId: string, tenantId: string, code: string, consumeBackupCode = true) {
    const normalized = code.replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
    const factor = await this.getActiveTotpFactor(userId, tenantId);
    const secret = factor ? this.decryptSecret(factor.secretEncrypted) : null;
    if (secret && this.verifyTotp(secret, normalized)) {
      await this.prisma.$executeRaw`
        UPDATE "UserMfaFactor"
        SET "lastUsedAt" = NOW(), "updatedAt" = NOW()
        WHERE "id" = ${factor!.id}
      `;
      return true;
    }

    const codeHash = this.hashBackupCode(normalized);
    const [backupCode] = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "UserBackupCode"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
        AND "codeHash" = ${codeHash}
        AND "usedAt" IS NULL
      LIMIT 1
    `;
    if (!backupCode) return false;
    if (consumeBackupCode) {
      await this.prisma.$executeRaw`
        UPDATE "UserBackupCode" SET "usedAt" = NOW() WHERE "id" = ${backupCode.id}
      `;
    }
    return true;
  }

  private async backupCodeCounts(userId: string, tenantId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ total: number; remaining: number }>>`
      SELECT COUNT(*)::int as "total",
             COUNT(*) FILTER (WHERE "usedAt" IS NULL)::int as "remaining"
      FROM "UserBackupCode"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
    `;
    return rows[0] ?? { total: 0, remaining: 0 };
  }

  private async validateTrustedDevice(userId: string, tenantId: string, token: string) {
    const [device] = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "TrustedDevice"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
        AND "tokenHash" = ${this.hashToken(token)}
        AND "status" = 'ACTIVE'
        AND "revokedAt" IS NULL
        AND "expiresAt" > NOW()
      LIMIT 1
    `;
    if (!device) return null;
    await this.prisma.$executeRaw`
      UPDATE "TrustedDevice"
      SET "lastUsedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${device.id}
    `;
    return device;
  }

  private async createTrustedDevice(userId: string, tenantId: string, name: string | undefined, meta: RequestMeta) {
    const policy = await this.getTenantIdentityPolicy(tenantId);
    const rawToken = this.newOpaqueToken('td');
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + Math.max(policy.trustedDeviceTtlDays, 1) * 24 * 60 * 60 * 1000);
    await this.prisma.$executeRaw`
      INSERT INTO "TrustedDevice" (
        "id", "tenantId", "userId", "tokenHash", "status", "name", "ipAddress", "userAgent",
        "lastUsedAt", "expiresAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${tenantId},
        ${userId},
        ${this.hashToken(rawToken)},
        'ACTIVE'::"TrustedDeviceStatus",
        ${name?.trim() || 'Trusted browser'},
        ${meta.ipAddress ?? null},
        ${meta.userAgent ?? null},
        NOW(),
        ${expiresAt},
        NOW(),
        NOW()
      )
    `;
    return { id, rawToken };
  }

  private async getSsoProviders(tenantId: string, activeOnly = false) {
    return this.prisma.$queryRaw<SsoProviderRow[]>`
      SELECT *, "type"::text as "type", "status"::text as "status"
      FROM "SsoProvider"
      WHERE "tenantId" = ${tenantId}
        AND (${activeOnly} = false OR "status" = 'ACTIVE')
      ORDER BY "SsoProvider"."type" ASC, "SsoProvider"."name" ASC
    `;
  }

  private async getSsoProviderById(providerId: string, tenantId: string) {
    const [provider] = await this.prisma.$queryRaw<SsoProviderRow[]>`
      SELECT *, "type"::text as "type", "status"::text as "status"
      FROM "SsoProvider"
      WHERE "id" = ${providerId}
        AND "tenantId" = ${tenantId}
      LIMIT 1
    `;
    return provider ?? null;
  }

  private serializeSsoProvider(row: SsoProviderRow) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      type: row.type,
      status: row.status,
      name: row.name,
      issuerUrl: row.issuerUrl,
      authorizationUrl: row.authorizationUrl,
      tokenUrl: row.tokenUrl,
      userInfoUrl: row.userInfoUrl,
      redirectUri: row.redirectUri,
      clientId: row.clientId,
      clientSecretConfigured: Boolean(row.clientSecretEncrypted),
      scopes: row.scopes,
      allowedDomains: row.allowedDomains,
      buttonLabel: row.buttonLabel,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private async exchangeOauthCode(provider: SsoProviderRow, code: string, redirectUri: string, codeVerifier: string | null) {
    const tokenUrl = provider.tokenUrl ?? this.providerDefaults(provider.type).tokenUrl;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: provider.clientId ?? ''
    });
    if (codeVerifier) body.set('code_verifier', codeVerifier);
    const clientSecret = this.decryptSecret(provider.clientSecretEncrypted);
    if (clientSecret) body.set('client_secret', clientSecret);
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!response.ok) throw new UnauthorizedException('SSO token exchange failed');
    return response.json() as Promise<{ access_token: string; id_token?: string }>;
  }

  private async fetchOauthProfile(provider: SsoProviderRow, accessToken: string) {
    const userInfoUrl = provider.userInfoUrl ?? this.providerDefaults(provider.type).userInfoUrl;
    const response = await fetch(userInfoUrl, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new UnauthorizedException('SSO profile lookup failed');
    return response.json() as Promise<{ sub?: string; id?: string; email?: string; name?: string; given_name?: string; family_name?: string }>;
  }

  private async findOrProvisionSsoUser(tenantId: string, provider: SsoProviderRow, profile: { sub?: string; id?: string; email?: string; name?: string; given_name?: string; family_name?: string }) {
    const email = profile.email!.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
      select: { id: true, tenantId: true, email: true, status: true }
    });
    if (existing) {
      if (existing.status !== UserStatus.ACTIVE) throw new UnauthorizedException('User account is not active');
      return existing;
    }

    const metadata = this.asRecord(provider.metadata);
    if (metadata.jitProvisioningEnabled === false) {
      throw new UnauthorizedException('SSO user is not provisioned');
    }

    const viewerRole = await this.prisma.role.findFirst({
      where: { tenantId, name: { in: ['Viewer', 'Member'] } },
      select: { id: true }
    });
    const nameParts = (profile.name ?? email.split('@')[0]).split(' ');
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        firstName: profile.given_name ?? nameParts[0] ?? 'SSO',
        lastName: profile.family_name ?? (nameParts.slice(1).join(' ') || 'User'),
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date()
      },
      select: { id: true, tenantId: true, email: true, status: true }
    });
    if (viewerRole) {
      await this.prisma.userRole.create({ data: { userId: user.id, roleId: viewerRole.id } });
    }
    return user;
  }

  private async linkSsoAccount(tenantId: string, userId: string, provider: SsoProviderRow, profile: { sub?: string; id?: string; email?: string; name?: string }) {
    const providerUserId = profile.sub ?? profile.id ?? profile.email!;
    await this.prisma.$executeRaw`
      INSERT INTO "UserSsoAccount" (
        "id", "tenantId", "userId", "providerId", "providerType", "providerUserId", "email",
        "displayName", "metadata", "lastLoginAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${tenantId},
        ${userId},
        ${provider.id},
        ${provider.type}::"SsoProviderType",
        ${providerUserId},
        ${profile.email!.toLowerCase()},
        ${profile.name ?? null},
        ${JSON.stringify(profile)}::jsonb,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT ("tenantId", "providerId", "providerUserId")
      DO UPDATE SET
        "userId" = EXCLUDED."userId",
        "email" = EXCLUDED."email",
        "displayName" = EXCLUDED."displayName",
        "metadata" = EXCLUDED."metadata",
        "lastLoginAt" = NOW(),
        "updatedAt" = NOW()
    `;
  }

  private async findTenantBySsoDomain(domain: string) {
    const [row] = await this.prisma.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
      SELECT t."id", t."name", t."slug"
      FROM "Tenant" t
      JOIN "SecurityPolicy" sp ON sp."tenantId" = t."id"
      JOIN "SsoProvider" sso ON sso."tenantId" = t."id"
      WHERE sp."domainDiscoveryEnabled" = true
        AND sso."status" = 'ACTIVE'
        AND ${domain} = ANY(sso."allowedDomains")
      LIMIT 1
    `;
    return row ?? null;
  }

  private assertDomainAllowed(email: string, provider: SsoProviderRow) {
    if (provider.allowedDomains.length === 0) return;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || !provider.allowedDomains.map((item) => item.toLowerCase()).includes(domain)) {
      throw new UnauthorizedException('Email domain is not allowed for this SSO provider');
    }
  }

  private async ensureSecurityPolicy(tenantId: string) {
    await this.prisma.$executeRaw`
      INSERT INTO "SecurityPolicy" ("id", "tenantId", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${tenantId}, NOW(), NOW())
      ON CONFLICT ("tenantId") DO NOTHING
    `;
  }

  private async emailForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return user?.email ?? 'unknown';
  }

  private async isSuspiciousLogin(userId?: string | null, tenantId?: string | null, ipAddress?: string | null) {
    if (!userId || !tenantId || !ipAddress) return false;
    const rows = await this.prisma.$queryRaw<Array<{ differentIp: number; recentFailures: number }>>`
      SELECT
        COUNT(*) FILTER (WHERE "status" = 'SUCCESS' AND "ipAddress" IS NOT NULL AND "ipAddress" <> ${ipAddress})::int as "differentIp",
        COUNT(*) FILTER (WHERE "status" IN ('FAILED', 'MFA_FAILED') AND "createdAt" > NOW() - INTERVAL '30 minutes')::int as "recentFailures"
      FROM "LoginHistory"
      WHERE "tenantId" = ${tenantId}
        AND "userId" = ${userId}
    `;
    const result = rows[0];
    return Boolean(result && (result.differentIp > 0 || result.recentFailures >= 5));
  }

  private async createSecurityEvent(tenantId: string, actorId: string | null, type: string, severity: SecurityEventSeverity, meta: RequestMeta) {
    await this.prisma.securityEvent.create({
      data: {
        tenantId,
        actorId,
        type,
        severity,
        source: 'identity-security',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    });
  }

  private generateBase32Secret() {
    return this.base32Encode(randomBytes(20));
  }

  private base32Encode(buffer: Buffer) {
    let bits = '';
    for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
    let output = '';
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.slice(i, i + 5).padEnd(5, '0');
      output += base32Alphabet[Number.parseInt(chunk, 2)];
    }
    return output;
  }

  private base32Decode(secret: string) {
    const clean = secret.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
    let bits = '';
    for (const char of clean) {
      const value = base32Alphabet.indexOf(char);
      if (value < 0) throw new BadRequestException('Invalid TOTP secret');
      bits += value.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
  }

  private verifyTotp(secret: string, code: string) {
    const normalized = code.replace(/\D/g, '');
    if (!/^\d{6}$/.test(normalized)) return false;
    const counter = Math.floor(Date.now() / 30_000);
    return [-1, 0, 1].some((offset) => this.safeEqual(this.totp(secret, counter + offset), normalized));
  }

  private totp(secret: string, counter: number) {
    const key = this.base32Decode(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));
    const hmac = createHmac('sha1', key).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
    return `${binary % 1_000_000}`.padStart(6, '0');
  }

  private safeEqual(left: string, right: string) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private otpauthUrl(label: string, email: string, secret: string) {
    const account = encodeURIComponent(`${this.totpIssuer}:${email}`);
    const issuer = encodeURIComponent(this.totpIssuer);
    return `otpauth://totp/${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }

  private generateBackupCodes() {
    return Array.from({ length: 10 }, () => `${randomBytes(4).toString('hex')}-${randomBytes(4).toString('hex')}`.toUpperCase());
  }

  private hashBackupCode(code: string) {
    return this.hashToken(code.replace(/\s+/g, '').replace(/-/g, '').toUpperCase());
  }

  private newOpaqueToken(prefix: string) {
    return `${prefix}_${randomBytes(48).toString('base64url')}`;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private encryptSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { v: 1, alg: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64'), ciphertext: ciphertext.toString('base64') };
  }

  private decryptSecret(value: unknown) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    const record = this.asRecord(value);
    if (record.alg !== 'aes-256-gcm' || typeof record.iv !== 'string' || typeof record.tag !== 'string' || typeof record.ciphertext !== 'string') return null;
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(record.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  private encryptionKey() {
    const configured =
      this.configService.get<string>('security.encryptionKey') ||
      this.configService.get<string>('jwt.accessSecret') ||
      'taskbricks-local-development-fallback-key';
    return createHash('sha256').update(configured).digest();
  }

  private providerDefaults(type: string) {
    if (type === 'GOOGLE') {
      return {
        issuerUrl: 'https://accounts.google.com',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        scopes: ['openid', 'email', 'profile'],
        buttonLabel: 'Continue with Google'
      };
    }
    if (type === 'MICROSOFT') {
      return {
        issuerUrl: 'https://login.microsoftonline.com/common/v2.0',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
        scopes: ['openid', 'email', 'profile'],
        buttonLabel: 'Continue with Microsoft'
      };
    }
    return {
      issuerUrl: null,
      authorizationUrl: '',
      tokenUrl: '',
      userInfoUrl: '',
      scopes: ['openid', 'email', 'profile'],
      buttonLabel: 'Continue with SSO'
    };
  }

  private defaultSsoRedirectUri() {
    return buildPublicUrl(this.configService.get<string>('app.frontendUrl'), '/login/sso/callback');
  }

  private normalizeDomains(domains?: string[]) {
    return [...new Set((domains ?? []).map((domain) => domain.trim().toLowerCase()).filter(Boolean))];
  }

  private textArray(values?: string[]) {
    const safe = (values ?? []).filter(Boolean);
    if (safe.length === 0) return Prisma.sql`ARRAY[]::text[]`;
    return Prisma.sql`ARRAY[${Prisma.join(safe)}]::text[]`;
  }

  private authLoginMethodArray(values: string[]) {
    if (values.length === 0) return Prisma.sql`ARRAY[]::"AuthLoginMethod"[]`;
    return Prisma.sql`ARRAY[${Prisma.join(values)}]::"AuthLoginMethod"[]`;
  }

  private asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  }

  private deviceFingerprint(meta: RequestMeta) {
    return createHash('sha256').update(`${meta.ipAddress ?? ''}|${meta.userAgent ?? ''}`).digest('hex');
  }

  private base64Url(buffer: Buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private get totpIssuer() {
    return this.configService.get<string>('security.twoFactorIssuer') || 'TaskBricks';
  }
}
