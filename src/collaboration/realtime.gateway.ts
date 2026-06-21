import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  MeetingAttendeeStatus,
  Visibility,
} from '@prisma/client';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessPolicyService } from '../access-policy/project-access-policy.service';

export function resolveRealtimeCorsOrigin(
  value = process.env.SOCKET_CORS_ORIGINS,
  nodeEnv = process.env.NODE_ENV
) {
  const origins = `${value ?? ''}`
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0) return origins;
  return nodeEnv === 'production' ? false : true;
}

@WebSocketGateway({
  namespace: 'realtime',
  cors: {
    origin: resolveRealtimeCorsOrigin(),
    credentials: true
  }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server?: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly projectAccessPolicy: ProjectAccessPolicyService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticate(client);
      client.data.user = user;
      await client.join(`tenant:${user.tenantId}`);
      await client.join(`user:${user.id}`);
      client.emit('connection.ready', {
        userId: user.id,
        tenantId: user.tenantId
      });
    } catch (error) {
      client.emit('connection.error', {
        message: error instanceof Error ? error.message : 'Unauthorized websocket connection'
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (user) {
      this.logger.debug(`Realtime disconnected userId=${user.id}`);
    }
  }

  @SubscribeMessage('conversation.join')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string }
  ) {
    const user = this.socketUser(client);
    const conversationId = this.requiredString(body.conversationId, 'conversationId');
    await this.assertConversationAccess(user, conversationId);

    await client.join(`conversation:${conversationId}`);
    return {
      event: 'conversation.joined',
      data: { conversationId }
    };
  }

  @SubscribeMessage('conversation.leave')
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string }
  ) {
    const conversationId = this.requiredString(body.conversationId, 'conversationId');
    await client.leave(`conversation:${conversationId}`);
    return {
      event: 'conversation.left',
      data: { conversationId }
    };
  }

  @SubscribeMessage('task.join')
  async joinTask(@ConnectedSocket() client: Socket, @MessageBody() body: { taskId?: string }) {
    const user = this.socketUser(client);
    const taskId = this.requiredString(body.taskId, 'taskId');
    const task = await this.prisma.task.findFirst({
      where: this.projectAccessPolicy.taskAccessWhere(user, taskId),
      select: { id: true }
    });

    if (!task) {
      throw new UnauthorizedException('Task access is required');
    }

    await client.join(`task:${taskId}`);
    return {
      event: 'task.joined',
      data: { taskId }
    };
  }

  @SubscribeMessage('task.leave')
  async leaveTask(@ConnectedSocket() client: Socket, @MessageBody() body: { taskId?: string }) {
    const taskId = this.requiredString(body.taskId, 'taskId');
    await client.leave(`task:${taskId}`);
    return {
      event: 'task.left',
      data: { taskId }
    };
  }

  @SubscribeMessage('meeting.join')
  async joinMeeting(@ConnectedSocket() client: Socket, @MessageBody() body: { meetingId?: string }) {
    const user = this.socketUser(client);
    const meetingId = this.requiredString(body.meetingId, 'meetingId');
    await this.assertMeetingAccess(user, meetingId);

    await client.join(`meeting:${meetingId}`);
    return {
      event: 'meeting.joined',
      data: { meetingId }
    };
  }

  @SubscribeMessage('meeting.leave')
  async leaveMeeting(@ConnectedSocket() client: Socket, @MessageBody() body: { meetingId?: string }) {
    const meetingId = this.requiredString(body.meetingId, 'meetingId');
    await client.leave(`meeting:${meetingId}`);
    return {
      event: 'meeting.left',
      data: { meetingId }
    };
  }

  @SubscribeMessage('meeting.typing.start')
  async meetingTypingStart(@ConnectedSocket() client: Socket, @MessageBody() body: { meetingId?: string; area?: string }) {
    const user = this.socketUser(client);
    const meetingId = this.requiredString(body.meetingId, 'meetingId');
    await this.assertMeetingAccess(user, meetingId);
    client.to(`meeting:${meetingId}`).emit('meeting.typing.started', {
      meetingId,
      userId: user.id,
      area: body.area ?? 'notes'
    });
    return {
      event: 'meeting.typing.started',
      data: { meetingId }
    };
  }

  @SubscribeMessage('meeting.typing.stop')
  async meetingTypingStop(@ConnectedSocket() client: Socket, @MessageBody() body: { meetingId?: string; area?: string }) {
    const user = this.socketUser(client);
    const meetingId = this.requiredString(body.meetingId, 'meetingId');
    await this.assertMeetingAccess(user, meetingId);
    client.to(`meeting:${meetingId}`).emit('meeting.typing.stopped', {
      meetingId,
      userId: user.id,
      area: body.area ?? 'notes'
    });
    return {
      event: 'meeting.typing.stopped',
      data: { meetingId }
    };
  }

  @SubscribeMessage('typing.start')
  async typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string }
  ) {
    const user = this.socketUser(client);
    const conversationId = this.requiredString(body.conversationId, 'conversationId');
    await this.assertConversationAccess(user, conversationId);
    client.to(`conversation:${conversationId}`).emit('typing.started', {
      conversationId,
      userId: user.id
    });
    return {
      event: 'typing.started',
      data: { conversationId }
    };
  }

  @SubscribeMessage('typing.stop')
  async typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string }
  ) {
    const user = this.socketUser(client);
    const conversationId = this.requiredString(body.conversationId, 'conversationId');
    await this.assertConversationAccess(user, conversationId);
    client.to(`conversation:${conversationId}`).emit('typing.stopped', {
      conversationId,
      userId: user.id
    });
    return {
      event: 'typing.stopped',
      data: { conversationId }
    };
  }

  emitMessageCreated(conversationId: string, payload: Record<string, unknown>) {
    this.safeEmit(`conversation:${conversationId}`, 'message.created', payload);
  }

  emitMessageUpdated(conversationId: string, payload: Record<string, unknown>) {
    this.safeEmit(`conversation:${conversationId}`, 'message.updated', payload);
  }

  emitMessageDeleted(conversationId: string, payload: Record<string, unknown>) {
    this.safeEmit(`conversation:${conversationId}`, 'message.deleted', payload);
  }

  emitMessageReactionUpdated(conversationId: string, payload: Record<string, unknown>) {
    this.safeEmit(`conversation:${conversationId}`, 'message.reaction.updated', payload);
  }

  emitInternalMailReceived(userId: string, payload: Record<string, unknown>) {
    this.safeEmit(`user:${userId}`, 'internal_mail.received', payload);
  }

  emitInternalMailUpdated(userId: string, payload: Record<string, unknown>) {
    this.safeEmit(`user:${userId}`, 'internal_mail.updated', payload);
  }

  emitTaskUpdated(tenantId: string, taskId: string, payload: Record<string, unknown>) {
    this.safeEmit(`task:${taskId}`, 'task.updated', payload);
    this.safeEmit(`tenant:${tenantId}`, 'task.updated', payload);
  }

  emitMeetingUpdated(tenantId: string, meetingId: string, event: string, payload: Record<string, unknown>) {
    this.safeEmit(`meeting:${meetingId}`, event, payload);
    this.safeEmit(`tenant:${tenantId}`, event, payload);
  }

  emitNotificationCreated(userId: string, payload: Record<string, unknown>) {
    this.safeEmit(`user:${userId}`, 'notification.created', payload);
  }

  getRuntimeSnapshot() {
    const namespace = this.server as
      | (Server & {
          sockets?: Map<string, Socket>;
          adapter?: { rooms?: Map<string, Set<string>> };
        })
      | undefined;
    const sockets = namespace?.sockets instanceof Map ? [...namespace.sockets.values()] : [];
    const rooms = namespace?.adapter?.rooms instanceof Map ? [...namespace.adapter.rooms.entries()] : [];
    const tenantCounts = new Map<string, number>();
    const authMethods = new Map<string, number>();

    for (const socket of sockets) {
      const user = socket.data.user as AuthenticatedUser | undefined;
      if (user?.tenantId) {
        tenantCounts.set(user.tenantId, (tenantCounts.get(user.tenantId) ?? 0) + 1);
      }
      const method = typeof socket.handshake.auth?.method === 'string' ? socket.handshake.auth.method : 'unknown';
      authMethods.set(method, (authMethods.get(method) ?? 0) + 1);
    }

    const roomCounts = rooms.reduce(
      (acc, [room, members]) => {
        if (room.startsWith('tenant:')) acc.tenant += 1;
        if (room.startsWith('conversation:')) acc.conversation += 1;
        if (room.startsWith('task:')) acc.task += 1;
        if (room.startsWith('meeting:')) acc.meeting += 1;
        if (room.startsWith('user:')) acc.user += 1;
        acc.total += 1;
        acc.memberships += members.size;
        return acc;
      },
      { total: 0, tenant: 0, user: 0, conversation: 0, task: 0, meeting: 0, memberships: 0 }
    );

    return {
      namespace: 'realtime',
      status: this.server ? 'ready' : 'not_ready',
      connections: sockets.length,
      rooms: roomCounts,
      tenants: Object.fromEntries(tenantCounts),
      authMethods: Object.fromEntries(authMethods)
    };
  }

  private safeEmit(room: string, event: string, payload: Record<string, unknown>) {
    try {
      this.server?.to(room).emit(event, payload);
    } catch (error) {
      this.logger.warn(
        `Realtime emit failed event=${event} room=${room}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  private async authenticate(client: Socket): Promise<AuthenticatedUser> {
    const token = this.extractToken(client);
    const secret = this.configService.get<string>('jwt.accessSecret');

    if (!token || !secret) {
      throw new UnauthorizedException('Missing websocket access token');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid websocket token type');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session is no longer active');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user || user.tenantId !== payload.tenantId || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      sessionId: payload.sessionId,
      roles: user.roles.map((userRole) => userRole.role.name),
      permissions: [
        ...new Set(
          user.roles.flatMap((userRole) =>
            userRole.role.permissions.map(
              (rolePermission) =>
                `${rolePermission.permission.action}:${rolePermission.permission.subject}`
            )
          )
        )
      ]
    };
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const header = client.handshake.headers.authorization;

    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }

    return undefined;
  }

  private socketUser(client: Socket) {
    const user = client.data.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Authenticated websocket user is missing');
    }

    return user;
  }

  private canManageMeetings(user: AuthenticatedUser) {
    return user.permissions.includes('manage:all') || user.permissions.includes('manage:meetings');
  }

  private async assertConversationAccess(user: AuthenticatedUser, conversationId: string) {
    const member = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId: user.id,
        conversation: {
          tenantId: user.tenantId
        }
      },
      select: { id: true }
    });

    if (!member) {
      throw new UnauthorizedException('Conversation membership is required');
    }
  }

  private async assertMeetingAccess(user: AuthenticatedUser, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: {
        id: meetingId,
        tenantId: user.tenantId,
        OR: this.canManageMeetings(user)
          ? undefined
          : [
              { visibility: { in: [Visibility.ORGANIZATION, Visibility.PUBLIC] } },
              { hostId: user.id },
              { createdById: user.id },
              { attendees: { some: { userId: user.id, status: { not: MeetingAttendeeStatus.REMOVED } } } }
            ]
      },
      select: { id: true }
    });

    if (!meeting) {
      throw new UnauthorizedException('Meeting access is required');
    }
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new UnauthorizedException(`${field} is required`);
    }

    return value.trim();
  }
}
