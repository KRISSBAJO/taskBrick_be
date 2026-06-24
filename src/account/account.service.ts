import { Injectable } from '@nestjs/common';
import { NotificationChannel, Prisma, ProjectStatus, TaskPriority, TaskStatus, UserStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSupportRequestDto,
  SupportRequestPriority
} from './dto/create-support-request.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const accountWorkspaceSelect = {
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

const guestProjectSelect = {
  id: true,
  key: true,
  name: true,
  status: true,
  visibility: true,
  progress: true,
  updatedAt: true,
  workspace: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true
    }
  },
  team: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.ProjectSelect;

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async overview(user: AuthenticatedUser) {
    const [
      tenant,
      workspaceCount,
      teamCount,
      projectCount,
      assignedOpenTasks,
      urgentTasks,
      unreadNotifications,
      trustedDevices,
      activeSessions,
      explicitMemberships
    ] = await Promise.all([
      this.prisma.tenant.findUnique({
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
              projects: true
            }
          }
        }
      }),
      this.prisma.workspace.count({ where: { tenantId: user.tenantId } }),
      this.prisma.team.count({ where: { tenantId: user.tenantId } }),
      this.prisma.project.count({ where: { tenantId: user.tenantId } }),
      this.prisma.task.count({
        where: {
          tenantId: user.tenantId,
          status: { not: TaskStatus.DONE },
          assignees: { some: { userId: user.id } }
        }
      }),
      this.prisma.task.count({
        where: {
          tenantId: user.tenantId,
          status: { not: TaskStatus.DONE },
          priority: { in: [TaskPriority.URGENT, TaskPriority.CRITICAL] },
          assignees: { some: { userId: user.id } }
        }
      }),
      this.prisma.notification.count({
        where: {
          tenantId: user.tenantId,
          userId: user.id,
          readAt: null
        }
      }),
      this.prisma.trustedDevice.count({
        where: {
          tenantId: user.tenantId,
          userId: user.id,
          status: 'ACTIVE',
          revokedAt: null,
          expiresAt: { gt: new Date() }
        }
      }),
      this.prisma.authSession.count({
        where: {
          tenantId: user.tenantId,
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() }
        }
      }),
      this.prisma.projectMember.count({
        where: {
          userId: user.id,
          project: { tenantId: user.tenantId }
        }
      })
    ]);

    return {
      user: this.currentUser(user),
      tenant,
      access: this.accessSummary(user),
      counts: {
        workspaces: workspaceCount,
        teams: teamCount,
        projects: projectCount,
        explicitProjectMemberships: explicitMemberships,
        assignedOpenTasks,
        urgentTasks,
        unreadNotifications,
        trustedDevices,
        activeSessions
      }
    };
  }

  async workspaces(user: AuthenticatedUser, query: PaginationQueryDto) {
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
        select: accountWorkspaceSelect,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.workspace.count({ where })
    ]);

    return {
      data: data.map((workspace) => ({
        ...workspace,
        canManage: this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:workspaces'])
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  async guestWorkspaces(user: AuthenticatedUser, query: PaginationQueryDto) {
    const memberships = await this.prisma.projectMember.findMany({
      where: {
        userId: user.id,
        project: {
          tenantId: user.tenantId,
          ...(query.search
            ? {
                OR: [
                  { name: { contains: query.search, mode: 'insensitive' } },
                  { key: { contains: query.search, mode: 'insensitive' } },
                  { workspace: { name: { contains: query.search, mode: 'insensitive' } } }
                ]
              }
            : {})
        }
      },
      select: {
        role: true,
        createdAt: true,
        project: { select: guestProjectSelect }
      },
      orderBy: [{ createdAt: 'desc' }]
    });

    const grouped = new Map<string, {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      icon: string | null;
      role: string | null;
      projectCount: number;
      projects: Array<{
        id: string;
        key: string;
        name: string;
        status: ProjectStatus;
        visibility: string;
        progress: number;
        role: string | null;
        team: { id: string; name: string } | null;
        updatedAt: Date;
      }>;
    }>();

    for (const membership of memberships) {
      const workspace = membership.project.workspace;
      const current = grouped.get(workspace.id) ?? {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        icon: workspace.icon,
        role: membership.role,
        projectCount: 0,
        projects: []
      };

      current.projectCount += 1;
      current.projects.push({
        id: membership.project.id,
        key: membership.project.key,
        name: membership.project.name,
        status: membership.project.status,
        visibility: membership.project.visibility,
        progress: membership.project.progress,
        role: membership.role,
        team: membership.project.team,
        updatedAt: membership.project.updatedAt
      });
      grouped.set(workspace.id, current);
    }

    const allData = Array.from(grouped.values());
    const start = (query.page - 1) * query.limit;
    const data = allData.slice(start, start + query.limit);

    return {
      data,
      page: query.page,
      limit: query.limit,
      total: allData.length,
      totalPages: Math.ceil(allData.length / query.limit),
      externalGuestWorkspacesSupported: false,
      note: 'TaskBricks currently scopes one tenant per login. This list shows workspaces where your account was explicitly added to projects.'
    };
  }

  help() {
    return {
      categories: [
        {
          id: 'ACCOUNT',
          title: 'Account and access',
          description: 'Profile, sign-in, MFA, trusted devices, and password issues.'
        },
        {
          id: 'WORKSPACE',
          title: 'Workspace setup',
          description: 'Workspaces, teams, invites, permissions, projects, and roles.'
        },
        {
          id: 'BILLING',
          title: 'Billing and plans',
          description: 'Subscriptions, invoices, seats, Stripe, Paystack, and payment confirmation.'
        },
        {
          id: 'TECHNICAL',
          title: 'Technical support',
          description: 'API errors, uploads, realtime, mobile access, and browser issues.'
        }
      ],
      channels: [
        { id: 'in_app', label: 'In-app support request', available: true },
        { id: 'audit', label: 'Tenant audit trail', available: true },
        { id: 'admin_notification', label: 'Tenant admin notification', available: true }
      ],
      responseTargets: {
        normal: 'Within one business day',
        high: 'Same business day',
        urgent: 'As soon as a tenant admin is available'
      }
    };
  }

  async createSupportRequest(user: AuthenticatedUser, dto: CreateSupportRequestDto, meta: RequestMeta) {
    const supportRequestId = randomUUID();
    const priority = dto.priority ?? SupportRequestPriority.NORMAL;
    const requesterName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const adminIds = await this.supportRecipientIds(user);

    const auditValue: Prisma.InputJsonObject = {
      supportRequestId,
      category: dto.category,
      priority,
      subject: dto.subject,
      message: dto.message,
      sourceUrl: dto.sourceUrl ?? null,
      requester: {
        id: user.id,
        email: user.email,
        name: requesterName
      },
      notifiedUserIds: adminIds
    };

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'account.support_request.create',
      entityType: 'SupportRequest',
      entityId: supportRequestId,
      newValue: auditValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    if (adminIds.length) {
      await this.notificationsService.create(
        user,
        {
          userIds: adminIds,
          title: `Support request: ${dto.subject}`,
          body: `${requesterName} submitted a ${priority.toLowerCase()} ${dto.category.toLowerCase()} request.`,
          channels: [NotificationChannel.IN_APP],
          critical: priority === SupportRequestPriority.URGENT,
          data: {
            supportRequestId,
            category: dto.category,
            priority,
            requesterId: user.id,
            sourceUrl: dto.sourceUrl ?? null
          }
        },
        meta
      );
    }

    return {
      id: supportRequestId,
      status: 'RECEIVED',
      category: dto.category,
      priority,
      notifiedAdminCount: adminIds.length,
      message: adminIds.length
        ? 'Support request received and tenant admins were notified.'
        : 'Support request received and recorded in the tenant audit trail.'
    };
  }

  private async supportRecipientIds(user: AuthenticatedUser) {
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        status: UserStatus.ACTIVE,
        OR: [
          { id: user.id },
          { roles: { some: { role: { name: { in: ['Owner', 'Admin'] } } } } },
          {
            roles: {
              some: {
                role: {
                  permissions: {
                    some: {
                      OR: [
                        { permission: { action: 'manage', subject: 'all' } },
                        { permission: { action: 'manage', subject: 'tenant' } },
                        { permission: { action: 'manage', subject: 'users' } }
                      ]
                    }
                  }
                }
              }
            }
          }
        ]
      },
      select: { id: true },
      take: 20
    });

    return [...new Set(admins.map((admin) => admin.id))];
  }

  private currentUser(user: AuthenticatedUser) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
      timezone: user.timezone ?? null,
      locale: user.locale ?? null,
      status: user.status,
      roles: user.roles,
      permissions: user.permissions,
      isPlatformAdmin: user.isPlatformAdmin ?? false,
      platformAdminLevel: user.platformAdminLevel ?? null
    };
  }

  private accessSummary(user: AuthenticatedUser) {
    return {
      isOwner: this.hasAny(user, ['manage:all']),
      canManageTenant: this.hasAny(user, ['manage:all', 'manage:tenant']),
      canManageWorkspaces: this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:workspaces']),
      canManageUsers: this.hasAny(user, ['manage:all', 'manage:users']),
      canManageSecurity: this.hasAny(user, ['manage:all', 'manage:security']),
      canManageBilling: this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:billing'])
    };
  }

  private hasAny(user: AuthenticatedUser, permissions: string[]) {
    return permissions.some((permission) => user.permissions.includes(permission));
  }
}
