import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import {
  ProjectAccessPolicyService,
  ProjectPolicyActions
} from '../access-policy/project-access-policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RealtimeGateway } from '../collaboration/realtime.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { QaService } from '../qa/qa.service';
import { CompleteSprintDto } from './dto/complete-sprint.dto';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateRetrospectiveDto } from './dto/create-retrospective.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { ReorderBoardColumnsDto } from './dto/reorder-board-columns.dto';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { SprintTaskBulkDto } from './dto/sprint-task-bulk.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateRetrospectiveDto } from './dto/update-retrospective.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { UpdateTaskOrderDto } from './dto/update-task-order.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

type DueState = 'NONE' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'DONE';

const taskStatusColor: Record<TaskStatus, string> = {
  BACKLOG: '#94a3b8',
  TODO: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  REVIEW: '#8b5cf6',
  TESTING: '#06b6d4',
  DONE: '#10b981',
  CANCELLED: '#6b7280'
};

const taskPriorityColor: Record<TaskPriority, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#f97316',
  CRITICAL: '#ef4444'
};

const taskTypeColor: Record<TaskType, string> = {
  TASK: '#64748b',
  BUG: '#ef4444',
  STORY: '#8b5cf6',
  EPIC: '#7c3aed',
  FEATURE: '#2563eb',
  INCIDENT: '#f97316',
  APPROVAL: '#0891b2',
  CHANGE_REQUEST: '#0f766e',
  MILESTONE: '#d97706'
};

const sprintSelect = {
  id: true,
  projectId: true,
  name: true,
  goal: true,
  startDate: true,
  endDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      tenantId: true,
      key: true,
      name: true
    }
  },
  _count: {
    select: {
      meetings: true,
      tasks: true,
      retrospectives: true
    }
  }
} satisfies Prisma.SprintSelect;

const boardColumnSelect = {
  id: true,
  boardId: true,
  name: true,
  status: true,
  wipLimit: true,
  isCollapsed: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.BoardColumnSelect;

const boardSelect = {
  id: true,
  tenantId: true,
  projectId: true,
  name: true,
  description: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  columns: {
    select: boardColumnSelect,
    orderBy: [{ sortOrder: 'asc' as const }]
  }
} satisfies Prisma.BoardSelect;

const boardTaskSelect = {
  id: true,
  tenantId: true,
  projectId: true,
  sprintId: true,
  boardColumnId: true,
  parentTaskId: true,
  reporterId: true,
  key: true,
  title: true,
  type: true,
  status: true,
  priority: true,
  startDate: true,
  dueDate: true,
  completedAt: true,
  storyPoints: true,
  estimateMins: true,
  actualMins: true,
  sortOrder: true,
  archivedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  boardColumn: {
    select: {
      id: true,
      name: true,
      status: true,
      sortOrder: true
    }
  },
  assignees: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    }
  },
  labels: {
    select: {
      id: true,
      label: {
        select: {
          id: true,
          name: true,
          color: true
        }
      }
    }
  },
  _count: {
    select: {
      comments: true,
      attachments: true,
      subtasks: true
    }
  }
} satisfies Prisma.TaskSelect;

const boardCardTaskSelect = {
  ...boardTaskSelect,
  sprint: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      completedAt: true
    }
  },
  comments: {
    select: {
      id: true,
      body: true,
      authorId: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true
        }
      }
    },
    orderBy: [{ createdAt: 'desc' as const }],
    take: 1
  },
  attachments: {
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true
    },
    orderBy: [{ createdAt: 'desc' as const }],
    take: 3
  },
  checklists: {
    select: {
      id: true,
      title: true,
      items: {
        select: {
          id: true,
          isDone: true
        }
      }
    },
    orderBy: [{ createdAt: 'asc' as const }]
  },
  dependenciesFrom: {
    select: {
      id: true,
      type: true,
      toTask: {
        select: {
          id: true,
          key: true,
          title: true,
          status: true,
          priority: true
        }
      }
    },
    take: 3
  },
  dependenciesTo: {
    select: {
      id: true,
      type: true,
      fromTask: {
        select: {
          id: true,
          key: true,
          title: true,
          status: true,
          priority: true
        }
      }
    },
    take: 3
  },
  _count: {
    select: {
      ...boardTaskSelect._count.select,
      comments: true,
      attachments: true,
      subtasks: true,
      checklists: true,
      dependenciesFrom: true,
      dependenciesTo: true
    }
  }
} satisfies Prisma.TaskSelect;

type BoardTaskRecord = Prisma.TaskGetPayload<{ select: typeof boardCardTaskSelect }>;

