import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InternalMailFolder,
  InternalMailPriority,
  InternalMailRecipientKind,
  InternalMailboxMemberRole,
  InternalMailboxStatus,
  InternalMailboxType,
  NotificationChannel,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RealtimeGateway } from '../collaboration/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInternalMailDto } from './dto/create-internal-mail.dto';
import { InternalMailMailboxQueryDto } from './dto/internal-mail-mailbox-query.dto';
import { InternalMailQueryDto } from './dto/internal-mail-query.dto';
import {
  CreateInternalMailboxAliasDto,
  CreateInternalMailboxDto,
  RegenerateInternalMailboxAddressDto,
  UpdateInternalMailboxDto,
  UpsertInternalMailboxMemberDto,
} from './dto/manage-internal-mailbox.dto';
import { ReplyInternalMailDto } from './dto/reply-internal-mail.dto';
import { MoveInternalMailDto, SnoozeInternalMailDto } from './dto/update-internal-mail-state.dto';

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
  status: true,
} satisfies Prisma.UserSelect;

const mailboxAliasSelect = {
  id: true,
  tenantId: true,
  mailboxId: true,
  localPart: true,
  address: true,
  status: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InternalMailboxAliasSelect;

const mailboxSelect = {
  id: true,
  tenantId: true,
  userId: true,
  teamId: true,
  type: true,
  status: true,
  displayName: true,
  localPart: true,
  address: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: userSummarySelect,
  },
  team: {
    select: {
      id: true,
      name: true,
    },
  },
  aliases: {
    select: mailboxAliasSelect,
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  members: {
    select: {
      id: true,
      userId: true,
      role: true,
      user: {
        select: userSummarySelect,
      },
    },
    orderBy: [{ createdAt: 'asc' as const }],
  },
} satisfies Prisma.InternalMailboxSelect;

const recipientSelect = {
  id: true,
  tenantId: true,
  messageId: true,
  userId: true,
  kind: true,
  deliveredAt: true,
  readAt: true,
  createdAt: true,
  user: {
    select: userSummarySelect,
  },
} satisfies Prisma.InternalMailRecipientSelect;

const messageSelect = {
  id: true,
  tenantId: true,
  threadId: true,
  senderId: true,
  subject: true,
  bodyText: true,
  bodyHtml: true,
  priority: true,
  attachments: true,
  isDraft: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
  sender: {
    select: userSummarySelect,
  },
  recipients: {
    select: recipientSelect,
    orderBy: [{ createdAt: 'asc' as const }],
  },
} satisfies Prisma.InternalMailMessageSelect;

const participantSelect = {
  id: true,
  tenantId: true,
  threadId: true,
  userId: true,
  folder: true,
  readAt: true,
  starredAt: true,
  flaggedAt: true,
  pinnedAt: true,
  archivedAt: true,
  deletedAt: true,
  snoozedUntil: true,
  lastReadMessageId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: userSummarySelect,
  },
} satisfies Prisma.InternalMailParticipantSelect;

const threadSelect = {
  id: true,
  tenantId: true,
  subject: true,
  createdById: true,
  priority: true,
  lastMessageAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: userSummarySelect,
  },
  participants: {
    select: participantSelect,
    orderBy: [{ createdAt: 'asc' as const }],
  },
  messages: {
    select: messageSelect,
    orderBy: [{ createdAt: 'asc' as const }],
  },
} satisfies Prisma.InternalMailThreadSelect;

type InternalMailThreadRecord = Prisma.InternalMailThreadGetPayload<{ select: typeof threadSelect }>;
type InternalMailboxRecord = Prisma.InternalMailboxGetPayload<{ select: typeof mailboxSelect }>;
type UserMailboxTarget = { id: string; email: string; firstName: string; lastName: string };

