import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Prisma, Visibility } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { ProjectAccessPolicyService } from '../access-policy/project-access-policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFileAssetDto } from './dto/create-file-asset.dto';
import { CreateUploadIntentDto } from './dto/create-upload-intent.dto';
import { FileAssetQueryDto } from './dto/file-asset-query.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const fileAssetSelect = {
  id: true,
  tenantId: true,
  uploadedById: true,
  scope: true,
  entityType: true,
  entityId: true,
  fileName: true,
  fileUrl: true,
  storageKey: true,
  provider: true,
  mimeType: true,
  sizeBytes: true,
  visibility: true,
  metadata: true,
  archivedAt: true,
  deletedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      status: true
    }
  }
} satisfies Prisma.FileAssetSelect;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly projectAccessPolicy: ProjectAccessPolicyService
  ) {}

  status() {
    return {
      module: 'files',
      status: 'ready',
      driver: this.storageDriver(),
      maxUploadBytes: this.configService.get<number>('storage.maxUploadBytes', 10485760)
    };
  }

  async createUploadIntent(user: AuthenticatedUser, dto: CreateUploadIntentDto) {
    const entityType = this.normalizeKey(dto.entityType);
    const scope = this.normalizeKey(dto.scope ?? entityType);
    await this.assertEntityAccess(user, entityType, dto.entityId, true);
    await this.assertUploadAllowed(user.tenantId, dto.mimeType, dto.sizeBytes);

    const provider = this.storageDriver();
    const storageKey = this.storageKey(user.tenantId, scope, entityType, dto.fileName);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const base = {
      provider,
      storageKey,
      expiresAt,
      maxUploadBytes: await this.maxUploadBytes(user.tenantId),
      entityType,
      entityId: dto.entityId ?? null,
      scope,
      visibility: dto.visibility ?? Visibility.TEAM,
      fileName: dto.fileName,
      mimeType: dto.mimeType ?? null,
      sizeBytes: dto.sizeBytes ?? null
    };

    if (provider === 'cloudinary') {
      return {
        ...base,
        method: 'POST',
        uploadUrl: this.cloudinaryUploadUrl(),
        fields: this.cloudinarySignedFields(storageKey),
        headers: {},
        fileUrl: this.cloudinaryAssetUrl(storageKey)
      };
    }

    if (provider === 's3') {
      const contentType = dto.mimeType || 'application/octet-stream';
      return {
        ...base,
        method: 'PUT',
        uploadUrl: await this.s3SignedPutUrl(storageKey, contentType),
        fields: {},
        headers: { 'Content-Type': contentType },
        bucket: this.configService.get<string>('storage.s3Bucket'),
        region: this.configService.get<string>('storage.s3Region'),
        fileUrl: this.s3AssetUrl(storageKey)
      };
    }

    return {
      ...base,
      method: 'POST',
      uploadUrl: null,
      fields: {},
      headers: {},
      fileUrl: `/uploads/${storageKey}`
    };
  }

  async list(user: AuthenticatedUser, query: FileAssetQueryDto) {
    const entityType = query.entityType ? this.normalizeKey(query.entityType) : undefined;
    await this.assertEntityAccess(user, entityType, query.entityId, false);
    const canViewPrivateFiles = await this.canViewPrivateEntityFiles(user, entityType, query.entityId);
    const where: Prisma.FileAssetWhereInput = {
      tenantId: user.tenantId,
      scope: query.scope ? this.normalizeKey(query.scope) : undefined,
      entityType,
      entityId: query.entityId,
      provider: query.provider ? query.provider.trim().toLowerCase() : undefined,
      deletedAt: query.includeDeleted || query.includeDelete ? undefined : null,
      archivedAt: query.includeArchived ? undefined : null,
      AND: canViewPrivateFiles ? undefined : [this.projectAccessPolicy.fileVisibilityWhere(user)],
      ...(query.search
        ? {
            OR: [
              { fileName: { contains: query.search, mode: 'insensitive' } },
              { mimeType: { contains: query.search, mode: 'insensitive' } },
              { entityType: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fileAsset.findMany({
        where,
        select: fileAssetSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.fileAsset.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async get(user: AuthenticatedUser, fileId: string) {
    const file = await this.getFileOrThrow(user.tenantId, fileId);
    await this.assertEntityAccess(user, file.entityType, file.entityId ?? undefined, false);
    await this.assertCanViewFile(user, file);
    return file;
  }

  async create(user: AuthenticatedUser, dto: CreateFileAssetDto, meta: RequestMeta) {
    const entityType = this.normalizeKey(dto.entityType);
    const scope = this.normalizeKey(dto.scope ?? entityType);
    await this.assertEntityAccess(user, entityType, dto.entityId, true);
    await this.assertUploadAllowed(user.tenantId, dto.mimeType, dto.sizeBytes);

    const file = await this.prisma.fileAsset.create({
      data: {
        tenantId: user.tenantId,
        uploadedById: user.id,
        scope,
        entityType,
        entityId: dto.entityId,
        fileName: dto.fileName.trim(),
        fileUrl: dto.fileUrl,
        storageKey: dto.storageKey,
        provider: (dto.provider ?? this.storageDriver()).trim().toLowerCase(),
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        visibility: dto.visibility ?? Visibility.TEAM,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        metadata: dto.metadata === undefined ? undefined : this.toJson(dto.metadata)
      },
      select: fileAssetSelect
    });

    if (entityType === 'TASK' && dto.entityId) {
      await this.mirrorTaskAttachment(dto.entityId, dto);
    }

    await this.recordAudit(user, 'file.create', 'FileAsset', file.id, undefined, {
      entityType,
      entityId: dto.entityId,
      provider: file.provider,
      fileName: file.fileName
    }, meta);
    return file;
  }

  async archive(user: AuthenticatedUser, fileId: string, meta: RequestMeta) {
    const before = await this.getFileOrThrow(user.tenantId, fileId);
    await this.assertEntityAccess(user, before.entityType, before.entityId ?? undefined, true);
    const updated = await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { archivedAt: new Date() },
      select: fileAssetSelect
    });
    await this.recordAudit(user, 'file.archive', 'FileAsset', fileId, {
      archivedAt: before.archivedAt
    }, {
      archivedAt: updated.archivedAt
    }, meta);
    return updated;
  }

  async restore(user: AuthenticatedUser, fileId: string, meta: RequestMeta) {
    const before = await this.getFileOrThrow(user.tenantId, fileId);
    await this.assertEntityAccess(user, before.entityType, before.entityId ?? undefined, true);
    const updated = await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { archivedAt: null, deletedAt: null },
      select: fileAssetSelect
    });
    await this.recordAudit(user, 'file.restore', 'FileAsset', fileId, {
      archivedAt: before.archivedAt,
      deletedAt: before.deletedAt
    }, {
      archivedAt: updated.archivedAt,
      deletedAt: updated.deletedAt
    }, meta);
    return updated;
  }

  async delete(user: AuthenticatedUser, fileId: string, meta: RequestMeta) {
    const before = await this.getFileOrThrow(user.tenantId, fileId);
    await this.assertEntityAccess(user, before.entityType, before.entityId ?? undefined, true);
    const updated = await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
      select: fileAssetSelect
    });
    await this.recordAudit(user, 'file.delete', 'FileAsset', fileId, {
      deletedAt: before.deletedAt
    }, {
      deletedAt: updated.deletedAt
    }, meta);
    return updated;
  }

  async cleanupExpired(user: AuthenticatedUser, meta: RequestMeta) {
    this.assertCanManageFiles(user);
    const result = await this.prisma.fileAsset.updateMany({
      where: {
        tenantId: user.tenantId,
        expiresAt: { lte: new Date() },
        deletedAt: null
      },
      data: { deletedAt: new Date() }
    });
    await this.recordAudit(user, 'file.cleanup_expired', 'FileAsset', user.tenantId, undefined, {
      deleted: result.count
    }, meta);
    return { success: true, deleted: result.count };
  }

  private async mirrorTaskAttachment(taskId: string, dto: CreateFileAssetDto) {
    const exists = await this.prisma.taskAttachment.findFirst({
      where: { taskId, fileUrl: dto.fileUrl },
      select: { id: true }
    });
    if (exists) return;
    await this.prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes
      }
    });
  }

  private async getFileOrThrow(tenantId: string, fileId: string) {
    const file = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, tenantId },
      select: fileAssetSelect
    });
    if (!file) throw new NotFoundException('File asset not found');
    return file;
  }

  private async assertUploadAllowed(tenantId: string, mimeType?: string, sizeBytes?: number) {
    const [policy, defaultMax] = await Promise.all([
      this.prisma.securityPolicy.findUnique({
        where: { tenantId },
        select: { maxUploadBytes: true, allowedUploadMimeTypes: true }
      }),
      this.maxUploadBytes(tenantId)
    ]);
    const maxUploadBytes = policy?.maxUploadBytes ?? defaultMax;
    if (sizeBytes !== undefined && sizeBytes > maxUploadBytes) {
      throw new BadRequestException(`File exceeds the maximum upload size of ${maxUploadBytes} bytes`);
    }
    if (policy?.allowedUploadMimeTypes.length) {
      if (!mimeType) throw new BadRequestException('A MIME type is required by the tenant file policy');
      const allowed = policy.allowedUploadMimeTypes.map((item) => item.toLowerCase());
      if (!allowed.includes(mimeType.toLowerCase())) {
        throw new BadRequestException('File type is not allowed by the tenant file policy');
      }
    }
  }

  private async maxUploadBytes(tenantId: string) {
    const policy = await this.prisma.securityPolicy.findUnique({
      where: { tenantId },
      select: { maxUploadBytes: true }
    });
    return policy?.maxUploadBytes ?? this.configService.get<number>('storage.maxUploadBytes', 10485760);
  }

  private async assertEntityAccess(
    user: AuthenticatedUser,
    entityType?: string,
    entityId?: string,
    write = false
  ) {
    if (!entityType || !entityId) return;
    const normalizedType = this.normalizeKey(entityType);
    let count: number;
    if (normalizedType === 'PROJECT') {
      if (write) {
        await this.projectAccessPolicy.assertProjectAction(user, entityId, 'manageFiles');
        return;
      }
      await this.projectAccessPolicy.assertProjectAction(user, entityId, 'viewProject');
      return;
    } else if (normalizedType === 'TASK') {
      if (write) {
        await this.projectAccessPolicy.assertTaskAction(user, entityId, 'manageFiles');
        return;
      }
      count = await this.prisma.task.count({ where: this.projectAccessPolicy.taskAccessWhere(user, entityId) });
    } else if (['CONVERSATION', 'CHAT'].includes(normalizedType)) {
      count = await this.prisma.conversation.count({
        where: { id: entityId, tenantId: user.tenantId, members: { some: { userId: user.id } } }
      });
    } else if (normalizedType === 'MESSAGE') {
      count = await this.prisma.message.count({
        where: {
          id: entityId,
          conversation: {
            tenantId: user.tenantId,
            members: { some: { userId: user.id } }
          }
        }
      });
    } else if (normalizedType === 'DOCUMENT') {
      count = await this.prisma.document.count({
        where: {
          id: entityId,
          tenantId: user.tenantId,
          OR: [
            { visibility: { in: [Visibility.ORGANIZATION, Visibility.PUBLIC] } },
            { createdById: user.id },
            { project: this.projectAccessPolicy.projectAccessWhere(user) }
          ]
        }
      });
    } else if (normalizedType === 'WORKFLOW') {
      count = await this.prisma.workflow.count({
        where: { id: entityId, tenantId: user.tenantId }
      });
    } else if (normalizedType === 'WORKFLOW_RUN') {
      count = await this.prisma.workflowRun.count({
        where: { id: entityId, tenantId: user.tenantId }
      });
    } else if (normalizedType === 'TEAM') {
      const canManageTeamFiles = this.canManageFiles(user) || user.permissions.includes('manage:teams');
      count = await this.prisma.team.count({
        where: {
          id: entityId,
          tenantId: user.tenantId,
          deletedAt: null,
          OR: canManageTeamFiles
            ? undefined
            : [
                { createdById: user.id },
                { members: { some: { userId: user.id } } }
              ]
        }
      });
    } else if (normalizedType === 'MEETING') {
      count = await this.prisma.meeting.count({
        where: {
          id: entityId,
          tenantId: user.tenantId,
          OR: this.canManageFiles(user)
            ? undefined
            : [
                { visibility: { in: [Visibility.ORGANIZATION, Visibility.PUBLIC] } },
                { hostId: user.id },
                { createdById: user.id },
                { attendees: { some: { userId: user.id, status: { not: 'REMOVED' } } } }
              ]
        }
      });
    } else if (normalizedType === 'OMOFLOW') {
      count = 1;
    } else {
      count = await this.prisma.fileAsset.count({
        where: { tenantId: user.tenantId, entityType: normalizedType, entityId }
      });
    }

    if (count === 0) {
      throw write
        ? new ForbiddenException('Cannot attach a file to this entity')
        : new ForbiddenException('Cannot access files for this entity');
    }
  }

  private assertCanManageFiles(user: AuthenticatedUser) {
    if (this.canManageFiles(user)) return;
    throw new ForbiddenException('Cannot manage files');
  }

  private canManageFiles(user: AuthenticatedUser) {
    return (
      user.permissions.includes('manage:all') ||
      user.permissions.includes('manage:tenant') ||
      user.permissions.includes('manage:projects')
    );
  }

  private async canViewPrivateEntityFiles(
    user: AuthenticatedUser,
    entityType?: string,
    entityId?: string
  ) {
    if (!entityType || !entityId || this.canManageFiles(user)) return this.canManageFiles(user);
    const normalizedType = this.normalizeKey(entityType);
    if (normalizedType === 'PROJECT') {
      const matrix = await this.projectAccessPolicy.getProjectPermissions(user, entityId);
      return matrix.actions.viewPrivateFiles;
    }
    if (normalizedType === 'TASK') {
      const task = await this.prisma.task.findFirst({
        where: { id: entityId, tenantId: user.tenantId },
        select: { projectId: true }
      });
      if (!task) return false;
      const matrix = await this.projectAccessPolicy.getProjectPermissions(user, task.projectId);
      return matrix.actions.viewPrivateFiles;
    }
    if (normalizedType === 'TEAM') {
      if (user.permissions.includes('manage:teams')) return true;
      const team = await this.prisma.team.findFirst({
        where: {
          id: entityId,
          tenantId: user.tenantId,
          deletedAt: null,
          OR: [
            { createdById: user.id },
            { members: { some: { userId: user.id } } }
          ]
        },
        select: { id: true }
      });
      return Boolean(team);
    }
    return false;
  }

  private async assertCanViewFile(
    user: AuthenticatedUser,
    file: { uploadedById: string | null; visibility: Visibility; entityType: string; entityId: string | null }
  ) {
    if (file.visibility !== Visibility.PRIVATE || file.uploadedById === user.id || this.canManageFiles(user)) {
      return;
    }

    const canViewPrivate = await this.canViewPrivateEntityFiles(user, file.entityType, file.entityId ?? undefined);
    if (canViewPrivate) return;
    throw new ForbiddenException('Cannot access this private file');
  }

  private storageDriver() {
    return this.configService.get<string>('storage.driver', 'local').trim().toLowerCase();
  }

  private storageKey(tenantId: string, scope: string, entityType: string, fileName: string) {
    const safeName = fileName
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 120);
    const date = new Date().toISOString().slice(0, 10);
    return `${tenantId}/${scope.toLowerCase()}/${entityType.toLowerCase()}/${date}/${cryptoRandom()}-${safeName}`;
  }

  private cloudinaryUploadUrl() {
    const cloudName = this.configService.get<string>('storage.cloudinaryCloudName');
    if (!cloudName) throw new BadRequestException('Cloudinary storage is not configured');
    return `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  }

  private cloudinarySignedFields(storageKey: string) {
    const apiKey = this.configService.get<string>('storage.cloudinaryApiKey');
    const apiSecret = this.configService.get<string>('storage.cloudinaryApiSecret');
    if (!apiKey || !apiSecret) throw new BadRequestException('Cloudinary upload signing is not configured');
    const timestamp = Math.floor(Date.now() / 1000);
    const baseFolder = this.configService.get<string>('storage.cloudinaryUploadFolder')?.trim().replace(/^\/+|\/+$/g, '');
    const storageFolder = storageKey.split('/').slice(0, -1).join('/');
    const folder = [baseFolder, storageFolder].filter(Boolean).join('/');
    const publicId = storageKey.split('/').at(-1)?.replace(/\.[^.]+$/, '') ?? storageKey;
    const uploadPreset = this.configService.get<string>('storage.cloudinaryUploadPreset')?.trim();
    const params: Record<string, string | number> = { folder, public_id: publicId, timestamp };
    if (uploadPreset) params.upload_preset = uploadPreset;
    const signatureBase = Object.entries(params)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const signature = createHash('sha1').update(`${signatureBase}${apiSecret}`).digest('hex');
    return {
      api_key: apiKey,
      folder,
      public_id: publicId,
      timestamp,
      ...(uploadPreset ? { upload_preset: uploadPreset } : {}),
      signature
    };
  }

  private cloudinaryAssetUrl(storageKey: string) {
    const cloudName = this.configService.get<string>('storage.cloudinaryCloudName');
    return cloudName ? `cloudinary://${cloudName}/${storageKey}` : storageKey;
  }

  private async s3SignedPutUrl(storageKey: string, contentType: string) {
    const region = this.configService.get<string>('storage.s3Region');
    const bucket = this.configService.get<string>('storage.s3Bucket');
    if (!region || !bucket) throw new BadRequestException('S3 storage is not configured');

    const accessKeyId = this.configService.get<string>('storage.s3AccessKeyId');
    const secretAccessKey = this.configService.get<string>('storage.s3SecretAccessKey');
    const client = new S3Client({
      region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {})
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: contentType
    });

    return getSignedUrl(client, command, { expiresIn: 15 * 60 });
  }

  private s3AssetUrl(storageKey: string) {
    const bucket = this.configService.get<string>('storage.s3Bucket');
    const publicBaseUrl = this.configService.get<string>('storage.s3PublicBaseUrl')?.trim().replace(/\/$/, '');
    if (publicBaseUrl) return `${publicBaseUrl}/${storageKey}`;
    return bucket ? `s3://${bucket}/${storageKey}` : storageKey;
  }

  private normalizeKey(value: string) {
    return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private paginate<T>(data: T[], total: number, query: FileAssetQueryDto) {
    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    };
  }

  private async recordAudit(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: Prisma.InputJsonValue | undefined,
    newValue: Prisma.InputJsonValue | undefined,
    meta: RequestMeta
  ) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }
}

function cryptoRandom() {
  return randomUUID();
}
