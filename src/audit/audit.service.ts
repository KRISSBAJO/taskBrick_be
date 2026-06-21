import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AuditRecordInput {
  tenantId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          oldValue: input.oldValue ?? Prisma.JsonNull,
          newValue: input.newValue ?? Prisma.JsonNull,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log action=${input.action} tenantId=${input.tenantId}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}
