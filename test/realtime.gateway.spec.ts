import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import type { AuthenticatedUser } from '../src/auth/interfaces/authenticated-user.interface';
import {
  RealtimeGateway,
  resolveRealtimeCorsOrigin
} from '../src/collaboration/realtime.gateway';

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

function createSocket() {
  const emit = jest.fn();
  const toEmit = jest.fn();

  return {
    socket: {
      data: { user },
      join: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      leave: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      to: jest.fn(() => ({ emit: toEmit })),
      emit
    },
    emit,
    toEmit
  };
}

function createGateway() {
  type FindFirst = (args?: unknown) => Promise<unknown>;
  type TaskAccessWhere = (
    authenticatedUser: AuthenticatedUser,
    taskId?: string
  ) => Record<string, unknown>;

  const prisma = {
    task: { findFirst: jest.fn<FindFirst>() },
    meeting: { findFirst: jest.fn<FindFirst>() },
    conversationMember: { findFirst: jest.fn<FindFirst>() }
  };
  const projectAccessPolicy = {
    taskAccessWhere: jest.fn<TaskAccessWhere>(() => ({ id: 'task-1', tenantId: user.tenantId }))
  };

  const gateway = new RealtimeGateway(
    {} as never,
    {} as never,
    prisma as never,
    projectAccessPolicy as never
  );

  return { gateway, prisma, projectAccessPolicy };
}

describe('RealtimeGateway authorization', () => {
  it('emits task updates only to the task room', () => {
    const { gateway } = createGateway();
    const emit = jest.fn();
    const to = jest.fn((_room: string) => ({ emit }));
    (gateway as unknown as { server: { to: typeof to } }).server = { to };

    gateway.emitTaskUpdated('tenant-1', 'task-1', { taskId: 'task-1', status: 'DONE' });

    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('task:task-1');
    expect(emit).toHaveBeenCalledWith('task.updated', { taskId: 'task-1', status: 'DONE' });
  });

  it('emits sanitized meeting updates only to the meeting and participant user rooms', async () => {
    const { gateway, prisma } = createGateway();
    const emit = jest.fn();
    const target = { to: jest.fn((_room: string) => target), emit };
    (gateway as unknown as { server: typeof target }).server = target;
    prisma.meeting.findFirst.mockResolvedValue({
      hostId: 'host-1',
      createdById: 'creator-1',
      attendees: [{ userId: 'attendee-1' }, { userId: 'host-1' }]
    });

    await gateway.emitMeetingUpdated('tenant-1', 'meeting-1', 'meeting.updated', {
      meetingId: 'meeting-1',
      meeting: {
        id: 'meeting-1',
        title: 'Private title',
        clientEmail: 'client@example.com',
        status: 'LIVE',
        visibility: 'PRIVATE',
        updatedAt: '2026-06-21T00:00:00.000Z'
      }
    });

    expect(target.to).toHaveBeenCalledWith('meeting:meeting-1');
    expect(target.to).toHaveBeenCalledWith('user:host-1');
    expect(target.to).toHaveBeenCalledWith('user:creator-1');
    expect(target.to).toHaveBeenCalledWith('user:attendee-1');
    expect(target.to).not.toHaveBeenCalledWith('tenant:tenant-1');
    expect(emit).toHaveBeenCalledWith('meeting.updated', {
      meetingId: 'meeting-1',
      meeting: {
        id: 'meeting-1',
        status: 'LIVE',
        visibility: 'PRIVATE',
        approvalStatus: undefined,
        startAt: undefined,
        endAt: undefined,
        updatedAt: '2026-06-21T00:00:00.000Z'
      }
    });
  });

  it('rejects task room joins when project policy does not allow the task', async () => {
    const { gateway, prisma, projectAccessPolicy } = createGateway();
    const { socket } = createSocket();
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(gateway.joinTask(socket as never, { taskId: 'task-1' })).rejects.toThrow(
      UnauthorizedException
    );

    expect(projectAccessPolicy.taskAccessWhere).toHaveBeenCalledWith(user, 'task-1');
    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: 'task-1', tenantId: user.tenantId },
      select: { id: true }
    });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('rejects meeting typing events when the user cannot access the meeting', async () => {
    const { gateway, prisma } = createGateway();
    const { socket, toEmit } = createSocket();
    prisma.meeting.findFirst.mockResolvedValue(null);

    await expect(
      gateway.meetingTypingStart(socket as never, { meetingId: 'meeting-1' })
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.meeting.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'meeting-1',
        tenantId: user.tenantId,
        OR: [
          { visibility: { in: ['ORGANIZATION', 'PUBLIC'] } },
          { hostId: user.id },
          { createdById: user.id },
          { attendees: { some: { userId: user.id, status: { not: 'REMOVED' } } } }
        ]
      },
      select: { id: true }
    });
    expect(toEmit).not.toHaveBeenCalled();
  });

  it('rejects conversation typing events when the user is not a member', async () => {
    const { gateway, prisma } = createGateway();
    const { socket, toEmit } = createSocket();
    prisma.conversationMember.findFirst.mockResolvedValue(null);

    await expect(
      gateway.typingStart(socket as never, { conversationId: 'conversation-1' })
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.conversationMember.findFirst).toHaveBeenCalledWith({
      where: {
        conversationId: 'conversation-1',
        userId: user.id,
        conversation: { tenantId: user.tenantId }
      },
      select: { id: true }
    });
    expect(toEmit).not.toHaveBeenCalled();
  });
});

describe('resolveRealtimeCorsOrigin', () => {
  it('uses explicit socket origins when configured', () => {
    expect(
      resolveRealtimeCorsOrigin('https://app.taskbricks.com, https://admin.taskbricks.com', 'production')
    ).toEqual(['https://app.taskbricks.com', 'https://admin.taskbricks.com']);
  });

  it('rejects browser origins by default in production', () => {
    expect(resolveRealtimeCorsOrigin('', 'production')).toBe(false);
  });

  it('keeps local development permissive when no socket origins are configured', () => {
    expect(resolveRealtimeCorsOrigin('', 'development')).toBe(true);
  });
});
