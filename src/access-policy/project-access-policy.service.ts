import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus, Visibility } from '@prisma/client';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

export type ProjectAccessLevel =
  | 'TENANT_ADMIN'
  | 'PROJECT_ADMIN'
  | 'TASK_ADMIN'
  | 'PROJECT_OWNER'
  | 'PROJECT_MANAGER'
  | 'PROJECT_EDITOR'
  | 'PROJECT_CONTRIBUTOR'
  | 'PROJECT_VIEWER'
  | 'CLIENT'
  | 'TEAM_MEMBER'
  | 'TASK_PARTICIPANT'
  | 'TENANT_VIEWER'
  | 'NO_ACCESS';

export type ProjectPolicyAction =
  | 'viewProject'
  | 'editProject'
  | 'archiveProject'
  | 'restoreProject'
  | 'deleteProject'
  | 'manageMembers'
  | 'viewBoard'
  | 'manageBoardColumns'
  | 'manageSprints'
  | 'manageMilestones'
  | 'manageRisks'
  | 'viewBudget'
  | 'manageBudget'
  | 'createTasks'
  | 'editTasks'
  | 'moveTasks'
  | 'deleteTasks'
  | 'commentTasks'
  | 'manageFiles'
  | 'viewPrivateFiles';

export type ProjectPolicyActions = Record<ProjectPolicyAction, boolean>;

const allActions: ProjectPolicyAction[] = [
  'viewProject',
  'editProject',
  'archiveProject',
  'restoreProject',
  'deleteProject',
  'manageMembers',
  'viewBoard',
  'manageBoardColumns',
  'manageSprints',
  'manageMilestones',
  'manageRisks',
  'viewBudget',
  'manageBudget',
  'createTasks',
  'editTasks',
  'moveTasks',
  'deleteTasks',
  'commentTasks',
  'manageFiles',
  'viewPrivateFiles'
];