const retrospectiveSelect = {
  id: true,
  sprintId: true,
  authorId: true,
  wentWell: true,
  improve: true,
  actionItems: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.SprintRetrospectiveSelect;

const defaultBoardColumns = [
  { name: 'Backlog', status: TaskStatus.BACKLOG, sortOrder: 0 },
  { name: 'To Do', status: TaskStatus.TODO, sortOrder: 1 },
  { name: 'In Progress', status: TaskStatus.IN_PROGRESS, sortOrder: 2 },
  { name: 'Review', status: TaskStatus.REVIEW, sortOrder: 3 },
  { name: 'Testing', status: TaskStatus.TESTING, sortOrder: 4 },
  { name: 'Done', status: TaskStatus.DONE, sortOrder: 5 },
  { name: 'Cancelled', status: TaskStatus.CANCELLED, sortOrder: 6 }
];

@Injectable()
export class AgileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly projectAccessPolicy: ProjectAccessPolicyService,
    private readonly qaService: QaService
  ) {}

  async listSprints(user: AuthenticatedUser, query: SprintQueryDto) {
    const where: Prisma.SprintWhereInput = {
      project: this.projectAccessPolicy.projectAccessWhere(user),
      projectId: query.projectId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { goal: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...this.sprintStateWhere(query.state)
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sprint.findMany({
        where,
        select: sprintSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.sprint.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createSprint(user: AuthenticatedUser, dto: CreateSprintDto, meta: RequestMeta) {
    await this.projectAccessPolicy.assertProjectAction(user, dto.projectId, 'manageSprints');
    await this.getTenantProjectOrThrow(user.tenantId, dto.projectId);
    this.assertSprintSchedule(dto.startDate ? new Date(dto.startDate) : null, dto.endDate ? new Date(dto.endDate) : null);

    const sprint = await this.prisma.sprint.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined
      },
      select: sprintSelect
    });

    await this.recordAudit(user, 'sprint.create', 'Sprint', sprint.id, undefined, {
      projectId: sprint.projectId,
      name: sprint.name
    }, meta);

    return sprint;
  }

  async getSprint(user: AuthenticatedUser, sprintId: string) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'viewBoard');
    return sprint;
  }

  async updateSprint(
    user: AuthenticatedUser,
    sprintId: string,
    dto: UpdateSprintDto,
    meta: RequestMeta
  ) {
    const before = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'manageSprints');
    const nextStartDate = this.resolveDatePatch(before.startDate, dto, 'startDate');
    const nextEndDate = this.resolveDatePatch(before.endDate, dto, 'endDate');
    this.assertSprintUpdateAllowed(before, dto, nextStartDate);
    this.assertSprintSchedule(nextStartDate, nextEndDate);

    const sprint = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name: dto.name,
        goal: dto.goal,
        startDate: this.datePatch(dto, 'startDate'),
        endDate: this.datePatch(dto, 'endDate'),
        completedAt: this.datePatch(dto, 'completedAt')
      },
      select: sprintSelect
    });

    await this.recordAudit(user, 'sprint.update', 'Sprint', sprint.id, {
      name: before.name,
      goal: before.goal,
      completedAt: before.completedAt
    }, {
      name: sprint.name,
      goal: sprint.goal,
      completedAt: sprint.completedAt
    }, meta);

    return sprint;
  }

  async deleteSprint(user: AuthenticatedUser, sprintId: string, meta: RequestMeta) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'manageSprints');

    if (sprint.completedAt) {
      throw new BadRequestException('Completed sprints cannot be deleted');
    }

    if (this.isSprintActive(sprint)) {
      throw new BadRequestException('Active sprints cannot be deleted');
    }

    if (sprint._count.tasks > 0 || sprint._count.retrospectives > 0 || sprint._count.meetings > 0) {
      throw new BadRequestException('Sprint must have no tasks, meetings, or retrospectives before deletion');
    }

    await this.prisma.sprint.delete({ where: { id: sprintId } });
    await this.recordAudit(user, 'sprint.delete', 'Sprint', sprintId, {
      projectId: sprint.projectId,
      name: sprint.name
    }, undefined, meta);

    return { success: true };
  }

  async startSprint(user: AuthenticatedUser, sprintId: string, meta: RequestMeta) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'manageSprints');

    if (sprint.completedAt) {
      throw new BadRequestException('Completed sprints cannot be started');
    }

    const activeSprint = await this.prisma.sprint.findFirst({
      where: {
        id: { not: sprintId },
        projectId: sprint.projectId,
        completedAt: null,
        startDate: { lte: new Date() }
      },
      select: { id: true, name: true }
    });

    if (activeSprint) {
      throw new ConflictException(`Sprint ${activeSprint.name} is already active for this project`);
    }

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        startDate: new Date()
      },
      select: sprintSelect
    });

    await this.recordAudit(user, 'sprint.start', 'Sprint', sprintId, {
      startDate: sprint.startDate
    }, {
      startDate: updated.startDate
    }, meta);

    return updated;
  }

  async completeSprint(
    user: AuthenticatedUser,
    sprintId: string,
    dto: CompleteSprintDto,
    meta: RequestMeta
  ) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'manageSprints');

    if (sprint.completedAt) {
      throw new BadRequestException('Sprint is already completed');
    }

    if (!sprint.startDate || sprint.startDate > new Date()) {
      throw new BadRequestException('Only active sprints can be completed');
    }

    let moveTargetSprintId: string | null = null;

    if (dto.moveIncompleteToSprintId) {
      const target = await this.getTenantSprintOrThrow(user.tenantId, dto.moveIncompleteToSprintId);
      if (target.projectId !== sprint.projectId) {
        throw new BadRequestException('Incomplete tasks can only move to a sprint in the same project');
      }
      if (target.completedAt) {
        throw new BadRequestException('Incomplete tasks cannot move to a completed sprint');
      }
      moveTargetSprintId = target.id;
    }

    const moveIncompleteToBacklog = dto.moveIncompleteToBacklog ?? true;

    const result = await this.prisma.$transaction(async (tx) => {
      const incompleteWhere: Prisma.TaskWhereInput = {
        sprintId,
        status: {
          notIn: [TaskStatus.DONE, TaskStatus.CANCELLED]
        }
      };

      const incompleteCount = await tx.task.count({ where: incompleteWhere });

      if (moveTargetSprintId || moveIncompleteToBacklog) {
        await tx.task.updateMany({
          where: incompleteWhere,
          data: {
            sprintId: moveTargetSprintId
          }
        });
      }

      const completed = await tx.sprint.update({
        where: { id: sprintId },
        data: {
          completedAt: new Date()
        },
        select: sprintSelect
      });

      return {
        sprint: completed,
        incompleteMoved: moveTargetSprintId || moveIncompleteToBacklog ? incompleteCount : 0,
        incompleteRemaining: moveTargetSprintId || moveIncompleteToBacklog ? 0 : incompleteCount
      };
    });

    await this.recordAudit(user, 'sprint.complete', 'Sprint', sprintId, {
      completedAt: sprint.completedAt
    }, {
      completedAt: result.sprint.completedAt,
      incompleteMoved: result.incompleteMoved,
      moveTargetSprintId
    }, meta);

    return result;
  }

  async listSprintTasks(user: AuthenticatedUser, sprintId: string, query: PaginationQueryDto) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'viewBoard');
    const where: Prisma.TaskWhereInput = {
      tenantId: user.tenantId,
      projectId: sprint.projectId,
      sprintId,
      ...(query.search
        ? {
            OR: [
              { key: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        select: boardTaskSelect,
        orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.task.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async addSprintTasks(
    user: AuthenticatedUser,
    sprintId: string,
    dto: SprintTaskBulkDto,
    meta: RequestMeta
  ) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'manageSprints');
    const tasks = await this.getTenantTasksOrThrow(user.tenantId, dto.taskIds);

    if (tasks.some((task) => task.projectId !== sprint.projectId)) {
      throw new BadRequestException('All tasks must belong to the sprint project');
    }

    await this.prisma.task.updateMany({
      where: {
        id: { in: dto.taskIds },
        tenantId: user.tenantId
      },
      data: {
        sprintId
      }
    });

    await this.recordAudit(user, 'sprint.tasks_add', 'Sprint', sprintId, undefined, {
      taskIds: dto.taskIds
    }, meta);

    return this.listSprintTasks(user, sprintId, { page: 1, limit: 100 });
  }

  async removeSprintTask(
    user: AuthenticatedUser,
    sprintId: string,
    taskId: string,
    meta: RequestMeta
  ) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'manageSprints');
    await this.assertTaskBelongsToProject(user.tenantId, taskId, sprint.projectId);

    await this.prisma.task.update({
      where: { id: taskId },
      data: { sprintId: null }
    });

    await this.recordAudit(user, 'sprint.task_remove', 'Sprint', sprintId, {
      taskId
    }, undefined, meta);

    return { success: true };
  }

  async getBacklog(user: AuthenticatedUser, projectId: string, query: PaginationQueryDto) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewBoard');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);

    const where: Prisma.TaskWhereInput = {
      tenantId: user.tenantId,
      projectId,
      sprintId: null,
      ...(query.search
        ? {
            OR: [
              { key: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        select: boardTaskSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.task.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async listProjectBoards(user: AuthenticatedUser, projectId: string) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewBoard');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);
    await this.ensureDefaultBoard(user.tenantId, projectId);

    return this.prisma.board.findMany({
      where: {
        tenantId: user.tenantId,
        projectId
      },
      select: boardSelect,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
    });
  }

  async createBoard(
    user: AuthenticatedUser,
    projectId: string,
    dto: CreateBoardDto,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'manageBoardColumns');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);

    try {
      const board = await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.board.updateMany({
            where: { projectId },
            data: { isDefault: false }
          });
        }

        const created = await tx.board.create({
          data: {
            tenantId: user.tenantId,
            projectId,
            name: dto.name,
            description: dto.description,
            isDefault: dto.isDefault ?? false,
            columns: {
              create: defaultBoardColumns
            }
          },
          select: boardSelect
        });

        return created;
      });

      await this.recordAudit(user, 'board.create', 'Board', board.id, undefined, {
        projectId,
        name: board.name
      }, meta);

      return board;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Board name already exists in this project');
      }
      throw error;
    }
  }

  async updateBoard(user: AuthenticatedUser, boardId: string, dto: UpdateBoardDto, meta: RequestMeta) {
    const before = await this.getTenantBoardOrThrow(user.tenantId, boardId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'manageBoardColumns');

    try {
      const board = await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.board.updateMany({
            where: { projectId: before.projectId, id: { not: boardId } },
            data: { isDefault: false }
          });
        }

        return tx.board.update({
          where: { id: boardId },
          data: {
            name: dto.name,
            description: dto.description,
            isDefault: dto.isDefault
          },
          select: boardSelect
        });
      });

      await this.recordAudit(user, 'board.update', 'Board', boardId, {
        name: before.name,
        isDefault: before.isDefault
      }, {
        name: board.name,
        isDefault: board.isDefault
      }, meta);

      return board;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Board name already exists in this project');
      }
      throw error;
    }
  }

  async deleteBoard(user: AuthenticatedUser, boardId: string, meta: RequestMeta) {
    const board = await this.getTenantBoardOrThrow(user.tenantId, boardId);
    await this.projectAccessPolicy.assertProjectAction(user, board.projectId, 'manageBoardColumns');

    if (board.isDefault) {
      throw new BadRequestException('Default board cannot be deleted');
    }

    await this.prisma.board.delete({ where: { id: boardId } });
    await this.recordAudit(user, 'board.delete', 'Board', boardId, {
      projectId: board.projectId,
      name: board.name
    }, undefined, meta);

    return { success: true };
  }

  async getProjectBoard(user: AuthenticatedUser, projectId: string) {
    const policy = await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewBoard');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);
    const board = await this.ensureDefaultBoard(user.tenantId, projectId);
    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId: user.tenantId,
        projectId,
        archivedAt: null,
        deletedAt: null
      },
      select: boardCardTaskSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
    const taskSummaries = tasks.map((task) => this.toBoardCardTask(user, task, policy.actions));

    return {
      ...board,
      summary: this.resolveBoardSummary(taskSummaries),
      permissions: this.resolveBoardPermissions(user, policy.actions),
      columns: board.columns.map((column) => {
        const columnTasks = taskSummaries.filter((task) => this.taskBelongsToColumn(task, column, board.columns));
        const metrics = this.resolveColumnMetrics(columnTasks, column.wipLimit);
        return {
          ...column,
          taskCount: columnTasks.length,
          metrics,
          wip: {
            limit: column.wipLimit,
            used: columnTasks.length,
            remaining: column.wipLimit == null ? null : Math.max(column.wipLimit - columnTasks.length, 0),
            usagePercent: column.wipLimit ? Math.round((columnTasks.length / column.wipLimit) * 100) : null
          },
          isOverWipLimit: metrics.isOverWipLimit,
          tasks: columnTasks
        };
      })
    };
  }

  async createBoardColumn(
    user: AuthenticatedUser,
    boardId: string,
    dto: CreateBoardColumnDto,
    meta: RequestMeta
  ) {
    const board = await this.getTenantBoardOrThrow(user.tenantId, boardId);
    await this.projectAccessPolicy.assertProjectAction(user, board.projectId, 'manageBoardColumns');

    try {
      const nextSortOrder = dto.sortOrder ?? (await this.getNextBoardColumnSortOrder(boardId));
      const column = await this.prisma.boardColumn.create({
        data: {
          boardId,
          name: dto.name,
          status: dto.status,
          wipLimit: dto.wipLimit,
          isCollapsed: dto.isCollapsed,
          sortOrder: nextSortOrder
        },
        select: boardColumnSelect
      });

      await this.recordAudit(user, 'board.column_create', 'BoardColumn', column.id, undefined, {
        boardId,
        status: column.status,
        name: column.name,
        isCollapsed: column.isCollapsed
      }, meta);

      return column;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A column for this status already exists on the board');
      }
      throw error;
    }
  }

  async updateBoardColumn(
    user: AuthenticatedUser,
    boardId: string,
    columnId: string,
    dto: UpdateBoardColumnDto,
    meta: RequestMeta
  ) {
    const board = await this.getTenantBoardOrThrow(user.tenantId, boardId);
    await this.projectAccessPolicy.assertProjectAction(user, board.projectId, 'manageBoardColumns');
    const before = await this.getBoardColumnOrThrow(boardId, columnId);

    try {
      const column = await this.prisma.boardColumn.update({
        where: { id: columnId },
        data: {
          name: dto.name,
          status: dto.status,
          wipLimit: dto.wipLimit,
          isCollapsed: dto.isCollapsed,
          sortOrder: dto.sortOrder
        },
        select: boardColumnSelect
      });

      await this.recordAudit(user, 'board.column_update', 'BoardColumn', column.id, {
        name: before.name,
        status: before.status,
        wipLimit: before.wipLimit,
        isCollapsed: before.isCollapsed
      }, {
        name: column.name,
        status: column.status,
        wipLimit: column.wipLimit,
        isCollapsed: column.isCollapsed
      }, meta);

      return column;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A column for this status already exists on the board');
      }
      throw error;
    }
  }

  async deleteBoardColumn(
    user: AuthenticatedUser,
    boardId: string,
    columnId: string,
    meta: RequestMeta
  ) {
    const board = await this.getTenantBoardOrThrow(user.tenantId, boardId);
    await this.projectAccessPolicy.assertProjectAction(user, board.projectId, 'manageBoardColumns');
    const column = await this.getBoardColumnOrThrow(boardId, columnId);
    const taskCount = await this.prisma.task.count({
      where: {
        projectId: board.projectId,
        OR: [
          { boardColumnId: columnId },
          ...(column.status ? [{ boardColumnId: null, status: column.status }] : [])
        ]
      }
    });

    if (taskCount > 0) {
      throw new BadRequestException('Move tasks out of this column before deleting it');
    }

    await this.prisma.boardColumn.delete({ where: { id: columnId } });
    await this.recordAudit(user, 'board.column_delete', 'BoardColumn', columnId, {
      boardId,
      status: column.status,
      name: column.name
    }, undefined, meta);

    return { success: true };
  }

  async reorderBoardColumns(
    user: AuthenticatedUser,
    boardId: string,
    dto: ReorderBoardColumnsDto,
    meta: RequestMeta
  ) {
    const board = await this.getTenantBoardOrThrow(user.tenantId, boardId);
    await this.projectAccessPolicy.assertProjectAction(user, board.projectId, 'manageBoardColumns');
    const existing = await this.prisma.boardColumn.findMany({
      where: { boardId },
      select: { id: true }
    });
    const existingIds = new Set(existing.map((column) => column.id));

    for (const column of dto.columns) {
      if (!existingIds.has(column.columnId)) {
        throw new NotFoundException('One or more columns were not found on this board');
      }
    }

    await this.prisma.$transaction(
      dto.columns.map((column) =>
        this.prisma.boardColumn.update({
          where: { id: column.columnId },
          data: { sortOrder: column.sortOrder }
        })
      )
    );

    await this.recordAudit(user, 'board.columns_reorder', 'Board', boardId, undefined, {
      projectId: board.projectId,
      columns: dto.columns
    }, meta);

    return this.getTenantBoardOrThrow(user.tenantId, boardId);
  }

  async updateTaskStatus(
    user: AuthenticatedUser,
    taskId: string,
    dto: UpdateTaskStatusDto,
    meta: RequestMeta
  ) {
    const task = await this.getTenantTaskOrThrow(user.tenantId, taskId);
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'moveTasks');
    const board = await this.ensureDefaultBoard(user.tenantId, task.projectId);
    const targetColumn = board.columns.find((column) => column.status === dto.status);
    await this.assertWipLimitAllowsMove(user.tenantId, task.projectId, task.status, dto.status);
    if (dto.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      await this.qaService.assertTaskDoneGate(user, taskId, task.projectId);
    }

    const completedAt = this.resolveCompletedAt(task.completedAt, dto.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.task.update({
        where: { id: taskId },
        data: {
          status: dto.status,
          boardColumnId: targetColumn?.id ?? null,
          completedAt
        },
        select: boardTaskSelect
      });

      await tx.taskActivity.create({
        data: {
          taskId,
          actorId: user.id,
          action: 'task.status_update',
          oldValue: this.toJsonValue({ status: task.status, boardColumnId: task.boardColumnId }),
          newValue: this.toJsonValue({ status: dto.status, boardColumnId: targetColumn?.id, reason: dto.reason })
        }
      });

      return saved;
    });

    await this.recordAudit(user, 'task.status_update', 'Task', taskId, {
      status: task.status
    }, {
      status: updated.status,
      boardColumnId: updated.boardColumnId,
      reason: dto.reason
    }, meta);

    this.realtimeGateway.emitTaskUpdated(user.tenantId, taskId, {
      taskId,
      action: 'status_update',
      oldStatus: task.status,
      status: updated.status,
      actorId: user.id
    });

    return updated;
  }

  async updateTaskOrder(
    user: AuthenticatedUser,
    taskId: string,
    dto: UpdateTaskOrderDto,
    meta: RequestMeta
  ) {
    const task = await this.getTenantTaskOrThrow(user.tenantId, taskId);
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'moveTasks');
    const nextColumn =
      dto.boardColumnId === undefined
        ? undefined
        : dto.boardColumnId
          ? await this.getTenantBoardColumnForProjectOrThrow(user.tenantId, task.projectId, dto.boardColumnId)
          : null;
    const nextStatus = dto.status ?? nextColumn?.status ?? undefined;

    if (nextColumn?.wipLimit && (task.boardColumnId !== nextColumn.id || task.status !== nextStatus)) {
      const currentCount = await this.countTasksForColumn(user.tenantId, task.projectId, nextColumn);
      if (currentCount >= nextColumn.wipLimit) {
        throw new BadRequestException(`WIP limit reached for ${nextColumn.name}`);
      }
    } else if (nextStatus) {
      await this.assertWipLimitAllowsMove(user.tenantId, task.projectId, task.status, nextStatus);
    }

    if (nextStatus === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      await this.qaService.assertTaskDoneGate(user, taskId, task.projectId);
    }

    if (dto.sprintId) {
      await this.assertSprintBelongsToProject(user.tenantId, dto.sprintId, task.projectId);
    }

    const completedAt = nextStatus ? this.resolveCompletedAt(task.completedAt, nextStatus) : undefined;
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.task.update({
        where: { id: taskId },
        data: {
          sortOrder: dto.sortOrder,
          status: nextStatus,
          boardColumnId: dto.boardColumnId === undefined ? undefined : dto.boardColumnId,
          sprintId: dto.sprintId === undefined ? undefined : dto.sprintId,
          completedAt
        },
        select: boardTaskSelect
      });

      await tx.taskActivity.create({
        data: {
          taskId,
          actorId: user.id,
          action: 'task.order_update',
          oldValue: this.toJsonValue({
            sortOrder: task.sortOrder,
            status: task.status,
            sprintId: task.sprintId,
            boardColumnId: task.boardColumnId
          }),
          newValue: this.toJsonValue({
            sortOrder: dto.sortOrder,
            status: nextStatus,
            sprintId: dto.sprintId,
            boardColumnId: dto.boardColumnId
          })
        }
      });

      return saved;
    });

    await this.recordAudit(user, 'task.order_update', 'Task', taskId, {
      sortOrder: task.sortOrder,
      status: task.status,
      sprintId: task.sprintId,
      boardColumnId: task.boardColumnId
    }, {
      sortOrder: updated.sortOrder,
      status: updated.status,
      sprintId: updated.sprintId,
      boardColumnId: updated.boardColumnId
    }, meta);

    this.realtimeGateway.emitTaskUpdated(user.tenantId, taskId, {
      taskId,
      action: 'order_update',
      status: updated.status,
      sortOrder: updated.sortOrder,
      sprintId: updated.sprintId,
      boardColumnId: updated.boardColumnId,
      actorId: user.id
    });

    return updated;
  }

  async getSprintBurndown(user: AuthenticatedUser, sprintId: string) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'viewBoard');
    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId: user.tenantId,
        sprintId
      },
      select: {
        id: true,
        storyPoints: true,
        status: true,
        createdAt: true,
        completedAt: true
      }
    });

    const start = sprint.startDate ?? sprint.createdAt;
    const end = sprint.endDate ?? sprint.completedAt ?? new Date();
    const days = this.daysBetween(start, end);
    const totalPoints = tasks.reduce((sum, task) => sum + (task.storyPoints ?? 1), 0);

    return {
      sprintId,
      totalTasks: tasks.length,
      totalPoints,
      pointsDone: tasks
        .filter((task) => task.status === TaskStatus.DONE)
        .reduce((sum, task) => sum + (task.storyPoints ?? 1), 0),
      series: days.map((day) => {
        const remainingPoints = tasks
          .filter((task) => !task.completedAt || task.completedAt > day)
          .reduce((sum, task) => sum + (task.storyPoints ?? 1), 0);

        return {
          date: day.toISOString().slice(0, 10),
          remainingPoints,
          remainingTasks: tasks.filter((task) => !task.completedAt || task.completedAt > day).length
        };
      })
    };
  }

  async getProjectVelocity(user: AuthenticatedUser, projectId: string, limit = 6) {
    await this.projectAccessPolicy.assertProjectAction(user, projectId, 'viewBoard');
    await this.getTenantProjectOrThrow(user.tenantId, projectId);

    const sprints = await this.prisma.sprint.findMany({
      where: {
        projectId,
        completedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        completedAt: true,
        tasks: {
          where: {
            status: TaskStatus.DONE
          },
          select: {
            storyPoints: true
          }
        }
      },
      orderBy: [{ completedAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 20)
    });

    const data = sprints.reverse().map((sprint) => ({
      sprintId: sprint.id,
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      completedAt: sprint.completedAt,
      completedTasks: sprint.tasks.length,
      completedPoints: sprint.tasks.reduce((sum, task) => sum + (task.storyPoints ?? 1), 0)
    }));
    const averagePoints =
      data.length === 0
        ? 0
        : data.reduce((sum, sprint) => sum + sprint.completedPoints, 0) / data.length;

    return {
      projectId,
      averagePoints,
      sprints: data
    };
  }

  async listRetrospectives(user: AuthenticatedUser, sprintId: string) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'viewBoard');

    return this.prisma.sprintRetrospective.findMany({
      where: { sprintId },
      select: retrospectiveSelect,
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async createRetrospective(
    user: AuthenticatedUser,
    sprintId: string,
    dto: CreateRetrospectiveDto,
    meta: RequestMeta
  ) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'manageSprints');

    const retrospective = await this.prisma.sprintRetrospective.create({
      data: {
        sprintId,
        authorId: user.id,
        wentWell: dto.wentWell,
        improve: dto.improve,
        actionItems: dto.actionItems ? this.toJsonValue(dto.actionItems) : undefined
      },
      select: retrospectiveSelect
    });

    await this.recordAudit(user, 'sprint.retrospective_create', 'SprintRetrospective', retrospective.id, undefined, {
      sprintId
    }, meta);

    return retrospective;
  }

  async updateRetrospective(
    user: AuthenticatedUser,
    sprintId: string,
    retrospectiveId: string,
    dto: UpdateRetrospectiveDto,
    meta: RequestMeta
  ) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'manageSprints');
    const before = await this.getRetrospectiveOrThrow(sprintId, retrospectiveId);

    const retrospective = await this.prisma.sprintRetrospective.update({
      where: { id: retrospectiveId },
      data: {
        wentWell: dto.wentWell,
        improve: dto.improve,
        actionItems: dto.actionItems ? this.toJsonValue(dto.actionItems) : undefined
      },
      select: retrospectiveSelect
    });

    await this.recordAudit(user, 'sprint.retrospective_update', 'SprintRetrospective', retrospectiveId, {
      wentWell: before.wentWell,
      improve: before.improve
    }, {
      wentWell: retrospective.wentWell,
      improve: retrospective.improve
    }, meta);

    return retrospective;
  }

  async deleteRetrospective(
    user: AuthenticatedUser,
    sprintId: string,
    retrospectiveId: string,
    meta: RequestMeta
  ) {
    const sprint = await this.getTenantSprintOrThrow(user.tenantId, sprintId);
    await this.projectAccessPolicy.assertProjectAction(user, sprint.projectId, 'manageSprints');
    const retrospective = await this.getRetrospectiveOrThrow(sprintId, retrospectiveId);

    await this.prisma.sprintRetrospective.delete({ where: { id: retrospectiveId } });
    await this.recordAudit(user, 'sprint.retrospective_delete', 'SprintRetrospective', retrospectiveId, {
      sprintId,
      authorId: retrospective.authorId
    }, undefined, meta);

    return { success: true };
  }

  private sprintStateWhere(state?: 'planned' | 'active' | 'completed'): Prisma.SprintWhereInput {
    const now = new Date();

    if (state === 'planned') {
      return {
        completedAt: null,
        OR: [
          { startDate: null },
          { startDate: { gt: now } }
        ]
      };
    }

    if (state === 'active') {
      return {
        completedAt: null,
        startDate: { lte: now }
      };
    }

    if (state === 'completed') {
      return { completedAt: { not: null } };
    }

    return {};
  }

  private datePatch<T extends 'completedAt' | 'endDate' | 'startDate'>(
    dto: Pick<UpdateSprintDto, T>,
    key: T
  ) {
    if (!Object.prototype.hasOwnProperty.call(dto, key)) {
      return undefined;
    }

    const value = dto[key];
    return value ? new Date(value) : null;
  }

  private resolveDatePatch<T extends 'endDate' | 'startDate'>(
    current: Date | null,
    dto: Pick<UpdateSprintDto, T>,
    key: T
  ) {
    if (!Object.prototype.hasOwnProperty.call(dto, key)) {
      return current;
    }

    const value = dto[key];
    return value ? new Date(value) : null;
  }

  private assertSprintUpdateAllowed(
    sprint: { startDate: Date | null; completedAt: Date | null },
    dto: UpdateSprintDto,
    nextStartDate: Date | null
  ) {
    if (Object.prototype.hasOwnProperty.call(dto, 'completedAt')) {
      throw new BadRequestException('Use the complete sprint workflow to change completion state');
    }

    if (sprint.completedAt && (Object.prototype.hasOwnProperty.call(dto, 'startDate') || Object.prototype.hasOwnProperty.call(dto, 'endDate'))) {
      throw new BadRequestException('Completed sprint schedule cannot be changed');
    }

    if (this.isSprintActive(sprint) && Object.prototype.hasOwnProperty.call(dto, 'startDate')) {
      if (!nextStartDate || nextStartDate > new Date()) {
        throw new BadRequestException('Active sprint start date cannot be cleared or moved to the future');
      }
    }
  }

  private assertSprintSchedule(startDate: Date | null, endDate: Date | null) {
    if (!startDate && endDate) {
      throw new BadRequestException('Sprint end date requires a start date');
    }

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('Sprint end date must be after the start date');
    }
  }

  private isSprintActive(sprint: { startDate: Date | null; completedAt: Date | null }) {
    return Boolean(sprint.startDate && !sprint.completedAt && sprint.startDate <= new Date());
  }

  private async getTenantProjectOrThrow(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId
      },
      select: {
        id: true,
        tenantId: true,
        key: true,
        name: true
      }
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async getTenantSprintOrThrow(tenantId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findFirst({
      where: {
        id: sprintId,
        project: {
          tenantId
        }
      },
      select: sprintSelect
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    return sprint;
  }

  private async assertSprintBelongsToProject(
    tenantId: string,
    sprintId: string,
    projectId: string
  ) {
    const sprint = await this.prisma.sprint.findFirst({
      where: {
        id: sprintId,
        projectId,
        project: {
          tenantId
        }
      },
      select: {
        id: true
      }
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
  }

  private async getTenantTaskOrThrow(tenantId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId
      },
      select: {
        id: true,
        projectId: true,
        sprintId: true,
        boardColumnId: true,
        status: true,
        sortOrder: true,
        completedAt: true
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async getTenantTasksOrThrow(tenantId: string, taskIds: string[]) {
    const tasks = await this.prisma.task.findMany({
      where: {
        id: { in: taskIds },
        tenantId
      },
      select: {
        id: true,
        projectId: true
      }
    });

    if (tasks.length !== new Set(taskIds).size) {
      throw new NotFoundException('One or more tasks were not found');
    }

    return tasks;
  }

  private async assertTaskBelongsToProject(tenantId: string, taskId: string, projectId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId,
        projectId
      },
      select: {
        id: true
      }
    });

    if (!task) {
      throw new NotFoundException('Task not found in project');
    }
  }

  private async ensureDefaultBoard(tenantId: string, projectId: string) {
    const existing = await this.prisma.board.findFirst({
      where: {
        tenantId,
        projectId,
        isDefault: true
      },
      select: boardSelect
    });

    if (existing) {
      return existing;
    }

    const anyBoard = await this.prisma.board.findFirst({
      where: {
        tenantId,
        projectId
      },
      select: boardSelect,
      orderBy: [{ createdAt: 'asc' }]
    });

    if (anyBoard) {
      return this.prisma.board.update({
        where: { id: anyBoard.id },
        data: { isDefault: true },
        select: boardSelect
      });
    }

    return this.prisma.board.create({
      data: {
        tenantId,
        projectId,
        name: 'Default board',
        isDefault: true,
        columns: {
          create: defaultBoardColumns
        }
      },
      select: boardSelect
    });
  }

  private async getTenantBoardOrThrow(tenantId: string, boardId: string) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        tenantId
      },
      select: boardSelect
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return board;
  }

  private async getBoardColumnOrThrow(boardId: string, columnId: string) {
    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId
      },
      select: boardColumnSelect
    });

    if (!column) {
      throw new NotFoundException('Board column not found');
    }

    return column;
  }

  private async getTenantBoardColumnForProjectOrThrow(
    tenantId: string,
    projectId: string,
    columnId: string
  ) {
    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        board: {
          tenantId,
          projectId
        }
      },
      select: boardColumnSelect
    });

    if (!column) {
      throw new NotFoundException('Board column not found');
    }

    return column;
  }

  private async getNextBoardColumnSortOrder(boardId: string) {
    const aggregate = await this.prisma.boardColumn.aggregate({
      where: { boardId },
      _max: { sortOrder: true }
    });

    return (aggregate._max.sortOrder ?? -1) + 1;
  }

  private toBoardCardTask(
    user: AuthenticatedUser,
    task: BoardTaskRecord,
    projectActions?: ProjectPolicyActions
  ) {
    const {
      attachments,
      checklists,
      comments,
      dependenciesFrom,
      dependenciesTo,
      ...taskBase
    } = task;
    const due = this.resolveDueState(task.dueDate, task.completedAt);
    const checklistTotal = checklists.reduce((total, checklist) => total + checklist.items.length, 0);
    const checklistDone = checklists.reduce(
      (total, checklist) => total + checklist.items.filter((item) => item.isDone).length,
      0
    );
    const blockedByCount = task._count.dependenciesTo;
    const blockingCount = task._count.dependenciesFrom;
    const isBlocked = blockedByCount > 0;
    const isBlocking = blockingCount > 0;
    const ageDays = this.daysSince(task.createdAt);
    const updatedAgeDays = this.daysSince(task.updatedAt);

    return {
      ...taskBase,
      card: {
        key: task.key,
        code: task.key,
        title: task.title,
        type: task.type,
        status: task.status,
        priority: task.priority,
        colors: {
          status: taskStatusColor[task.status],
          priority: taskPriorityColor[task.priority],
          type: taskTypeColor[task.type],
          rail: isBlocked ? taskPriorityColor.CRITICAL : taskPriorityColor[task.priority]
        },
        sprint: task.sprint
          ? {
              id: task.sprint.id,
              name: task.sprint.name,
              startDate: task.sprint.startDate,
              endDate: task.sprint.endDate,
              completedAt: task.sprint.completedAt,
              state: this.resolveSprintState(task.sprint)
            }
          : null,
        assignees: task.assignees.map((assignee) => ({
          id: assignee.id,
          userId: assignee.user.id,
          email: assignee.user.email,
          firstName: assignee.user.firstName,
          lastName: assignee.user.lastName,
          avatarUrl: assignee.user.avatarUrl
        })),
        labels: task.labels.map(({ id, label }) => ({
          id,
          labelId: label.id,
          name: label.name,
          color: label.color
        })),
        due,
        storyPoints: task.storyPoints,
        estimate: {
          estimateMins: task.estimateMins,
          actualMins: task.actualMins,
          remainingMins:
            task.estimateMins == null
              ? null
              : Math.max(task.estimateMins - (task.actualMins ?? 0), 0)
        },
        checklist: {
          checklistCount: task._count.checklists,
          total: checklistTotal,
          completed: checklistDone,
          percent: checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0
        },
        comments: {
          count: task._count.comments,
          latest: comments[0]
            ? {
                id: comments[0].id,
                body: this.previewText(comments[0].body),
                authorId: comments[0].authorId,
                author: comments[0].author,
                createdAt: comments[0].createdAt
              }
            : null
        },
        attachments: {
          count: task._count.attachments,
          previews: attachments.map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            kind: this.resolveAttachmentKind(attachment.fileName, attachment.mimeType),
            createdAt: attachment.createdAt
          }))
        },
        dependencies: {
          isBlocked,
          isBlocking,
          blockedByCount,
          blockingCount,
          blockers: dependenciesTo.map((dependency) => ({
            id: dependency.id,
            type: dependency.type,
            task: dependency.fromTask
          })),
          blocking: dependenciesFrom.map((dependency) => ({
            id: dependency.id,
            type: dependency.type,
            task: dependency.toTask
          }))
        },
        flags: {
          isBlocked,
          isBlocking,
          isOverdue: due.state === 'OVERDUE',
          isDueToday: due.state === 'TODAY',
          isHighPriority: ['HIGH', 'URGENT', 'CRITICAL'].includes(task.priority),
          hasAssignees: task.assignees.length > 0,
          hasLabels: task.labels.length > 0,
          hasComments: task._count.comments > 0,
          hasAttachments: task._count.attachments > 0,
          hasChecklist: checklistTotal > 0,
          hasSubtasks: task._count.subtasks > 0,
          isStale: updatedAgeDays >= 14 && !['DONE', 'CANCELLED'].includes(task.status)
        },
        freshness: {
          createdAgeDays: ageDays,
          updatedAgeDays,
          updatedAt: task.updatedAt
        }
      },
      metrics: {
        storyPoints: task.storyPoints ?? 0,
        estimateMins: task.estimateMins ?? 0,
        actualMins: task.actualMins ?? 0,
        remainingMins:
          task.estimateMins == null ? 0 : Math.max(task.estimateMins - (task.actualMins ?? 0), 0),
        commentCount: task._count.comments,
        attachmentCount: task._count.attachments,
        checklistTotal,
        checklistCompleted: checklistDone,
        blockedByCount,
        blockingCount,
        ageDays,
        updatedAgeDays
      },
      permissions: this.resolveTaskPermissions(user, projectActions)
    };
  }

  private resolveColumnMetrics(
    tasks: Array<ReturnType<AgileService['toBoardCardTask']>>,
    wipLimit?: number | null
  ) {
    const taskCount = tasks.length;
    const completedCount = tasks.filter((task) => task.status === TaskStatus.DONE).length;
    const storyPoints = tasks.reduce((total, task) => total + (task.storyPoints ?? 0), 0);
    const completedStoryPoints = tasks
      .filter((task) => task.status === TaskStatus.DONE)
      .reduce((total, task) => total + (task.storyPoints ?? 0), 0);

    return {
      taskCount,
      storyPoints,
      completedStoryPoints,
      estimateMins: tasks.reduce((total, task) => total + (task.estimateMins ?? 0), 0),
      actualMins: tasks.reduce((total, task) => total + (task.actualMins ?? 0), 0),
      blockedCount: tasks.filter((task) => task.card.flags.isBlocked).length,
      overdueCount: tasks.filter((task) => task.card.flags.isOverdue).length,
      dueTodayCount: tasks.filter((task) => task.card.flags.isDueToday).length,
      highPriorityCount: tasks.filter((task) => task.card.flags.isHighPriority).length,
      unassignedCount: tasks.filter((task) => task.assignees.length === 0).length,
      completionRate: taskCount ? Math.round((completedCount / taskCount) * 100) : 0,
      isOverWipLimit: Boolean(wipLimit && taskCount > wipLimit)
    };
  }

  private resolveBoardSummary(tasks: Array<ReturnType<AgileService['toBoardCardTask']>>) {
    const taskCount = tasks.length;
    const completedCount = tasks.filter((task) => task.status === TaskStatus.DONE).length;

    return {
      taskCount,
      completedCount,
      openCount: tasks.filter(
        (task) => task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED
      ).length,
      cancelledCount: tasks.filter((task) => task.status === TaskStatus.CANCELLED).length,
      storyPoints: tasks.reduce((total, task) => total + (task.storyPoints ?? 0), 0),
      completedStoryPoints: tasks
        .filter((task) => task.status === TaskStatus.DONE)
        .reduce((total, task) => total + (task.storyPoints ?? 0), 0),
      estimateMins: tasks.reduce((total, task) => total + (task.estimateMins ?? 0), 0),
      actualMins: tasks.reduce((total, task) => total + (task.actualMins ?? 0), 0),
      blockedCount: tasks.filter((task) => task.card.flags.isBlocked).length,
      blockingCount: tasks.filter((task) => task.card.flags.isBlocking).length,
      overdueCount: tasks.filter((task) => task.card.flags.isOverdue).length,
      dueTodayCount: tasks.filter((task) => task.card.flags.isDueToday).length,
      highPriorityCount: tasks.filter((task) => task.card.flags.isHighPriority).length,
      unassignedCount: tasks.filter((task) => task.assignees.length === 0).length,
      completionRate: taskCount ? Math.round((completedCount / taskCount) * 100) : 0,
      generatedAt: new Date()
    };
  }

  private resolveBoardPermissions(user: AuthenticatedUser, projectActions?: ProjectPolicyActions) {
    if (projectActions) {
      return {
        canView: projectActions.viewBoard || projectActions.viewProject,
        canCreateTask: projectActions.createTasks,
        canMoveTasks: projectActions.moveTasks,
        canManageColumns: projectActions.manageBoardColumns,
        canEditBoard: projectActions.manageBoardColumns,
        canManageSprints: projectActions.manageSprints,
        canViewReports: projectActions.viewBoard || projectActions.viewProject
      };
    }

    const canManageTasks = this.hasPermission(user, 'manage:tasks');

    return {
      canView: this.hasPermission(user, 'read:tasks') || canManageTasks,
      canCreateTask: canManageTasks,
      canMoveTasks: canManageTasks,
      canManageColumns: canManageTasks,
      canEditBoard: canManageTasks,
      canManageSprints: canManageTasks,
      canViewReports: this.hasPermission(user, 'read:reports') || this.hasPermission(user, 'manage:reports')
    };
  }

  private resolveTaskPermissions(user: AuthenticatedUser, projectActions?: ProjectPolicyActions) {
    if (projectActions) {
      return {
        canView: projectActions.viewBoard || projectActions.viewProject,
        canEdit: projectActions.editTasks,
        canMove: projectActions.moveTasks,
        canArchive: projectActions.deleteTasks,
        canDelete: projectActions.deleteTasks,
        canAssign: projectActions.editTasks,
        canComment: projectActions.commentTasks,
        canAttach: projectActions.manageFiles
      };
    }

    const canManageTasks = this.hasPermission(user, 'manage:tasks');

    return {
      canView: this.hasPermission(user, 'read:tasks') || canManageTasks,
      canEdit: canManageTasks,
      canMove: canManageTasks,
      canArchive: canManageTasks,
      canDelete: canManageTasks,
      canAssign: canManageTasks,
      canComment: canManageTasks || this.hasPermission(user, 'comment:tasks'),
      canAttach: canManageTasks
    };
  }

  private hasPermission(user: AuthenticatedUser, permission: string) {
    return user.permissions.includes('manage:all') || user.permissions.includes(permission);
  }

  private resolveDueState(dueDate: Date | null, completedAt: Date | null) {
    if (completedAt) {
      return {
        state: 'DONE' as DueState,
        date: dueDate,
        daysUntil: null
      };
    }

    if (!dueDate) {
      return {
        state: 'NONE' as DueState,
        date: null,
        daysUntil: null
      };
    }

    const today = this.startOfDay(new Date());
    const due = this.startOfDay(dueDate);
    const daysUntil = Math.round((due.getTime() - today.getTime()) / 86_400_000);

    return {
      state: daysUntil < 0 ? 'OVERDUE' as DueState : daysUntil === 0 ? 'TODAY' as DueState : 'UPCOMING' as DueState,
      date: dueDate,
      daysUntil
    };
  }

  private resolveSprintState(sprint: { startDate: Date | null; endDate: Date | null; completedAt: Date | null }) {
    if (sprint.completedAt) return 'COMPLETED';
    const now = new Date();
    if (sprint.startDate && sprint.startDate > now) return 'PLANNED';
    if (sprint.endDate && sprint.endDate < now) return 'ENDED';
    if (sprint.startDate || sprint.endDate) return 'ACTIVE';
    return 'UNSCHEDULED';
  }

  private resolveAttachmentKind(fileName: string, mimeType?: string | null) {
    const lowerName = fileName.toLowerCase();
    const lowerMime = (mimeType ?? '').toLowerCase();

    if (lowerMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|svg)$/.test(lowerName)) return 'IMAGE';
    if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) return 'PDF';
    if (lowerMime.includes('spreadsheet') || /\.(csv|xls|xlsx)$/.test(lowerName)) return 'SHEET';
    if (lowerMime.includes('presentation') || /\.(ppt|pptx)$/.test(lowerName)) return 'SLIDE';
    if (lowerMime.includes('word') || /\.(doc|docx)$/.test(lowerName)) return 'DOC';
    if (lowerMime.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/.test(lowerName)) return 'VIDEO';
    if (lowerMime.startsWith('audio/') || /\.(mp3|wav|m4a)$/.test(lowerName)) return 'AUDIO';
    return 'FILE';
  }

  private previewText(value: string, maxLength = 140) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
  }

  private daysSince(date: Date) {
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private taskBelongsToColumn(
    task: { boardColumnId: string | null; status: TaskStatus },
    column: { id: string; status: TaskStatus | null },
    columns: Array<{ id: string; status: TaskStatus | null }>
  ) {
    if (task.boardColumnId) {
      return task.boardColumnId === column.id;
    }

    const statusColumn = columns.find((item) => item.status === task.status);
    return statusColumn?.id === column.id;
  }

  private countTasksForColumn(
    tenantId: string,
    projectId: string,
    column: { id: string; status: TaskStatus | null }
  ) {
    return this.prisma.task.count({
      where: {
        tenantId,
        projectId,
        OR: [
          { boardColumnId: column.id },
          ...(column.status ? [{ boardColumnId: null, status: column.status }] : [])
        ]
      }
    });
  }

  private async assertWipLimitAllowsMove(
    tenantId: string,
    projectId: string,
    currentStatus: TaskStatus,
    nextStatus: TaskStatus
  ) {
    if (currentStatus === nextStatus) {
      return;
    }

    const board = await this.ensureDefaultBoard(tenantId, projectId);
    const column = board.columns.find((item) => item.status === nextStatus);

    if (!column?.wipLimit) {
      return;
    }

    const currentCount = await this.prisma.task.count({
      where: {
        tenantId,
        projectId,
        status: nextStatus
      }
    });

    if (currentCount >= column.wipLimit) {
      throw new BadRequestException(`WIP limit reached for ${column.name}`);
    }
  }

  private resolveCompletedAt(currentCompletedAt: Date | null, status: TaskStatus) {
    if (status === TaskStatus.DONE && !currentCompletedAt) {
      return new Date();
    }

    if (status !== TaskStatus.DONE) {
      return null;
    }

    return undefined;
  }

  private async getRetrospectiveOrThrow(sprintId: string, retrospectiveId: string) {
    const retrospective = await this.prisma.sprintRetrospective.findFirst({
      where: {
        id: retrospectiveId,
        sprintId
      },
      select: retrospectiveSelect
    });

    if (!retrospective) {
      throw new NotFoundException('Sprint retrospective not found');
    }

    return retrospective;
  }

  private daysBetween(start: Date, end: Date) {
    const days: Date[] = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    while (cursor <= last && days.length < 180) {
      days.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days.length ? days : [new Date()];
  }

  private async recordAudit(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: Record<string, unknown> | undefined,
    newValue: Record<string, unknown> | undefined,
    meta: RequestMeta
  ) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? this.toJsonValue(oldValue) : undefined,
      newValue: newValue ? this.toJsonValue(newValue) : undefined,
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

  private isUniqueConstraintError(error: unknown) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
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
