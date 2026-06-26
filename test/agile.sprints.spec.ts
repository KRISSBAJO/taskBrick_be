import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import type { AuthenticatedUser } from '../src/auth/interfaces/authenticated-user.interface';
import { AgileService } from '../src/agile/agile.service';

const user: AuthenticatedUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
  status: 'ACTIVE',
  sessionId: 'session-1',
  roles: [],
  permissions: []
};

function sprint(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sprint-1',
    projectId: 'project-1',
    name: 'Sprint 1',
    goal: null,
    startDate: null,
    endDate: null,
    completedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    project: {
      id: 'project-1',
      tenantId: user.tenantId,
      key: 'TB',
      name: 'TaskBricks'
    },
    _count: {
      meetings: 0,
      retrospectives: 0,
      tasks: 0
    },
    ...overrides
  };
}

function createService() {
  type AsyncMock = (args?: unknown) => Promise<unknown>;
  type AuditRecord = (args?: unknown) => Promise<void>;

  const prisma = {
    project: {
      findFirst: jest.fn<AsyncMock>()
    },
    sprint: {
      create: jest.fn<AsyncMock>(),
      delete: jest.fn<AsyncMock>(),
      findFirst: jest.fn<AsyncMock>(),
      update: jest.fn<AsyncMock>()
    }
  };
  const auditService = {
    record: jest.fn<AuditRecord>()
  };
  const projectAccessPolicy = {
    assertProjectAction: jest.fn<AuditRecord>(),
    projectAccessWhere: jest.fn()
  };

  const service = new AgileService(
    prisma as never,
    auditService as never,
    {} as never,
    projectAccessPolicy as never
  );

  return { auditService, prisma, projectAccessPolicy, service };
}

describe('AgileService sprint lifecycle guardrails', () => {
  it('deletes only planned empty sprints', async () => {
    const { prisma, service } = createService();
    prisma.sprint.findFirst.mockResolvedValue(sprint());
    prisma.sprint.delete.mockResolvedValue(sprint());

    await expect(service.deleteSprint(user, 'sprint-1', {})).resolves.toEqual({ success: true });

    expect(prisma.sprint.delete).toHaveBeenCalledWith({ where: { id: 'sprint-1' } });
  });

  it('rejects deleting active sprints', async () => {
    const { prisma, service } = createService();
    prisma.sprint.findFirst.mockResolvedValue(sprint({ startDate: daysFromNow(-30) }));

    await expect(service.deleteSprint(user, 'sprint-1', {})).rejects.toThrow(BadRequestException);
    expect(prisma.sprint.delete).not.toHaveBeenCalled();
  });

  it('rejects deleting completed sprints', async () => {
    const { prisma, service } = createService();
    prisma.sprint.findFirst.mockResolvedValue(sprint({ completedAt: new Date('2026-06-10T00:00:00.000Z') }));

    await expect(service.deleteSprint(user, 'sprint-1', {})).rejects.toThrow('Completed sprints cannot be deleted');
    expect(prisma.sprint.delete).not.toHaveBeenCalled();
  });

  it('rejects deleting sprints with owned task, meeting, or retrospective data', async () => {
    const { prisma, service } = createService();
    prisma.sprint.findFirst.mockResolvedValue(
      sprint({
        _count: {
          meetings: 1,
          retrospectives: 0,
          tasks: 0
        }
      })
    );

    await expect(service.deleteSprint(user, 'sprint-1', {})).rejects.toThrow(
      'Sprint must have no tasks, meetings, or retrospectives before deletion'
    );
    expect(prisma.sprint.delete).not.toHaveBeenCalled();
  });

  it('allows clearing planned sprint dates through PATCH nulls', async () => {
    const { prisma, service } = createService();
    const planned = sprint({
      startDate: daysFromNow(30),
      endDate: daysFromNow(45)
    });
    prisma.sprint.findFirst.mockResolvedValue(planned);
    prisma.sprint.update.mockResolvedValue({ ...planned, startDate: null, endDate: null });

    await service.updateSprint(user, 'sprint-1', { startDate: null, endDate: null }, {});

    expect(prisma.sprint.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endDate: null,
          startDate: null
        })
      })
    );
  });

  it('rejects clearing active sprint start date', async () => {
    const { prisma, service } = createService();
    prisma.sprint.findFirst.mockResolvedValue(sprint({ startDate: daysFromNow(-30) }));

    await expect(service.updateSprint(user, 'sprint-1', { startDate: null }, {})).rejects.toThrow(
      'Active sprint start date cannot be cleared or moved to the future'
    );
    expect(prisma.sprint.update).not.toHaveBeenCalled();
  });

  it('requires an end date to have a start date', async () => {
    const { prisma, service } = createService();
    prisma.project.findFirst.mockResolvedValue({ id: 'project-1', tenantId: user.tenantId, key: 'TB', name: 'TaskBricks' });

    await expect(
      service.createSprint(user, {
        projectId: 'project-1',
        name: 'Bad sprint',
        endDate: '2026-08-15T12:00:00.000Z'
      }, {})
    ).rejects.toThrow('Sprint end date requires a start date');
    expect(prisma.sprint.create).not.toHaveBeenCalled();
  });
});

function daysFromNow(days: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}
