import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const workspaceSelect = {
  id: true,
  tenantId: true,
  name: true,
  slug: true,
  description: true,
  icon: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      teams: true,
      projects: true
    }
  }
} satisfies Prisma.WorkspaceSelect;

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async list(user: AuthenticatedUser, query: PaginationQueryDto) {
    const where: Prisma.WorkspaceWhereInput = {
      tenantId: user.tenantId,
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
      this.prisma.workspace.findMany({
        where,
        select: workspaceSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.workspace.count({ where })
    ]);

    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  async get(user: AuthenticatedUser, workspaceId: string) {
    return this.getTenantWorkspaceOrThrow(user.tenantId, workspaceId);
  }

  async create(user: AuthenticatedUser, dto: CreateWorkspaceDto, meta: RequestMeta) {
    await this.assertSlugAvailable(user.tenantId, dto.slug);

    const workspace = await this.prisma.workspace.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        icon: dto.icon
      },
      select: workspaceSelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'workspace.create',
      entityType: 'Workspace',
      entityId: workspace.id,
      newValue: {
        name: workspace.name,
        slug: workspace.slug
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return workspace;
  }

  async update(
    user: AuthenticatedUser,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
    meta: RequestMeta
  ) {
    const before = await this.getTenantWorkspaceOrThrow(user.tenantId, workspaceId);

    if (dto.slug && dto.slug !== before.slug) {
      await this.assertSlugAvailable(user.tenantId, dto.slug);
    }

    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        icon: dto.icon
      },
      select: workspaceSelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'workspace.update',
      entityType: 'Workspace',
      entityId: workspaceId,
      oldValue: {
        name: before.name,
        slug: before.slug
      },
      newValue: {
        name: updated.name,
        slug: updated.slug
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return updated;
  }

  async delete(user: AuthenticatedUser, workspaceId: string, meta: RequestMeta) {
    const workspace = await this.getTenantWorkspaceOrThrow(user.tenantId, workspaceId);

    if (workspace._count.projects > 0 || workspace._count.teams > 0) {
      throw new BadRequestException('Workspace must be empty before deletion');
    }

    await this.prisma.workspace.delete({
      where: { id: workspaceId }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'workspace.delete',
      entityType: 'Workspace',
      entityId: workspaceId,
      oldValue: {
        name: workspace.name,
        slug: workspace.slug
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  private async getTenantWorkspaceOrThrow(tenantId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        tenantId
      },
      select: workspaceSelect
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  private async assertSlugAvailable(tenantId: string, slug: string) {
    const existing = await this.prisma.workspace.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug
        }
      }
    });

    if (existing) {
      throw new ConflictException('Workspace slug already exists in this tenant');
    }
  }
}
