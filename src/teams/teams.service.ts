import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { NotificationChannel, Prisma, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteTeamMemberDto } from './dto/invite-team-member.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const teamSelect = {
  id: true,
  tenantId: true,
  workspaceId: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  workspace: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  _count: {
    select: {
      members: true,
      projects: true
    }
  }
} satisfies Prisma.TeamSelect;

const teamMemberSelect = {
  id: true,
  teamId: true,
  userId: true,
  role: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      status: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              isSystem: true,
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
              }
            }
          }
        },
        orderBy: {
          role: {
            name: 'asc'
          }
        }
      }
    }
  }
} satisfies Prisma.TeamMemberSelect;

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService
  ) {}

  async list(user: AuthenticatedUser, query: TeamQueryDto) {
    const where: Prisma.TeamWhereInput = {
      tenantId: user.tenantId,
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
      ...(query.search
        ? {
            OR: [{ name: { contains: query.search, mode: 'insensitive' } }]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        select: teamSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.team.count({ where })
    ]);

    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  async get(user: AuthenticatedUser, teamId: string) {
    return this.getTenantTeamOrThrow(user.tenantId, teamId);
  }

  async create(user: AuthenticatedUser, dto: CreateTeamDto, meta: RequestMeta) {
    if (dto.workspaceId) {
      await this.assertWorkspaceBelongsToTenant(user.tenantId, dto.workspaceId);
    }

    const team = await this.prisma.team.create({
      data: {
        tenantId: user.tenantId,
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description
      },
      select: teamSelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'team.create',
      entityType: 'Team',
      entityId: team.id,
      newValue: {
        name: team.name,
        workspaceId: team.workspaceId
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return team;
  }

  async update(user: AuthenticatedUser, teamId: string, dto: UpdateTeamDto, meta: RequestMeta) {
    const before = await this.getTenantTeamOrThrow(user.tenantId, teamId);

    if (dto.workspaceId) {
      await this.assertWorkspaceBelongsToTenant(user.tenantId, dto.workspaceId);
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: dto.name,
        description: dto.description,
        workspaceId: dto.workspaceId
      },
      select: teamSelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'team.update',
      entityType: 'Team',
      entityId: teamId,
      oldValue: {
        name: before.name,
        workspaceId: before.workspaceId
      },
      newValue: {
        name: updated.name,
        workspaceId: updated.workspaceId
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return updated;
  }

  async delete(user: AuthenticatedUser, teamId: string, meta: RequestMeta) {
    const team = await this.getTenantTeamOrThrow(user.tenantId, teamId);

    if (team._count.members > 0 || team._count.projects > 0) {
      throw new BadRequestException('Team must be empty before deletion');
    }

    await this.prisma.team.delete({
      where: { id: teamId }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'team.delete',
      entityType: 'Team',
      entityId: teamId,
      oldValue: {
        name: team.name,
        workspaceId: team.workspaceId
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  async listMembers(user: AuthenticatedUser, teamId: string) {
    await this.getTenantTeamOrThrow(user.tenantId, teamId);

    return this.prisma.teamMember.findMany({
      where: {
        teamId,
        user: {
          tenantId: user.tenantId
        }
      },
      orderBy: [{ createdAt: 'asc' }],
      select: teamMemberSelect
    });
  }

  async addMember(
    user: AuthenticatedUser,
    teamId: string,
    dto: AddTeamMemberDto,
    meta: RequestMeta
  ) {
    await this.getTenantTeamOrThrow(user.tenantId, teamId);
    await this.assertUserBelongsToTenant(user.tenantId, dto.userId);

    await this.prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId: dto.userId
        }
      },
      update: {
        role: dto.role
      },
      create: {
        teamId,
        userId: dto.userId,
        role: dto.role
      },
    });
    const member = await this.getTeamMemberOrThrow(user.tenantId, teamId, dto.userId);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'team.member_add',
      entityType: 'TeamMember',
      entityId: member.id,
      newValue: {
        teamId,
        userId: dto.userId,
        role: dto.role
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return member;
  }

  async inviteMember(
    user: AuthenticatedUser,
    teamId: string,
    dto: InviteTeamMemberDto,
    meta: RequestMeta
  ) {
    const team = await this.getTenantTeamOrThrow(user.tenantId, teamId);
    const email = dto.email.toLowerCase().trim();

    if (dto.roleIds?.length) {
      await this.assertRolesBelongToTenant(user.tenantId, dto.roleIds);
    }

    const invited = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: user.tenantId,
            email
          }
        },
        select: { id: true, status: true }
      });

      if (existing?.status === UserStatus.DEACTIVATED || existing?.status === UserStatus.SUSPENDED) {
        throw new BadRequestException('Suspended or deactivated users cannot be invited to a team');
      }

      const memberUser = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              firstName: dto.firstName,
              lastName: dto.lastName
            },
            select: { id: true, status: true }
          })
        : await tx.user.create({
            data: {
              tenantId: user.tenantId,
              email,
              firstName: dto.firstName,
              lastName: dto.lastName,
              status: UserStatus.INVITED
            },
            select: { id: true, status: true }
          });

      if (dto.roleIds?.length) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            userId: memberUser.id,
            roleId
          })),
          skipDuplicates: true
        });
      }

      await tx.teamMember.upsert({
        where: {
          teamId_userId: {
            teamId,
            userId: memberUser.id
          }
        },
        update: {
          role: dto.teamRole
        },
        create: {
          teamId,
          userId: memberUser.id,
          role: dto.teamRole
        }
      });

      return memberUser;
    });

    const member = await this.getTeamMemberOrThrow(user.tenantId, teamId, invited.id);

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'team.member_invite',
      entityType: 'TeamMember',
      entityId: member.id,
      newValue: {
        teamId,
        userId: invited.id,
        email,
        teamRole: dto.teamRole,
        roleIds: dto.roleIds ?? []
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    await this.deliverTeamInvite(user, team, member.userId, invited.status, dto.teamRole, meta);

    return member;
  }

  async resendMemberInvite(
    user: AuthenticatedUser,
    teamId: string,
    userId: string,
    meta: RequestMeta
  ) {
    const team = await this.getTenantTeamOrThrow(user.tenantId, teamId);
    const member = await this.getTeamMemberOrThrow(user.tenantId, teamId, userId);

    if (member.user.status === UserStatus.DEACTIVATED || member.user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('Only active or pending users can receive team invitations');
    }

    const delivery = await this.deliverTeamInvite(
      user,
      team,
      member.userId,
      member.user.status,
      member.role ?? undefined,
      meta
    );

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'team.member_invite_resend',
      entityType: 'TeamMember',
      entityId: member.id,
      newValue: {
        teamId,
        userId,
        delivery
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true, delivery, member };
  }

  async cancelMemberInvitation(
    user: AuthenticatedUser,
    teamId: string,
    userId: string,
    meta: RequestMeta
  ) {
    await this.getTenantTeamOrThrow(user.tenantId, teamId);
    const member = await this.getTeamMemberOrThrow(user.tenantId, teamId, userId);

    if (member.user.status !== UserStatus.INVITED) {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }

    await this.prisma.$transaction([
      this.prisma.teamMember.deleteMany({
        where: {
          teamId,
          userId
        }
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: {
          tenantId: user.tenantId,
          userId,
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
      action: 'team.member_invite_cancel',
      entityType: 'TeamMember',
      entityId: member.id,
      oldValue: {
        teamId,
        userId,
        email: member.user.email
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  async removeMember(
    user: AuthenticatedUser,
    teamId: string,
    userId: string,
    meta: RequestMeta
  ) {
    await this.getTenantTeamOrThrow(user.tenantId, teamId);
    await this.assertUserBelongsToTenant(user.tenantId, userId);

    await this.prisma.teamMember.deleteMany({
      where: {
        teamId,
        userId
      }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'team.member_remove',
      entityType: 'TeamMember',
      entityId: `${teamId}:${userId}`,
      oldValue: {
        teamId,
        userId
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  private async getTenantTeamOrThrow(tenantId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        tenantId
      },
      select: teamSelect
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  private async assertWorkspaceBelongsToTenant(tenantId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        tenantId
      },
      select: { id: true }
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private async assertRolesBelongToTenant(tenantId: string, roleIds: string[]) {
    const roles = await this.prisma.role.findMany({
      where: {
        tenantId,
        id: { in: roleIds }
      },
      select: { id: true }
    });

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles were not found');
    }
  }

  private async getTeamMemberOrThrow(tenantId: string, teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
        user: {
          tenantId
        }
      },
      select: teamMemberSelect
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    return member;
  }

  private async deliverTeamInvite(
    actor: AuthenticatedUser,
    team: { id: string; name: string },
    targetUserId: string,
    targetStatus: UserStatus,
    teamRole: string | undefined,
    meta: RequestMeta
  ) {
    if (targetStatus === UserStatus.INVITED) {
      await this.authService.sendInvitation(targetUserId, actor.id, meta);
      return 'email';
    }

    if (targetStatus === UserStatus.ACTIVE) {
      await this.notificationsService.create(actor, {
        userIds: [targetUserId],
        title: `You were added to ${team.name}`,
        body: `${this.displayActor(actor)} added you to ${team.name}${teamRole ? ` as ${teamRole}` : ''}.`,
        channels: [NotificationChannel.IN_APP],
        critical: false,
        data: {
          type: 'team.member_added',
          teamId: team.id,
          teamName: team.name,
          teamRole,
          actorId: actor.id
        }
      }, meta);

      return 'in_app';
    }

    return 'none';
  }

  private displayActor(user: AuthenticatedUser) {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email;
  }
}
