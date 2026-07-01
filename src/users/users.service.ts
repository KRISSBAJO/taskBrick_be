import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BulkInviteUsersDto } from './dto/bulk-invite-users.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface RequestMeta {
  ipAddress?: string | null;
  origin?: string | null;
  referer?: string | null;
  userAgent?: string | null;
}

export type BulkInviteStatus = 'CREATED' | 'UPDATED' | 'SKIPPED' | 'FAILED';

export interface BulkInviteResult {
  email: string;
  deliveryStatus?: string;
  status: BulkInviteStatus;
  userId: string | null;
  message: string;
}

export interface BulkInviteUsersResponse {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  inviteDelivery: string;
  results: BulkInviteResult[];
}

const userSelect = {
  id: true,
  tenantId: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  timezone: true,
  locale: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
          isSystem: true
        }
      }
    }
  },
  internalMailbox: {
    select: {
      id: true,
      address: true,
      localPart: true,
      displayName: true,
      status: true
    }
  }
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService
  ) {}

  async listUsers(user: AuthenticatedUser, query: PaginationQueryDto) {
    const where: Prisma.UserWhereInput = {
      tenantId: user.tenantId,
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
        select: userSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.user.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async getUser(user: AuthenticatedUser, userId: string) {
    return this.getTenantUserOrThrow(user.tenantId, userId);
  }

  async inviteUser(user: AuthenticatedUser, dto: InviteUserDto, meta: RequestMeta) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: user.tenantId,
          email
        }
      }
    });

    if (existing) {
      throw new ConflictException('User already exists in this tenant');
    }

    if (dto.roleIds?.length) {
      await this.assertRolesBelongToTenant(user.tenantId, dto.roleIds);
    }
    const inviteRoleIds = await this.resolveInviteRoleIds(user.tenantId, dto.roleIds);

    const invited = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId: user.tenantId,
          email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: UserStatus.INVITED
        }
      });

      if (inviteRoleIds.length) {
        await tx.userRole.createMany({
          data: inviteRoleIds.map((roleId) => ({
            userId: created.id,
            roleId
          })),
          skipDuplicates: true
        });
      }

      return created;
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'user.invite',
      entityType: 'User',
      entityId: invited.id,
      newValue: {
        email: invited.email,
        roleIds: inviteRoleIds
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    const invitation = await this.authService.sendInvitation(invited.id, user.id, meta);

    return {
      delivery: invitation.delivery?.channel ?? 'email',
      deliveryStatus: invitation.delivery,
      user: await this.getTenantUserOrThrow(user.tenantId, invited.id)
    };
  }

  async bulkInviteUsers(
    user: AuthenticatedUser,
    dto: BulkInviteUsersDto,
    meta: RequestMeta
  ): Promise<BulkInviteUsersResponse> {
    const defaultRoleIds = this.unique(dto.defaultRoleIds ?? []);
    const fallbackMemberRoleId = await this.getDefaultMemberRoleId(user.tenantId);
    const allRoleIds = this.unique([
      ...defaultRoleIds,
      ...dto.users.flatMap((item) => item.roleIds ?? [])
    ]);

    if (allRoleIds.length) {
      await this.assertRolesBelongToTenant(user.tenantId, allRoleIds);
    }

    const seenEmails = new Set<string>();
    const createdUserIds: string[] = [];
    const results: BulkInviteResult[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.users) {
        const email = item.email.toLowerCase().trim();

        if (!email || seenEmails.has(email)) {
          results.push({
            email,
            status: 'SKIPPED',
            userId: null,
            message: seenEmails.has(email)
              ? 'Duplicate row in this import.'
              : 'Email address is required.'
          });
          continue;
        }

        seenEmails.add(email);

        const rowRoleIds = this.unique([...(item.roleIds ?? []), ...defaultRoleIds]);

        try {
          const existing = await tx.user.findUnique({
            where: {
              tenantId_email: {
                tenantId: user.tenantId,
                email
              }
            },
            select: {
              id: true,
              status: true
            }
          });

          if (existing) {
            if (existing.status === UserStatus.DEACTIVATED) {
              results.push({
                email,
                status: 'SKIPPED',
                userId: existing.id,
                message: 'User exists but is deactivated. Reactivate the account before assigning roles.'
              });
              continue;
            }

            const effectiveRoleIds = rowRoleIds.length
              ? rowRoleIds
              : await this.resolveExistingUserFallbackRoleIds(tx, existing.id, fallbackMemberRoleId);

            if (effectiveRoleIds.length) {
              await tx.userRole.createMany({
                data: effectiveRoleIds.map((roleId) => ({
                  userId: existing.id,
                  roleId
                })),
                skipDuplicates: true
              });
            }

            results.push({
              email,
              status: 'UPDATED',
              userId: existing.id,
              message: effectiveRoleIds.length
                ? 'Existing tenant user found; missing roles were attached.'
                : 'Existing tenant user found.'
            });
            continue;
          }

          const created = await tx.user.create({
            data: {
              tenantId: user.tenantId,
              email,
              firstName: this.nameOrFallback(item.firstName, email),
              lastName: item.lastName?.trim() || '',
              status: UserStatus.INVITED
            },
            select: {
              id: true
            }
          });

          const effectiveRoleIds = rowRoleIds.length
            ? rowRoleIds
            : fallbackMemberRoleId
              ? [fallbackMemberRoleId]
              : [];

          if (effectiveRoleIds.length) {
            await tx.userRole.createMany({
              data: effectiveRoleIds.map((roleId) => ({
                userId: created.id,
                roleId
              })),
              skipDuplicates: true
            });
          }

          createdUserIds.push(created.id);
          results.push({
            email,
            status: 'CREATED',
            userId: created.id,
            message: 'Tenant user created.'
          });
        } catch (error) {
          results.push({
            email,
            status: 'FAILED',
            userId: null,
            message: error instanceof Error ? error.message : 'Unable to import this user.'
          });
        }
      }
    });

    const sendInvites = dto.sendInvites ?? true;
    if (sendInvites) {
      for (const createdUserId of createdUserIds) {
        try {
          const invitation = await this.authService.sendInvitation(createdUserId, user.id, meta);
          const delivery = invitation.delivery;
          const result = results.find((item) => item.userId === createdUserId);
          if (result && delivery?.status && delivery.status !== 'sent') {
            result.deliveryStatus = delivery.status;
            result.message = invitation.message;
          }
        } catch (error) {
          const result = results.find((item) => item.userId === createdUserId);
          if (result) {
            result.message = `Tenant user created, but invitation delivery failed: ${
              error instanceof Error ? error.message : 'unknown delivery error'
            }`;
          }
        }
      }
    }

    const summary: BulkInviteUsersResponse = {
      created: results.filter((item) => item.status === 'CREATED').length,
      updated: results.filter((item) => item.status === 'UPDATED').length,
      skipped: results.filter((item) => item.status === 'SKIPPED').length,
      failed: results.filter((item) => item.status === 'FAILED').length,
      inviteDelivery: sendInvites ? 'sent_for_created_users' : 'disabled',
      results
    };

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'user.bulk_invite',
      entityType: 'User',
      entityId: null,
      newValue: summary as unknown as Prisma.InputJsonValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return summary;
  }

  async resendInvitation(user: AuthenticatedUser, userId: string, meta: RequestMeta) {
    const target = await this.getTenantUserOrThrow(user.tenantId, userId);

    if (target.status !== UserStatus.INVITED) {
      throw new ConflictException('Only pending tenant invitations can be resent');
    }

    const invitation = await this.authService.sendInvitation(target.id, user.id, meta);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'user.invite_resend',
      entityType: 'User',
      entityId: target.id,
      newValue: {
        email: target.email,
        delivery: invitation.delivery?.channel ?? 'email',
        deliveryStatus: invitation.delivery
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return {
      success: true,
      delivery: invitation.delivery?.channel ?? 'email',
      deliveryStatus: invitation.delivery,
      user: await this.getTenantUserOrThrow(user.tenantId, target.id)
    };
  }

  async cancelInvitation(user: AuthenticatedUser, userId: string, meta: RequestMeta) {
    if (user.id === userId) {
      throw new ConflictException('You cannot cancel your own invitation');
    }

    const target = await this.getTenantUserOrThrow(user.tenantId, userId);

    if (target.status !== UserStatus.INVITED) {
      throw new ConflictException('Only pending tenant invitations can be cancelled');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: target.id },
        data: { status: UserStatus.DEACTIVATED }
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: {
          tenantId: user.tenantId,
          userId: target.id,
          usedAt: null
        },
        data: {
          usedAt: new Date()
        }
      })
    ]);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'user.invite_cancel',
      entityType: 'User',
      entityId: target.id,
      oldValue: {
        email: target.email,
        status: target.status
      },
      newValue: {
        status: UserStatus.DEACTIVATED
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return {
      success: true,
      user: await this.getTenantUserOrThrow(user.tenantId, target.id)
    };
  }

  async reinviteUser(user: AuthenticatedUser, userId: string, meta: RequestMeta) {
    const target = await this.getTenantUserOrThrow(user.tenantId, userId);

    if (target.status === UserStatus.ACTIVE) {
      throw new ConflictException('Active users do not need a tenant invitation');
    }

    if (target.status !== UserStatus.DEACTIVATED && target.status !== UserStatus.INVITED) {
      throw new ConflictException('This user cannot be reinvited from its current state');
    }

    await this.prisma.user.update({
      where: { id: target.id },
      data: { status: UserStatus.INVITED }
    });

    const invitation = await this.authService.sendInvitation(target.id, user.id, meta);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: target.status === UserStatus.DEACTIVATED ? 'user.invite_reactivate' : 'user.invite_resend',
      entityType: 'User',
      entityId: target.id,
      oldValue: {
        email: target.email,
        status: target.status
      },
      newValue: {
        status: UserStatus.INVITED,
        delivery: invitation.delivery?.channel ?? 'email',
        deliveryStatus: invitation.delivery
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return {
      success: true,
      delivery: invitation.delivery?.channel ?? 'email',
      deliveryStatus: invitation.delivery,
      user: await this.getTenantUserOrThrow(user.tenantId, target.id)
    };
  }

  async updateUser(
    user: AuthenticatedUser,
    userId: string,
    dto: UpdateUserDto,
    meta: RequestMeta
  ) {
    const before = await this.getTenantUserOrThrow(user.tenantId, userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: dto.status,
        timezone: dto.timezone,
        locale: dto.locale,
        avatarUrl: dto.avatarUrl
      },
      select: userSelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'user.update',
      entityType: 'User',
      entityId: userId,
      oldValue: {
        firstName: before.firstName,
        lastName: before.lastName,
        status: before.status
      },
      newValue: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        status: updated.status
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return updated;
  }

  async updateMyProfile(
    user: AuthenticatedUser,
    dto: UpdateMyProfileDto,
    meta: RequestMeta
  ) {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        timezone: dto.timezone,
        locale: dto.locale,
        avatarUrl: dto.avatarUrl
      },
      select: userSelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'user.profile_update',
      entityType: 'User',
      entityId: user.id,
      newValue: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        timezone: updated.timezone,
        locale: updated.locale
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return updated;
  }

  private async getTenantUserOrThrow(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      },
      select: userSelect
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async assertRolesBelongToTenant(tenantId: string, roleIds: string[]) {
    const roles = await this.prisma.role.findMany({
      where: {
        tenantId,
        id: {
          in: roleIds
        }
      },
      select: {
        id: true
      }
    });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles were not found');
    }
  }

  private async resolveInviteRoleIds(tenantId: string, roleIds: string[] | undefined) {
    const uniqueRoleIds = this.unique(roleIds ?? []);
    if (uniqueRoleIds.length) return uniqueRoleIds;

    const memberRoleId = await this.getDefaultMemberRoleId(tenantId);
    return memberRoleId ? [memberRoleId] : [];
  }

  private async getDefaultMemberRoleId(tenantId: string) {
    const role = await this.prisma.role.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name: 'Member'
        }
      },
      select: { id: true }
    });

    return role?.id ?? null;
  }

  private async resolveExistingUserFallbackRoleIds(
    tx: Prisma.TransactionClient,
    userId: string,
    fallbackMemberRoleId: string | null
  ) {
    if (!fallbackMemberRoleId) return [];

    const existingRoleCount = await tx.userRole.count({
      where: { userId }
    });

    return existingRoleCount === 0 ? [fallbackMemberRoleId] : [];
  }

  private nameOrFallback(name: string | undefined, email: string) {
    const trimmed = name?.trim();
    if (trimmed) return trimmed;

    const localPart = email.split('@')[0] || 'User';
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .slice(0, 80) || 'User';
  }

  private unique(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private paginate<T>(data: T[], total: number, query: PaginationQueryDto) {
    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }
}
