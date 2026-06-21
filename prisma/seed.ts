import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import {
  PrismaClient,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
  UserStatus,
  Visibility
} from '@prisma/client';
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES, permissionKey } from '../src/auth/auth.constants';

const prisma = new PrismaClient();

async function seedTenantDefaults(tenantId: string) {
  const permissions = new Map<string, string>();

  for (const permission of DEFAULT_PERMISSIONS) {
    const saved = await prisma.permission.upsert({
      where: {
        tenantId_action_subject: {
          tenantId,
          action: permission.action,
          subject: permission.subject
        }
      },
      update: {
        description: permission.description
      },
      create: {
        tenantId,
        action: permission.action,
        subject: permission.subject,
        description: permission.description
      }
    });

    permissions.set(permissionKey(permission), saved.id);
  }

  for (const role of DEFAULT_ROLES) {
    const savedRole = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: role.name
        }
      },
      update: {
        description: role.description,
        isSystem: true
      },
      create: {
        tenantId,
        name: role.name,
        description: role.description,
        isSystem: true
      }
    });

    for (const rolePermission of role.permissions) {
      const permissionId = permissions.get(rolePermission);

      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: savedRole.id,
              permissionId
            }
          },
          update: {},
          create: {
            roleId: savedRole.id,
            permissionId
          }
        });
      }
    }
  }
}

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

