import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { ProjectAccessPolicyService } from '../access-policy/project-access-policy.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { GlobalSearchQueryDto, SearchCategory } from './dto/global-search-query.dto';

type SearchResultType =
  | 'PROJECT'
  | 'TASK'
  | 'FILE'
  | 'USER'
  | 'TEAM'
  | 'WORKSPACE'
  | 'MESSAGE';

type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string | null;
  url: string;
  score: number;
  updatedAt?: Date | string | null;
  metadata?: Record<string, unknown>;
};

const categoryTypes: Record<SearchCategory, SearchResultType[]> = {
  all: ['PROJECT', 'TASK', 'FILE', 'USER', 'TEAM', 'WORKSPACE', 'MESSAGE'],
  projects: ['PROJECT'],
  tasks: ['TASK'],
  files: ['FILE'],
  people: ['USER'],
  teams: ['TEAM'],
  workspaces: ['WORKSPACE'],
  messages: ['MESSAGE']
};

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessPolicy: ProjectAccessPolicyService
  ) {}

  status() {
    return {
      module: 'search',
      status: 'ready',
      capabilities: [
        'tenant-scoped-global-search',
        'project-and-task-search',
        'file-asset-search',
        'people-team-workspace-search',
        'conversation-member-message-search',
        'command-center-results'
      ]
    };
  }

  async globalSearch(user: AuthenticatedUser, query: GlobalSearchQueryDto) {
    const term = query.search?.trim() ?? '';
    const types = categoryTypes[query.category ?? 'all'];
    const perTypeLimit = this.perTypeLimit(query.limit, types.length);

    const buckets = await Promise.all(
      types.map((type) => this.searchType(type, user, term, perTypeLimit))
    );
    const data = buckets
      .flat()
      .sort((left, right) => {
        const scoreDelta = right.score - left.score;
        if (scoreDelta !== 0) return scoreDelta;
        return this.timeValue(right.updatedAt) - this.timeValue(left.updatedAt);
      })
      .slice(0, query.limit);

    const facets = data.reduce<Record<SearchResultType, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {} as Record<SearchResultType, number>);

    return {
      data,
      page: query.page,
      limit: query.limit,
      total: data.length,
      totalPages: 1,
      facets,
      query: {
        search: term,
        category: query.category ?? 'all',
        contextType: query.contextType,
        contextId: query.contextId
      }
    };
  }

  private searchType(
    type: SearchResultType,
    user: AuthenticatedUser,
    term: string,
    limit: number
  ): Promise<SearchResult[]> {
    if (type === 'PROJECT') return this.searchProjects(user, term, limit);
    if (type === 'TASK') return this.searchTasks(user, term, limit);
    if (type === 'FILE') return this.searchFiles(user, term, limit);
    if (type === 'USER') return this.searchUsers(user, term, limit);
    if (type === 'TEAM') return this.searchTeams(user, term, limit);
    if (type === 'WORKSPACE') return this.searchWorkspaces(user, term, limit);
    return this.searchMessages(user, term, limit);
  }

  private async searchProjects(user: AuthenticatedUser, term: string, limit: number) {
    const rows = await this.prisma.project.findMany({
      where: {
        AND: [
          this.projectAccessPolicy.projectAccessWhere(user),
          term
            ? {
                OR: [
                  { key: { contains: term, mode: 'insensitive' } },
                  { name: { contains: term, mode: 'insensitive' } },
                  { description: { contains: term, mode: 'insensitive' } }
                ]
              }
            : {}
        ]
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        status: true,
        progress: true,
        updatedAt: true
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit
    });
    return rows.map<SearchResult>((project) => ({
      id: project.id,
      type: 'PROJECT',
      title: project.name,
      subtitle: `${project.key} / ${project.status} / ${project.progress}%`,
      url: `/projects/${project.id}`,
      score: this.score(term, [project.key, project.name, project.description]),
      updatedAt: project.updatedAt,
      metadata: { key: project.key, status: project.status, progress: project.progress }
    }));
  }

  private async searchTasks(user: AuthenticatedUser, term: string, limit: number) {
    const rows = await this.prisma.task.findMany({
      where: {
        AND: [
          this.projectAccessPolicy.taskAccessWhere(user),
          term
            ? {
                OR: [
                  { key: { contains: term, mode: 'insensitive' } },
                  { title: { contains: term, mode: 'insensitive' } },
                  { description: { contains: term, mode: 'insensitive' } }
                ]
              }
            : {}
        ]
      },
      select: {
        id: true,
        key: true,
        projectId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        type: true,
        dueDate: true,
        updatedAt: true,
        project: { select: { key: true, name: true } }
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit
    });
    return rows.map<SearchResult>((task) => ({
      id: task.id,
      type: 'TASK',
      title: task.title,
      subtitle: `${task.key} / ${task.status} / ${task.priority}`,
      url: `/projects/${task.projectId}?task=${task.id}`,
      score: this.score(term, [task.key, task.title, task.description, task.project.key, task.project.name]),
      updatedAt: task.updatedAt,
      metadata: {
        key: task.key,
        status: task.status,
        priority: task.priority,
        taskType: task.type,
        dueDate: task.dueDate
      }
    }));
  }

  private async searchFiles(user: AuthenticatedUser, term: string, limit: number) {
    const rows = await this.prisma.fileAsset.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        archivedAt: null,
        AND: [
          this.projectAccessPolicy.fileVisibilityWhere(user),
          term
            ? {
                OR: [
                  { fileName: { contains: term, mode: 'insensitive' } },
                  { mimeType: { contains: term, mode: 'insensitive' } },
                  { entityType: { contains: term, mode: 'insensitive' } }
                ]
              }
            : {}
        ]
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        mimeType: true,
        entityType: true,
        entityId: true,
        provider: true,
        visibility: true,
        updatedAt: true
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit
    });
    return rows.map<SearchResult>((file) => ({
      id: file.id,
      type: 'FILE',
      title: file.fileName,
      subtitle: `${file.entityType} / ${file.provider} / ${file.visibility}`,
      url: file.fileUrl,
      score: this.score(term, [file.fileName, file.mimeType, file.entityType]),
      updatedAt: file.updatedAt,
      metadata: {
        fileUrl: file.fileUrl,
        mimeType: file.mimeType,
        entityType: file.entityType,
        entityId: file.entityId,
        provider: file.provider,
        external: /^https?:\/\//i.test(file.fileUrl)
      }
    }));
  }

  private async searchUsers(user: AuthenticatedUser, term: string, limit: number) {
    const canSearchPeople = this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:users', 'read:users']);
    const rows = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        status: { not: UserStatus.DEACTIVATED },
        id: canSearchPeople ? undefined : user.id,
        ...(term
          ? {
              OR: [
                { email: { contains: term, mode: 'insensitive' } },
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        updatedAt: true
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit
    });
    return rows.map<SearchResult>((person) => ({
      id: person.id,
      type: 'USER',
      title: `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || person.email,
      subtitle: `${person.email} / ${person.status}`,
      url: '/team',
      score: this.score(term, [person.email, person.firstName, person.lastName]),
      updatedAt: person.updatedAt,
      metadata: { email: person.email, status: person.status }
    }));
  }

  private async searchTeams(user: AuthenticatedUser, term: string, limit: number) {
    const rows = await this.prisma.team.findMany({
      where: {
        tenantId: user.tenantId,
        AND: [
          this.projectAccessPolicy.canManageAllProjects(user) ? {} : { members: { some: { userId: user.id } } },
          term
            ? {
                OR: [
                  { name: { contains: term, mode: 'insensitive' } },
                  { description: { contains: term, mode: 'insensitive' } }
                ]
              }
            : {}
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
        _count: { select: { members: true, projects: true } }
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit
    });
    return rows.map<SearchResult>((team) => ({
      id: team.id,
      type: 'TEAM',
      title: team.name,
      subtitle: `${team._count.members} members / ${team._count.projects} projects`,
      url: '/team',
      score: this.score(term, [team.name, team.description]),
      updatedAt: team.updatedAt,
      metadata: team._count
    }));
  }

  private async searchWorkspaces(user: AuthenticatedUser, term: string, limit: number) {
    const rows = await this.prisma.workspace.findMany({
      where: {
        tenantId: user.tenantId,
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { slug: { contains: term, mode: 'insensitive' } },
                { description: { contains: term, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        updatedAt: true,
        _count: { select: { teams: true, projects: true } }
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit
    });
    return rows.map<SearchResult>((workspace) => ({
      id: workspace.id,
      type: 'WORKSPACE',
      title: workspace.name,
      subtitle: `${workspace.slug} / ${workspace._count.teams} teams / ${workspace._count.projects} projects`,
      url: '/projects',
      score: this.score(term, [workspace.name, workspace.slug, workspace.description]),
      updatedAt: workspace.updatedAt,
      metadata: workspace._count
    }));
  }

  private async searchMessages(user: AuthenticatedUser, term: string, limit: number) {
    const rows = await this.prisma.message.findMany({
      where: {
        body: term ? { contains: term, mode: 'insensitive' } : { not: null },
        conversation: {
          tenantId: user.tenantId,
          members: { some: { userId: user.id } }
        }
      },
      select: {
        id: true,
        body: true,
        conversationId: true,
        createdAt: true,
        updatedAt: true,
        conversation: { select: { title: true, isGroup: true } }
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit
    });
    return rows.map<SearchResult>((message) => ({
      id: message.id,
      type: 'MESSAGE',
      title: this.preview(message.body ?? 'Attachment message'),
      subtitle: message.conversation.title ?? (message.conversation.isGroup ? 'Group conversation' : 'Direct message'),
      url: `/messages?conversation=${message.conversationId}`,
      score: this.score(term, [message.body]),
      updatedAt: message.updatedAt,
      metadata: { conversationId: message.conversationId }
    }));
  }

  private hasAny(user: AuthenticatedUser, permissions: string[]) {
    return permissions.some((permission) => user.permissions.includes(permission));
  }

  private perTypeLimit(limit: number, typeCount: number) {
    return Math.min(25, Math.max(5, Math.ceil(limit / Math.max(1, typeCount)) + 3));
  }

  private score(term: string, values: Array<string | null | undefined>) {
    if (!term) return 1;
    const needle = term.toLowerCase();
    let score = 0;
    values.filter(Boolean).forEach((value) => {
      const text = value!.toLowerCase();
      if (text === needle) score += 100;
      else if (text.startsWith(needle)) score += 50;
      else if (text.includes(needle)) score += 20;
    });
    return score;
  }

  private preview(value: string) {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    return trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed;
  }

  private timeValue(value?: Date | string | null) {
    if (!value) return 0;
    return new Date(value).getTime();
  }
}
