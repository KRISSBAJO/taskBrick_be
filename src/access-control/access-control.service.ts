import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listPermissions(user: AuthenticatedUser) {
    return this.prisma.permission.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ subject: 'asc' }, { action: 'asc' }],
      select: {
        id: true,
        action: true,
        subject: true,
        description: true,
        createdAt: true
      }
    });
  }

  async listRoles(user: AuthenticatedUser) {
    return this.prisma.role.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                action: true,
                subject: true,
                description: true
              }
            }
          },
          orderBy: {
            permission: {
              subject: 'asc'
            }
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    });
  }

  async createRole(user: AuthenticatedUser, dto: CreateRoleDto, meta: RequestMeta) {
    await this.assertPermissionsBelongToTenant(user.tenantId, dto.permissionIds ?? []);

    const existing = await this.prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId: user.tenantId,
          name: dto.name
        }
      }
    });

    if (existing) {
      throw new ConflictException('Role name already exists in this tenant');
    }

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name,
          description: dto.description,
          isSystem: false
        }
      });

      if (dto.permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: created.id,
            permissionId
          })),
          skipDuplicates: true
        });
      }

      return created;
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'role.create',
      entityType: 'Role',
      entityId: role.id,
      newValue: {
        name: role.name,
        permissionIds: dto.permissionIds ?? []
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return this.getRole(user.tenantId, role.id);
  }

  async updateRole(
    user: AuthenticatedUser,
    roleId: string,
    dto: UpdateRoleDto,
    meta: RequestMeta
  ) {
    const role = await this.getTenantRoleOrThrow(user.tenantId, roleId);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (dto.permissionIds) {
      await this.assertPermissionsBelongToTenant(user.tenantId, dto.permissionIds);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.role.update({
        where: { id: roleId },
        data: {
          name: dto.name,
          description: dto.description
        }
      });

      if (dto.permissionIds) {
        await tx.rolePermission.deleteMany({
          where: { roleId }
        });

        if (dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((permissionId) => ({
              roleId,
              permissionId
            })),
            skipDuplicates: true
          });
        }
      }

      return saved;
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'role.update',
      entityType: 'Role',
      entityId: roleId,
      oldValue: {
        name: role.name,
        description: role.description
      },
      newValue: {
        name: updated.name,
        description: updated.description,
        permissionIds: dto.permissionIds
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return this.getRole(user.tenantId, roleId);
  }

  async deleteRole(user: AuthenticatedUser, roleId: string, meta: RequestMeta) {
    const role = await this.getTenantRoleOrThrow(user.tenantId, roleId);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    const assignmentCount = await this.prisma.userRole.count({
      where: { roleId }
    });

    if (assignmentCount > 0) {
      throw new BadRequestException('Role cannot be deleted while assigned to users');
    }

    await this.prisma.role.delete({
      where: { id: roleId }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'role.delete',
      entityType: 'Role',
      entityId: roleId,
      oldValue: {
        name: role.name,
        description: role.description
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  async assignRole(user: AuthenticatedUser, dto: AssignRoleDto, meta: RequestMeta) {
    await this.getTenantRoleOrThrow(user.tenantId, dto.roleId);
    await this.getTenantUserOrThrow(user.tenantId, dto.userId);

    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: dto.userId,
          roleId: dto.roleId
        }
      },
      update: {},
      create: {
        userId: dto.userId,
        roleId: dto.roleId
      }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'role.assign',
      entityType: 'UserRole',
      entityId: `${dto.userId}:${dto.roleId}`,
      newValue: {
        userId: dto.userId,
        roleId: dto.roleId
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  async removeRoleFromUser(
    user: AuthenticatedUser,
    roleId: string,
    userId: string,
    meta: RequestMeta
  ) {
    const role = await this.getTenantRoleOrThrow(user.tenantId, roleId);
    await this.getTenantUserOrThrow(user.tenantId, userId);

    if (role.name === 'Owner') {
      const ownerCount = await this.prisma.userRole.count({
        where: {
          roleId,
          user: {
            tenantId: user.tenantId
          }
        }
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Tenant must keep at least one owner');
      }
    }

    await this.prisma.userRole.deleteMany({
      where: {
        userId,
        roleId
      }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'role.unassign',
      entityType: 'UserRole',
      entityId: `${userId}:${roleId}`,
      oldValue: {
        userId,
        roleId
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  private async getRole(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId
      },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                action: true,
                subject: true,
                description: true
              }
            }
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  private async getTenantRoleOrThrow(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId
      }
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  private async getTenantUserOrThrow(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async assertPermissionsBelongToTenant(tenantId: string, permissionIds: string[]) {
    if (permissionIds.length === 0) {
      return;
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        tenantId,
        id: {
          in: permissionIds
        }
      },
      select: {
        id: true
      }
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions are invalid for this tenant');
    }
  }
}
