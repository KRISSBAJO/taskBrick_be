import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectAccessPolicyService } from '../access-policy/project-access-policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { CreateProjectChangeRequestDto } from './dto/create-project-change-request.dto';
import { CreateProjectDecisionDto } from './dto/create-project-decision.dto';
import { CreateProjectDependencyDto } from './dto/create-project-dependency.dto';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';
import { CreateProjectRiskDto } from './dto/create-project-risk.dto';
import { CreateProjectStakeholderDto } from './dto/create-project-stakeholder.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdateProjectChangeRequestDto } from './dto/update-project-change-request.dto';
import { UpdateProjectDecisionDto } from './dto/update-project-decision.dto';
import { UpdateProjectDependencyDto } from './dto/update-project-dependency.dto';
import { UpdateProjectBudgetDto } from './dto/update-project-budget.dto';
import { UpdateProjectRiskDto } from './dto/update-project-risk.dto';
import { UpdateProjectStakeholderDto } from './dto/update-project-stakeholder.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const projectSelect = {
  id: true,
  tenantId: true,
  workspaceId: true,
  teamId: true,
  key: true,
  name: true,
  description: true,
  status: true,
  visibility: true,
  startDate: true,
  dueDate: true,
  completedAt: true,
  progress: true,
  currency: true,
  contractValue: true,
  clientName: true,
  clientEmail: true,
  clientPhone: true,
  locationName: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  timezone: true,
  billingCode: true,
  costCenter: true,
  createdAt: true,
  updatedAt: true,
  workspace: { select: { id: true, name: true, slug: true } },
  team: { select: { id: true, name: true } },
  _count: {
    select: {
      members: true,
      tasks: true,
      sprints: true,
      milestones: true,
      risks: true,
      budgets: true,
      stakeholders: true,
      dependencies: true,
      decisions: true,
      changeRequests: true,
      documents: true
    }
  }
} satisfies Prisma.ProjectSelect;

const financeUpdateFields = [
  'currency',
  'contractValue',
  'clientName',
  'clientEmail',
  'clientPhone',
  'locationName',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'country',
  'postalCode',
  'timezone',
  'billingCode',
  'costCenter'
] as const;

