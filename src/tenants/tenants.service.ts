import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async getCurrentTenant(user: AuthenticatedUser) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        website: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            workspaces: true,
            teams: true,
            projects: true,
            integrations: true
          }
        }
      }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateCurrentTenant(
    user: AuthenticatedUser,
    dto: UpdateTenantDto,
    meta: RequestMeta
  ) {
    const before = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId }
    });

    if (!before) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        name: dto.name,
        logoUrl: dto.logoUrl,
        website: dto.website
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        website: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'tenant.update',
      entityType: 'Tenant',
      entityId: user.tenantId,
      oldValue: {
        name: before.name,
        logoUrl: before.logoUrl,
        website: before.website
      },
      newValue: {
        name: updated.name,
        logoUrl: updated.logoUrl,
        website: updated.website
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return updated;
  }
}