@Injectable()
export class InternalMailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  status() {
    return {
      module: 'internal-mail',
      status: 'ready',
      delivery: 'database-mailbox-with-realtime-notifications',
    };
  }

  async folderSummary(user: AuthenticatedUser) {
    const [byFolder, unread, starred, flagged, pinned] = await Promise.all([
      this.prisma.internalMailParticipant.groupBy({
        by: ['folder'],
        where: { tenantId: user.tenantId, userId: user.id },
        _count: { _all: true },
      }),
      this.prisma.internalMailParticipant.count({
        where: {
          tenantId: user.tenantId,
          userId: user.id,
          folder: { not: InternalMailFolder.DELETED },
          readAt: null,
        },
      }),
      this.prisma.internalMailParticipant.count({
        where: { tenantId: user.tenantId, userId: user.id, starredAt: { not: null } },
      }),
      this.prisma.internalMailParticipant.count({
        where: { tenantId: user.tenantId, userId: user.id, flaggedAt: { not: null } },
      }),
      this.prisma.internalMailParticipant.count({
        where: { tenantId: user.tenantId, userId: user.id, pinnedAt: { not: null } },
      }),
    ]);

    const counts = Object.values(InternalMailFolder).reduce<Record<string, number>>((acc, folder) => {
      acc[folder] = 0;
      return acc;
    }, {});

    for (const row of byFolder) {
      counts[row.folder] = row._count._all;
    }

    return {
      counts,
      unread,
      starred,
      flagged,
      pinned,
    };
  }

  async listMailboxes(user: AuthenticatedUser, query: InternalMailMailboxQueryDto) {
    await this.ensureTenantUserMailboxes(user.tenantId, user.id);

    const search = query.search?.trim();
    const where: Prisma.InternalMailboxWhereInput = {
      tenantId: user.tenantId,
      status: query.status ?? InternalMailboxStatus.ACTIVE,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (search) {
      const normalized = this.normalizeAddressInput(search);
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { address: { contains: normalized, mode: 'insensitive' } },
        { localPart: { contains: normalized.split('@')[0], mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { aliases: { some: { address: { contains: normalized, mode: 'insensitive' } } } },
        { aliases: { some: { localPart: { contains: normalized.split('@')[0], mode: 'insensitive' } } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { team: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [mailboxes, total] = await this.prisma.$transaction([
      this.prisma.internalMailbox.findMany({
        where,
        select: mailboxSelect,
        orderBy: [
          { type: 'asc' },
          { displayName: 'asc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.internalMailbox.count({ where }),
    ]);

    return this.paginate(mailboxes.map((mailbox) => this.serializeMailbox(mailbox)), total, query);
  }

  async ensureUserMailboxIdentity(tenantId: string, userId: string, actorId?: string) {
    const tenant = await this.getTenantAddressContext(tenantId);
    const target = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        status: { not: UserStatus.DEACTIVATED },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    await this.ensureUserMailbox(tenantId, tenant.slug, target, actorId);

    const mailbox = await this.prisma.internalMailbox.findUnique({
      where: { userId },
      select: mailboxSelect,
    });

    if (!mailbox) {
      throw new NotFoundException('Internal mailbox not found');
    }

    return this.serializeMailbox(mailbox);
  }

  async createMailbox(user: AuthenticatedUser, dto: CreateInternalMailboxDto, meta: RequestMeta) {
    this.assertMailboxAdministrator(user);
    const tenant = await this.getTenantAddressContext(user.tenantId);
    const type = dto.type ?? InternalMailboxType.SHARED;
    await this.assertMailboxTargetsBelongToTenant(user.tenantId, dto.userId, dto.teamId, dto.memberIds);
    const localPart = this.normalizeLocalPart(dto.localPart || dto.address?.split('@')[0] || dto.displayName);
    const address = dto.address ? this.normalizeAddressInput(dto.address) : this.mailboxAddress(localPart, tenant.slug);

    const mailbox = await this.prisma.internalMailbox.create({
      data: {
        tenantId: user.tenantId,
        userId: dto.userId,
        teamId: dto.teamId,
        type,
        status: InternalMailboxStatus.ACTIVE,
        displayName: dto.displayName.trim(),
        localPart,
        address,
        description: dto.description?.trim() || null,
        createdById: user.id,
        updatedById: user.id,
        aliases: {
          create: {
            tenantId: user.tenantId,
            localPart,
            address,
            status: InternalMailboxStatus.ACTIVE,
            isPrimary: true,
            createdById: user.id,
          },
        },
        members: dto.memberIds?.length
          ? {
              createMany: {
                data: dto.memberIds.map((memberId) => ({
                  tenantId: user.tenantId,
                  userId: memberId,
                  role: memberId === dto.userId ? InternalMailboxMemberRole.OWNER : InternalMailboxMemberRole.MEMBER,
                  createdById: user.id,
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      select: mailboxSelect,
    });

    await this.audit(user, 'internal_mail.mailbox_create', mailbox.id, undefined, this.auditMailbox(mailbox), meta);
    return this.serializeMailbox(mailbox);
  }

  async updateMailbox(user: AuthenticatedUser, mailboxId: string, dto: UpdateInternalMailboxDto, meta: RequestMeta) {
    this.assertMailboxAdministrator(user);
    const current = await this.getMailboxOrThrow(user.tenantId, mailboxId);
    const tenant = await this.getTenantAddressContext(user.tenantId);
    await this.assertMailboxTargetsBelongToTenant(user.tenantId, dto.userId, dto.teamId);

    const localPart = dto.localPart ? this.normalizeLocalPart(dto.localPart) : dto.address ? this.normalizeLocalPart(dto.address.split('@')[0]) : undefined;
    const address = dto.address
      ? this.normalizeAddressInput(dto.address)
      : localPart
        ? this.mailboxAddress(localPart, tenant.slug)
        : undefined;

    const updated = await this.prisma.internalMailbox.update({
      where: { id: mailboxId },
      data: {
        displayName: dto.displayName?.trim(),
        description: dto.description?.trim() ?? undefined,
        localPart,
        address,
        status: dto.status,
        userId: dto.userId,
        teamId: dto.teamId,
        updatedById: user.id,
      },
      select: mailboxSelect,
    });

    if (localPart || address) {
      await this.prisma.internalMailboxAlias.upsert({
        where: { tenantId_address: { tenantId: user.tenantId, address: updated.address } },
        update: {
          localPart: updated.localPart,
          status: updated.status,
          isPrimary: true,
        },
        create: {
          tenantId: user.tenantId,
          mailboxId,
          localPart: updated.localPart,
          address: updated.address,
          status: updated.status,
          isPrimary: true,
          createdById: user.id,
        },
      });
    }

    await this.audit(user, 'internal_mail.mailbox_update', mailboxId, this.auditMailbox(current), this.auditMailbox(updated), meta);
    return this.serializeMailbox(updated);
  }

  async createAlias(user: AuthenticatedUser, mailboxId: string, dto: CreateInternalMailboxAliasDto, meta: RequestMeta) {
    this.assertMailboxAdministrator(user);
    const mailbox = await this.getMailboxOrThrow(user.tenantId, mailboxId);
    const tenant = await this.getTenantAddressContext(user.tenantId);
    const localPart = this.normalizeLocalPart(dto.localPart || dto.address?.split('@')[0] || mailbox.localPart);
    const address = dto.address ? this.normalizeAddressInput(dto.address) : this.mailboxAddress(localPart, tenant.slug);

    if (dto.isPrimary) {
      await this.prisma.internalMailboxAlias.updateMany({
        where: { tenantId: user.tenantId, mailboxId },
        data: { isPrimary: false },
      });
    }

    const alias = await this.prisma.internalMailboxAlias.create({
      data: {
        tenantId: user.tenantId,
        mailboxId,
        localPart,
        address,
        status: InternalMailboxStatus.ACTIVE,
        isPrimary: dto.isPrimary === true,
        createdById: user.id,
      },
      select: mailboxAliasSelect,
    });

    await this.audit(user, 'internal_mail.mailbox_alias_create', mailboxId, undefined, alias as Prisma.InputJsonValue, meta);
    return alias;
  }

  async regenerateAddress(
    user: AuthenticatedUser,
    mailboxId: string,
    dto: RegenerateInternalMailboxAddressDto,
    meta: RequestMeta,
  ) {
    this.assertMailboxAdministrator(user);
    const current = await this.getMailboxOrThrow(user.tenantId, mailboxId);
    const tenant = await this.getTenantAddressContext(user.tenantId);
    const baseLocalPart = dto.localPart
      ? this.normalizeLocalPart(dto.localPart)
      : this.mailboxBaseLocalPart(current);
    const localPart = await this.availableLocalPart(user.tenantId, baseLocalPart, mailboxId);
    const address = this.mailboxAddress(localPart, tenant.slug);
    const keepPreviousAsAlias = dto.keepPreviousAsAlias !== false;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (keepPreviousAsAlias) {
        await tx.internalMailboxAlias.upsert({
          where: { tenantId_address: { tenantId: user.tenantId, address: current.address } },
          update: {
            localPart: current.localPart,
            status: InternalMailboxStatus.ACTIVE,
            isPrimary: false,
          },
          create: {
            tenantId: user.tenantId,
            mailboxId,
            localPart: current.localPart,
            address: current.address,
            status: InternalMailboxStatus.ACTIVE,
            isPrimary: false,
            createdById: user.id,
          },
        });
      }

      await tx.internalMailboxAlias.updateMany({
        where: { tenantId: user.tenantId, mailboxId },
        data: { isPrimary: false },
      });

      const next = await tx.internalMailbox.update({
        where: { id: mailboxId },
        data: {
          localPart,
          address,
          updatedById: user.id,
        },
        select: mailboxSelect,
      });

      await tx.internalMailboxAlias.upsert({
        where: { tenantId_address: { tenantId: user.tenantId, address } },
        update: {
          localPart,
          status: InternalMailboxStatus.ACTIVE,
          isPrimary: true,
        },
        create: {
          tenantId: user.tenantId,
          mailboxId,
          localPart,
          address,
          status: InternalMailboxStatus.ACTIVE,
          isPrimary: true,
          createdById: user.id,
        },
      });

      return next;
    });

    await this.audit(
      user,
      'internal_mail.mailbox_address_regenerate',
      mailboxId,
      this.auditMailbox(current),
      this.auditMailbox(updated),
      meta,
    );

    return this.serializeMailbox(updated);
  }

  async addMailboxMember(user: AuthenticatedUser, mailboxId: string, dto: UpsertInternalMailboxMemberDto, meta: RequestMeta) {
    this.assertMailboxAdministrator(user);
    await this.getMailboxOrThrow(user.tenantId, mailboxId);
    await this.assertUsersBelongToTenant(user.tenantId, [dto.userId]);

    const member = await this.prisma.internalMailboxMember.upsert({
      where: { mailboxId_userId: { mailboxId, userId: dto.userId } },
      update: {
        role: dto.role ?? InternalMailboxMemberRole.MEMBER,
      },
      create: {
        tenantId: user.tenantId,
        mailboxId,
        userId: dto.userId,
        role: dto.role ?? InternalMailboxMemberRole.MEMBER,
        createdById: user.id,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        user: { select: userSummarySelect },
      },
    });

    await this.audit(user, 'internal_mail.mailbox_member_upsert', mailboxId, undefined, member as Prisma.InputJsonValue, meta);
    return member;
  }

  async removeMailboxMember(user: AuthenticatedUser, mailboxId: string, memberUserId: string, meta: RequestMeta) {
    this.assertMailboxAdministrator(user);
    await this.getMailboxOrThrow(user.tenantId, mailboxId);
    const member = await this.prisma.internalMailboxMember.findFirst({
      where: { tenantId: user.tenantId, mailboxId, userId: memberUserId },
      select: { id: true, userId: true, role: true },
    });

    if (!member) {
      throw new NotFoundException('Mailbox member not found');
    }

    await this.prisma.internalMailboxMember.delete({ where: { id: member.id } });
    await this.audit(user, 'internal_mail.mailbox_member_remove', mailboxId, member as Prisma.InputJsonValue, undefined, meta);

    return { success: true };
  }

  async listThreads(user: AuthenticatedUser, query: InternalMailQueryDto) {
    const where = this.threadListWhere(user, query);

    const [participants, total] = await this.prisma.$transaction([
      this.prisma.internalMailParticipant.findMany({
        where,
        include: {
          thread: {
            select: {
              ...threadSelect,
              messages: {
                select: messageSelect,
                orderBy: [{ createdAt: 'desc' }],
                take: 1,
              },
            },
          },
        },
        orderBy: [{ thread: { lastMessageAt: 'desc' } }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.internalMailParticipant.count({ where }),
    ]);

    return this.paginate(
      participants.map((participant) => this.serializeThread(participant.thread, participant)),
      total,
      query,
    );
  }

  async getThread(user: AuthenticatedUser, threadId: string, markRead = false) {
    const participant = await this.getParticipantOrThrow(user, threadId);

    if (markRead && !participant.readAt) {
      await this.markRead(user, threadId);
    }

    const thread = await this.prisma.internalMailThread.findFirst({
      where: { id: threadId, tenantId: user.tenantId },
      select: threadSelect,
    });

    if (!thread) {
      throw new NotFoundException('Internal mail thread not found');
    }

    return this.serializeThread(thread, participant);
  }

  async createThread(user: AuthenticatedUser, dto: CreateInternalMailDto, meta: RequestMeta) {
    const subject = this.cleanSubject(dto.subject);
    const priority = dto.priority ?? InternalMailPriority.NORMAL;
    const saveAsDraft = dto.saveAsDraft === true;
    const recipients = await this.resolveRecipients(user, dto);
    const recipientIds = [...new Set(recipients.map((recipient) => recipient.userId))];

    if (!saveAsDraft && recipientIds.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    await this.assertUsersBelongToTenant(user.tenantId, recipientIds);
    const now = new Date();
    const participantIds = [...new Set([user.id, ...recipientIds])];

    const created = await this.prisma.$transaction(async (tx) => {
      const thread = await tx.internalMailThread.create({
        data: {
          tenantId: user.tenantId,
          createdById: user.id,
          subject,
          priority,
          lastMessageAt: now,
          metadata: {
            source: 'work-hub.internal-mail',
          },
        },
        select: { id: true },
      });

      const message = await tx.internalMailMessage.create({
        data: {
          tenantId: user.tenantId,
          threadId: thread.id,
          senderId: user.id,
          subject,
          bodyText: dto.bodyText.trim(),
          bodyHtml: dto.bodyHtml?.trim() || null,
          priority,
          attachments: this.toJson(dto.attachments),
          isDraft: saveAsDraft,
          sentAt: saveAsDraft ? null : now,
          recipients: recipients.length
            ? {
                create: recipients.map((recipient) => ({
                  tenantId: user.tenantId,
                  userId: recipient.userId,
                  kind: recipient.kind,
                  deliveredAt: saveAsDraft ? null : now,
                })),
              }
            : undefined,
        },
        select: { id: true },
      });

      await tx.internalMailParticipant.createMany({
        data: participantIds.map((userId) => ({
          tenantId: user.tenantId,
          threadId: thread.id,
          userId,
          folder:
            userId === user.id
              ? saveAsDraft
                ? InternalMailFolder.DRAFTS
                : InternalMailFolder.SENT
              : InternalMailFolder.INBOX,
          readAt: userId === user.id ? now : null,
          lastReadMessageId: userId === user.id ? message.id : null,
        })),
        skipDuplicates: true,
      });

      return { threadId: thread.id, messageId: message.id };
    });

    await this.audit(user, saveAsDraft ? 'internal_mail.draft_create' : 'internal_mail.send', created.threadId, undefined, {
      recipientCount: recipientIds.length,
      priority,
    }, meta);

    if (!saveAsDraft) {
      await this.notifyRecipients(user, recipientIds, subject, dto.bodyText, created.threadId, created.messageId, priority, meta);
    }

    return this.getThread(user, created.threadId);
  }

  async sendDraft(user: AuthenticatedUser, threadId: string, meta: RequestMeta) {
    const participant = await this.getParticipantOrThrow(user, threadId);

    if (participant.folder !== InternalMailFolder.DRAFTS) {
      throw new BadRequestException('Only draft mail can be sent from drafts');
    }

    const thread = await this.prisma.internalMailThread.findFirst({
      where: { id: threadId, tenantId: user.tenantId },
      select: {
        id: true,
        subject: true,
        priority: true,
        participants: {
          select: { userId: true },
        },
        messages: {
          where: { isDraft: true },
          orderBy: [{ createdAt: 'desc' }],
          take: 1,
          select: {
            id: true,
            subject: true,
            bodyText: true,
            priority: true,
            recipients: {
              select: {
                kind: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Internal mail thread not found');
    }

    const draftMessage = thread.messages[0];
    if (!draftMessage) {
      throw new BadRequestException('Draft message was already sent or is no longer editable');
    }

    const recipients = draftMessage.recipients.length
      ? draftMessage.recipients.map((recipient) => ({ userId: recipient.userId, kind: recipient.kind }))
      : thread.participants
          .filter((item) => item.userId !== user.id)
          .map((item) => ({ userId: item.userId, kind: InternalMailRecipientKind.TO }));
    const recipientIds = [...new Set(recipients.map((recipient) => recipient.userId))];

    if (!recipientIds.length) {
      throw new BadRequestException('At least one recipient is required');
    }

    await this.assertUsersBelongToTenant(user.tenantId, recipientIds);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.internalMailMessage.update({
        where: { id: draftMessage.id },
        data: {
          isDraft: false,
          sentAt: now,
        },
      });

      if (draftMessage.recipients.length) {
        await tx.internalMailRecipient.updateMany({
          where: { tenantId: user.tenantId, messageId: draftMessage.id },
          data: { deliveredAt: now },
        });
      } else {
        await tx.internalMailRecipient.createMany({
          data: recipients.map((recipient) => ({
            tenantId: user.tenantId,
            messageId: draftMessage.id,
            userId: recipient.userId,
            kind: recipient.kind,
            deliveredAt: now,
          })),
          skipDuplicates: true,
        });
      }

      await tx.internalMailThread.update({
        where: { id: threadId },
        data: {
          lastMessageAt: now,
          priority: draftMessage.priority,
        },
      });

      await tx.internalMailParticipant.update({
        where: { id: participant.id },
        data: {
          archivedAt: null,
          deletedAt: null,
          folder: InternalMailFolder.SENT,
          lastReadMessageId: draftMessage.id,
          readAt: now,
          snoozedUntil: null,
        },
      });

      for (const recipientId of recipientIds) {
        await tx.internalMailParticipant.upsert({
          where: { threadId_userId: { threadId, userId: recipientId } },
          update: {
            archivedAt: null,
            deletedAt: null,
            folder: InternalMailFolder.INBOX,
            readAt: null,
            snoozedUntil: null,
          },
          create: {
            tenantId: user.tenantId,
            threadId,
            userId: recipientId,
            folder: InternalMailFolder.INBOX,
          },
        });
      }
    });

    await this.audit(user, 'internal_mail.draft_send', threadId, undefined, {
      messageId: draftMessage.id,
      recipientCount: recipientIds.length,
    }, meta);
    await this.notifyRecipients(user, recipientIds, thread.subject, draftMessage.bodyText, threadId, draftMessage.id, draftMessage.priority, meta);

    return this.getThread(user, threadId);
  }

  async reply(user: AuthenticatedUser, threadId: string, dto: ReplyInternalMailDto, meta: RequestMeta) {
    const participant = await this.getParticipantOrThrow(user, threadId);
    const thread = await this.prisma.internalMailThread.findFirst({
      where: { id: threadId, tenantId: user.tenantId },
      select: {
        id: true,
        subject: true,
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Internal mail thread not found');
    }

    const explicitRecipients = await this.resolveRecipients(user, dto);
    const fallbackRecipientIds = thread.participants
      .map((item) => item.userId)
      .filter((participantUserId) => participantUserId !== user.id);
    const recipients = explicitRecipients.length
      ? explicitRecipients
      : fallbackRecipientIds.map((userId) => ({ userId, kind: InternalMailRecipientKind.TO }));
    const recipientIds = [...new Set(recipients.map((recipient) => recipient.userId))];

    if (!recipientIds.length) {
      throw new BadRequestException('At least one recipient is required');
    }

    await this.assertUsersBelongToTenant(user.tenantId, recipientIds);
    const now = new Date();
    const priority = dto.priority ?? InternalMailPriority.NORMAL;
    const subject = thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const message = await tx.internalMailMessage.create({
        data: {
          tenantId: user.tenantId,
          threadId,
          senderId: user.id,
          subject,
          bodyText: dto.bodyText.trim(),
          bodyHtml: dto.bodyHtml?.trim() || null,
          priority,
          attachments: this.toJson(dto.attachments),
          sentAt: now,
          recipients: {
            create: recipients.map((recipient) => ({
              tenantId: user.tenantId,
              userId: recipient.userId,
              kind: recipient.kind,
              deliveredAt: now,
            })),
          },
        },
        select: { id: true },
      });

      await tx.internalMailThread.update({
        where: { id: threadId },
        data: { lastMessageAt: now, priority },
      });

      await tx.internalMailParticipant.update({
        where: { id: participant.id },
        data: {
          readAt: now,
          lastReadMessageId: message.id,
        },
      });

      for (const recipientId of recipientIds) {
        await tx.internalMailParticipant.upsert({
          where: { threadId_userId: { threadId, userId: recipientId } },
          update: {
            folder: InternalMailFolder.INBOX,
            readAt: null,
            deletedAt: null,
            archivedAt: null,
            snoozedUntil: null,
          },
          create: {
            tenantId: user.tenantId,
            threadId,
            userId: recipientId,
            folder: InternalMailFolder.INBOX,
          },
        });
      }

      return { messageId: message.id };
    });

    await this.audit(user, 'internal_mail.reply', threadId, undefined, {
      recipientCount: recipientIds.length,
      messageId: created.messageId,
    }, meta);
    await this.notifyRecipients(user, recipientIds, subject, dto.bodyText, threadId, created.messageId, priority, meta);

    return this.getThread(user, threadId);
  }

  async markRead(user: AuthenticatedUser, threadId: string) {
    const participant = await this.getParticipantOrThrow(user, threadId);
    const latestMessage = await this.prisma.internalMailMessage.findFirst({
      where: { tenantId: user.tenantId, threadId },
      orderBy: [{ createdAt: 'desc' }],
      select: { id: true },
    });
    const now = new Date();

    const updated = await this.prisma.internalMailParticipant.update({
      where: { id: participant.id },
      data: { readAt: now, lastReadMessageId: latestMessage?.id ?? participant.lastReadMessageId },
      select: participantSelect,
    });

    await this.prisma.internalMailRecipient.updateMany({
      where: { tenantId: user.tenantId, userId: user.id, message: { threadId }, readAt: null },
      data: { readAt: now },
    });

    this.realtimeGateway.emitInternalMailUpdated(user.id, { threadId, state: 'read' });
    return updated;
  }

  async markUnread(user: AuthenticatedUser, threadId: string) {
    const participant = await this.getParticipantOrThrow(user, threadId);
    const updated = await this.prisma.internalMailParticipant.update({
      where: { id: participant.id },
      data: { readAt: null, lastReadMessageId: null },
      select: participantSelect,
    });

    this.realtimeGateway.emitInternalMailUpdated(user.id, { threadId, state: 'unread' });
    return updated;
  }

  async setStar(user: AuthenticatedUser, threadId: string, value: boolean, meta: RequestMeta) {
    return this.updateParticipantDate(user, threadId, 'starredAt', value, 'internal_mail.star', meta);
  }

  async setFlag(user: AuthenticatedUser, threadId: string, value: boolean, meta: RequestMeta) {
    return this.updateParticipantDate(user, threadId, 'flaggedAt', value, 'internal_mail.flag', meta);
  }

  async setPin(user: AuthenticatedUser, threadId: string, value: boolean, meta: RequestMeta) {
    return this.updateParticipantDate(user, threadId, 'pinnedAt', value, 'internal_mail.pin', meta);
  }

  async snooze(user: AuthenticatedUser, threadId: string, dto: SnoozeInternalMailDto, meta: RequestMeta) {
    const participant = await this.getParticipantOrThrow(user, threadId);
    const snoozedUntil = dto.snoozedUntil ? new Date(dto.snoozedUntil) : null;

    if (snoozedUntil && Number.isNaN(snoozedUntil.getTime())) {
      throw new BadRequestException('Invalid snooze date');
    }

    const updated = await this.prisma.internalMailParticipant.update({
      where: { id: participant.id },
      data: {
        folder: snoozedUntil ? InternalMailFolder.SNOOZED : InternalMailFolder.INBOX,
        snoozedUntil,
      },
      select: participantSelect,
    });

    await this.audit(user, 'internal_mail.snooze', threadId, undefined, { snoozedUntil }, meta);
    this.realtimeGateway.emitInternalMailUpdated(user.id, { threadId, state: 'snoozed' });
    return updated;
  }

  archive(user: AuthenticatedUser, threadId: string, meta: RequestMeta) {
    return this.move(user, threadId, { folder: InternalMailFolder.ARCHIVE }, meta, 'internal_mail.archive');
  }

  restore(user: AuthenticatedUser, threadId: string, meta: RequestMeta) {
    return this.move(user, threadId, { folder: InternalMailFolder.INBOX }, meta, 'internal_mail.restore');
  }

  delete(user: AuthenticatedUser, threadId: string, meta: RequestMeta) {
    return this.move(user, threadId, { folder: InternalMailFolder.DELETED }, meta, 'internal_mail.delete');
  }

  async move(
    user: AuthenticatedUser,
    threadId: string,
    dto: MoveInternalMailDto,
    meta: RequestMeta,
    action = 'internal_mail.move',
  ) {
    const participant = await this.getParticipantOrThrow(user, threadId);
    const now = new Date();
    const updated = await this.prisma.internalMailParticipant.update({
      where: { id: participant.id },
      data: {
        folder: dto.folder,
        archivedAt: dto.folder === InternalMailFolder.ARCHIVE ? now : null,
        deletedAt: dto.folder === InternalMailFolder.DELETED ? now : null,
        snoozedUntil: dto.folder === InternalMailFolder.SNOOZED ? participant.snoozedUntil : null,
      },
      select: participantSelect,
    });

    await this.audit(user, action, threadId, { folder: participant.folder }, { folder: dto.folder }, meta);
    this.realtimeGateway.emitInternalMailUpdated(user.id, { threadId, folder: dto.folder });
    return updated;
  }

  private threadListWhere(user: AuthenticatedUser, query: InternalMailQueryDto) {
    const where: Prisma.InternalMailParticipantWhereInput = {
      tenantId: user.tenantId,
      userId: user.id,
      folder: query.folder ?? InternalMailFolder.INBOX,
    };

    if (query.unreadOnly) where.readAt = null;
    if (query.starredOnly) {
      delete where.folder;
      where.starredAt = { not: null };
    }
    if (query.flaggedOnly) {
      delete where.folder;
      where.flaggedAt = { not: null };
    }
    if (query.pinnedOnly) {
      delete where.folder;
      where.pinnedAt = { not: null };
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.thread = {
        OR: [
          { subject: { contains: search, mode: 'insensitive' } },
          {
            messages: {
              some: {
                OR: [
                  { bodyText: { contains: search, mode: 'insensitive' } },
                  { sender: { email: { contains: search, mode: 'insensitive' } } },
                  { sender: { firstName: { contains: search, mode: 'insensitive' } } },
                  { sender: { lastName: { contains: search, mode: 'insensitive' } } },
                ],
              },
            },
          },
        ],
      };
    }

    return where;
  }

  private serializeThread(thread: InternalMailThreadRecord, participant: unknown) {
    const currentParticipant = participant as Prisma.InternalMailParticipantGetPayload<{ select: typeof participantSelect }>;
    const sortedMessages = [...thread.messages].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
    const latestMessage = sortedMessages[sortedMessages.length - 1] ?? null;
    const unread = !currentParticipant.readAt && latestMessage?.senderId !== currentParticipant.userId;

    return {
      ...thread,
      currentParticipant,
      latestMessage,
      unread,
      messageCount: thread.messages.length,
      recipientCount: thread.participants.length,
    };
  }

  private async getParticipantOrThrow(user: AuthenticatedUser, threadId: string) {
    const participant = await this.prisma.internalMailParticipant.findFirst({
      where: {
        tenantId: user.tenantId,
        threadId,
        userId: user.id,
      },
      select: participantSelect,
    });

    if (!participant) {
      throw new NotFoundException('Internal mail thread not found');
    }

    return participant;
  }

  private async resolveRecipients(
    user: AuthenticatedUser,
    dto: {
      toIds?: string[];
      ccIds?: string[];
      bccIds?: string[];
      toAddresses?: string[];
      ccAddresses?: string[];
      bccAddresses?: string[];
    },
  ) {
    await this.ensureTenantUserMailboxes(user.tenantId, user.id);

    const recipients = [
      ...(await this.resolveRecipientBucket(user, InternalMailRecipientKind.TO, dto.toIds, dto.toAddresses)),
      ...(await this.resolveRecipientBucket(user, InternalMailRecipientKind.CC, dto.ccIds, dto.ccAddresses)),
      ...(await this.resolveRecipientBucket(user, InternalMailRecipientKind.BCC, dto.bccIds, dto.bccAddresses)),
    ];
    const seen = new Set<string>();

    return recipients.filter((recipient) => {
      const key = `${recipient.kind}:${recipient.userId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async resolveRecipientBucket(
    user: AuthenticatedUser,
    kind: InternalMailRecipientKind,
    ids: string[] = [],
    addresses: string[] = [],
  ) {
    const idRecipients = ids
      .map((userId) => userId?.trim())
      .filter((userId): userId is string => Boolean(userId))
      .map((userId) => ({ userId, kind }));
    const addressRecipients = await this.resolveMailboxAddresses(user, addresses, kind);

    return [...idRecipients, ...addressRecipients];
  }

  private async resolveMailboxAddresses(
    user: AuthenticatedUser,
    values: string[] = [],
    kind: InternalMailRecipientKind,
  ) {
    const tokens = this.normalizeAddressInputs(values);
    if (!tokens.length) return [];

    const tenant = await this.getTenantAddressContext(user.tenantId);
    const localParts = tokens.map((token) => this.addressLocalPart(token));
    const addresses = tokens.map((token) =>
      token.includes('@') ? this.normalizeAddressInput(token) : this.mailboxAddress(token, tenant.slug),
    );
    const lookupAddresses = [...new Set([...tokens.filter((token) => token.includes('@')), ...addresses].map((token) => this.normalizeAddressInput(token)))];
    const lookupLocalParts = [...new Set(localParts)];

    const mailboxes = await this.prisma.internalMailbox.findMany({
      where: {
        tenantId: user.tenantId,
        status: InternalMailboxStatus.ACTIVE,
        OR: [
          { address: { in: lookupAddresses } },
          { localPart: { in: lookupLocalParts } },
          { aliases: { some: { status: InternalMailboxStatus.ACTIVE, address: { in: lookupAddresses } } } },
          { aliases: { some: { status: InternalMailboxStatus.ACTIVE, localPart: { in: lookupLocalParts } } } },
          { user: { email: { in: lookupAddresses } } },
        ],
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        teamId: true,
        type: true,
        address: true,
        localPart: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        aliases: {
          where: { status: InternalMailboxStatus.ACTIVE },
          select: {
            address: true,
            localPart: true,
          },
        },
        members: {
          select: {
            userId: true,
          },
        },
      },
    });

    const missing = tokens.filter((token) => !mailboxes.some((mailbox) => this.mailboxMatchesInput(mailbox, token, tenant.slug)));
    if (missing.length) {
      throw new BadRequestException(`Unknown or inactive internal mailbox: ${missing.join(', ')}`);
    }

    const userIds = new Set<string>();
    const teamIds = new Set<string>();

    for (const mailbox of mailboxes) {
      if (mailbox.userId) userIds.add(mailbox.userId);
      for (const member of mailbox.members) userIds.add(member.userId);
      if (mailbox.type === InternalMailboxType.TEAM && mailbox.teamId) teamIds.add(mailbox.teamId);
    }

    if (teamIds.size) {
      const teamMembers = await this.prisma.teamMember.findMany({
        where: {
          teamId: { in: [...teamIds] },
          user: {
            tenantId: user.tenantId,
            status: { not: UserStatus.DEACTIVATED },
          },
        },
        select: { userId: true },
      });
      for (const member of teamMembers) userIds.add(member.userId);
    }

    return [...userIds].map((userId) => ({ userId, kind }));
  }

  private async ensureTenantUserMailboxes(tenantId: string, actorId?: string) {
    const tenant = await this.getTenantAddressContext(tenantId);
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: { not: UserStatus.DEACTIVATED },
        internalMailbox: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ createdAt: 'asc' }],
      take: 250,
    });

    for (const target of users) {
      await this.ensureUserMailbox(tenantId, tenant.slug, target, actorId);
    }
  }

  private async ensureUserMailbox(
    tenantId: string,
    tenantSlug: string,
    target: UserMailboxTarget,
    actorId?: string,
  ) {
    const existing = await this.prisma.internalMailbox.findUnique({
      where: { userId: target.id },
      select: { id: true },
    });
    if (existing) return existing;

    const baseLocalPart = this.preferredLocalPart(target);
    const localPart = await this.availableLocalPart(tenantId, baseLocalPart);
    const address = this.mailboxAddress(localPart, tenantSlug);
    const displayName = `${target.firstName} ${target.lastName}`.trim() || target.email;

    const mailbox = await this.prisma.internalMailbox.create({
      data: {
        tenantId,
        userId: target.id,
        type: InternalMailboxType.USER,
        status: InternalMailboxStatus.ACTIVE,
        displayName,
        localPart,
        address,
        description: 'Primary user mailbox',
        createdById: actorId,
        updatedById: actorId,
        aliases: {
          create: {
            tenantId,
            localPart,
            address,
            status: InternalMailboxStatus.ACTIVE,
            isPrimary: true,
            createdById: actorId,
          },
        },
      },
      select: { id: true },
    });

    return mailbox;
  }

  private async availableLocalPart(tenantId: string, base: string, excludeMailboxId?: string) {
    let candidate = base;
    let suffix = 1;

    while (await this.localPartExists(tenantId, candidate, excludeMailboxId)) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }

    return candidate;
  }

  private async localPartExists(tenantId: string, localPart: string, excludeMailboxId?: string) {
    const normalized = this.normalizeLocalPart(localPart);
    const [mailbox, alias] = await this.prisma.$transaction([
      this.prisma.internalMailbox.findFirst({
        where: {
          tenantId,
          localPart: normalized,
          ...(excludeMailboxId ? { id: { not: excludeMailboxId } } : {}),
        },
        select: { id: true },
      }),
      this.prisma.internalMailboxAlias.findFirst({
        where: {
          tenantId,
          localPart: normalized,
          ...(excludeMailboxId ? { mailboxId: { not: excludeMailboxId } } : {}),
        },
        select: { id: true },
      }),
    ]);

    return Boolean(mailbox || alias);
  }

  private async getTenantAddressContext(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  private serializeMailbox(mailbox: InternalMailboxRecord) {
    return {
      ...mailbox,
      primaryAddress: mailbox.address,
      canReceive: mailbox.status === InternalMailboxStatus.ACTIVE,
      memberCount: mailbox.members.length + (mailbox.userId ? 1 : 0),
    };
  }

  private preferredLocalPart(user: { email: string; firstName: string; lastName: string }) {
    const fullName = this.normalizeLocalPart(`${user.firstName}.${user.lastName}`);
    if (fullName.length >= 3) return fullName;

    const emailPart = this.normalizeLocalPart(user.email.split('@')[0] ?? '');
    return emailPart || 'user';
  }

  private mailboxBaseLocalPart(mailbox: InternalMailboxRecord) {
    if (mailbox.type === InternalMailboxType.USER && mailbox.user) {
      return this.preferredLocalPart(mailbox.user);
    }

    if (mailbox.type === InternalMailboxType.TEAM && mailbox.team?.name) {
      return this.normalizeLocalPart(mailbox.team.name);
    }

    return this.normalizeLocalPart(mailbox.displayName || mailbox.localPart);
  }

  private normalizeAddressInputs(values: string[]) {
    return [
      ...new Set(
        values
          .flatMap((value) => String(value ?? '').split(/[,\n;\t]+/))
          .map((value) => value.trim())
          .map((value) => value.match(/<([^>]+)>/)?.[1] ?? value)
          .map((value) => this.normalizeAddressInput(value))
          .filter(Boolean),
      ),
    ];
  }

  private normalizeAddressInput(value: string) {
    return value.trim().toLowerCase();
  }

  private addressLocalPart(value: string) {
    return this.normalizeLocalPart(value.includes('@') ? value.split('@')[0] : value);
  }

  private normalizeLocalPart(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '.')
      .replace(/[._-]{2,}/g, '.')
      .replace(/^[._-]+|[._-]+$/g, '');

    return normalized.slice(0, 64) || 'user';
  }

  private mailboxAddress(localPart: string, tenantSlug: string) {
    const normalizedLocalPart = this.normalizeLocalPart(localPart);
    const normalizedTenantSlug = this.normalizeLocalPart(tenantSlug);
    const domain = (process.env.INTERNAL_MAIL_DOMAIN || 'taskbricks.local').trim().toLowerCase();
    return `${normalizedLocalPart}@${normalizedTenantSlug}.${domain}`;
  }

  private mailboxMatchesInput(
    mailbox: {
      address: string;
      localPart: string;
      user?: { email: string } | null;
      aliases: Array<{ address: string; localPart: string }>;
    },
    input: string,
    tenantSlug: string,
  ) {
    const normalized = this.normalizeAddressInput(input);
    const localPart = this.addressLocalPart(normalized);
    const fullAddress = normalized.includes('@') ? normalized : this.mailboxAddress(normalized, tenantSlug);
    const candidates = [
      mailbox.address,
      mailbox.localPart,
      mailbox.user?.email,
      ...mailbox.aliases.flatMap((alias) => [alias.address, alias.localPart]),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => this.normalizeAddressInput(value));

    return candidates.includes(normalized) || candidates.includes(fullAddress) || candidates.includes(localPart);
  }

  private async assertUsersBelongToTenant(tenantId: string, userIds: string[]) {
    const ids = [...new Set(userIds)];
    if (!ids.length) return;

    const count = await this.prisma.user.count({
      where: {
        id: { in: ids },
        tenantId,
      },
    });

    if (count !== ids.length) {
      throw new ForbiddenException('All recipients must belong to this tenant');
    }
  }

  private async assertMailboxTargetsBelongToTenant(
    tenantId: string,
    userId?: string,
    teamId?: string,
    memberIds: string[] = [],
  ) {
    if (userId) await this.assertUsersBelongToTenant(tenantId, [userId]);
    if (memberIds.length) await this.assertUsersBelongToTenant(tenantId, memberIds);
    if (!teamId) return;

    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId },
      select: { id: true },
    });

    if (!team) {
      throw new ForbiddenException('Mailbox team must belong to this tenant');
    }
  }

  private assertMailboxAdministrator(user: AuthenticatedUser) {
    const permissions = new Set(user.permissions ?? []);
    if (permissions.has('manage:all') || permissions.has('manage:users') || permissions.has('manage:teams')) {
      return;
    }

    throw new ForbiddenException('Mailbox administration requires tenant management permissions');
  }

  private async getMailboxOrThrow(tenantId: string, mailboxId: string) {
    const mailbox = await this.prisma.internalMailbox.findFirst({
      where: { id: mailboxId, tenantId },
      select: mailboxSelect,
    });

    if (!mailbox) {
      throw new NotFoundException('Internal mailbox not found');
    }

    return mailbox;
  }

  private auditMailbox(mailbox: InternalMailboxRecord) {
    return {
      id: mailbox.id,
      type: mailbox.type,
      status: mailbox.status,
      displayName: mailbox.displayName,
      localPart: mailbox.localPart,
      address: mailbox.address,
      userId: mailbox.userId,
      teamId: mailbox.teamId,
      aliasCount: mailbox.aliases.length,
      memberCount: mailbox.members.length,
    } satisfies Prisma.InputJsonObject;
  }

  private async notifyRecipients(
    user: AuthenticatedUser,
    recipientIds: string[],
    subject: string,
    bodyText: string,
    threadId: string,
    messageId: string,
    priority: InternalMailPriority,
    meta: RequestMeta,
  ) {
    const recipients = recipientIds.filter((recipientId) => recipientId !== user.id);
    if (!recipients.length) return;

    await this.notificationsService.create(
      user,
      {
        userIds: recipients,
        title: `New mail: ${subject}`,
        body: this.preview(bodyText),
        channels: [NotificationChannel.IN_APP],
        critical: priority === InternalMailPriority.URGENT,
        data: {
          internalMailThreadId: threadId,
          internalMailMessageId: messageId,
        },
      },
      meta,
    );

    for (const recipientId of recipients) {
      this.realtimeGateway.emitInternalMailReceived(recipientId, {
        threadId,
        messageId,
        subject,
        senderId: user.id,
        priority,
      });
    }
  }

  private async updateParticipantDate(
    user: AuthenticatedUser,
    threadId: string,
    field: 'starredAt' | 'flaggedAt' | 'pinnedAt',
    value: boolean,
    action: string,
    meta: RequestMeta,
  ) {
    const participant = await this.getParticipantOrThrow(user, threadId);
    const updated = await this.prisma.internalMailParticipant.update({
      where: { id: participant.id },
      data: { [field]: value ? new Date() : null },
      select: participantSelect,
    });

    await this.audit(user, action, threadId, { [field]: participant[field] }, { [field]: updated[field] }, meta);
    this.realtimeGateway.emitInternalMailUpdated(user.id, { threadId, [field]: updated[field] });
    return updated;
  }

  private cleanSubject(subject: string) {
    return subject.trim().replace(/\s+/g, ' ');
  }

  private preview(value: string) {
    return value.replace(/\s+/g, ' ').trim().slice(0, 180);
  }

  private toJson(value?: Record<string, unknown>) {
    return value ? (value as Prisma.InputJsonValue) : undefined;
  }

  private paginate<T>(data: T[], total: number, query: { page: number; limit: number }) {
    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  private audit(
    user: AuthenticatedUser,
    action: string,
    entityId: string,
    oldValue: Prisma.InputJsonValue | undefined,
    newValue: Prisma.InputJsonValue | undefined,
    meta: RequestMeta,
  ) {
    return this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType: action.includes('mailbox') ? 'InternalMailbox' : 'InternalMailThread',
      entityId,
      oldValue,
      newValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