const financeScopedProjectFields = [
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

const projectPolicySelect = {
  id: true,
  tenantId: true,
  workspaceId: true,
  teamId: true,
  key: true,
  name: true,
  status: true,
  visibility: true,
  members: {
    select: {
      id: true,
      userId: true,
      role: true,
      createdAt: true
    }
  },
  team: {
    select: {
      id: true,
      members: {
        select: {
          id: true,
          userId: true,
          role: true
        }
      }
    }
  }
} satisfies Prisma.ProjectSelect;

type ProjectPolicyBaseContext = Prisma.ProjectGetPayload<{ select: typeof projectPolicySelect }>;
type ProjectPolicyContext = ProjectPolicyBaseContext & { tasks: Array<{ id: string }> };

@Injectable()
export class ProjectAccessPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  projectAccessWhere(user: AuthenticatedUser, projectId?: string): Prisma.ProjectWhereInput {
    if (this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:projects'])) {
      return { id: projectId, tenantId: user.tenantId };
    }

    return {
      id: projectId,
      tenantId: user.tenantId,
      OR: [
        { visibility: { in: [Visibility.WORKSPACE, Visibility.ORGANIZATION, Visibility.PUBLIC] } },
        { members: { some: { userId: user.id } } },
        { team: { members: { some: { userId: user.id } } } },
        { tasks: { some: { reporterId: user.id } } },
        { tasks: { some: { assignees: { some: { userId: user.id } } } } },
        { tasks: { some: { watchers: { some: { userId: user.id } } } } }
      ]
    };
  }

  taskAccessWhere(user: AuthenticatedUser, taskId?: string): Prisma.TaskWhereInput {
    if (this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:projects'])) {
      return { id: taskId, tenantId: user.tenantId };
    }

    return {
      id: taskId,
      tenantId: user.tenantId,
      OR: [
        { reporterId: user.id },
        { assignees: { some: { userId: user.id } } },
        { watchers: { some: { userId: user.id } } },
        { project: this.projectAccessWhere(user) }
      ]
    };
  }

  fileVisibilityWhere(user: AuthenticatedUser): Prisma.FileAssetWhereInput {
    if (this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:projects'])) {
      return { tenantId: user.tenantId };
    }

    return {
      tenantId: user.tenantId,
      OR: [
        { uploadedById: user.id },
        { visibility: { in: [Visibility.WORKSPACE, Visibility.ORGANIZATION, Visibility.PUBLIC] } }
      ]
    };
  }

  async getProjectPermissions(user: AuthenticatedUser, projectId: string) {
    const context = await this.getProjectPolicyContext(user, projectId);
    const accessLevel = this.accessLevelFor(user, context);
    const actions = this.actionsFor(user, context, accessLevel);

    if (!actions.viewProject) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const currentMember = context.members.find((member) => member.userId === user.id) ?? null;
    const teamMember = context.team?.members.find((member) => member.userId === user.id) ?? null;

    return {
      projectId: context.id,
      key: context.key,
      name: context.name,
      status: context.status,
      visibility: context.visibility,
      accessLevel,
      source: this.sourceFor(accessLevel),
      projectRole: currentMember?.role ?? null,
      teamRole: teamMember?.role ?? null,
      actions,
      roles: this.roleCatalog()
    };
  }

  async assertProjectAction(user: AuthenticatedUser, projectId: string, action: ProjectPolicyAction) {
    const matrix = await this.getProjectPermissions(user, projectId);
    if (matrix.actions[action]) return matrix;
    throw new ForbiddenException(`Project permission denied: ${action}`);
  }

  async assertTaskAction(
    user: AuthenticatedUser,
    taskId: string,
    action: Extract<ProjectPolicyAction, 'editTasks' | 'moveTasks' | 'deleteTasks' | 'commentTasks' | 'manageFiles'>
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId: user.tenantId },
      select: { id: true, projectId: true }
    });

    if (!task) throw new NotFoundException('Task not found');
    return this.assertProjectAction(user, task.projectId, action);
  }

  canManageAllProjects(user: AuthenticatedUser) {
    return this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:projects']);
  }

  assertCanCreateProject(user: AuthenticatedUser) {
    if (this.canManageAllProjects(user)) {
      return;
    }

    throw new ForbiddenException('Project permission denied: createProject');
  }

  async projectForUser<T extends Record<string, unknown> & { id: string }>(
    user: AuthenticatedUser,
    project: T
  ) {
    const permissions = await this.getProjectPermissions(user, project.id);
    return this.applyProjectFieldPolicy(project, permissions);
  }

  async projectsForUser<T extends Record<string, unknown> & { id: string }>(
    user: AuthenticatedUser,
    projects: T[]
  ) {
    return Promise.all(projects.map((project) => this.projectForUser(user, project)));
  }

  applyProjectFieldPolicy<T extends Record<string, unknown>>(
    project: T,
    permissions: Awaited<ReturnType<ProjectAccessPolicyService['getProjectPermissions']>>
  ) {
    const result: Record<string, unknown> = {
      ...project,
      permissions,
      financeRedacted: false
    };

    if (!permissions.actions.viewBudget && !permissions.actions.manageBudget) {
      for (const field of financeScopedProjectFields) {
        if (field in result) {
          result[field] = null;
        }
      }
      result.financeRedacted = true;
    }

    return result as T & {
      permissions: Awaited<ReturnType<ProjectAccessPolicyService['getProjectPermissions']>>;
      financeRedacted: boolean;
    };
  }

  private async getProjectPolicyContext(user: AuthenticatedUser, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId: user.tenantId },
      select: {
        ...projectPolicySelect,
        tasks: {
          where: {
            OR: [
              { reporterId: user.id },
              { assignees: { some: { userId: user.id } } },
              { watchers: { some: { userId: user.id } } }
            ]
          },
          select: { id: true },
          take: 1
        }
      }
    });

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private accessLevelFor(user: AuthenticatedUser, project: ProjectPolicyContext): ProjectAccessLevel {
    if (this.hasAny(user, ['manage:all', 'manage:tenant'])) return 'TENANT_ADMIN';
    if (user.permissions.includes('manage:projects')) return 'PROJECT_ADMIN';

    const member = project.members.find((item) => item.userId === user.id);
    if (member) {
      const role = this.normalizeProjectRole(member.role);
      if (role === 'OWNER') return 'PROJECT_OWNER';
      if (role === 'MANAGER') return 'PROJECT_MANAGER';
      if (role === 'EDITOR') return 'PROJECT_EDITOR';
      if (role === 'CLIENT') return 'CLIENT';
      if (role === 'VIEWER') return 'PROJECT_VIEWER';
      return 'PROJECT_CONTRIBUTOR';
    }

    const isTeamMember = project.team?.members.some((item) => item.userId === user.id) ?? false;
    const isTaskParticipant = this.isTaskParticipant(project);
    const isVisibleToTenant =
      project.visibility === Visibility.WORKSPACE ||
      project.visibility === Visibility.ORGANIZATION ||
      project.visibility === Visibility.PUBLIC;

    if (user.permissions.includes('manage:tasks') && (isTeamMember || isTaskParticipant || isVisibleToTenant)) {
      return 'TASK_ADMIN';
    }
    if (isTeamMember) return 'TEAM_MEMBER';
    if (isTaskParticipant) return 'TASK_PARTICIPANT';
    if (
      isVisibleToTenant
    ) {
      return 'TENANT_VIEWER';
    }
    return 'NO_ACCESS';
  }

  private actionsFor(
    user: AuthenticatedUser,
    project: ProjectPolicyContext,
    accessLevel: ProjectAccessLevel
  ): ProjectPolicyActions {
    const actions = this.emptyActions();
    const grant = (...keys: ProjectPolicyAction[]) => keys.forEach((key) => (actions[key] = true));
    const grantAll = () => grant(...allActions);

    if (accessLevel === 'TENANT_ADMIN' || accessLevel === 'PROJECT_ADMIN' || accessLevel === 'PROJECT_OWNER') {
      grantAll();
    } else if (accessLevel === 'TASK_ADMIN') {
      grant(
        'viewProject',
        'viewBoard',
        'createTasks',
        'editTasks',
        'moveTasks',
        'deleteTasks',
        'commentTasks',
        'manageFiles',
        'viewPrivateFiles'
      );
    } else if (accessLevel === 'PROJECT_MANAGER') {
      grant(
        'viewProject',
        'editProject',
        'archiveProject',
        'restoreProject',
        'manageMembers',
        'viewBoard',
        'manageBoardColumns',
        'manageSprints',
        'manageMilestones',
        'manageRisks',
        'viewBudget',
        'manageBudget',
        'createTasks',
        'editTasks',
        'moveTasks',
        'deleteTasks',
        'commentTasks',
        'manageFiles',
        'viewPrivateFiles'
      );
    } else if (accessLevel === 'PROJECT_EDITOR') {
      grant(
        'viewProject',
        'viewBoard',
        'manageMilestones',
        'manageRisks',
        'createTasks',
        'editTasks',
        'moveTasks',
        'commentTasks',
        'manageFiles'
      );
    } else if (accessLevel === 'PROJECT_CONTRIBUTOR' || accessLevel === 'TEAM_MEMBER') {
      grant('viewProject', 'viewBoard', 'createTasks', 'editTasks', 'moveTasks', 'commentTasks', 'manageFiles');
    } else if (accessLevel === 'CLIENT') {
      grant('viewProject', 'viewBoard', 'commentTasks');
    } else if (accessLevel === 'PROJECT_VIEWER' || accessLevel === 'TASK_PARTICIPANT' || accessLevel === 'TENANT_VIEWER') {
      grant('viewProject', 'viewBoard');
    }

    if (user.permissions.includes('comment:tasks') && actions.viewProject) {
      actions.commentTasks = true;
    }

    if (project.status === ProjectStatus.ARCHIVED && !this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:projects'])) {
      actions.createTasks = false;
      actions.editTasks = false;
      actions.moveTasks = false;
      actions.deleteTasks = false;
      actions.manageFiles = false;
      actions.manageBoardColumns = false;
      actions.manageSprints = false;
      actions.manageMilestones = false;
      actions.manageRisks = false;
      actions.viewBudget = false;
      actions.manageBudget = false;
    }

    return actions;
  }

  private normalizeProjectRole(role?: string | null) {
    const normalized = (role ?? 'CONTRIBUTOR')
      .trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase();

    if (['OWNER', 'PROJECT_OWNER', 'ADMIN'].includes(normalized)) return 'OWNER';
    if (['MANAGER', 'PROJECT_MANAGER', 'LEAD', 'DELIVERY_MANAGER'].includes(normalized)) return 'MANAGER';
    if (['EDITOR', 'MAINTAINER'].includes(normalized)) return 'EDITOR';
    if (['VIEWER', 'READ_ONLY', 'READONLY', 'OBSERVER'].includes(normalized)) return 'VIEWER';
    if (['CLIENT', 'STAKEHOLDER', 'EXTERNAL'].includes(normalized)) return 'CLIENT';
    return 'CONTRIBUTOR';
  }

  private isTaskParticipant(project: ProjectPolicyContext) {
    return project.tasks.length > 0;
  }

  private emptyActions(): ProjectPolicyActions {
    return Object.fromEntries(allActions.map((action) => [action, false])) as ProjectPolicyActions;
  }

  private sourceFor(accessLevel: ProjectAccessLevel) {
    if (accessLevel.endsWith('ADMIN')) return 'global-role';
    if (accessLevel.startsWith('PROJECT_') || accessLevel === 'CLIENT') return 'project-member';
    if (accessLevel === 'TEAM_MEMBER') return 'team-membership';
    if (accessLevel === 'TASK_PARTICIPANT') return 'task-participation';
    if (accessLevel === 'TENANT_VIEWER') return 'project-visibility';
    return 'none';
  }

  private roleCatalog() {
    return [
      {
        role: 'Owner',
        accessLevel: 'PROJECT_OWNER',
        description: 'Full project control, member security, deletion, private files, and delivery operations.'
      },
      {
        role: 'Manager',
        accessLevel: 'PROJECT_MANAGER',
        description: 'Runs delivery, members, planning, risks, budgets, tasks, and files, but cannot hard-delete the project.'
      },
      {
        role: 'Editor',
        accessLevel: 'PROJECT_EDITOR',
        description: 'Edits delivery work, milestones, risks, tasks, and operational files.'
      },
      {
        role: 'Contributor',
        accessLevel: 'PROJECT_CONTRIBUTOR',
        description: 'Creates and updates assigned project work, comments, and shared files.'
      },
      {
        role: 'Viewer',
        accessLevel: 'PROJECT_VIEWER',
        description: 'Read-only project visibility for internal observers.'
      },
      {
        role: 'Client',
        accessLevel: 'CLIENT',
        description: 'External stakeholder view and comment access without internal management controls.'
      }
    ];
  }

  private hasAny(user: AuthenticatedUser, permissions: string[]) {
    return permissions.some((permission) => user.permissions.includes(permission));
  }
}
