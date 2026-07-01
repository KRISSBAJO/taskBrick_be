import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus, TaskType, Visibility } from '@prisma/client';
import { ProjectAccessPolicyService } from '../access-policy/project-access-policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { QaService } from '../qa/qa.service';
import { AssignLabelDto } from './dto/assign-label.dto';
import { BulkTaskOperationDto } from './dto/bulk-task-operation.dto';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { CreateTaskAttachmentDto } from './dto/create-task-attachment.dto';
import { CreateTaskChecklistItemDto } from './dto/create-task-checklist-item.dto';
import { CreateTaskChecklistDto } from './dto/create-task-checklist.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import { CreateTaskSavedViewDto } from './dto/create-task-saved-view.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CustomFieldQueryDto } from './dto/custom-field-query.dto';
import { SetTaskCustomFieldValueDto } from './dto/set-task-custom-field-value.dto';
import { TaskSavedViewQueryDto } from './dto/task-saved-view-query.dto';
import { TASK_SORT_FIELDS, TaskQueryDto } from './dto/task-query.dto';
import { TaskUserDto } from './dto/task-user.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { UpdateTaskChecklistItemDto } from './dto/update-task-checklist-item.dto';
import { UpdateTaskChecklistDto } from './dto/update-task-checklist.dto';
import { UpdateTaskCommentDto } from './dto/update-task-comment.dto';
import { UpdateTaskSavedViewDto } from './dto/update-task-saved-view.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const userSummarySelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true
} satisfies Prisma.UserSelect;

const taskDependencyTaskSelect = {
  id: true,
  projectId: true,
  key: true,
  title: true,
  status: true,
  priority: true,
  project: {
    select: {
      id: true,
      key: true,
      name: true
    }
  }
} satisfies Prisma.TaskSelect;

const checklistSelect = {
  id: true,
  taskId: true,
  title: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      checklistId: true,
      text: true,
      isDone: true,
      sortOrder: true
    },
    orderBy: [{ sortOrder: 'asc' as const }]
  }
} satisfies Prisma.TaskChecklistSelect;

const taskSelect = {
  id: true,
  tenantId: true,
  projectId: true,
  sprintId: true,
  parentTaskId: true,
  reporterId: true,
  key: true,
  title: true,
  description: true,
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
  project: {
    select: {
      id: true,
      key: true,
      name: true,
      status: true,
      workspaceId: true,
      teamId: true,
      visibility: true
    }
  },
  boardColumn: {
    select: {
      id: true,
      name: true,
      status: true,
      sortOrder: true,
      isCollapsed: true,
      wipLimit: true
    }
  },
  sprint: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      completedAt: true
    }
  },
  parentTask: {
    select: {
      id: true,
      key: true,
      title: true,
      status: true
    }
  },
  reporter: {
    select: userSummarySelect
  },
  assignees: {
    select: {
      id: true,
      user: {
        select: userSummarySelect
      }
    }
  },
  watchers: {
    select: {
      id: true,
      userId: true
    }
  },
  labels: {
    select: {
      id: true,
      label: {
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true
        }
      }
    }
  },
  checklists: {
    select: checklistSelect,
    orderBy: [{ createdAt: 'asc' as const }]
  },
  _count: {
    select: {
      subtasks: true,
      comments: true,
      attachments: true,
      dependenciesFrom: true,
      dependenciesTo: true,
      activities: true,
      timeEntries: true,
      customValues: true
    }
  }
} satisfies Prisma.TaskSelect;

const commentSelect = {
  id: true,
  taskId: true,
  authorId: true,
  body: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: userSummarySelect
  },
  _count: {
    select: {
      replies: true
    }
  }
} satisfies Prisma.TaskCommentSelect;

const attachmentSelect = {
  id: true,
  taskId: true,
  fileName: true,
  fileUrl: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true
} satisfies Prisma.TaskAttachmentSelect;

const labelSelect = {
  id: true,
  tenantId: true,
  name: true,
  color: true,
  createdAt: true,
  _count: {
    select: {
      tasks: true
    }
  }
} satisfies Prisma.LabelSelect;

const customFieldSelect = {
  id: true,
  tenantId: true,
  workspaceId: true,
  projectId: true,
  entityType: true,
  name: true,
  type: true,
  required: true,
  config: true,
  sortOrder: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  options: {
    select: {
      id: true,
      customFieldId: true,
      label: true,
      value: true,
      sortOrder: true
    },
    orderBy: [{ sortOrder: 'asc' as const }]
  }
} satisfies Prisma.CustomFieldSelect;

const taskSavedViewSelect = {
  id: true,
  tenantId: true,
  ownerId: true,
  projectId: true,
  name: true,
  description: true,
  visibility: true,
  filters: true,
  columns: true,
  sortBy: true,
  sortDirection: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: userSummarySelect
  },
  project: {
    select: {
      id: true,
      key: true,
      name: true
    }
  }
} satisfies Prisma.TaskSavedViewSelect;

const dependencySelect = {
  id: true,
  fromTaskId: true,
  toTaskId: true,
  type: true,
  fromTask: {
    select: taskDependencyTaskSelect
  },
  toTask: {
    select: taskDependencyTaskSelect
  }
} satisfies Prisma.TaskDependencySelect;

const activitySelect = {
  id: true,
  taskId: true,
  actorId: true,
  action: true,
  oldValue: true,
  newValue: true,
  createdAt: true
} satisfies Prisma.TaskActivitySelect;

const customFieldValueSelect = {
  id: true,
  customFieldId: true,
  taskId: true,
  value: true,
  customField: {
    select: {
      id: true,
      entityType: true,
      name: true,
      type: true,
      required: true,
      config: true
    }
  }
} satisfies Prisma.CustomFieldValueSelect;

type TaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;
type CustomFieldRecord = Prisma.CustomFieldGetPayload<{ select: typeof customFieldSelect }>;
type TaskSavedViewRecord = Prisma.TaskSavedViewGetPayload<{ select: typeof taskSavedViewSelect }>;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectAccessPolicy: ProjectAccessPolicyService,
    private readonly qaService: QaService
  ) {}

  taxonomy() {
    return {
      taskTypes: Object.values(TaskType).map((value) => ({
        value,
        label: this.titleCase(value),
        category: this.taskTypeCategory(value),
        workflow: this.taskTypeWorkflow(value)
      })),
      statuses: Object.values(TaskStatus),
      priorities: Object.values(TaskPriority),
      dependencyTypes: [
        { value: 'BLOCKS', label: 'Blocks', inverseLabel: 'Blocked by' },
        { value: 'RELATES_TO', label: 'Relates to', inverseLabel: 'Related task' },
        { value: 'DUPLICATES', label: 'Duplicates', inverseLabel: 'Duplicated by' },
        { value: 'DEPENDS_ON', label: 'Depends on', inverseLabel: 'Required by' },
        { value: 'CAUSES', label: 'Causes', inverseLabel: 'Caused by' }
      ],
      sortFields: TASK_SORT_FIELDS,
      customFieldEntityTypes: ['TASK', 'PROJECT', 'SPRINT']
    };
  }

  async list(user: AuthenticatedUser, query: TaskQueryDto) {
    const filters: Prisma.TaskWhereInput[] = [
      this.taskAccessWhere(user),
      { projectId: query.projectId },
      { sprintId: query.sprintId },
      { parentTaskId: query.parentTaskId },
      { boardColumnId: query.boardColumnId },
      { reporterId: query.reporterId },
      { archivedAt: query.includeArchived ? undefined : null },
      { deletedAt: query.includeDeleted ? undefined : null },
      this.enumSetFilter('status', query.status, query.statuses, TaskStatus),
      this.enumSetFilter('priority', query.priority, query.priorities, TaskPriority),
      this.enumSetFilter('type', query.type, query.types, TaskType),
      { dueDate: this.dateRange(query.dueFrom, query.dueTo) },
      { startDate: this.dateRange(query.startFrom, query.startTo) },
      { createdAt: this.requiredDateRange(query.createdFrom, query.createdTo) },
      { updatedAt: this.requiredDateRange(query.updatedFrom, query.updatedTo) },
      { completedAt: this.dateRange(query.completedFrom, query.completedTo) },
      { storyPoints: this.numberRange(query.storyPointsMin, query.storyPointsMax) },
      { estimateMins: this.numberRange(query.estimateMinsMin, query.estimateMinsMax) },
      { actualMins: this.numberRange(query.actualMinsMin, query.actualMinsMax) }
    ];

    if (query.assigneeId) filters.push({ assignees: { some: { userId: query.assigneeId } } });
    if (query.watcherId) filters.push({ watchers: { some: { userId: query.watcherId } } });
    if (query.labelId) filters.push({ labels: { some: { labelId: query.labelId } } });
    if (query.hasAttachments !== undefined) {
      filters.push({ attachments: query.hasAttachments ? { some: {} } : { none: {} } });
    }
    if (query.hasSubtasks !== undefined) {
      filters.push({ subtasks: query.hasSubtasks ? { some: {} } : { none: {} } });
    }
    if (query.hasDependencies !== undefined) {
      filters.push(
        query.hasDependencies
          ? { OR: [{ dependenciesFrom: { some: {} } }, { dependenciesTo: { some: {} } }] }
          : { AND: [{ dependenciesFrom: { none: {} } }, { dependenciesTo: { none: {} } }] }
      );
    }
    if (query.isBlocked) filters.push({ dependenciesTo: { some: {} } });
    if (query.isBlocking) filters.push({ dependenciesFrom: { some: {} } });
    if (query.unassigned) filters.push({ assignees: { none: {} } });
    if (query.isOverdue) {
      filters.push({
        dueDate: { lt: new Date() },
        status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] }
      });
    }
    if (query.search) {
      filters.push({
        OR: [
          { key: { contains: query.search, mode: 'insensitive' } },
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } }
        ]
      });
    }

    const where: Prisma.TaskWhereInput = {
      AND: filters.filter((filter) => Object.keys(filter).length > 0)
    };
    const orderBy = this.taskOrderBy(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        select: taskSelect,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.task.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async get(user: AuthenticatedUser, taskId: string) {
    return this.getAccessibleTaskOrThrow(user, taskId);
  }

  async create(user: AuthenticatedUser, dto: CreateTaskDto, meta: RequestMeta) {
    const project = await this.getTenantProjectSummaryOrThrow(user.tenantId, dto.projectId);
    await this.projectAccessPolicy.assertProjectAction(user, dto.projectId, 'createTasks');
    const reporterId = dto.reporterId ?? user.id;

    await this.assertUserBelongsToTenant(user.tenantId, reporterId);

    if (dto.sprintId) {
      await this.assertSprintBelongsToProject(dto.projectId, dto.sprintId);
    }

    if (dto.parentTaskId) {
      await this.assertTaskBelongsToProject(user.tenantId, dto.parentTaskId, dto.projectId);
    }

    const task = await this.createTaskWithUniqueKey(project, dto.key, {
      tenantId: user.tenantId,
      projectId: dto.projectId,
      sprintId: dto.sprintId,
      parentTaskId: dto.parentTaskId,
      reporterId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: dto.status,
      priority: dto.priority,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      completedAt: this.resolveCreateCompletedAt(dto.status, dto.completedAt),
      storyPoints: dto.storyPoints,
      estimateMins: dto.estimateMins,
      actualMins: dto.actualMins,
      sortOrder: dto.sortOrder
    });

    await this.recordTaskActivity(task.id, user, 'task.create', undefined, {
      key: task.key,
      title: task.title,
      status: task.status
    });

    await this.recordAudit(user, 'task.create', 'Task', task.id, undefined, {
      key: task.key,
      title: task.title,
      projectId: task.projectId
    }, meta);

    return task;
  }

  async update(user: AuthenticatedUser, taskId: string, dto: UpdateTaskDto, meta: RequestMeta) {
    const before = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, before.projectId, 'editTasks');
    const nextProjectId = dto.projectId ?? before.projectId;
    const projectChanged = nextProjectId !== before.projectId;
    const nextKey = dto.key ? this.normalizeKey(dto.key) : before.key;

    if (dto.projectId) {
      await this.getTenantProjectSummaryOrThrow(user.tenantId, dto.projectId);
    }

    if (projectChanged) {
      await this.projectAccessPolicy.assertProjectAction(user, nextProjectId, 'createTasks');
    }

    if (projectChanged || nextKey !== before.key) {
      await this.assertTaskKeyAvailable(nextProjectId, nextKey, taskId);
    }

    if (dto.reporterId) {
      await this.assertUserBelongsToTenant(user.tenantId, dto.reporterId);
    }

    const nextSprintId =
      dto.sprintId === undefined ? (projectChanged ? null : before.sprintId) : dto.sprintId;
    const nextParentTaskId =
      dto.parentTaskId === undefined
        ? projectChanged
          ? null
          : before.parentTaskId
        : dto.parentTaskId;

    if (nextSprintId) {
      await this.assertSprintBelongsToProject(nextProjectId, nextSprintId);
    }

    if (nextParentTaskId) {
      if (nextParentTaskId === taskId) {
        throw new BadRequestException('A task cannot be its own parent');
      }
      await this.assertTaskBelongsToProject(user.tenantId, nextParentTaskId, nextProjectId);
      await this.assertParentDoesNotCreateCycle(user.tenantId, taskId, nextParentTaskId);
    }

    const completedAt = this.resolveUpdateCompletedAt(
      before.completedAt,
      dto.status,
      dto.completedAt
    );
    const nextBoardColumnId =
      dto.status !== undefined
        ? await this.resolveDefaultBoardColumnId(user.tenantId, nextProjectId, dto.status)
        : projectChanged
          ? null
          : undefined;

    if (dto.status === TaskStatus.DONE && before.status !== TaskStatus.DONE) {
      await this.qaService.assertTaskDoneGate(user, taskId, nextProjectId);
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        projectId: dto.projectId,
        sprintId: dto.sprintId === undefined ? (projectChanged ? null : undefined) : dto.sprintId,
        parentTaskId:
          dto.parentTaskId === undefined ? (projectChanged ? null : undefined) : dto.parentTaskId,
        reporterId: dto.reporterId,
        key: dto.key ? nextKey : undefined,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        boardColumnId: nextBoardColumnId,
        priority: dto.priority,
        startDate:
          dto.startDate === undefined ? undefined : dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
        completedAt,
        storyPoints: dto.storyPoints,
        estimateMins: dto.estimateMins,
        actualMins: dto.actualMins,
        sortOrder: dto.sortOrder
      },
      select: taskSelect
    });

    const oldValue = {
      key: before.key,
      title: before.title,
      status: before.status,
      priority: before.priority,
      projectId: before.projectId
    };
    const newValue = {
      key: updated.key,
      title: updated.title,
      status: updated.status,
      priority: updated.priority,
      projectId: updated.projectId
    };

    await this.recordTaskActivity(taskId, user, 'task.update', oldValue, newValue);
    await this.recordAudit(user, 'task.update', 'Task', taskId, oldValue, newValue, meta);

    return updated;
  }

  async delete(user: AuthenticatedUser, taskId: string, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'deleteTasks');

    if (task._count.subtasks > 0) {
      throw new BadRequestException('Task must not have subtasks before deletion');
    }

    const deletedAt = new Date();
    const deleted = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        archivedAt: deletedAt,
        deletedAt
      },
      select: taskSelect
    });

    await this.recordTaskActivity(taskId, user, 'task.delete', {
      key: task.key,
      title: task.title,
      archivedAt: task.archivedAt,
      deletedAt: task.deletedAt
    }, {
      key: deleted.key,
      title: deleted.title,
      archivedAt: deleted.archivedAt,
      deletedAt: deleted.deletedAt
    });

    await this.recordAudit(user, 'task.delete', 'Task', taskId, {
      key: task.key,
      title: task.title,
      archivedAt: task.archivedAt,
      deletedAt: task.deletedAt
    }, {
      key: deleted.key,
      title: deleted.title,
      archivedAt: deleted.archivedAt,
      deletedAt: deleted.deletedAt
    }, meta);

    return deleted;
  }

  async archive(user: AuthenticatedUser, taskId: string, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'deleteTasks');

    const archivedAt = new Date();
    const archived = await this.prisma.task.update({
      where: { id: taskId },
      data: { archivedAt },
      select: taskSelect
    });

    await this.recordTaskActivity(taskId, user, 'task.archive', {
      archivedAt: task.archivedAt
    }, {
      archivedAt
    });
    await this.recordAudit(user, 'task.archive', 'Task', taskId, {
      archivedAt: task.archivedAt
    }, {
      archivedAt
    }, meta);

    return archived;
  }

  async restore(user: AuthenticatedUser, taskId: string, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');

    const restored = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        archivedAt: null,
        deletedAt: null
      },
      select: taskSelect
    });

    await this.recordTaskActivity(taskId, user, 'task.restore', {
      archivedAt: task.archivedAt,
      deletedAt: task.deletedAt
    }, {
      archivedAt: null,
      deletedAt: null
    });
    await this.recordAudit(user, 'task.restore', 'Task', taskId, {
      archivedAt: task.archivedAt,
      deletedAt: task.deletedAt
    }, {
      archivedAt: null,
      deletedAt: null
    }, meta);

    return restored;
  }

  async bulkOperation(user: AuthenticatedUser, dto: BulkTaskOperationDto, meta: RequestMeta) {
    const taskIds = [...new Set(dto.taskIds)];
    const tasks = await this.prisma.task.findMany({
      where: {
        AND: [
          this.taskAccessWhere(user),
          {
            id: {
              in: taskIds
            }
          }
        ]
      },
      select: taskSelect
    });

    if (tasks.length !== taskIds.length) {
      throw new NotFoundException('One or more tasks were not found or are not accessible');
    }

    const projectIds = [...new Set(tasks.map((task) => task.projectId))];
    const action = dto.operation === 'DELETE' || dto.operation === 'ARCHIVE' ? 'deleteTasks' : 'editTasks';
    for (const projectId of projectIds) {
      await this.projectAccessPolicy.assertProjectAction(user, projectId, action);
    }

    if (dto.operation === 'DELETE' && tasks.some((task) => task._count.subtasks > 0)) {
      throw new BadRequestException('Bulk delete requires selected tasks to have no subtasks');
    }

    if (dto.operation === 'UPDATE') {
      return this.bulkUpdateTasks(user, tasks, dto, meta);
    }

    const timestamp = new Date();
    const data =
      dto.operation === 'RESTORE'
        ? { archivedAt: null, deletedAt: null }
        : dto.operation === 'ARCHIVE'
          ? { archivedAt: timestamp }
          : { archivedAt: timestamp, deletedAt: timestamp };
    const activity = `task.bulk_${dto.operation.toLowerCase()}`;

    await this.prisma.task.updateMany({
      where: {
        id: {
          in: taskIds
        },
        tenantId: user.tenantId
      },
      data
    });

    await Promise.all(
      tasks.map((task) =>
        this.recordTaskActivity(task.id, user, activity, {
          archivedAt: task.archivedAt,
          deletedAt: task.deletedAt
        }, data)
      )
    );
    await this.recordAudit(user, activity, 'Task', taskIds.join(','), {
      taskIds,
      count: tasks.length
    }, {
      operation: dto.operation,
      ...data
    }, meta);

    return {
      success: true,
      operation: dto.operation,
      count: tasks.length
    };
  }

  async listCustomFields(user: AuthenticatedUser, query: CustomFieldQueryDto) {
    const entityType = this.normalizeEntityType(query.entityType);

    if (query.projectId) {
      await this.projectAccessPolicy.assertProjectAction(user, query.projectId, 'viewProject');
    }

    if (query.workspaceId) {
      await this.assertWorkspaceBelongsToTenant(user.tenantId, query.workspaceId);
    }

    const where: Prisma.CustomFieldWhereInput = {
      tenantId: user.tenantId,
      entityType,
      workspaceId: query.workspaceId,
      projectId: query.projectId,
      archivedAt: query.includeArchived ? undefined : null
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customField.findMany({
        where,
        select: customFieldSelect,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.customField.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createCustomField(
    user: AuthenticatedUser,
    dto: CreateCustomFieldDto,
    meta: RequestMeta
  ) {
    await this.assertCanManageCustomFieldScope(user, dto.workspaceId, dto.projectId);
    const entityType = this.normalizeEntityType(dto.entityType);
    await this.assertCustomFieldNameAvailable(
      user.tenantId,
      entityType,
      dto.name.trim(),
      dto.workspaceId,
      dto.projectId
    );

    const customField = await this.prisma.customField.create({
      data: {
        tenantId: user.tenantId,
        workspaceId: dto.workspaceId,
        projectId: dto.projectId,
        entityType,
        name: dto.name.trim(),
        type: dto.type,
        required: dto.required ?? false,
        config: dto.config ? this.toJsonValue(dto.config) : undefined,
        sortOrder: dto.sortOrder ?? 0,
        options: dto.options?.length
          ? {
              create: dto.options.map((option, index) => ({
                label: option.label.trim(),
                value: option.value.trim(),
                sortOrder: option.sortOrder ?? index
              }))
            }
          : undefined
      },
      select: customFieldSelect
    });

    await this.recordAudit(user, 'task.custom_field_create', 'CustomField', customField.id, undefined, {
      id: customField.id,
      entityType: customField.entityType,
      name: customField.name,
      workspaceId: customField.workspaceId,
      projectId: customField.projectId
    }, meta);

    return customField;
  }

  async updateCustomField(
    user: AuthenticatedUser,
    customFieldId: string,
    dto: UpdateCustomFieldDto,
    meta: RequestMeta
  ) {
    const before = await this.getCustomFieldOrThrow(user.tenantId, customFieldId);
    const nextWorkspaceId = dto.workspaceId === undefined ? before.workspaceId : dto.workspaceId;
    const nextProjectId = dto.projectId === undefined ? before.projectId : dto.projectId;

    await this.assertCanManageCustomFieldScope(user, nextWorkspaceId ?? undefined, nextProjectId ?? undefined);

    const nextName = dto.name?.trim() ?? before.name;
    if (
      nextName !== before.name ||
      nextWorkspaceId !== before.workspaceId ||
      nextProjectId !== before.projectId
    ) {
      await this.assertCustomFieldNameAvailable(
        user.tenantId,
        before.entityType,
        nextName,
        nextWorkspaceId ?? undefined,
        nextProjectId ?? undefined,
        customFieldId
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.options) {
        await tx.customFieldOption.deleteMany({ where: { customFieldId } });
      }

      await tx.customField.update({
        where: { id: customFieldId },
        data: {
          workspaceId: dto.workspaceId === undefined ? undefined : dto.workspaceId,
          projectId: dto.projectId === undefined ? undefined : dto.projectId,
          name: dto.name === undefined ? undefined : nextName,
          type: dto.type,
          required: dto.required,
          config: dto.config === undefined ? undefined : this.toJsonValue(dto.config),
          sortOrder: dto.sortOrder,
          options: dto.options?.length
            ? {
                create: dto.options.map((option, index) => ({
                  label: option.label.trim(),
                  value: option.value.trim(),
                  sortOrder: option.sortOrder ?? index
                }))
              }
            : undefined
        }
      });

      return tx.customField.findUniqueOrThrow({
        where: { id: customFieldId },
        select: customFieldSelect
      });
    });

    await this.recordAudit(user, 'task.custom_field_update', 'CustomField', customFieldId, {
      name: before.name,
      workspaceId: before.workspaceId,
      projectId: before.projectId,
      archivedAt: before.archivedAt
    }, {
      name: updated.name,
      workspaceId: updated.workspaceId,
      projectId: updated.projectId,
      archivedAt: updated.archivedAt
    }, meta);

    return updated;
  }

  async archiveCustomField(user: AuthenticatedUser, customFieldId: string, meta: RequestMeta) {
    const before = await this.getCustomFieldOrThrow(user.tenantId, customFieldId);
    await this.assertCanManageCustomFieldScope(
      user,
      before.workspaceId ?? undefined,
      before.projectId ?? undefined
    );

    const archivedAt = new Date();
    const archived = await this.prisma.customField.update({
      where: { id: customFieldId },
      data: { archivedAt },
      select: customFieldSelect
    });

    await this.recordAudit(user, 'task.custom_field_archive', 'CustomField', customFieldId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt
    }, meta);

    return archived;
  }

  async restoreCustomField(user: AuthenticatedUser, customFieldId: string, meta: RequestMeta) {
    const before = await this.getCustomFieldOrThrow(user.tenantId, customFieldId);
    await this.assertCanManageCustomFieldScope(
      user,
      before.workspaceId ?? undefined,
      before.projectId ?? undefined
    );

    const restored = await this.prisma.customField.update({
      where: { id: customFieldId },
      data: { archivedAt: null },
      select: customFieldSelect
    });

    await this.recordAudit(user, 'task.custom_field_restore', 'CustomField', customFieldId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: null
    }, meta);

    return restored;
  }

  async deleteCustomField(user: AuthenticatedUser, customFieldId: string, meta: RequestMeta) {
    const customField = await this.getCustomFieldOrThrow(user.tenantId, customFieldId);
    await this.assertCanManageCustomFieldScope(
      user,
      customField.workspaceId ?? undefined,
      customField.projectId ?? undefined
    );

    const valueCount = await this.prisma.customFieldValue.count({ where: { customFieldId } });
    if (valueCount > 0) {
      return this.archiveCustomField(user, customFieldId, meta);
    }

    await this.prisma.customField.delete({ where: { id: customFieldId } });
    await this.recordAudit(user, 'task.custom_field_delete', 'CustomField', customFieldId, {
      name: customField.name,
      entityType: customField.entityType
    }, undefined, meta);

    return { success: true };
  }

  async listSavedViews(user: AuthenticatedUser, query: TaskSavedViewQueryDto) {
    if (query.projectId) {
      await this.projectAccessPolicy.assertProjectAction(user, query.projectId, 'viewProject');
    }

    const sharedVisibility = [Visibility.TEAM, Visibility.WORKSPACE, Visibility.ORGANIZATION, Visibility.PUBLIC];
    const where: Prisma.TaskSavedViewWhereInput = {
      tenantId: user.tenantId,
      projectId: query.projectId,
      visibility: query.visibility,
      OR: [
        { ownerId: user.id },
        { projectId: null, visibility: { in: sharedVisibility.filter((item) => item !== Visibility.TEAM) } },
        { project: this.projectAccessPolicy.projectAccessWhere(user), visibility: { in: sharedVisibility } }
      ]
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.taskSavedView.findMany({
        where,
        select: taskSavedViewSelect,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.taskSavedView.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createSavedView(
    user: AuthenticatedUser,
    dto: CreateTaskSavedViewDto,
    meta: RequestMeta
  ) {
    if (dto.projectId) {
      await this.projectAccessPolicy.assertProjectAction(user, dto.projectId, 'viewProject');
    }

    if ((dto.visibility ?? Visibility.PRIVATE) !== Visibility.PRIVATE) {
      await this.assertCanShareSavedView(user, dto.projectId);
    }

    const savedView = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.taskSavedView.updateMany({
          where: {
            tenantId: user.tenantId,
            ownerId: user.id,
            projectId: dto.projectId ?? null
          },
          data: { isDefault: false }
        });
      }

      return tx.taskSavedView.create({
        data: {
          tenantId: user.tenantId,
          ownerId: user.id,
          projectId: dto.projectId,
          name: dto.name.trim(),
          description: dto.description,
          visibility: dto.visibility ?? Visibility.PRIVATE,
          filters: this.toJsonValue(dto.filters),
          columns: dto.columns ? this.toJsonValue(dto.columns) : undefined,
          sortBy: dto.sortBy,
          sortDirection: dto.sortDirection,
          isDefault: dto.isDefault ?? false
        },
        select: taskSavedViewSelect
      });
    });

    await this.recordAudit(user, 'task.saved_view_create', 'TaskSavedView', savedView.id, undefined, {
      name: savedView.name,
      projectId: savedView.projectId,
      visibility: savedView.visibility
    }, meta);

    return savedView;
  }

  async updateSavedView(
    user: AuthenticatedUser,
    viewId: string,
    dto: UpdateTaskSavedViewDto,
    meta: RequestMeta
  ) {
    const before = await this.getSavedViewOrThrow(user.tenantId, viewId);
    await this.assertSavedViewMutable(user, before);

    const nextVisibility = dto.visibility ?? before.visibility;
    if (nextVisibility !== Visibility.PRIVATE) {
      await this.assertCanShareSavedView(user, before.projectId ?? undefined);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.taskSavedView.updateMany({
          where: {
            tenantId: user.tenantId,
            ownerId: before.ownerId,
            projectId: before.projectId
          },
          data: { isDefault: false }
        });
      }

      return tx.taskSavedView.update({
        where: { id: viewId },
        data: {
          name: dto.name === undefined ? undefined : dto.name.trim(),
          description: dto.description,
          visibility: dto.visibility,
          filters: dto.filters === undefined ? undefined : this.toJsonValue(dto.filters),
          columns: dto.columns === undefined ? undefined : this.toJsonValue(dto.columns),
          sortBy: dto.sortBy,
          sortDirection: dto.sortDirection,
          isDefault: dto.isDefault
        },
        select: taskSavedViewSelect
      });
    });

    await this.recordAudit(user, 'task.saved_view_update', 'TaskSavedView', viewId, {
      name: before.name,
      visibility: before.visibility,
      isDefault: before.isDefault
    }, {
      name: updated.name,
      visibility: updated.visibility,
      isDefault: updated.isDefault
    }, meta);

    return updated;
  }

  async deleteSavedView(user: AuthenticatedUser, viewId: string, meta: RequestMeta) {
    const savedView = await this.getSavedViewOrThrow(user.tenantId, viewId);
    await this.assertSavedViewMutable(user, savedView);

    await this.prisma.taskSavedView.delete({ where: { id: viewId } });
    await this.recordAudit(user, 'task.saved_view_delete', 'TaskSavedView', viewId, {
      name: savedView.name,
      visibility: savedView.visibility
    }, undefined, meta);

    return { success: true };
  }

  async listAssignees(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    return this.prisma.taskAssignee.findMany({
      where: { taskId, user: { tenantId: user.tenantId } },
      select: {
        id: true,
        user: {
          select: userSummarySelect
        }
      },
      orderBy: [{ user: { email: 'asc' } }]
    });
  }

  async addAssignee(user: AuthenticatedUser, taskId: string, dto: TaskUserDto, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    await this.assertUserBelongsToTenant(user.tenantId, dto.userId);

    const assignee = await this.prisma.taskAssignee.upsert({
      where: {
        taskId_userId: {
          taskId,
          userId: dto.userId
        }
      },
      update: {},
      create: {
        taskId,
        userId: dto.userId
      },
      select: {
        id: true,
        user: {
          select: userSummarySelect
        }
      }
    });

    await this.recordTaskActivity(taskId, user, 'task.assignee_add', undefined, {
      userId: dto.userId
    });
    await this.recordAudit(user, 'task.assignee_add', 'TaskAssignee', assignee.id, undefined, {
      taskId,
      userId: dto.userId
    }, meta);

    return assignee;
  }

  async removeAssignee(user: AuthenticatedUser, taskId: string, userId: string, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    await this.assertUserBelongsToTenant(user.tenantId, userId);

    await this.prisma.taskAssignee.deleteMany({ where: { taskId, userId } });
    await this.recordTaskActivity(taskId, user, 'task.assignee_remove', {
      userId
    });
    await this.recordAudit(user, 'task.assignee_remove', 'TaskAssignee', `${taskId}:${userId}`, {
      taskId,
      userId
    }, undefined, meta);

    return { success: true };
  }

  async listWatchers(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    const watchers = await this.prisma.taskWatcher.findMany({
      where: { taskId },
      select: {
        id: true,
        userId: true
      },
      orderBy: [{ id: 'asc' }]
    });
    const users = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        id: {
          in: watchers.map((watcher) => watcher.userId)
        }
      },
      select: userSummarySelect
    });
    const usersById = new Map(users.map((watcherUser) => [watcherUser.id, watcherUser]));

    return watchers.map((watcher) => ({
      ...watcher,
      user: usersById.get(watcher.userId) ?? null
    }));
  }

  async addWatcher(user: AuthenticatedUser, taskId: string, dto: TaskUserDto, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    await this.assertUserBelongsToTenant(user.tenantId, dto.userId);

    const watcher = await this.prisma.taskWatcher.upsert({
      where: {
        taskId_userId: {
          taskId,
          userId: dto.userId
        }
      },
      update: {},
      create: {
        taskId,
        userId: dto.userId
      },
      select: {
        id: true,
        userId: true
      }
    });

    await this.recordTaskActivity(taskId, user, 'task.watcher_add', undefined, {
      userId: dto.userId
    });
    await this.recordAudit(user, 'task.watcher_add', 'TaskWatcher', watcher.id, undefined, {
      taskId,
      userId: dto.userId
    }, meta);

    return watcher;
  }

  async removeWatcher(user: AuthenticatedUser, taskId: string, userId: string, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    await this.assertUserBelongsToTenant(user.tenantId, userId);

    await this.prisma.taskWatcher.deleteMany({ where: { taskId, userId } });
    await this.recordTaskActivity(taskId, user, 'task.watcher_remove', { userId });
    await this.recordAudit(user, 'task.watcher_remove', 'TaskWatcher', `${taskId}:${userId}`, {
      taskId,
      userId
    }, undefined, meta);

    return { success: true };
  }

  async listComments(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    return this.prisma.taskComment.findMany({
      where: { taskId },
      select: commentSelect,
      orderBy: [{ createdAt: 'asc' }]
    });
  }

  async createComment(
    user: AuthenticatedUser,
    taskId: string,
    dto: CreateTaskCommentDto,
    meta: RequestMeta
  ) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'commentTasks');

    if (dto.parentId) {
      await this.getCommentOrThrow(user.tenantId, taskId, dto.parentId);
    }

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        authorId: user.id,
        body: dto.body,
        parentId: dto.parentId
      },
      select: commentSelect
    });

    await this.recordTaskActivity(taskId, user, 'task.comment_create', undefined, {
      commentId: comment.id
    });
    await this.recordAudit(user, 'task.comment_create', 'TaskComment', comment.id, undefined, {
      taskId
    }, meta);

    return comment;
  }

  async updateComment(
    user: AuthenticatedUser,
    taskId: string,
    commentId: string,
    dto: UpdateTaskCommentDto,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'commentTasks');
    const before = await this.getCommentOrThrow(user.tenantId, taskId, commentId);
    this.assertCanModifyComment(user, before.authorId);

    const comment = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { body: dto.body },
      select: commentSelect
    });

    await this.recordTaskActivity(taskId, user, 'task.comment_update', {
      commentId,
      body: before.body
    }, {
      commentId,
      body: comment.body
    });
    await this.recordAudit(user, 'task.comment_update', 'TaskComment', commentId, {
      body: before.body
    }, {
      body: comment.body
    }, meta);

    return comment;
  }

  async deleteComment(user: AuthenticatedUser, taskId: string, commentId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'commentTasks');
    const comment = await this.getCommentOrThrow(user.tenantId, taskId, commentId);
    this.assertCanModifyComment(user, comment.authorId);

    if (comment._count.replies > 0) {
      throw new BadRequestException('Delete replies before deleting this comment');
    }

    await this.prisma.taskComment.delete({ where: { id: commentId } });
    await this.recordTaskActivity(taskId, user, 'task.comment_delete', { commentId });
    await this.recordAudit(user, 'task.comment_delete', 'TaskComment', commentId, {
      taskId,
      body: comment.body
    }, undefined, meta);

    return { success: true };
  }

  async listAttachments(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    return this.prisma.taskAttachment.findMany({
      where: { taskId },
      select: attachmentSelect,
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async createAttachment(
    user: AuthenticatedUser,
    taskId: string,
    dto: CreateTaskAttachmentDto,
    meta: RequestMeta
  ) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'manageFiles');

    const attachment = await this.prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes
      },
      select: attachmentSelect
    });

    await this.recordTaskActivity(taskId, user, 'task.attachment_create', undefined, {
      attachmentId: attachment.id,
      fileName: attachment.fileName
    });
    await this.recordAudit(user, 'task.attachment_create', 'TaskAttachment', attachment.id, undefined, {
      taskId,
      fileName: attachment.fileName
    }, meta);

    return attachment;
  }

  async deleteAttachment(
    user: AuthenticatedUser,
    taskId: string,
    attachmentId: string,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'manageFiles');
    const attachment = await this.getAttachmentOrThrow(user.tenantId, taskId, attachmentId);

    await this.prisma.taskAttachment.delete({ where: { id: attachmentId } });
    await this.recordTaskActivity(taskId, user, 'task.attachment_delete', {
      attachmentId,
      fileName: attachment.fileName
    });
    await this.recordAudit(user, 'task.attachment_delete', 'TaskAttachment', attachmentId, {
      taskId,
      fileName: attachment.fileName
    }, undefined, meta);

    return { success: true };
  }

  async listChecklists(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    return this.prisma.taskChecklist.findMany({
      where: { taskId },
      select: checklistSelect,
      orderBy: [{ createdAt: 'asc' }]
    });
  }

  async createChecklist(
    user: AuthenticatedUser,
    taskId: string,
    dto: CreateTaskChecklistDto,
    meta: RequestMeta
  ) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');

    const checklist = await this.prisma.taskChecklist.create({
      data: {
        taskId,
        title: dto.title
      },
      select: checklistSelect
    });

    await this.recordTaskActivity(taskId, user, 'task.checklist_create', undefined, {
      checklistId: checklist.id,
      title: checklist.title
    });
    await this.recordAudit(user, 'task.checklist_create', 'TaskChecklist', checklist.id, undefined, {
      taskId,
      title: checklist.title
    }, meta);

    return checklist;
  }

  async updateChecklist(
    user: AuthenticatedUser,
    taskId: string,
    checklistId: string,
    dto: UpdateTaskChecklistDto,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'editTasks');
    const before = await this.getChecklistOrThrow(user.tenantId, taskId, checklistId);

    const checklist = await this.prisma.taskChecklist.update({
      where: { id: checklistId },
      data: { title: dto.title },
      select: checklistSelect
    });

    await this.recordTaskActivity(taskId, user, 'task.checklist_update', {
      checklistId,
      title: before.title
    }, {
      checklistId,
      title: checklist.title
    });
    await this.recordAudit(user, 'task.checklist_update', 'TaskChecklist', checklistId, {
      title: before.title
    }, {
      title: checklist.title
    }, meta);

    return checklist;
  }

  async deleteChecklist(user: AuthenticatedUser, taskId: string, checklistId: string, meta: RequestMeta) {
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'editTasks');
    const checklist = await this.getChecklistOrThrow(user.tenantId, taskId, checklistId);

    await this.prisma.taskChecklist.delete({ where: { id: checklistId } });
    await this.recordTaskActivity(taskId, user, 'task.checklist_delete', {
      checklistId,
      title: checklist.title
    });
    await this.recordAudit(user, 'task.checklist_delete', 'TaskChecklist', checklistId, {
      taskId,
      title: checklist.title
    }, undefined, meta);

    return { success: true };
  }

  async createChecklistItem(
    user: AuthenticatedUser,
    taskId: string,
    checklistId: string,
    dto: CreateTaskChecklistItemDto,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'editTasks');
    await this.getChecklistOrThrow(user.tenantId, taskId, checklistId);

    const item = await this.prisma.taskChecklistItem.create({
      data: {
        checklistId,
        text: dto.text,
        sortOrder: dto.sortOrder
      }
    });

    await this.recordTaskActivity(taskId, user, 'task.checklist_item_create', undefined, {
      checklistId,
      itemId: item.id,
      text: item.text
    });
    await this.recordAudit(user, 'task.checklist_item_create', 'TaskChecklistItem', item.id, undefined, {
      checklistId,
      text: item.text
    }, meta);

    return item;
  }

  async updateChecklistItem(
    user: AuthenticatedUser,
    taskId: string,
    checklistId: string,
    itemId: string,
    dto: UpdateTaskChecklistItemDto,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'editTasks');
    const before = await this.getChecklistItemOrThrow(user.tenantId, taskId, checklistId, itemId);

    const item = await this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        text: dto.text,
        isDone: dto.isDone,
        sortOrder: dto.sortOrder
      }
    });

    await this.recordTaskActivity(taskId, user, 'task.checklist_item_update', {
      itemId,
      text: before.text,
      isDone: before.isDone
    }, {
      itemId,
      text: item.text,
      isDone: item.isDone
    });
    await this.recordAudit(user, 'task.checklist_item_update', 'TaskChecklistItem', itemId, {
      text: before.text,
      isDone: before.isDone
    }, {
      text: item.text,
      isDone: item.isDone
    }, meta);

    return item;
  }

  async deleteChecklistItem(
    user: AuthenticatedUser,
    taskId: string,
    checklistId: string,
    itemId: string,
    meta: RequestMeta
  ) {
    await this.projectAccessPolicy.assertTaskAction(user, taskId, 'editTasks');
    const item = await this.getChecklistItemOrThrow(user.tenantId, taskId, checklistId, itemId);

    await this.prisma.taskChecklistItem.delete({ where: { id: itemId } });
    await this.recordTaskActivity(taskId, user, 'task.checklist_item_delete', {
      itemId,
      text: item.text
    });
    await this.recordAudit(user, 'task.checklist_item_delete', 'TaskChecklistItem', itemId, {
      checklistId,
      text: item.text
    }, undefined, meta);

    return { success: true };
  }

  async listLabels(user: AuthenticatedUser) {
    return this.prisma.label.findMany({
      where: { tenantId: user.tenantId },
      select: labelSelect,
      orderBy: [{ name: 'asc' }]
    });
  }

  async createLabel(user: AuthenticatedUser, dto: CreateLabelDto, meta: RequestMeta) {
    const name = dto.name.trim();
    await this.assertLabelNameAvailable(user.tenantId, name);

    const label = await this.prisma.label.create({
      data: {
        tenantId: user.tenantId,
        name,
        color: dto.color
      },
      select: labelSelect
    });

    await this.recordAudit(user, 'task.label_create', 'Label', label.id, undefined, {
      name: label.name,
      color: label.color
    }, meta);

    return label;
  }

  async updateLabel(user: AuthenticatedUser, labelId: string, dto: UpdateLabelDto, meta: RequestMeta) {
    const before = await this.getLabelOrThrow(user.tenantId, labelId);
    const nextName = dto.name?.trim();

    if (nextName && nextName !== before.name) {
      await this.assertLabelNameAvailable(user.tenantId, nextName, labelId);
    }

    const label = await this.prisma.label.update({
      where: { id: labelId },
      data: {
        name: nextName,
        color: dto.color
      },
      select: labelSelect
    });

    await this.recordAudit(user, 'task.label_update', 'Label', labelId, {
      name: before.name,
      color: before.color
    }, {
      name: label.name,
      color: label.color
    }, meta);

    return label;
  }

  async deleteLabel(user: AuthenticatedUser, labelId: string, meta: RequestMeta) {
    const label = await this.getLabelOrThrow(user.tenantId, labelId);

    await this.prisma.label.delete({ where: { id: labelId } });
    await this.recordAudit(user, 'task.label_delete', 'Label', labelId, {
      name: label.name,
      color: label.color
    }, undefined, meta);

    return { success: true };
  }

  async listTaskLabels(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    return this.prisma.taskLabel.findMany({
      where: {
        taskId,
        label: {
          tenantId: user.tenantId
        }
      },
      select: {
        id: true,
        label: {
          select: labelSelect
        }
      },
      orderBy: [{ label: { name: 'asc' } }]
    });
  }

  async assignLabel(user: AuthenticatedUser, taskId: string, dto: AssignLabelDto, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    const label = await this.getLabelOrThrow(user.tenantId, dto.labelId);

    const taskLabel = await this.prisma.taskLabel.upsert({
      where: {
        taskId_labelId: {
          taskId,
          labelId: dto.labelId
        }
      },
      update: {},
      create: {
        taskId,
        labelId: dto.labelId
      },
      select: {
        id: true,
        label: {
          select: labelSelect
        }
      }
    });

    await this.recordTaskActivity(taskId, user, 'task.label_assign', undefined, {
      labelId: label.id,
      name: label.name
    });
    await this.recordAudit(user, 'task.label_assign', 'TaskLabel', taskLabel.id, undefined, {
      taskId,
      labelId: label.id
    }, meta);

    return taskLabel;
  }

  async removeTaskLabel(user: AuthenticatedUser, taskId: string, labelId: string, meta: RequestMeta) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    const label = await this.getLabelOrThrow(user.tenantId, labelId);

    await this.prisma.taskLabel.deleteMany({ where: { taskId, labelId } });
    await this.recordTaskActivity(taskId, user, 'task.label_remove', {
      labelId,
      name: label.name
    });
    await this.recordAudit(user, 'task.label_remove', 'TaskLabel', `${taskId}:${labelId}`, {
      taskId,
      labelId
    }, undefined, meta);

    return { success: true };
  }

  async listDependencies(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    const [blocking, blockedBy] = await this.prisma.$transaction([
      this.prisma.taskDependency.findMany({
        where: { fromTaskId: taskId },
        select: dependencySelect,
        orderBy: [{ id: 'asc' }]
      }),
      this.prisma.taskDependency.findMany({
        where: { toTaskId: taskId },
        select: dependencySelect,
        orderBy: [{ id: 'asc' }]
      })
    ]);

    return {
      blocking,
      blockedBy
    };
  }

  async createDependency(
    user: AuthenticatedUser,
    taskId: string,
    dto: CreateTaskDependencyDto,
    meta: RequestMeta
  ) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    const toTask = await this.getAccessibleTaskOrThrow(user, dto.toTaskId);
    await this.projectAccessPolicy.assertProjectAction(user, toTask.projectId, 'editTasks');

    if (taskId === dto.toTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const type = (dto.type ?? 'BLOCKS').trim().toUpperCase();

    try {
      const dependency = await this.prisma.taskDependency.create({
        data: {
          fromTaskId: taskId,
          toTaskId: dto.toTaskId,
          type
        },
        select: dependencySelect
      });

      await this.recordTaskActivity(taskId, user, 'task.dependency_create', undefined, {
        dependencyId: dependency.id,
        toTaskId: dto.toTaskId,
        type
      });
      await this.recordAudit(user, 'task.dependency_create', 'TaskDependency', dependency.id, undefined, {
        fromTaskId: taskId,
        toTaskId: dto.toTaskId,
        type
      }, meta);

      return dependency;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Task dependency already exists');
      }
      throw error;
    }
  }

  async deleteDependency(
    user: AuthenticatedUser,
    taskId: string,
    dependencyId: string,
    meta: RequestMeta
  ) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    const dependency = await this.prisma.taskDependency.findFirst({
      where: {
        id: dependencyId,
        fromTaskId: taskId
      },
      select: dependencySelect
    });

    if (!dependency) {
      throw new NotFoundException('Task dependency not found');
    }

    await this.prisma.taskDependency.delete({ where: { id: dependencyId } });
    await this.recordTaskActivity(taskId, user, 'task.dependency_delete', {
      dependencyId,
      toTaskId: dependency.toTaskId,
      type: dependency.type
    });
    await this.recordAudit(user, 'task.dependency_delete', 'TaskDependency', dependencyId, {
      fromTaskId: taskId,
      toTaskId: dependency.toTaskId,
      type: dependency.type
    }, undefined, meta);

    return { success: true };
  }

  async listActivities(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    return this.prisma.taskActivity.findMany({
      where: { taskId },
      select: activitySelect,
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async listCustomFieldValues(user: AuthenticatedUser, taskId: string) {
    await this.getAccessibleTaskOrThrow(user, taskId);

    return this.prisma.customFieldValue.findMany({
      where: {
        taskId,
        customField: {
          tenantId: user.tenantId
        }
      },
      select: customFieldValueSelect,
      orderBy: [{ customField: { name: 'asc' } }]
    });
  }

  async setCustomFieldValue(
    user: AuthenticatedUser,
    taskId: string,
    customFieldId: string,
    dto: SetTaskCustomFieldValueDto,
    meta: RequestMeta
  ) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');
    await this.getTaskCustomFieldOrThrow(user.tenantId, customFieldId);

    const value = this.toJsonValue(dto.value);
    const existing = await this.prisma.customFieldValue.findMany({
      where: {
        taskId,
        customFieldId
      },
      select: {
        id: true
      },
      orderBy: [{ id: 'asc' }]
    });

    if (existing.length > 1) {
      await this.prisma.customFieldValue.deleteMany({
        where: {
          id: {
            in: existing.slice(1).map((item) => item.id)
          }
        }
      });
    }

    const customValue = existing[0]
      ? await this.prisma.customFieldValue.update({
          where: { id: existing[0].id },
          data: { value },
          select: customFieldValueSelect
        })
      : await this.prisma.customFieldValue.create({
          data: {
            taskId,
            customFieldId,
            value
          },
          select: customFieldValueSelect
        });

    await this.recordTaskActivity(taskId, user, 'task.custom_field_set', undefined, {
      customFieldId
    });
    await this.recordAudit(user, 'task.custom_field_set', 'CustomFieldValue', customValue.id, undefined, {
      taskId,
      customFieldId
    }, meta);

    return customValue;
  }

  async deleteCustomFieldValue(
    user: AuthenticatedUser,
    taskId: string,
    customFieldId: string,
    meta: RequestMeta
  ) {
    const task = await this.getAccessibleTaskOrThrow(user, taskId);
    await this.projectAccessPolicy.assertProjectAction(user, task.projectId, 'editTasks');

    const customValue = await this.prisma.customFieldValue.findFirst({
      where: {
        taskId,
        customFieldId,
        customField: {
          tenantId: user.tenantId
        }
      },
      select: customFieldValueSelect
    });

    if (!customValue) {
      throw new NotFoundException('Custom field value not found');
    }

    await this.prisma.customFieldValue.delete({ where: { id: customValue.id } });
    await this.recordTaskActivity(taskId, user, 'task.custom_field_delete', {
      customFieldValueId: customValue.id,
      customFieldId: customValue.customFieldId
    });
    await this.recordAudit(user, 'task.custom_field_delete', 'CustomFieldValue', customValue.id, {
      taskId,
      customFieldId: customValue.customFieldId
    }, undefined, meta);

    return { success: true };
  }

  private async bulkUpdateTasks(
    user: AuthenticatedUser,
    tasks: TaskRecord[],
    dto: BulkTaskOperationDto,
    meta: RequestMeta
  ) {
    const taskIds = tasks.map((task) => task.id);
    const projectIds = [...new Set(tasks.map((task) => task.projectId))];

    if (dto.sprintId !== undefined || dto.boardColumnId !== undefined) {
      if (projectIds.length > 1) {
        throw new BadRequestException('Sprint and board column bulk updates must target one project');
      }

      const projectId = projectIds[0];
      if (dto.sprintId) {
        await this.assertSprintBelongsToProject(projectId, dto.sprintId);
      }
      if (dto.boardColumnId) {
        await this.assertBoardColumnBelongsToProject(projectId, dto.boardColumnId);
      }
    }

    if (dto.assigneeIds) {
      await Promise.all(
        dto.assigneeIds.map((userId) => this.assertUserBelongsToTenant(user.tenantId, userId))
      );
    }

    if (dto.labelIds) {
      await this.assertLabelsBelongToTenant(user.tenantId, dto.labelIds);
    }

    if (dto.status === TaskStatus.DONE) {
      await Promise.all(
        tasks
          .filter((task) => task.status !== TaskStatus.DONE)
          .map((task) => this.qaService.assertTaskDoneGate(user, task.id, task.projectId))
      );
    }

    const data: Prisma.TaskUncheckedUpdateManyInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.sprintId !== undefined) data.sprintId = dto.sprintId;
    if (dto.boardColumnId !== undefined) data.boardColumnId = dto.boardColumnId;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.storyPoints !== undefined) data.storyPoints = dto.storyPoints;
    if (dto.status === TaskStatus.DONE) data.completedAt = new Date();
    if (dto.status && dto.status !== TaskStatus.DONE) data.completedAt = null;

    const hasTaskFieldUpdates = Object.keys(data).length > 0;
    const hasRelationUpdates = dto.assigneeIds !== undefined || dto.labelIds !== undefined;
    if (!hasTaskFieldUpdates && !hasRelationUpdates) {
      throw new BadRequestException('Bulk update requires at least one field, assignee, or label change');
    }

    await this.prisma.$transaction(async (tx) => {
      if (hasTaskFieldUpdates) {
        await tx.task.updateMany({
          where: {
            tenantId: user.tenantId,
            id: {
              in: taskIds
            }
          },
          data
        });
      }

      if (dto.assigneeIds !== undefined) {
        await tx.taskAssignee.deleteMany({
          where: {
            taskId: {
              in: taskIds
            }
          }
        });
        if (dto.assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: taskIds.flatMap((taskId) =>
              dto.assigneeIds!.map((userId) => ({
                taskId,
                userId
              }))
            ),
            skipDuplicates: true
          });
        }
      }

      if (dto.labelIds !== undefined) {
        await tx.taskLabel.deleteMany({
          where: {
            taskId: {
              in: taskIds
            }
          }
        });
        if (dto.labelIds.length > 0) {
          await tx.taskLabel.createMany({
            data: taskIds.flatMap((taskId) =>
              dto.labelIds!.map((labelId) => ({
                taskId,
                labelId
              }))
            ),
            skipDuplicates: true
          });
        }
      }
    });

    await Promise.all(
      tasks.map((task) =>
        this.recordTaskActivity(task.id, user, 'task.bulk_update', {
          status: task.status,
          priority: task.priority,
          type: task.type,
          sprintId: task.sprintId,
          boardColumnId: task.boardColumn?.id,
          dueDate: task.dueDate,
          storyPoints: task.storyPoints
        }, {
          ...data,
          assigneeIds: dto.assigneeIds,
          labelIds: dto.labelIds
        })
      )
    );

    await this.recordAudit(user, 'task.bulk_update', 'Task', taskIds.join(','), {
      taskIds,
      count: taskIds.length
    }, {
      fields: data,
      assigneeIds: dto.assigneeIds,
      labelIds: dto.labelIds
    }, meta);

    return {
      success: true,
      operation: dto.operation,
      count: taskIds.length
    };
  }

  private async getAccessibleTaskOrThrow(user: AuthenticatedUser, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: this.taskAccessWhere(user, taskId),
      select: taskSelect
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private taskAccessWhere(user: AuthenticatedUser, taskId?: string): Prisma.TaskWhereInput {
    return this.projectAccessPolicy.taskAccessWhere(user, taskId);
  }

  private enumSetFilter<T extends Record<string, string>>(
    field: 'status' | 'priority' | 'type',
    single: T[keyof T] | undefined,
    csv: string | undefined,
    enumeration: T
  ): Prisma.TaskWhereInput {
    const values = [
      ...(single ? [single] : []),
      ...this.parseEnumList(csv, enumeration)
    ];
    const unique = [...new Set(values)];
    if (unique.length === 0) return {};
    return {
      [field]: unique.length === 1 ? unique[0] : { in: unique }
    } as Prisma.TaskWhereInput;
  }

  private parseEnumList<T extends Record<string, string>>(value: string | undefined, enumeration: T) {
    if (!value) return [];
    const valid = new Set(Object.values(enumeration));
    return value
      .split(',')
      .map((item) => item.trim().replace(/[\s-]+/g, '_').toUpperCase())
      .filter((item): item is T[keyof T] => valid.has(item as T[keyof T]));
  }

  private dateRange(from?: string, to?: string): Prisma.DateTimeNullableFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private requiredDateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }

  private numberRange(min?: number, max?: number): Prisma.IntNullableFilter | undefined {
    if (min === undefined && max === undefined) return undefined;
    return {
      gte: min,
      lte: max
    };
  }

  private taskOrderBy(query: TaskQueryDto): Prisma.TaskOrderByWithRelationInput[] {
    const direction = query.sortDirection ?? 'desc';
    const sortBy = query.sortBy ?? 'updatedAt';
    if (sortBy === 'sprintName') {
      return [
        { sprint: { name: direction } },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ];
    }

    return [
      { [sortBy]: direction } as Prisma.TaskOrderByWithRelationInput,
      { sortOrder: 'asc' },
      { createdAt: 'desc' }
    ];
  }

  private titleCase(value: string) {
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private taskTypeCategory(value: TaskType) {
    if (([TaskType.EPIC, TaskType.MILESTONE] as TaskType[]).includes(value)) return 'planning';
    if (([TaskType.BUG, TaskType.INCIDENT, TaskType.CHANGE_REQUEST] as TaskType[]).includes(value)) return 'operational';
    if (value === TaskType.APPROVAL) return 'governance';
    return 'delivery';
  }

  private taskTypeWorkflow(value: TaskType) {
    if (value === TaskType.EPIC) return ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    if (value === TaskType.MILESTONE) return ['BACKLOG', 'IN_PROGRESS', 'DONE'];
    if (value === TaskType.APPROVAL) return ['TODO', 'REVIEW', 'DONE', 'CANCELLED'];
    if (value === TaskType.INCIDENT || value === TaskType.BUG) {
      return ['BACKLOG', 'TODO', 'IN_PROGRESS', 'TESTING', 'DONE', 'CANCELLED'];
    }
    return Object.values(TaskStatus);
  }

  private normalizeEntityType(entityType?: string) {
    const normalized = (entityType ?? 'TASK').trim().replace(/[\s-]+/g, '_').toUpperCase();
    if (!['TASK', 'PROJECT', 'SPRINT'].includes(normalized)) {
      throw new BadRequestException('Unsupported custom field entity type');
    }
    return normalized;
  }

  private async assertCanManageCustomFieldScope(
    user: AuthenticatedUser,
    workspaceId?: string | null,
    projectId?: string | null
  ) {
    if (projectId) {
      await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editTasks');
      return;
    }

    if (workspaceId) {
      await this.assertWorkspaceBelongsToTenant(user.tenantId, workspaceId);
    }

    if (this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:tasks', 'manage:projects'])) {
      return;
    }

    throw new ForbiddenException('You do not have permission to manage task taxonomy');
  }

  private async assertCanShareSavedView(user: AuthenticatedUser, projectId?: string | null) {
    if (projectId) {
      await this.projectAccessPolicy.assertProjectAction(user, projectId, 'editTasks');
      return;
    }

    if (this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:tasks', 'manage:projects'])) {
      return;
    }

    throw new ForbiddenException('Only project editors or task managers can share saved views');
  }

  private async assertWorkspaceBelongsToTenant(tenantId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        tenantId
      },
      select: {
        id: true
      }
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
  }

  private async assertBoardColumnBelongsToProject(projectId: string, boardColumnId: string) {
    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: boardColumnId,
        board: {
          projectId
        }
      },
      select: {
        id: true
      }
    });

    if (!column) {
      throw new NotFoundException('Board column not found');
    }
  }

  private async assertLabelsBelongToTenant(tenantId: string, labelIds: string[]) {
    const uniqueLabelIds = [...new Set(labelIds)];
    const count = await this.prisma.label.count({
      where: {
        tenantId,
        id: {
          in: uniqueLabelIds
        }
      }
    });

    if (count !== uniqueLabelIds.length) {
      throw new NotFoundException('One or more labels were not found');
    }
  }

  private async assertCustomFieldNameAvailable(
    tenantId: string,
    entityType: string,
    name: string,
    workspaceId?: string | null,
    projectId?: string | null,
    excludeCustomFieldId?: string
  ) {
    const existing = await this.prisma.customField.findFirst({
      where: {
        tenantId,
        entityType,
        name,
        workspaceId: workspaceId ?? null,
        projectId: projectId ?? null,
        id: excludeCustomFieldId
          ? {
              not: excludeCustomFieldId
            }
          : undefined
      },
      select: {
        id: true
      }
    });

    if (existing) {
      throw new ConflictException('Custom field name already exists for this scope');
    }
  }

  private async getCustomFieldOrThrow(tenantId: string, customFieldId: string): Promise<CustomFieldRecord> {
    const customField = await this.prisma.customField.findFirst({
      where: {
        id: customFieldId,
        tenantId
      },
      select: customFieldSelect
    });

    if (!customField) {
      throw new NotFoundException('Custom field not found');
    }

    return customField;
  }

  private async getSavedViewOrThrow(tenantId: string, viewId: string): Promise<TaskSavedViewRecord> {
    const savedView = await this.prisma.taskSavedView.findFirst({
      where: {
        id: viewId,
        tenantId
      },
      select: taskSavedViewSelect
    });

    if (!savedView) {
      throw new NotFoundException('Saved task view not found');
    }

    return savedView;
  }

  private async assertSavedViewMutable(user: AuthenticatedUser, savedView: TaskSavedViewRecord) {
    if (savedView.ownerId === user.id) return;
    if (this.hasAny(user, ['manage:all', 'manage:tenant', 'manage:tasks'])) return;
    if (savedView.projectId) {
      await this.projectAccessPolicy.assertProjectAction(user, savedView.projectId, 'editTasks');
      return;
    }

    throw new ForbiddenException('You do not have permission to modify this saved view');
  }

  private async resolveDefaultBoardColumnId(tenantId: string, projectId: string, status: TaskStatus) {
    const board = await this.prisma.board.findFirst({
      where: {
        tenantId,
        projectId,
        isDefault: true
      },
      select: {
        columns: {
          where: { status },
          select: { id: true },
          take: 1
        }
      }
    });

    if (board?.columns[0]) {
      return board.columns[0].id;
    }

    const fallbackBoard = await this.prisma.board.findFirst({
      where: {
        tenantId,
        projectId
      },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        columns: {
          where: { status },
          select: { id: true },
          take: 1
        }
      }
    });

    return fallbackBoard?.columns[0]?.id ?? null;
  }

  private async getTenantTaskOrThrow(tenantId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId
      },
      select: taskSelect
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async getTenantProjectSummaryOrThrow(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId
      },
      select: {
        id: true,
        key: true,
        name: true
      }
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const member = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      },
      select: {
        id: true
      }
    });

    if (!member) {
      throw new NotFoundException('User not found');
    }
  }

  private async assertSprintBelongsToProject(projectId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findFirst({
      where: {
        id: sprintId,
        projectId
      },
      select: {
        id: true
      }
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
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

  private async assertParentDoesNotCreateCycle(
    tenantId: string,
    taskId: string,
    parentTaskId: string
  ) {
    let currentParentId: string | null = parentTaskId;
    let depth = 0;

    while (currentParentId && depth < 50) {
      if (currentParentId === taskId) {
        throw new BadRequestException('Parent task would create a cycle');
      }

      const parent = await this.prisma.task.findFirst({
        where: {
          id: currentParentId,
          tenantId
        },
        select: {
          parentTaskId: true
        }
      });

      currentParentId = parent?.parentTaskId ?? null;
      depth += 1;
    }

    if (depth >= 50) {
      throw new BadRequestException('Task hierarchy is too deep');
    }
  }

  private async createTaskWithUniqueKey(
    project: { id: string; key: string },
    requestedKey: string | undefined,
    data: Omit<Prisma.TaskUncheckedCreateInput, 'key'>
  ) {
    const explicitKey = requestedKey ? this.normalizeKey(requestedKey) : undefined;

    if (explicitKey) {
      await this.assertTaskKeyAvailable(project.id, explicitKey);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const key = explicitKey ?? (await this.generateTaskKey(project.id, project.key, attempt));

      try {
        return await this.prisma.task.create({
          data: {
            ...data,
            key
          },
          select: taskSelect
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error) || explicitKey) {
          throw error;
        }
      }
    }

    throw new ConflictException('Could not generate a unique task key');
  }

  private async generateTaskKey(projectId: string, projectKey: string, offset: number) {
    const taskCount = await this.prisma.task.count({
      where: {
        projectId
      }
    });

    return `${projectKey.toUpperCase()}-${taskCount + offset + 1}`;
  }

  private normalizeKey(key: string) {
    return key.trim().toUpperCase();
  }

  private async assertTaskKeyAvailable(projectId: string, key: string, excludeTaskId?: string) {
    const existing = await this.prisma.task.findFirst({
      where: {
        projectId,
        key,
        id: excludeTaskId
          ? {
              not: excludeTaskId
            }
          : undefined
      },
      select: {
        id: true
      }
    });

    if (existing) {
      throw new ConflictException('Task key already exists in this project');
    }
  }

  private resolveCreateCompletedAt(status: TaskStatus | undefined, completedAt: string | undefined) {
    if (completedAt) {
      return new Date(completedAt);
    }

    if (status === TaskStatus.DONE) {
      return new Date();
    }

    return undefined;
  }

  private resolveUpdateCompletedAt(
    currentCompletedAt: Date | null,
    status: TaskStatus | undefined,
    completedAt: string | null | undefined
  ) {
    if (completedAt !== undefined) {
      return completedAt ? new Date(completedAt) : null;
    }

    if (status === TaskStatus.DONE && !currentCompletedAt) {
      return new Date();
    }

    if (status && status !== TaskStatus.DONE) {
      return null;
    }

    return undefined;
  }

  private async getCommentOrThrow(tenantId: string, taskId: string, commentId: string) {
    const comment = await this.prisma.taskComment.findFirst({
      where: {
        id: commentId,
        taskId,
        task: {
          tenantId
        }
      },
      select: commentSelect
    });

    if (!comment) {
      throw new NotFoundException('Task comment not found');
    }

    return comment;
  }

  private assertCanModifyComment(user: AuthenticatedUser, authorId: string) {
    if (authorId === user.id || user.permissions.includes('manage:all') || user.permissions.includes('manage:tasks')) {
      return;
    }

    throw new ForbiddenException('Only the comment author or a task manager can modify this comment');
  }

  private async getAttachmentOrThrow(tenantId: string, taskId: string, attachmentId: string) {
    const attachment = await this.prisma.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
        task: {
          tenantId
        }
      },
      select: attachmentSelect
    });

    if (!attachment) {
      throw new NotFoundException('Task attachment not found');
    }

    return attachment;
  }

  private async getChecklistOrThrow(tenantId: string, taskId: string, checklistId: string) {
    const checklist = await this.prisma.taskChecklist.findFirst({
      where: {
        id: checklistId,
        taskId,
        task: {
          tenantId
        }
      },
      select: checklistSelect
    });

    if (!checklist) {
      throw new NotFoundException('Task checklist not found');
    }

    return checklist;
  }

  private async getChecklistItemOrThrow(
    tenantId: string,
    taskId: string,
    checklistId: string,
    itemId: string
  ) {
    const item = await this.prisma.taskChecklistItem.findFirst({
      where: {
        id: itemId,
        checklistId,
        checklist: {
          taskId,
          task: {
            tenantId
          }
        }
      }
    });

    if (!item) {
      throw new NotFoundException('Task checklist item not found');
    }

    return item;
  }

  private async getLabelOrThrow(tenantId: string, labelId: string) {
    const label = await this.prisma.label.findFirst({
      where: {
        id: labelId,
        tenantId
      },
      select: labelSelect
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    return label;
  }

  private async assertLabelNameAvailable(tenantId: string, name: string, excludeLabelId?: string) {
    const existing = await this.prisma.label.findFirst({
      where: {
        tenantId,
        name,
        id: excludeLabelId
          ? {
              not: excludeLabelId
            }
          : undefined
      },
      select: {
        id: true
      }
    });

    if (existing) {
      throw new ConflictException('Label name already exists in this tenant');
    }
  }

  private async getTaskCustomFieldOrThrow(tenantId: string, customFieldId: string) {
    const customField = await this.prisma.customField.findFirst({
      where: {
        id: customFieldId,
        tenantId,
        entityType: {
          equals: 'TASK',
          mode: 'insensitive'
        }
      },
      select: {
        id: true
      }
    });

    if (!customField) {
      throw new NotFoundException('Task custom field not found');
    }
  }

  private async recordTaskActivity(
    taskId: string,
    user: AuthenticatedUser,
    action: string,
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>
  ) {
    await this.prisma.taskActivity.create({
      data: {
        taskId,
        actorId: user.id,
        action,
        oldValue: oldValue ? this.toJsonValue(oldValue) : Prisma.JsonNull,
        newValue: newValue ? this.toJsonValue(newValue) : Prisma.JsonNull
      }
    });
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

  private hasAny(user: AuthenticatedUser, permissions: string[]) {
    return permissions.some((permission) => user.permissions.includes(permission));
  }

  private paginate<T>(data: T[], total: number, query: { page: number; limit: number }) {
    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }
}