async function seedFrontendDemoData(tenantId: string, userId: string) {
  const workspace = await prisma.workspace.upsert({
    where: {
      tenantId_slug: {
        tenantId,
        slug: 'delivery'
      }
    },
    update: {
      name: 'Acme Delivery',
      description: 'Frontend integration workspace for project, task, board, and reporting flows.',
      icon: 'layout-dashboard'
    },
    create: {
      tenantId,
      name: 'Acme Delivery',
      slug: 'delivery',
      description: 'Frontend integration workspace for project, task, board, and reporting flows.',
      icon: 'layout-dashboard'
    }
  });

  const existingTeam = await prisma.team.findFirst({
    where: {
      tenantId,
      name: 'Platform Delivery'
    }
  });

  const team = existingTeam
    ? await prisma.team.update({
        where: { id: existingTeam.id },
        data: {
          workspaceId: workspace.id,
          description: 'Cross-functional team used by the Next.js API migration.'
        }
      })
    : await prisma.team.create({
        data: {
          tenantId,
          workspaceId: workspace.id,
          name: 'Platform Delivery',
          description: 'Cross-functional team used by the Next.js API migration.'
        }
      });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId
      }
    },
    update: {
      role: 'Owner'
    },
    create: {
      teamId: team.id,
      userId,
      role: 'Owner'
    }
  });

  const project = await prisma.project.upsert({
    where: {
      tenantId_key: {
        tenantId,
        key: 'TB'
      }
    },
    update: {
      workspaceId: workspace.id,
      teamId: team.id,
      name: 'TaskBricks Frontend Migration',
      description: 'Phase 22 API compatibility project for the Next.js application.',
      status: ProjectStatus.ACTIVE,
      visibility: Visibility.TEAM,
      startDate: daysFromNow(-7),
      dueDate: daysFromNow(30),
      progress: 64
    },
    create: {
      tenantId,
      workspaceId: workspace.id,
      teamId: team.id,
      key: 'TB',
      name: 'TaskBricks Frontend Migration',
      description: 'Phase 22 API compatibility project for the Next.js application.',
      status: ProjectStatus.ACTIVE,
      visibility: Visibility.TEAM,
      startDate: daysFromNow(-7),
      dueDate: daysFromNow(30),
      progress: 64
    }
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId
      }
    },
    update: {
      role: 'Owner'
    },
    create: {
      projectId: project.id,
      userId,
      role: 'Owner'
    }
  });

  const existingSprint = await prisma.sprint.findFirst({
    where: {
      projectId: project.id,
      name: 'Phase 22 Integration Sprint'
    }
  });

  const sprint = existingSprint
    ? await prisma.sprint.update({
        where: { id: existingSprint.id },
        data: {
          goal: 'Connect Next.js screens to production backend contracts.',
          startDate: daysFromNow(-3),
          endDate: daysFromNow(11),
          completedAt: null
        }
      })
    : await prisma.sprint.create({
        data: {
          projectId: project.id,
          name: 'Phase 22 Integration Sprint',
          goal: 'Connect Next.js screens to production backend contracts.',
          startDate: daysFromNow(-3),
          endDate: daysFromNow(11)
        }
      });

  const board = await prisma.board.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'Delivery Board'
      }
    },
    update: {
      tenantId,
      description: 'Default board for frontend API migration smoke testing.',
      isDefault: true
    },
    create: {
      tenantId,
      projectId: project.id,
      name: 'Delivery Board',
      description: 'Default board for frontend API migration smoke testing.',
      isDefault: true
    }
  });

  const boardColumns = [
    { name: 'Backlog', status: TaskStatus.BACKLOG, sortOrder: 0 },
    { name: 'To Do', status: TaskStatus.TODO, sortOrder: 1 },
    { name: 'In Progress', status: TaskStatus.IN_PROGRESS, sortOrder: 2 },
    { name: 'Review', status: TaskStatus.REVIEW, sortOrder: 3 },
    { name: 'Testing', status: TaskStatus.TESTING, sortOrder: 4 },
    { name: 'Done', status: TaskStatus.DONE, sortOrder: 5 }
  ];

  for (const column of boardColumns) {
    await prisma.boardColumn.upsert({
      where: {
        boardId_status: {
          boardId: board.id,
          status: column.status
        }
      },
      update: {
        name: column.name,
        sortOrder: column.sortOrder
      },
      create: {
        boardId: board.id,
        name: column.name,
        status: column.status,
        sortOrder: column.sortOrder
      }
    });
  }

  const labels = await Promise.all(
    [
      { name: 'Frontend', color: '#0f766e' },
      { name: 'Backend', color: '#1d4ed8' },
      { name: 'Contract', color: '#ca8a04' },
      { name: 'Risk', color: '#dc2626' }
    ].map((label) =>
      prisma.label.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: label.name
          }
        },
        update: {
          color: label.color
        },
        create: {
          tenantId,
          name: label.name,
          color: label.color
        }
      })
    )
  );

  const frontendLabel = labels.find((label) => label.name === 'Frontend')!;
  const backendLabel = labels.find((label) => label.name === 'Backend')!;
  const contractLabel = labels.find((label) => label.name === 'Contract')!;
  const riskLabel = labels.find((label) => label.name === 'Risk')!;

  const tasks = [
    {
      key: 'TB-1021',
      title: 'Map workspace permissions to project roles',
      description: 'Confirm RBAC-protected project endpoints match the first Next.js workspace screens.',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.HIGH,
      labelId: contractLabel.id,
      storyPoints: 5,
      dueInDays: 4,
      sortOrder: 100
    },
    {
      key: 'TB-1051',
      title: 'Ship tenant-aware project list endpoint',
      description: 'Use the paginated projects API as the source of truth for portfolio screens.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      labelId: backendLabel.id,
      storyPoints: 8,
      dueInDays: 1,
      sortOrder: 200
    },
    {
      key: 'TB-1062',
      title: 'Approve reporting dashboard schema',
      description: 'Validate dashboard and analytics response shape for executive reporting widgets.',
      status: TaskStatus.REVIEW,
      priority: TaskPriority.HIGH,
      labelId: riskLabel.id,
      storyPoints: 3,
      dueInDays: 2,
      sortOrder: 300
    },
    {
      key: 'TB-1064',
      title: 'Add frontend contract check to CI',
      description: 'Export OpenAPI and verify frontend-critical workflows before deployment.',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      labelId: frontendLabel.id,
      storyPoints: 2,
      dueInDays: -1,
      sortOrder: 400
    }
  ];

  for (const taskSeed of tasks) {
    const completedAt = taskSeed.status === TaskStatus.DONE ? daysFromNow(-1) : null;
    const task = await prisma.task.upsert({
      where: {
        projectId_key: {
          projectId: project.id,
          key: taskSeed.key
        }
      },
      update: {
        sprintId: sprint.id,
        reporterId: userId,
        title: taskSeed.title,
        description: taskSeed.description,
        type: TaskType.TASK,
        status: taskSeed.status,
        priority: taskSeed.priority,
        dueDate: daysFromNow(taskSeed.dueInDays),
        completedAt,
        storyPoints: taskSeed.storyPoints,
        sortOrder: taskSeed.sortOrder
      },
      create: {
        tenantId,
        projectId: project.id,
        sprintId: sprint.id,
        reporterId: userId,
        key: taskSeed.key,
        title: taskSeed.title,
        description: taskSeed.description,
        type: TaskType.TASK,
        status: taskSeed.status,
        priority: taskSeed.priority,
        dueDate: daysFromNow(taskSeed.dueInDays),
        completedAt,
        storyPoints: taskSeed.storyPoints,
        sortOrder: taskSeed.sortOrder
      }
    });

    await prisma.taskAssignee.upsert({
      where: {
        taskId_userId: {
          taskId: task.id,
          userId
        }
      },
      update: {},
      create: {
        taskId: task.id,
        userId
      }
    });

    await prisma.taskWatcher.upsert({
      where: {
        taskId_userId: {
          taskId: task.id,
          userId
        }
      },
      update: {},
      create: {
        taskId: task.id,
        userId
      }
    });

    await prisma.taskLabel.upsert({
      where: {
        taskId_labelId: {
          taskId: task.id,
          labelId: taskSeed.labelId
        }
      },
      update: {},
      create: {
        taskId: task.id,
        labelId: taskSeed.labelId
      }
    });
  }

  await prisma.projectBudget.upsert({
    where: {
      id: `${project.id}-seed-budget`
    },
    update: {
      planned: 125000,
      actual: 79000,
      notes: 'Seed budget for portfolio UI integration.'
    },
    create: {
      id: `${project.id}-seed-budget`,
      projectId: project.id,
      currency: 'USD',
      planned: 125000,
      actual: 79000,
      notes: 'Seed budget for portfolio UI integration.'
    }
  });

  await prisma.projectRisk.upsert({
    where: {
      id: `${project.id}-seed-risk`
    },
    update: {
      title: 'Frontend contract drift',
      description: 'OpenAPI contract must be regenerated when protected workflows change.',
      severity: TaskPriority.HIGH,
      mitigation: 'Run npm run frontend:contract in CI.',
      isOpen: true
    },
    create: {
      id: `${project.id}-seed-risk`,
      projectId: project.id,
      title: 'Frontend contract drift',
      description: 'OpenAPI contract must be regenerated when protected workflows change.',
      severity: TaskPriority.HIGH,
      mitigation: 'Run npm run frontend:contract in CI.',
      isOpen: true
    }
  });

  return { workspace, team, project, sprint, board };
}

