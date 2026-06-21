import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationMemberDto } from './dto/conversation-member.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';
import { MessageReactionDto } from './dto/message-reaction.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { RealtimeGateway } from './realtime.gateway';

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

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  parentMessageId: true,
  forwardedFromMessageId: true,
  pinnedById: true,
  body: true,
  attachments: true,
  metadata: true,
  pinnedAt: true,
  createdAt: true,
  updatedAt: true,
  reactions: {
    select: {
      id: true,
      userId: true,
      emoji: true
    },
    orderBy: [{ id: 'asc' as const }]
  },
  readReceipts: {
    select: {
      id: true,
      userId: true,
      readAt: true
    },
    orderBy: [{ readAt: 'desc' as const }]
  }
} satisfies Prisma.MessageSelect;

const conversationSelect = {
  id: true,
  tenantId: true,
  title: true,
  isGroup: true,
  createdAt: true,
  members: {
    select: {
      id: true,
      userId: true
    }
  },
  messages: {
    select: messageSelect,
    orderBy: [{ createdAt: 'desc' as const }],
    take: 1
  },
  _count: {
    select: {
      members: true,
      messages: true
    }
  }
} satisfies Prisma.ConversationSelect;

const notificationSelect = {
  id: true,
  tenantId: true,
  userId: true,
  title: true,
  body: true,
  channel: true,
  readAt: true,
  data: true,
  createdAt: true
} satisfies Prisma.NotificationSelect;

@Injectable()
export class CollaborationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  async listConversations(user: AuthenticatedUser, query: ConversationQueryDto) {
    const where: Prisma.ConversationWhereInput = {
      tenantId: user.tenantId,
      isGroup: query.isGroup,
      members: {
        some: {
          userId: user.id
        }
      },
      ...(query.search
        ? {
            title: { contains: query.search, mode: 'insensitive' }
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        select: conversationSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.conversation.count({ where })
    ]);

    return this.paginate(await this.enrichConversations(user.tenantId, data), total, query);
  }

