import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

type RequestWithId = Request & { requestId?: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService
  ) {
    const secret = configService.get<string>('jwt.accessSecret');

    if (!secret) {
      throw new Error('JWT access secret is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true
    } as StrategyOptionsWithRequest);
  }

  async validate(request: RequestWithId, payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session is no longer active');
    }

    await this.assertRequestIpAllowed(request, payload, session.userId);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenant: {
          select: {
            status: true
          }
        },
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
    });

    if (!user || user.tenantId !== payload.tenantId || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    if (!['ACTIVE', 'TRIAL'].includes(user.tenant.status)) {
      throw new UnauthorizedException('Tenant is not active');
    }

    const platformAdmin = await this.loadPlatformAdminProfile(user.id);

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
      sessionId: payload.sessionId,
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
    } catch {
      return null;
    }
  }

  private async assertRequestIpAllowed(request: RequestWithId, payload: JwtPayload, userId: string) {
    const policy = await this.prisma.securityPolicy.findUnique({
      where: { tenantId: payload.tenantId },
      select: { enforceIpAllowlist: true, ipAllowlist: true }
    });
    if (!policy?.enforceIpAllowlist || policy.ipAllowlist.length === 0) return;

    const ipAddress = this.normalizeIp(request.ip || request.socket.remoteAddress || '');
    const allowed = policy.ipAllowlist.some((entry) => this.ipMatches(ipAddress, entry));
    if (allowed) return;

    await this.prisma.securityEvent.create({
      data: {
        tenantId: payload.tenantId,
        actorId: userId,
        type: 'auth.ip_blocked',
        severity: 'HIGH',
        source: 'jwt-strategy',
        subjectType: 'AuthSession',
        subjectId: payload.sessionId,
        ipAddress,
        userAgent: request.header('user-agent') ?? null,
        requestId: request.requestId ?? null,
        metadata: { allowlistSize: policy.ipAllowlist.length }
      }
    });
    throw new UnauthorizedException('Request IP is not allowed for this tenant');
  }

  private ipMatches(ipAddress: string, entry: string) {
    const normalizedEntry = this.normalizeIp(entry.trim());
    if (!normalizedEntry) return false;
    if (normalizedEntry === '*') return true;
    if (!normalizedEntry.includes('/')) return ipAddress === normalizedEntry;
    return this.ipv4CidrMatches(ipAddress, normalizedEntry);
  }

  private normalizeIp(value: string) {
    if (!value) return '';
    if (value === '::1') return '127.0.0.1';
    return value.replace(/^::ffff:/, '').trim();
  }

  private ipv4CidrMatches(ipAddress: string, cidr: string) {
    const [range, bitsText] = cidr.split('/');
    const bits = Number.parseInt(bitsText ?? '', 10);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    const ip = this.ipv4ToNumber(ipAddress);
    const base = this.ipv4ToNumber(range);
    if (ip === null || base === null) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ip & mask) === (base & mask);
  }

  private ipv4ToNumber(value: string) {
    const parts = value.split('.').map((part) => Number.parseInt(part, 10));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return null;
    }
    return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + parts[3];
  }
}