async function seedPlatformOwner(userId: string, email: string) {
  await prisma.$executeRaw`
    INSERT INTO "PlatformAdmin" (
      "id",
      "userId",
      "level",
      "status",
      "scopes",
      "notes",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${userId},
      'OWNER'::"PlatformAdminLevel",
      'ACTIVE'::"PlatformAdminStatus",
      ARRAY['platform:*']::text[],
      'Seeded platform owner',
      NOW(),
      NOW()
    )
    ON CONFLICT ("userId")
    DO UPDATE SET
      "level" = 'OWNER'::"PlatformAdminLevel",
      "status" = 'ACTIVE'::"PlatformAdminStatus",
      "scopes" = ARRAY['platform:*']::text[],
      "revokedById" = NULL,
      "revokedAt" = NULL,
      "notes" = 'Seeded platform owner',
      "updatedAt" = NOW()
  `;
  console.log(`Seeded platform owner email=${email}`);
}

async function seedExistingPlatformOwner() {
  const email = (process.env.SEED_PLATFORM_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? '').toLowerCase().trim();
  if (!email) {
    console.log('Platform admin seed skipped. Set SEED_PLATFORM_ADMIN_EMAIL to an existing user email.');
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true }
  });

  if (!user) {
    console.log(`Platform admin seed skipped. No existing user found for ${email}.`);
    return;
  }

  await seedPlatformOwner(user.id, user.email);
}

async function main() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    if (process.env.SEED_PLATFORM_ADMIN === 'true') {
      await seedExistingPlatformOwner();
    } else {
      console.log('Seed skipped. Set SEED_DEMO_DATA=true to create a local demo tenant.');
    }
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@taskbricks.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe12345!';
  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'Demo Organization'
    },
    create: {
      name: 'Demo Organization',
      slug: 'demo',
      status: 'ACTIVE'
    }
  });

  await seedTenantDefaults(tenant.id);

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email
      }
    },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE
    },
    create: {
      tenantId: tenant.id,
      email,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date()
    }
  });

  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Owner'
      }
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: ownerRole.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: ownerRole.id
    }
  });

  if (process.env.SEED_PLATFORM_ADMIN !== 'false') {
    await seedPlatformOwner(user.id, email);
  }

  const demo = await seedFrontendDemoData(tenant.id, user.id);

  console.log(`Demo tenant ready. Login with tenantSlug=demo email=${email}`);
  console.log(`Seeded workspace=${demo.workspace.id} team=${demo.team.id} project=${demo.project.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