  async createConversation(
    user: AuthenticatedUser,
    dto: CreateConversationDto,
    meta: RequestMeta
  ) {
    const memberIds = [...new Set([user.id, ...dto.memberIds])];
    const isGroup = dto.isGroup ?? false;

    if (!isGroup && memberIds.length !== 2) {
      throw new BadRequestException('Direct conversations must have exactly two members');
    }

    if (isGroup && memberIds.length < 2) {
      throw new BadRequestException('Group conversations need at least two members');
    }

    await this.assertUsersBelongToTenant(user.tenantId, memberIds);

    if (!isGroup) {
      await this.assertDirectConversationDoesNotExist(user.tenantId, memberIds);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        isGroup,
        members: {
          create: memberIds.map((memberId) => ({ userId: memberId }))
        }
      },
      select: conversationSelect
    });

    await this.recordAudit(user, 'conversation.create', 'Conversation', conversation.id, undefined, {
      title: conversation.title,
      isGroup: conversation.isGroup,
      memberIds
    }, meta);

    return (await this.enrichConversations(user.tenantId, [conversation]))[0];
  }

  async getConversation(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.getConversationForMemberOrThrow(user, conversationId);
    return (await this.enrichConversations(user.tenantId, [conversation]))[0];
  }

  async updateConversation(
    user: AuthenticatedUser,
    conversationId: string,
    dto: UpdateConversationDto,
    meta: RequestMeta
  ) {
    const before = await this.getConversationForMemberOrThrow(user, conversationId);

    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        title: dto.title,
        isGroup: dto.isGroup
      },
      select: conversationSelect
    });

    await this.recordAudit(user, 'conversation.update', 'Conversation', conversationId, {
      title: before.title,
      isGroup: before.isGroup
    }, {
      title: conversation.title,
      isGroup: conversation.isGroup
    }, meta);

    return (await this.enrichConversations(user.tenantId, [conversation]))[0];
  }

  async deleteConversation(user: AuthenticatedUser, conversationId: string, meta: RequestMeta) {
    const conversation = await this.getConversationForMemberOrThrow(user, conversationId);

    await this.prisma.conversation.delete({ where: { id: conversationId } });
    await this.recordAudit(user, 'conversation.delete', 'Conversation', conversationId, {
      title: conversation.title,
      isGroup: conversation.isGroup
    }, undefined, meta);

    return { success: true };
  }

  async listMembers(user: AuthenticatedUser, conversationId: string) {
    await this.getConversationForMemberOrThrow(user, conversationId);
    return this.getConversationMembers(user.tenantId, conversationId);
  }

  async addMember(
    user: AuthenticatedUser,
    conversationId: string,
    dto: ConversationMemberDto,
    meta: RequestMeta
  ) {
    const conversation = await this.getConversationForMemberOrThrow(user, conversationId);

    if (!conversation.isGroup) {
      throw new BadRequestException('Members cannot be added to direct conversations');
    }

    await this.assertUsersBelongToTenant(user.tenantId, [dto.userId]);

    const member = await this.prisma.conversationMember.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: dto.userId
        }
      },
      update: {},
      create: {
        conversationId,
        userId: dto.userId
      }
    });

    await this.recordAudit(user, 'conversation.member_add', 'ConversationMember', member.id, undefined, {
      conversationId,
      userId: dto.userId
    }, meta);

    return this.getConversationMembers(user.tenantId, conversationId);
  }

  async removeMember(
    user: AuthenticatedUser,
    conversationId: string,
    userId: string,
    meta: RequestMeta
  ) {
    const conversation = await this.getConversationForMemberOrThrow(user, conversationId);

    if (!conversation.isGroup) {
      throw new BadRequestException('Members cannot be removed from direct conversations');
    }

    const memberCount = await this.prisma.conversationMember.count({ where: { conversationId } });

    if (memberCount <= 2) {
      throw new BadRequestException('Group conversations must keep at least two members');
    }

    await this.prisma.conversationMember.deleteMany({ where: { conversationId, userId } });
    await this.recordAudit(user, 'conversation.member_remove', 'ConversationMember', `${conversationId}:${userId}`, {
      conversationId,
      userId
    }, undefined, meta);

    return { success: true };
  }

  async listMessages(
    user: AuthenticatedUser,
    conversationId: string,
    query: PaginationQueryDto
  ) {
    await this.getConversationForMemberOrThrow(user, conversationId);

    const where: Prisma.MessageWhereInput = {
      conversationId,
      ...(query.search
        ? {
            body: { contains: query.search, mode: 'insensitive' }
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        select: messageSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.message.count({ where })
    ]);

    return this.paginate(await this.enrichMessages(user.tenantId, data), total, query);
  }

  async createMessage(
    user: AuthenticatedUser,
    conversationId: string,
    dto: CreateMessageDto,
    meta: RequestMeta
  ) {
    const conversation = await this.getConversationForMemberOrThrow(user, conversationId);

    if (!dto.body?.trim() && !dto.attachments?.length) {
      throw new BadRequestException('Message body or attachments are required');
    }

    await this.assertMessageBelongsToConversation(conversationId, dto.parentMessageId, 'Parent message');
    if (dto.forwardedFromMessageId) {
      await this.getMessageForMemberOrThrow(user, dto.forwardedFromMessageId);
    }

    const memberIds = conversation.members.map((member) => member.userId);
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: user.id,
          parentMessageId: dto.parentMessageId,
          forwardedFromMessageId: dto.forwardedFromMessageId,
          body: dto.body?.trim() ? dto.body : undefined,
          attachments: dto.attachments ? this.toJsonValue(dto.attachments) : undefined,
          metadata: dto.metadata ? this.toJsonValue(dto.metadata) : undefined
        },
        select: messageSelect
      });

      await tx.messageReadReceipt.create({
        data: {
          messageId: created.id,
          userId: user.id
        }
      });

      for (const memberId of memberIds.filter((id) => id !== user.id)) {
        await tx.notification.create({
          data: {
            tenantId: user.tenantId,
            userId: memberId,
            title: conversation.title ?? 'New message',
            body: dto.body?.slice(0, 250),
            channel: NotificationChannel.IN_APP,
            data: {
              conversationId,
              messageId: created.id,
              senderId: user.id
            }
          }
        });
      }

      return created;
    });

    await this.recordAudit(user, 'message.create', 'Message', message.id, undefined, {
      conversationId
    }, meta);

    const enriched = (await this.enrichMessages(user.tenantId, [message]))[0];
    this.realtimeGateway.emitMessageCreated(conversationId, enriched as unknown as Record<string, unknown>);
    await this.emitUnreadNotifications(user.tenantId, memberIds.filter((id) => id !== user.id));

    return enriched;
  }

  async updateMessage(
    user: AuthenticatedUser,
    messageId: string,
    dto: UpdateMessageDto,
    meta: RequestMeta
  ) {
    const message = await this.getMessageForMemberOrThrow(user, messageId);
    this.assertCanModifyMessage(user, message.senderId);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { body: dto.body },
      select: messageSelect
    });

    await this.recordAudit(user, 'message.update', 'Message', messageId, {
      body: message.body
    }, {
      body: updated.body
    }, meta);

    const enriched = (await this.enrichMessages(user.tenantId, [updated]))[0];
    this.realtimeGateway.emitMessageUpdated(
      message.conversationId,
      enriched as unknown as Record<string, unknown>
    );

    return enriched;
  }

  async deleteMessage(user: AuthenticatedUser, messageId: string, meta: RequestMeta) {
    const message = await this.getMessageForMemberOrThrow(user, messageId);
    this.assertCanModifyMessage(user, message.senderId);

    await this.prisma.message.delete({ where: { id: messageId } });
    await this.recordAudit(user, 'message.delete', 'Message', messageId, {
      conversationId: message.conversationId,
      senderId: message.senderId
    }, undefined, meta);

    this.realtimeGateway.emitMessageDeleted(message.conversationId, {
      conversationId: message.conversationId,
      messageId
    });

    return { success: true };
  }

  async listPinnedMessages(user: AuthenticatedUser, conversationId: string) {
    await this.getConversationForMemberOrThrow(user, conversationId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        pinnedAt: { not: null }
      },
      select: messageSelect,
      orderBy: [{ pinnedAt: 'desc' }, { createdAt: 'desc' }],
      take: 50
    });

    return this.enrichMessages(user.tenantId, messages);
  }

  async pinMessage(user: AuthenticatedUser, messageId: string, meta: RequestMeta) {
    const before = await this.getMessageForMemberOrThrow(user, messageId);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        pinnedAt: new Date(),
        pinnedById: user.id
      },
      select: messageSelect
    });

    await this.recordAudit(user, 'message.pin', 'Message', messageId, {
      pinnedAt: before.pinnedAt?.toISOString(),
      pinnedById: before.pinnedById
    }, {
      pinnedAt: updated.pinnedAt?.toISOString(),
      pinnedById: updated.pinnedById
    }, meta);

    const enriched = (await this.enrichMessages(user.tenantId, [updated]))[0];
    this.realtimeGateway.emitMessageUpdated(before.conversationId, enriched as unknown as Record<string, unknown>);

    return enriched;
  }

  async unpinMessage(user: AuthenticatedUser, messageId: string, meta: RequestMeta) {
    const before = await this.getMessageForMemberOrThrow(user, messageId);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        pinnedAt: null,
        pinnedById: null
      },
      select: messageSelect
    });

    await this.recordAudit(user, 'message.unpin', 'Message', messageId, {
      pinnedAt: before.pinnedAt?.toISOString(),
      pinnedById: before.pinnedById
    }, {
      pinnedAt: null,
      pinnedById: null
    }, meta);

    const enriched = (await this.enrichMessages(user.tenantId, [updated]))[0];
    this.realtimeGateway.emitMessageUpdated(before.conversationId, enriched as unknown as Record<string, unknown>);

    return enriched;
  }

  async forwardMessage(
    user: AuthenticatedUser,
    messageId: string,
    dto: ForwardMessageDto,
    meta: RequestMeta
  ) {
    const source = await this.getMessageForMemberOrThrow(user, messageId);
    const conversationIds = [...new Set(dto.conversationIds.map((id) => id.trim()).filter(Boolean))];

    if (!conversationIds.length) {
      throw new BadRequestException('At least one destination conversation is required');
    }

    const conversations = await this.prisma.conversation.findMany({
      where: {
        id: { in: conversationIds },
        tenantId: user.tenantId,
        members: {
          some: {
            userId: user.id
          }
        }
      },
      select: conversationSelect
    });

    if (conversations.length !== conversationIds.length) {
      throw new NotFoundException('One or more destination conversations were not found');
    }

    const body = dto.body?.trim() || source.body || undefined;
    const attachments =
      dto.includeAttachments === false || source.attachments === null
        ? undefined
        : this.toJsonValue(source.attachments);

    if (!body && !attachments) {
      throw new BadRequestException('Forwarded message has no body or attachments');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const forwardedMessages: Array<{ id: string; conversationId: string; senderId: string }> = [];
      for (const conversation of conversations) {
        const message = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            body,
            attachments,
            forwardedFromMessageId: source.id,
            metadata: this.toJsonValue({
              forwarded: true,
              forwardedFromConversationId: source.conversationId,
              forwardedFromSenderId: source.senderId,
              forwardedAt: new Date().toISOString(),
              ...(dto.metadata && typeof dto.metadata === 'object' ? { metadata: dto.metadata } : {})
            })
          },
          select: messageSelect
        });

        await tx.messageReadReceipt.create({
          data: {
            messageId: message.id,
            userId: user.id
          }
        });

        for (const memberId of conversation.members.map((member) => member.userId).filter((id) => id !== user.id)) {
          await tx.notification.create({
            data: {
              tenantId: user.tenantId,
              userId: memberId,
              title: conversation.title ?? 'Forwarded message',
              body: body?.slice(0, 250),
              channel: NotificationChannel.IN_APP,
              data: {
                conversationId: conversation.id,
                messageId: message.id,
                senderId: user.id,
                forwardedFromMessageId: source.id
              }
            }
          });
        }

        forwardedMessages.push(message);
      }

      return forwardedMessages;
    });

    await this.recordAudit(user, 'message.forward', 'Message', source.id, undefined, {
      destinationConversationIds: conversationIds,
      forwardedCount: created.length
    }, meta);

    const enriched = await this.enrichMessages(user.tenantId, created);
    for (const message of enriched) {
      this.realtimeGateway.emitMessageCreated(message.conversationId, message as unknown as Record<string, unknown>);
    }

    await this.emitUnreadNotifications(
      user.tenantId,
      conversations.flatMap((conversation) => conversation.members.map((member) => member.userId)).filter((id) => id !== user.id)
    );

    return {
      data: enriched,
      forwarded: enriched.length
    };
  }

  async addReaction(
    user: AuthenticatedUser,
    messageId: string,
    dto: MessageReactionDto,
    meta: RequestMeta
  ) {
    const message = await this.getMessageForMemberOrThrow(user, messageId);

    const reaction = await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.id,
          emoji: dto.emoji
        }
      },
      update: {},
      create: {
        messageId,
        userId: user.id,
        emoji: dto.emoji
      }
    });

    await this.recordAudit(user, 'message.reaction_add', 'MessageReaction', reaction.id, undefined, {
      messageId,
      emoji: dto.emoji
    }, meta);

    this.realtimeGateway.emitMessageReactionUpdated(message.conversationId, {
      conversationId: message.conversationId,
      messageId,
      removed: false,
      reaction
    });

    return reaction;
  }

  async removeReaction(
    user: AuthenticatedUser,
    messageId: string,
    emoji: string,
    meta: RequestMeta
  ) {
    const message = await this.getMessageForMemberOrThrow(user, messageId);

    await this.prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId: user.id,
        emoji
      }
    });

    await this.recordAudit(user, 'message.reaction_remove', 'MessageReaction', `${messageId}:${user.id}:${emoji}`, {
      messageId,
      emoji
    }, undefined, meta);

    this.realtimeGateway.emitMessageReactionUpdated(message.conversationId, {
      conversationId: message.conversationId,
      messageId,
      userId: user.id,
      emoji,
      removed: true
    });

    return { success: true };
  }

  async listReadReceipts(user: AuthenticatedUser, messageId: string) {
    await this.getMessageForMemberOrThrow(user, messageId);

    const receipts = await this.prisma.messageReadReceipt.findMany({
      where: { messageId },
      orderBy: [{ readAt: 'desc' }]
    });
    const users = await this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: receipts.map((receipt) => receipt.userId) }
      },
      select: userSummarySelect
    });
    const usersById = new Map(users.map((receiptUser) => [receiptUser.id, receiptUser]));

    return receipts.map((receipt) => ({
      ...receipt,
      user: usersById.get(receipt.userId) ?? null
    }));
  }

  async markMessageRead(user: AuthenticatedUser, messageId: string) {
    await this.getMessageForMemberOrThrow(user, messageId);

    return this.prisma.messageReadReceipt.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId: user.id
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        messageId,
        userId: user.id
      }
    });
  }

  async listNotifications(user: AuthenticatedUser, query: NotificationQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      tenantId: user.tenantId,
      userId: user.id,
      readAt: query.unreadOnly ? null : undefined,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { body: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        select: notificationSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.notification.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async markNotificationRead(user: AuthenticatedUser, notificationId: string) {
    await this.getNotificationOrThrow(user, notificationId);

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
      select: notificationSelect
    });
  }

  async markAllNotificationsRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    return {
      success: true,
      updated: result.count
    };
  }

  private async getConversationForMemberOrThrow(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId: user.tenantId,
        members: {
          some: {
            userId: user.id
          }
        }
      },
      select: conversationSelect
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private async getMessageForMemberOrThrow(user: AuthenticatedUser, messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          tenantId: user.tenantId,
          members: {
            some: {
              userId: user.id
            }
          }
        }
      },
      select: messageSelect
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  private async assertMessageBelongsToConversation(
    conversationId: string,
    messageId: string | undefined,
    label: string
  ) {
    if (!messageId) return;

    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId
      },
      select: { id: true }
    });

    if (!message) {
      throw new BadRequestException(`${label} must belong to the same conversation`);
    }
  }

  private async getNotificationOrThrow(user: AuthenticatedUser, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        tenantId: user.tenantId,
        userId: user.id
      },
      select: notificationSelect
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  private async assertUsersBelongToTenant(tenantId: string, userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: userIds }
      },
      select: { id: true }
    });

    if (users.length !== new Set(userIds).size) {
      throw new NotFoundException('One or more users were not found');
    }
  }

  private async assertDirectConversationDoesNotExist(tenantId: string, memberIds: string[]) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        isGroup: false,
        members: {
          some: {
            userId: memberIds[0]
          }
        }
      },
      select: {
        id: true,
        members: {
          select: {
            userId: true
          }
        }
      }
    });
    const target = [...memberIds].sort().join(':');
    const existing = conversations.find(
      (conversation) =>
        conversation.members.map((member) => member.userId).sort().join(':') === target
    );

    if (existing) {
      throw new ConflictException('Direct conversation already exists for these members');
    }
  }

  private async getConversationMembers(tenantId: string, conversationId: string) {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      orderBy: [{ id: 'asc' }]
    });
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: members.map((member) => member.userId) }
      },
      select: userSummarySelect
    });
    const usersById = new Map(users.map((memberUser) => [memberUser.id, memberUser]));

    return members.map((member) => ({
      ...member,
      user: usersById.get(member.userId) ?? null
    }));
  }

  private async enrichConversations<T extends { members: { userId: string }[] }>(
    tenantId: string,
    conversations: T[]
  ) {
    const userIds = [...new Set(conversations.flatMap((conversation) => conversation.members.map((member) => member.userId)))];
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: userIds }
      },
      select: userSummarySelect
    });
    const usersById = new Map(users.map((memberUser) => [memberUser.id, memberUser]));

    return conversations.map((conversation) => ({
      ...conversation,
      members: conversation.members.map((member) => ({
        ...member,
        user: usersById.get(member.userId) ?? null
      }))
    }));
  }

  private async enrichMessages<T extends { senderId: string }>(tenantId: string, messages: T[]) {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: [...new Set(messages.map((message) => message.senderId))] }
      },
      select: userSummarySelect
    });
    const usersById = new Map(users.map((messageUser) => [messageUser.id, messageUser]));

    return messages.map((message) => ({
      ...message,
      sender: usersById.get(message.senderId) ?? null
    }));
  }

  private assertCanModifyMessage(user: AuthenticatedUser, senderId: string) {
    if (senderId === user.id || user.permissions.includes('manage:all')) {
      return;
    }

    throw new ForbiddenException('Only the sender can modify this message');
  }

  private async emitUnreadNotifications(tenantId: string, userIds: string[]) {
    for (const userId of userIds) {
      const latest = await this.prisma.notification.findFirst({
        where: {
          tenantId,
          userId,
          readAt: null
        },
        select: notificationSelect,
        orderBy: [{ createdAt: 'desc' }]
      });

      if (latest) {
        this.realtimeGateway.emitNotificationCreated(userId, latest as Record<string, unknown>);
      }
    }
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