const accessUpdateFields = ['visibility', 'workspaceId', 'teamId'] as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectAccessPolicy: ProjectAccessPolicyService,
    private readonly billingService: BillingService
  ) {}

  async list(user: AuthenticatedUser, query: ProjectQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      AND: [
        this.projectAccessPolicy.projectAccessWhere(user),
        {
          status: query.status,
          visibility: query.visibility,
          workspaceId: query.workspaceId,
          teamId: query.teamId,
          ...(query.search
            ? {
                OR: [
                  { name: { contains: query.search, mode: 'insensitive' } },
                  { key: { contains: query.search, mode: 'insensitive' } }
                ]
              }
            : {})
        }
      ]
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        select: projectSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.project.count({ where })
    ]);

    return {
      data: await this.projectAccessPolicy.projectsForUser(user, data),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  async get(user: AuthenticatedUser, projectId: string) {
    const project = await this.getTenantProjectOrThrow(user.tenantId, projectId);
    return this.projectAccessPolicy.projectForUser(user, project);
  }

  async getPermissions(user: AuthenticatedUser, projectId: string) {
    return this.projectAccessPolicy.getProjectPermissions(user, projectId);
  }

  async create(user: AuthenticatedUser, dto: CreateProjectDto, meta: RequestMeta) {
    this.projectAccessPolicy.assertCanCreateProject(user);
    const key = dto.key.toUpperCase().trim();
    await this.assertProjectKeyAvailable(user.tenantId, key);
    await this.assertWorkspaceBelongsToTenant(user.tenantId, dto.workspaceId);
    await this.assertProjectEntitlement(user.tenantId);

    if (dto.teamId) {
      await this.assertTeamBelongsToTenant(user.tenantId, dto.teamId);
    }

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          tenantId: user.tenantId,
          workspaceId: dto.workspaceId,
          teamId: dto.teamId,
          key,
          name: dto.name,
          description: dto.description,
          status: dto.status,
          visibility: dto.visibility,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          progress: dto.progress,
          currency: this.normalizeCurrency(dto.currency),
          contractValue: dto.contractValue,
          clientName: this.nullableText(dto.clientName),
          clientEmail: this.nullableText(dto.clientEmail?.toLowerCase()),
          clientPhone: this.nullableText(dto.clientPhone),
          locationName: this.nullableText(dto.locationName),
          addressLine1: this.nullableText(dto.addressLine1),
          addressLine2: this.nullableText(dto.addressLine2),
          city: this.nullableText(dto.city),
          state: this.nullableText(dto.state),
          country: this.nullableText(dto.country),
          postalCode: this.nullableText(dto.postalCode),
          timezone: this.nullableText(dto.timezone),
          billingCode: this.nullableText(dto.billingCode),
          costCenter: this.nullableText(dto.costCenter)
        },
        select: projectSelect
      });

      await tx.projectMember.create({
        data: {
          projectId: created.id,
          userId: user.id,
          role: 'Owner'
        }
      });

      return created;
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'project.create',
      entityType: 'Project',
      entityId: project.id,
      newValue: {
        key: project.key,
        name: project.name,
        ownerId: user.id,
        visibility: project.visibility,
        currency: project.currency,
        contractValue: project.contractValue,
        clientName: project.clientName
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return this.projectAccessPolicy.projectForUser(user, project);
  }

  async update(user: AuthenticatedUser, projectId: string, dto: UpdateProjectDto, meta: RequestMeta) {
    const permissions = await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    this.assertProjectFieldUpdateAllowed(dto, permissions.actions);
    const before = await this.getTenantProjectOrThrow(user.tenantId, projectId);

    if (dto.workspaceId) {
      await this.assertWorkspaceBelongsToTenant(user.tenantId, dto.workspaceId);
    }

    if (dto.teamId) {
      await this.assertTeamBelongsToTenant(user.tenantId, dto.teamId);
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        workspaceId: dto.workspaceId,
        teamId: dto.teamId,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        visibility: dto.visibility,
        startDate: dto.startDate === null ? null : dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate === null ? null : dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: dto.completedAt === null ? null : dto.completedAt ? new Date(dto.completedAt) : undefined,
        progress: dto.progress,
        currency: this.normalizeCurrency(dto.currency),
        contractValue: dto.contractValue,
        clientName: this.nullableText(dto.clientName),
        clientEmail: this.nullableText(dto.clientEmail?.toLowerCase()),
        clientPhone: this.nullableText(dto.clientPhone),
        locationName: this.nullableText(dto.locationName),
        addressLine1: this.nullableText(dto.addressLine1),
        addressLine2: this.nullableText(dto.addressLine2),
        city: this.nullableText(dto.city),
        state: this.nullableText(dto.state),
        country: this.nullableText(dto.country),
        postalCode: this.nullableText(dto.postalCode),
        timezone: this.nullableText(dto.timezone),
        billingCode: this.nullableText(dto.billingCode),
        costCenter: this.nullableText(dto.costCenter)
      },
      select: projectSelect
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'project.update',
      entityType: 'Project',
      entityId: projectId,
      oldValue: {
        name: before.name,
        status: before.status,
        progress: before.progress,
        visibility: before.visibility,
        currency: before.currency,
        contractValue: before.contractValue,
        clientName: before.clientName,
        locationName: before.locationName
      },
      newValue: {
        name: updated.name,
        status: updated.status,
        progress: updated.progress,
        visibility: updated.visibility,
        currency: updated.currency,
        contractValue: updated.contractValue,
        clientName: updated.clientName,
        locationName: updated.locationName
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    if (this.hasAnyField(dto, accessUpdateFields)) {
      await this.auditService.record({
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'project.access_policy_update',
        entityType: 'Project',
        entityId: projectId,
        oldValue: {
          workspaceId: before.workspaceId,
          teamId: before.teamId,
          visibility: before.visibility
        },
        newValue: {
          workspaceId: updated.workspaceId,
          teamId: updated.teamId,
          visibility: updated.visibility
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
    }

    return this.projectAccessPolicy.projectForUser(user, updated);
  }

  async delete(user: AuthenticatedUser, projectId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'deleteProject');
    const project = await this.getTenantProjectOrThrow(user.tenantId, projectId);

    if (project._count.tasks > 0 || project._count.sprints > 0 || project._count.documents > 0) {
      throw new BadRequestException('Project must be empty before deletion');
    }

    await this.prisma.project.delete({ where: { id: projectId } });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'project.delete',
      entityType: 'Project',
      entityId: projectId,
      oldValue: { key: project.key, name: project.name },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  async listMembers(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');

    return this.prisma.projectMember.findMany({
      where: { projectId, user: { tenantId: user.tenantId } },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, status: true } }
      }
    });
  }

  async addMember(user: AuthenticatedUser, projectId: string, dto: AddProjectMemberDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageMembers');
    await this.assertUserBelongsToTenant(user.tenantId, dto.userId);
    const role = this.normalizeProjectMemberRole(dto.role);

    const member = await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: dto.userId } },
      update: { role },
      create: { projectId, userId: dto.userId, role },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, status: true } }
      }
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'project.member_upsert',
      entityType: 'ProjectMember',
      entityId: member.id,
      newValue: { projectId, userId: dto.userId, role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'project.permission_update',
      entityType: 'Project',
      entityId: projectId,
      newValue: { userId: dto.userId, projectRole: role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return member;
  }

  async removeMember(user: AuthenticatedUser, projectId: string, userId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageMembers');
    await this.assertUserBelongsToTenant(user.tenantId, userId);

    const before = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true, role: true }
    });

    await this.prisma.projectMember.deleteMany({ where: { projectId, userId } });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'project.member_remove',
      entityType: 'ProjectMember',
      entityId: before?.id ?? `${projectId}:${userId}`,
      oldValue: { projectId, userId, role: before?.role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'project.permission_update',
      entityType: 'Project',
      entityId: projectId,
      oldValue: { userId, projectRole: before?.role },
      newValue: { userId, projectRole: null },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { success: true };
  }

  async listMilestones(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    return this.prisma.milestone.findMany({ where: { projectId }, orderBy: [{ dueDate: 'asc' }] });
  }

  async createMilestone(user: AuthenticatedUser, projectId: string, dto: CreateMilestoneDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageMilestones');
    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined
      }
    });
    await this.recordProjectChildAudit(user, 'project.milestone_create', 'Milestone', milestone.id, dto, meta);
    return milestone;
  }

  async updateMilestone(user: AuthenticatedUser, projectId: string, milestoneId: string, dto: UpdateMilestoneDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageMilestones');
    await this.getMilestoneOrThrow(user.tenantId, projectId, milestoneId);
    const milestone = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate === null ? null : dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: dto.completedAt === null ? null : dto.completedAt ? new Date(dto.completedAt) : undefined
      }
    });
    await this.recordProjectChildAudit(user, 'project.milestone_update', 'Milestone', milestone.id, dto, meta);
    return milestone;
  }

  async deleteMilestone(user: AuthenticatedUser, projectId: string, milestoneId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageMilestones');
    const before = await this.getMilestoneOrThrow(user.tenantId, projectId, milestoneId);
    await this.prisma.milestone.delete({ where: { id: milestoneId } });
    await this.recordProjectChildAudit(user, 'project.milestone_delete', 'Milestone', milestoneId, { title: before.title }, meta);
    return { success: true };
  }

  async listRisks(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    return this.prisma.projectRisk.findMany({ where: { projectId }, orderBy: [{ createdAt: 'desc' }] });
  }

  async createRisk(user: AuthenticatedUser, projectId: string, dto: CreateProjectRiskDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageRisks');
    const risk = await this.prisma.projectRisk.create({ data: { projectId, ...dto } });
    await this.recordProjectChildAudit(user, 'project.risk_create', 'ProjectRisk', risk.id, dto, meta);
    return risk;
  }

  async updateRisk(user: AuthenticatedUser, projectId: string, riskId: string, dto: UpdateProjectRiskDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageRisks');
    await this.getRiskOrThrow(user.tenantId, projectId, riskId);
    const risk = await this.prisma.projectRisk.update({ where: { id: riskId }, data: dto });
    await this.recordProjectChildAudit(user, 'project.risk_update', 'ProjectRisk', risk.id, dto, meta);
    return risk;
  }

  async deleteRisk(user: AuthenticatedUser, projectId: string, riskId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageRisks');
    const before = await this.getRiskOrThrow(user.tenantId, projectId, riskId);
    await this.prisma.projectRisk.delete({ where: { id: riskId } });
    await this.recordProjectChildAudit(user, 'project.risk_delete', 'ProjectRisk', riskId, { title: before.title }, meta);
    return { success: true };
  }

  async listBudgets(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewBudget');
    return this.prisma.projectBudget.findMany({ where: { projectId }, orderBy: [{ createdAt: 'desc' }] });
  }

  async createBudget(user: AuthenticatedUser, projectId: string, dto: CreateProjectBudgetDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageBudget');
    const budget = await this.prisma.projectBudget.create({ data: { projectId, ...dto } });
    await this.recordProjectChildAudit(user, 'project.budget_create', 'ProjectBudget', budget.id, dto, meta);
    return budget;
  }

  async updateBudget(user: AuthenticatedUser, projectId: string, budgetId: string, dto: UpdateProjectBudgetDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageBudget');
    await this.getBudgetOrThrow(user.tenantId, projectId, budgetId);
    const budget = await this.prisma.projectBudget.update({ where: { id: budgetId }, data: dto });
    await this.recordProjectChildAudit(user, 'project.budget_update', 'ProjectBudget', budget.id, dto, meta);
    return budget;
  }

  async deleteBudget(user: AuthenticatedUser, projectId: string, budgetId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageBudget');
    const before = await this.getBudgetOrThrow(user.tenantId, projectId, budgetId);
    await this.prisma.projectBudget.delete({ where: { id: budgetId } });
    await this.recordProjectChildAudit(user, 'project.budget_delete', 'ProjectBudget', budgetId, { currency: before.currency }, meta);
    return { success: true };
  }

  async listStakeholders(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    return this.prisma.projectStakeholder.findMany({
      where: { projectId },
      orderBy: [{ influence: 'desc' }, { updatedAt: 'desc' }]
    });
  }

  async createStakeholder(user: AuthenticatedUser, projectId: string, dto: CreateProjectStakeholderDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);
    const stakeholder = await this.prisma.projectStakeholder.create({
      data: {
        projectId,
        name: dto.name.trim(),
        email: this.nullableText(dto.email?.toLowerCase()),
        organization: this.nullableText(dto.organization),
        role: this.nullableText(dto.role),
        influence: dto.influence,
        isExternal: dto.isExternal,
        notes: this.nullableText(dto.notes)
      }
    });
    await this.recordProjectChildAudit(user, 'project.stakeholder_create', 'ProjectStakeholder', stakeholder.id, stakeholder, meta);
    return stakeholder;
  }

  async updateStakeholder(user: AuthenticatedUser, projectId: string, stakeholderId: string, dto: UpdateProjectStakeholderDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    await this.getStakeholderOrThrow(user.tenantId, projectId, stakeholderId);
    const stakeholder = await this.prisma.projectStakeholder.update({
      where: { id: stakeholderId },
      data: {
        name: dto.name?.trim(),
        email: this.nullableText(dto.email?.toLowerCase()),
        organization: this.nullableText(dto.organization),
        role: this.nullableText(dto.role),
        influence: dto.influence,
        isExternal: dto.isExternal,
        notes: this.nullableText(dto.notes)
      }
    });
    await this.recordProjectChildAudit(user, 'project.stakeholder_update', 'ProjectStakeholder', stakeholder.id, stakeholder, meta);
    return stakeholder;
  }

  async deleteStakeholder(user: AuthenticatedUser, projectId: string, stakeholderId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    const before = await this.getStakeholderOrThrow(user.tenantId, projectId, stakeholderId);
    await this.prisma.projectStakeholder.delete({ where: { id: stakeholderId } });
    await this.recordProjectChildAudit(user, 'project.stakeholder_delete', 'ProjectStakeholder', stakeholderId, { name: before.name }, meta);
    return { success: true };
  }

  async listDependencies(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    return this.prisma.projectDependency.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }]
    });
  }

  async createDependency(user: AuthenticatedUser, projectId: string, dto: CreateProjectDependencyDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);
    const dependency = await this.prisma.projectDependency.create({
      data: {
        projectId,
        title: dto.title.trim(),
        description: this.nullableText(dto.description),
        dependencyType: this.nullableText(dto.dependencyType),
        status: dto.status,
        ownerName: this.nullableText(dto.ownerName),
        ownerEmail: this.nullableText(dto.ownerEmail?.toLowerCase()),
        dueDate: this.optionalDate(dto.dueDate),
        resolvedAt: this.optionalDate(dto.resolvedAt),
        externalUrl: this.nullableText(dto.externalUrl),
        notes: this.nullableText(dto.notes)
      }
    });
    await this.recordProjectChildAudit(user, 'project.dependency_create', 'ProjectDependency', dependency.id, dependency, meta);
    return dependency;
  }

  async updateDependency(user: AuthenticatedUser, projectId: string, dependencyId: string, dto: UpdateProjectDependencyDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    await this.getDependencyOrThrow(user.tenantId, projectId, dependencyId);
    const dependency = await this.prisma.projectDependency.update({
      where: { id: dependencyId },
      data: {
        title: dto.title?.trim(),
        description: this.nullableText(dto.description),
        dependencyType: this.nullableText(dto.dependencyType),
        status: dto.status,
        ownerName: this.nullableText(dto.ownerName),
        ownerEmail: this.nullableText(dto.ownerEmail?.toLowerCase()),
        dueDate: this.optionalDate(dto.dueDate),
        resolvedAt: this.optionalDate(dto.resolvedAt),
        externalUrl: this.nullableText(dto.externalUrl),
        notes: this.nullableText(dto.notes)
      }
    });
    await this.recordProjectChildAudit(user, 'project.dependency_update', 'ProjectDependency', dependency.id, dependency, meta);
    return dependency;
  }

  async deleteDependency(user: AuthenticatedUser, projectId: string, dependencyId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    const before = await this.getDependencyOrThrow(user.tenantId, projectId, dependencyId);
    await this.prisma.projectDependency.delete({ where: { id: dependencyId } });
    await this.recordProjectChildAudit(user, 'project.dependency_delete', 'ProjectDependency', dependencyId, { title: before.title }, meta);
    return { success: true };
  }

  async listDecisions(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    return this.prisma.projectDecision.findMany({
      where: { projectId },
      orderBy: [{ decidedAt: 'desc' }, { updatedAt: 'desc' }]
    });
  }

  async createDecision(user: AuthenticatedUser, projectId: string, dto: CreateProjectDecisionDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);
    const decision = await this.prisma.projectDecision.create({
      data: {
        projectId,
        title: dto.title.trim(),
        description: this.nullableText(dto.description),
        status: dto.status,
        ownerName: this.nullableText(dto.ownerName),
        ownerEmail: this.nullableText(dto.ownerEmail?.toLowerCase()),
        decidedAt: this.optionalDate(dto.decidedAt),
        effectiveAt: this.optionalDate(dto.effectiveAt),
        outcome: this.nullableText(dto.outcome),
        notes: this.nullableText(dto.notes)
      }
    });
    await this.recordProjectChildAudit(user, 'project.decision_create', 'ProjectDecision', decision.id, decision, meta);
    return decision;
  }

  async updateDecision(user: AuthenticatedUser, projectId: string, decisionId: string, dto: UpdateProjectDecisionDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    await this.getDecisionOrThrow(user.tenantId, projectId, decisionId);
    const decision = await this.prisma.projectDecision.update({
      where: { id: decisionId },
      data: {
        title: dto.title?.trim(),
        description: this.nullableText(dto.description),
        status: dto.status,
        ownerName: this.nullableText(dto.ownerName),
        ownerEmail: this.nullableText(dto.ownerEmail?.toLowerCase()),
        decidedAt: this.optionalDate(dto.decidedAt),
        effectiveAt: this.optionalDate(dto.effectiveAt),
        outcome: this.nullableText(dto.outcome),
        notes: this.nullableText(dto.notes)
      }
    });
    await this.recordProjectChildAudit(user, 'project.decision_update', 'ProjectDecision', decision.id, decision, meta);
    return decision;
  }

  async deleteDecision(user: AuthenticatedUser, projectId: string, decisionId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    const before = await this.getDecisionOrThrow(user.tenantId, projectId, decisionId);
    await this.prisma.projectDecision.delete({ where: { id: decisionId } });
    await this.recordProjectChildAudit(user, 'project.decision_delete', 'ProjectDecision', decisionId, { title: before.title }, meta);
    return { success: true };
  }

  async listChangeRequests(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewProject');
    return this.prisma.projectChangeRequest.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }]
    });
  }

  async createChangeRequest(user: AuthenticatedUser, projectId: string, dto: CreateProjectChangeRequestDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);
    const changeRequest = await this.prisma.projectChangeRequest.create({
      data: {
        projectId,
        title: dto.title.trim(),
        description: this.nullableText(dto.description),
        reason: this.nullableText(dto.reason),
        status: dto.status,
        requestedByName: this.nullableText(dto.requestedByName),
        requestedByEmail: this.nullableText(dto.requestedByEmail?.toLowerCase()),
        approvedByName: this.nullableText(dto.approvedByName),
        approvedByEmail: this.nullableText(dto.approvedByEmail?.toLowerCase()),
        budgetImpact: dto.budgetImpact,
        scheduleImpactDays: dto.scheduleImpactDays,
        scopeImpact: this.nullableText(dto.scopeImpact),
        riskImpact: this.nullableText(dto.riskImpact),
        dueDate: this.optionalDate(dto.dueDate),
        submittedAt: this.optionalDate(dto.submittedAt),
        approvedAt: this.optionalDate(dto.approvedAt),
        implementedAt: this.optionalDate(dto.implementedAt),
        notes: this.nullableText(dto.notes)
      }
    });
    await this.recordProjectChildAudit(user, 'project.change_request_create', 'ProjectChangeRequest', changeRequest.id, changeRequest, meta);
    return changeRequest;
  }

  async updateChangeRequest(user: AuthenticatedUser, projectId: string, changeRequestId: string, dto: UpdateProjectChangeRequestDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    await this.getChangeRequestOrThrow(user.tenantId, projectId, changeRequestId);
    const changeRequest = await this.prisma.projectChangeRequest.update({
      where: { id: changeRequestId },
      data: {
        title: dto.title?.trim(),
        description: this.nullableText(dto.description),
        reason: this.nullableText(dto.reason),
        status: dto.status,
        requestedByName: this.nullableText(dto.requestedByName),
        requestedByEmail: this.nullableText(dto.requestedByEmail?.toLowerCase()),
        approvedByName: this.nullableText(dto.approvedByName),
        approvedByEmail: this.nullableText(dto.approvedByEmail?.toLowerCase()),
        budgetImpact: dto.budgetImpact,
        scheduleImpactDays: dto.scheduleImpactDays,
        scopeImpact: this.nullableText(dto.scopeImpact),
        riskImpact: this.nullableText(dto.riskImpact),
        dueDate: this.optionalDate(dto.dueDate),
        submittedAt: this.optionalDate(dto.submittedAt),
        approvedAt: this.optionalDate(dto.approvedAt),
        implementedAt: this.optionalDate(dto.implementedAt),
        notes: this.nullableText(dto.notes)
      }
    });
    await this.recordProjectChildAudit(user, 'project.change_request_update', 'ProjectChangeRequest', changeRequest.id, changeRequest, meta);
    return changeRequest;
  }

  async deleteChangeRequest(user: AuthenticatedUser, projectId: string, changeRequestId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editProject');
    const before = await this.getChangeRequestOrThrow(user.tenantId, projectId, changeRequestId);
    await this.prisma.projectChangeRequest.delete({ where: { id: changeRequestId } });
    await this.recordProjectChildAudit(user, 'project.change_request_delete', 'ProjectChangeRequest', changeRequestId, { title: before.title }, meta);
    return { success: true };
  }

  private async getTenantProjectOrThrow(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId }, select: projectSelect });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async assertProjectKeyAvailable(tenantId: string, key: string) {
    const existing = await this.prisma.project.findUnique({ where: { tenantId_key: { tenantId, key } } });
    if (existing) throw new ConflictException('Project key already exists in this tenant');
  }

  private async assertWorkspaceBelongsToTenant(tenantId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, tenantId }, select: { id: true } });
    if (!workspace) throw new NotFoundException('Workspace not found');
  }

  private async assertTeamBelongsToTenant(tenantId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, tenantId }, select: { id: true } });
    if (!team) throw new NotFoundException('Team not found');
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const member = await this.prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } });
    if (!member) throw new NotFoundException('User not found');
  }

  private async getMilestoneOrThrow(tenantId: string, projectId: string, milestoneId: string) {
    await this.getTenantProjectOrThrow(tenantId, projectId);
    const item = await this.prisma.milestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!item) throw new NotFoundException('Milestone not found');
    return item;
  }

  private async getRiskOrThrow(tenantId: string, projectId: string, riskId: string) {
    await this.getTenantProjectOrThrow(tenantId, projectId);
    const item = await this.prisma.projectRisk.findFirst({ where: { id: riskId, projectId } });
    if (!item) throw new NotFoundException('Risk not found');
    return item;
  }

  private async getBudgetOrThrow(tenantId: string, projectId: string, budgetId: string) {
    await this.getTenantProjectOrThrow(tenantId, projectId);
    const item = await this.prisma.projectBudget.findFirst({ where: { id: budgetId, projectId } });
    if (!item) throw new NotFoundException('Budget not found');
    return item;
  }

  private async getStakeholderOrThrow(tenantId: string, projectId: string, stakeholderId: string) {
    await this.getTenantProjectOrThrow(tenantId, projectId);
    const item = await this.prisma.projectStakeholder.findFirst({ where: { id: stakeholderId, projectId } });
    if (!item) throw new NotFoundException('Stakeholder not found');
    return item;
  }

  private async getDependencyOrThrow(tenantId: string, projectId: string, dependencyId: string) {
    await this.getTenantProjectOrThrow(tenantId, projectId);
    const item = await this.prisma.projectDependency.findFirst({ where: { id: dependencyId, projectId } });
    if (!item) throw new NotFoundException('Dependency not found');
    return item;
  }

  private async getDecisionOrThrow(tenantId: string, projectId: string, decisionId: string) {
    await this.getTenantProjectOrThrow(tenantId, projectId);
    const item = await this.prisma.projectDecision.findFirst({ where: { id: decisionId, projectId } });
    if (!item) throw new NotFoundException('Decision not found');
    return item;
  }

  private async getChangeRequestOrThrow(tenantId: string, projectId: string, changeRequestId: string) {
    await this.getTenantProjectOrThrow(tenantId, projectId);
    const item = await this.prisma.projectChangeRequest.findFirst({ where: { id: changeRequestId, projectId } });
    if (!item) throw new NotFoundException('Change request not found');
    return item;
  }

  private normalizeProjectMemberRole(role?: string | null) {
    const normalized = (role ?? 'Contributor').trim();
    const key = normalized.replace(/[\s-]+/g, '_').toUpperCase();
    if (['OWNER', 'PROJECT_OWNER', 'ADMIN'].includes(key)) return 'Owner';
    if (['MANAGER', 'PROJECT_MANAGER', 'LEAD', 'DELIVERY_MANAGER'].includes(key)) return 'Manager';
    if (['EDITOR', 'MAINTAINER'].includes(key)) return 'Editor';
    if (['VIEWER', 'READ_ONLY', 'READONLY', 'OBSERVER'].includes(key)) return 'Viewer';
    if (['CLIENT', 'STAKEHOLDER', 'EXTERNAL'].includes(key)) return 'Client';
    return 'Contributor';
  }

  private normalizeCurrency(currency?: string | null) {
    const value = currency?.trim().toUpperCase();
    return value ? value.slice(0, 3) : undefined;
  }

  private assertProjectFieldUpdateAllowed(
    dto: UpdateProjectDto,
    actions: Record<string, boolean>
  ) {
    if (this.hasAnyField(dto, financeUpdateFields) && !actions.manageBudget) {
      throw new ForbiddenException('Budget, client, location, and billing fields require project budget management access');
    }

    if (this.hasAnyField(dto, accessUpdateFields) && !actions.manageMembers) {
      throw new ForbiddenException('Project visibility, workspace, and team changes require project access management rights');
    }
  }

  private hasAnyField<T extends string>(
    value: object,
    fields: readonly T[]
  ) {
    return fields.some((field) => Object.prototype.hasOwnProperty.call(value, field));
  }

  private nullableText(value?: string | null) {
    if (value === undefined) return undefined;
    const normalized = value?.trim();
    return normalized || null;
  }

  private optionalDate(value?: string | null) {
    return value ? new Date(value) : undefined;
  }

  private async recordProjectChildAudit(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    value: unknown,
    meta: RequestMeta
  ) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType,
      entityId,
      newValue: this.toJsonValue(value),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null) {
      return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
    }

    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new BadRequestException('Value must be JSON serializable');
    }

    return JSON.parse(serialized) as Prisma.InputJsonValue;
  }

  private async assertProjectEntitlement(tenantId: string) {
    const currentProjects = await this.prisma.project.count({
      where: {
        tenantId,
        status: { not: 'ARCHIVED' }
      }
    });
    await this.billingService.assertFeatureLimitAvailable(
      tenantId,
      'projects.limit',
      currentProjects,
      1
    );
  }
}
