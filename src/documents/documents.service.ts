import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { DocumentStatus, Prisma, Visibility } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentFolderDto } from './dto/create-document-folder.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentFolderQueryDto } from './dto/document-folder-query.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { RestoreDocumentVersionDto } from './dto/restore-document-version.dto';
import { UpdateDocumentFolderDto } from './dto/update-document-folder.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const folderSelect = {
  id: true,
  tenantId: true,
  parentId: true,
  name: true,
  description: true,
  createdById: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      children: true,
      documents: true
    }
  }
} satisfies Prisma.DocumentFolderSelect;

const documentSelect = {
  id: true,
  tenantId: true,
  projectId: true,
  folderId: true,
  slug: true,
  title: true,
  summary: true,
  body: true,
  documentType: true,
  status: true,
  visibility: true,
  tags: true,
  createdById: true,
  updatedById: true,
  publishedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      key: true,
      name: true
    }
  },
  folder: {
    select: {
      id: true,
      name: true,
      parentId: true
    }
  },
  _count: {
    select: {
      versions: true
    }
  }
} satisfies Prisma.DocumentSelect;

const versionSelect = {
  id: true,
  documentId: true,
  version: true,
  title: true,
  body: true,
  summary: true,
  visibility: true,
  status: true,
  projectId: true,
  folderId: true,
  tags: true,
  changeNote: true,
  createdById: true,
  createdAt: true
} satisfies Prisma.DocumentVersionSelect;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async listFolders(user: AuthenticatedUser, query: DocumentFolderQueryDto) {
    const where: Prisma.DocumentFolderWhereInput = {
      tenantId: user.tenantId,
      parentId: query.parentId,
      archivedAt: query.includeArchived ? undefined : null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.documentFolder.findMany({
        where,
        select: folderSelect,
        orderBy: [{ name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.documentFolder.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async getFolderTree(user: AuthenticatedUser, includeArchived = false) {
    const folders = await this.prisma.documentFolder.findMany({
      where: {
        tenantId: user.tenantId,
        archivedAt: includeArchived ? undefined : null
      },
      select: folderSelect,
      orderBy: [{ name: 'asc' }]
    });
    const childrenByParent = new Map<string | null, typeof folders>();

    for (const folder of folders) {
      const parentKey = folder.parentId ?? null;
      childrenByParent.set(parentKey, [...(childrenByParent.get(parentKey) ?? []), folder]);
    }

    const build = (parentId: string | null): Array<(typeof folders)[number] & { children: unknown[] }> =>
      (childrenByParent.get(parentId) ?? []).map((folder) => ({
        ...folder,
        children: build(folder.id)
      }));

    return build(null);
  }

  async createFolder(
    user: AuthenticatedUser,
    dto: CreateDocumentFolderDto,
    meta: RequestMeta
  ) {
    if (dto.parentId) {
      await this.getFolderOrThrow(user.tenantId, dto.parentId);
    }

    await this.assertFolderNameAvailable(user.tenantId, dto.parentId ?? null, dto.name);

    const folder = await this.prisma.documentFolder.create({
      data: {
        tenantId: user.tenantId,
        parentId: dto.parentId,
        name: dto.name,
        description: dto.description,
        createdById: user.id
      },
      select: folderSelect
    });

    await this.recordAudit(user, 'document_folder.create', 'DocumentFolder', folder.id, undefined, {
      name: folder.name,
      parentId: folder.parentId
    }, meta);

    return folder;
  }

  async getFolder(user: AuthenticatedUser, folderId: string) {
    return this.getFolderOrThrow(user.tenantId, folderId);
  }

  async updateFolder(
    user: AuthenticatedUser,
    folderId: string,
    dto: UpdateDocumentFolderDto,
    meta: RequestMeta
  ) {
    const before = await this.getFolderOrThrow(user.tenantId, folderId);

    if (dto.parentId) {
      if (dto.parentId === folderId) {
        throw new BadRequestException('A folder cannot be its own parent');
      }
      await this.getFolderOrThrow(user.tenantId, dto.parentId);
      await this.assertFolderMoveDoesNotCreateCycle(user.tenantId, folderId, dto.parentId);
    }

    const nextParentId = dto.parentId === undefined ? before.parentId : dto.parentId;
    const nextName = dto.name ?? before.name;
    if (dto.name || dto.parentId !== undefined) {
      await this.assertFolderNameAvailable(user.tenantId, nextParentId ?? null, nextName, folderId);
    }

    const folder = await this.prisma.documentFolder.update({
      where: { id: folderId },
      data: {
        parentId: dto.parentId,
        name: dto.name,
        description: dto.description
      },
      select: folderSelect
    });

    await this.recordAudit(user, 'document_folder.update', 'DocumentFolder', folderId, {
      name: before.name,
      parentId: before.parentId
    }, {
      name: folder.name,
      parentId: folder.parentId
    }, meta);

    return folder;
  }

  async archiveFolder(user: AuthenticatedUser, folderId: string, meta: RequestMeta) {
    const folder = await this.getFolderOrThrow(user.tenantId, folderId);
    const archivedAt = new Date();

    await this.prisma.documentFolder.update({
      where: { id: folderId },
      data: { archivedAt },
      select: folderSelect
    });

    await this.recordAudit(user, 'document_folder.archive', 'DocumentFolder', folderId, {
      name: folder.name
    }, {
      archivedAt
    }, meta);

    return { success: true, archivedAt };
  }

  async restoreFolder(user: AuthenticatedUser, folderId: string, meta: RequestMeta) {
    const folder = await this.getFolderOrThrow(user.tenantId, folderId, true);

    const restored = await this.prisma.documentFolder.update({
      where: { id: folderId },
      data: { archivedAt: null },
      select: folderSelect
    });

    await this.recordAudit(user, 'document_folder.restore', 'DocumentFolder', folderId, {
      archivedAt: folder.archivedAt
    }, undefined, meta);

    return restored;
  }

  async deleteFolder(user: AuthenticatedUser, folderId: string, meta: RequestMeta) {
    const folder = await this.getFolderOrThrow(user.tenantId, folderId, true);
    const activeChildren = await this.prisma.documentFolder.count({
      where: { tenantId: user.tenantId, parentId: folderId, archivedAt: null }
    });
    const activeDocuments = await this.prisma.document.count({
      where: { tenantId: user.tenantId, folderId, archivedAt: null }
    });

    if (activeChildren > 0 || activeDocuments > 0) {
      throw new BadRequestException('Folder must be empty or archived before deletion');
    }

    await this.prisma.documentFolder.delete({ where: { id: folderId } });
    await this.recordAudit(user, 'document_folder.delete', 'DocumentFolder', folderId, {
      name: folder.name
    }, undefined, meta);

    return { success: true };
  }

  async listDocuments(user: AuthenticatedUser, query: DocumentQueryDto) {
    const andFilters: Prisma.DocumentWhereInput[] = [];
    const visibilityFilter = this.documentVisibilityWhere(user);

    if (Object.keys(visibilityFilter).length > 0) {
      andFilters.push(visibilityFilter);
    }

    if (query.search) {
      andFilters.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { summary: { contains: query.search, mode: 'insensitive' } },
          { body: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } }
        ]
      });
    }

    const where: Prisma.DocumentWhereInput = {
      tenantId: user.tenantId,
      projectId: query.projectId,
      folderId: query.folderId,
      documentType: query.documentType,
      status: query.status,
      visibility: query.visibility,
      archivedAt: query.includeArchived ? undefined : null,
      AND: andFilters.length ? andFilters : undefined
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        select: documentSelect,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.document.count({ where })
    ]);

    return this.paginate(data, total, query);
  }

  async createDocument(user: AuthenticatedUser, dto: CreateDocumentDto, meta: RequestMeta) {
    await this.validateDocumentTargets(user.tenantId, dto.projectId, dto.folderId);
    if (dto.slug) await this.assertSlugAvailable(user.tenantId, dto.slug);

    const document = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          tenantId: user.tenantId,
          projectId: dto.projectId,
          folderId: dto.folderId,
          slug: dto.slug,
          title: dto.title,
          summary: dto.summary,
          body: dto.body,
          documentType: dto.documentType,
          status: dto.status,
          visibility: dto.visibility,
          tags: dto.tags ? this.toJsonValue(dto.tags) : undefined,
          createdById: user.id,
          updatedById: user.id,
          publishedAt: dto.status === DocumentStatus.PUBLISHED ? new Date() : undefined,
          archivedAt: dto.status === DocumentStatus.ARCHIVED ? new Date() : undefined
        },
        select: documentSelect
      });

      await tx.documentVersion.create({
        data: this.buildVersionData(created, 1, user.id, dto.changeNote)
      });

      return created;
    });

    await this.recordAudit(user, 'document.create', 'Document', document.id, undefined, {
      title: document.title,
      projectId: document.projectId,
      folderId: document.folderId
    }, meta);

    return this.getDocument(user, document.id);
  }

  async getDocument(user: AuthenticatedUser, documentId: string) {
    const document = await this.getDocumentOrThrow(user.tenantId, documentId, true);
    this.assertCanReadDocument(user, document);
    return document;
  }

  async updateDocument(
    user: AuthenticatedUser,
    documentId: string,
    dto: UpdateDocumentDto,
    meta: RequestMeta
  ) {
    const before = await this.getDocumentOrThrow(user.tenantId, documentId, true);
    this.assertCanManageDocument(user, before);

    await this.validateDocumentTargets(user.tenantId, dto.projectId, dto.folderId);
    if (dto.slug && dto.slug !== before.slug) await this.assertSlugAvailable(user.tenantId, dto.slug, documentId);

    const document = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: documentId },
        data: {
          projectId: dto.projectId,
          folderId: dto.folderId,
          slug: dto.slug,
          title: dto.title,
          summary: dto.summary,
          body: dto.body,
          documentType: dto.documentType,
          status: dto.status,
          visibility: dto.visibility,
          tags: dto.tags ? this.toJsonValue(dto.tags) : undefined,
          updatedById: user.id,
          publishedAt:
            dto.status === DocumentStatus.PUBLISHED && !before.publishedAt
              ? new Date()
              : undefined,
          archivedAt:
            dto.status === DocumentStatus.ARCHIVED
              ? new Date()
              : dto.status
                ? null
                : undefined
        },
        select: documentSelect
      });
      const nextVersion = await this.nextVersion(tx, documentId);
      await tx.documentVersion.create({
        data: this.buildVersionData(updated, nextVersion, user.id, dto.changeNote)
      });
      return updated;
    });

    await this.recordAudit(user, 'document.update', 'Document', documentId, {
      title: before.title,
      status: before.status,
      visibility: before.visibility
    }, {
      title: document.title,
      status: document.status,
      visibility: document.visibility
    }, meta);

    return document;
  }

  async publishDocument(user: AuthenticatedUser, documentId: string, meta: RequestMeta) {
    return this.updateDocument(user, documentId, {
      status: DocumentStatus.PUBLISHED,
      changeNote: 'Published document'
    }, meta);
  }

  async archiveDocument(user: AuthenticatedUser, documentId: string, meta: RequestMeta) {
    return this.updateDocument(user, documentId, {
      status: DocumentStatus.ARCHIVED,
      changeNote: 'Archived document'
    }, meta);
  }

  async restoreDocument(user: AuthenticatedUser, documentId: string, meta: RequestMeta) {
    const document = await this.updateDocument(user, documentId, {
      status: DocumentStatus.DRAFT,
      changeNote: 'Restored document'
    }, meta);

    return this.prisma.document.update({
      where: { id: document.id },
      data: { archivedAt: null },
      select: documentSelect
    });
  }

  async hardDeleteDocument(user: AuthenticatedUser, documentId: string, meta: RequestMeta) {
    const document = await this.getDocumentOrThrow(user.tenantId, documentId, true);
    this.assertCanManageDocument(user, document);

    await this.prisma.document.delete({ where: { id: documentId } });
    await this.recordAudit(user, 'document.delete', 'Document', documentId, {
      title: document.title
    }, undefined, meta);

    return { success: true };
  }

  async listVersions(user: AuthenticatedUser, documentId: string) {
    const document = await this.getDocument(user, documentId);

    return this.prisma.documentVersion.findMany({
      where: { documentId: document.id },
      select: versionSelect,
      orderBy: [{ version: 'desc' }]
    });
  }

  async getVersion(user: AuthenticatedUser, documentId: string, version: number) {
    const document = await this.getDocument(user, documentId);
    const snapshot = await this.prisma.documentVersion.findUnique({
      where: {
        documentId_version: {
          documentId: document.id,
          version
        }
      },
      select: versionSelect
    });

    if (!snapshot) {
      throw new NotFoundException('Document version not found');
    }

    return snapshot;
  }

  async restoreVersion(
    user: AuthenticatedUser,
    documentId: string,
    version: number,
    dto: RestoreDocumentVersionDto,
    meta: RequestMeta
  ) {
    const document = await this.getDocumentOrThrow(user.tenantId, documentId, true);
    this.assertCanManageDocument(user, document);
    const snapshot = await this.getVersion(user, documentId, version);

    const restored = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id: documentId },
        data: {
          title: snapshot.title ?? document.title,
          body: snapshot.body,
          summary: snapshot.summary,
          visibility: snapshot.visibility ?? document.visibility,
          status: snapshot.status ?? document.status,
          projectId: snapshot.projectId,
          folderId: snapshot.folderId,
          tags: snapshot.tags === null ? Prisma.JsonNull : (snapshot.tags as Prisma.InputJsonValue),
          updatedById: user.id,
          archivedAt: snapshot.status === DocumentStatus.ARCHIVED ? new Date() : null,
          publishedAt: snapshot.status === DocumentStatus.PUBLISHED ? new Date() : document.publishedAt
        },
        select: documentSelect
      });
      const nextVersion = await this.nextVersion(tx, documentId);
      await tx.documentVersion.create({
        data: this.buildVersionData(
          updated,
          nextVersion,
          user.id,
          dto.changeNote ?? `Restored version ${version}`
        )
      });
      return updated;
    });

    await this.recordAudit(user, 'document.version_restore', 'Document', documentId, {
      restoredFromVersion: version
    }, {
      currentVersion: restored._count.versions + 1
    }, meta);

    return restored;
  }

  private async getFolderOrThrow(tenantId: string, folderId: string, includeArchived = false) {
    const folder = await this.prisma.documentFolder.findFirst({
      where: {
        id: folderId,
        tenantId,
        archivedAt: includeArchived ? undefined : null
      },
      select: folderSelect
    });

    if (!folder) {
      throw new NotFoundException('Document folder not found');
    }

    return folder;
  }

  private async getDocumentOrThrow(tenantId: string, documentId: string, includeArchived = false) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        archivedAt: includeArchived ? undefined : null
      },
      select: documentSelect
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  private async validateDocumentTargets(tenantId: string, projectId?: string, folderId?: string) {
    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, tenantId },
        select: { id: true }
      });
      if (!project) throw new NotFoundException('Project not found');
    }

    if (folderId) {
      await this.getFolderOrThrow(tenantId, folderId);
    }
  }

  private async assertSlugAvailable(tenantId: string, slug: string, excludeDocumentId?: string) {
    const existing = await this.prisma.document.findFirst({
      where: {
        tenantId,
        slug,
        id: excludeDocumentId ? { not: excludeDocumentId } : undefined
      },
      select: { id: true }
    });

    if (existing) {
      throw new ConflictException('Document slug already exists in this tenant');
    }
  }

  private async assertFolderNameAvailable(
    tenantId: string,
    parentId: string | null,
    name: string,
    excludeFolderId?: string
  ) {
    const existing = await this.prisma.documentFolder.findFirst({
      where: {
        tenantId,
        parentId,
        name,
        id: excludeFolderId ? { not: excludeFolderId } : undefined
      },
      select: { id: true }
    });

    if (existing) {
      throw new ConflictException('Folder name already exists under this parent');
    }
  }

  private async assertFolderMoveDoesNotCreateCycle(
    tenantId: string,
    folderId: string,
    parentId: string
  ) {
    let currentParentId: string | null = parentId;
    let depth = 0;

    while (currentParentId && depth < 50) {
      if (currentParentId === folderId) {
        throw new BadRequestException('Folder move would create a cycle');
      }

      const parent = await this.prisma.documentFolder.findFirst({
        where: { id: currentParentId, tenantId },
        select: { parentId: true }
      });
      currentParentId = parent?.parentId ?? null;
      depth += 1;
    }

    if (depth >= 50) {
      throw new BadRequestException('Folder hierarchy is too deep');
    }
  }

  private documentVisibilityWhere(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    if (this.canManageDocuments(user)) {
      return {};
    }

    return {
      OR: [
        { visibility: { not: Visibility.PRIVATE } },
        { createdById: user.id }
      ]
    };
  }

  private assertCanReadDocument(user: AuthenticatedUser, document: { visibility: Visibility; createdById: string | null }) {
    if (document.visibility !== Visibility.PRIVATE || document.createdById === user.id || this.canManageDocuments(user)) {
      return;
    }

    throw new ForbiddenException('Cannot read private document');
  }

  private assertCanManageDocument(user: AuthenticatedUser, document: { createdById: string | null }) {
    if (this.canManageDocuments(user) || document.createdById === user.id) {
      return;
    }

    throw new ForbiddenException('Cannot manage this document');
  }

  private canManageDocuments(user: AuthenticatedUser) {
    return user.permissions.includes('manage:all') || user.permissions.includes('manage:projects');
  }

  private async nextVersion(tx: Prisma.TransactionClient, documentId: string) {
    const aggregate = await tx.documentVersion.aggregate({
      where: { documentId },
      _max: { version: true }
    });

    return (aggregate._max.version ?? 0) + 1;
  }

  private buildVersionData(
    document: Prisma.DocumentGetPayload<{ select: typeof documentSelect }>,
    version: number,
    createdById: string,
    changeNote?: string
  ): Prisma.DocumentVersionUncheckedCreateInput {
    return {
      documentId: document.id,
      version,
      title: document.title,
      body: document.body,
      summary: document.summary,
      visibility: document.visibility,
      status: document.status,
      projectId: document.projectId,
      folderId: document.folderId,
      tags: document.tags === null ? Prisma.JsonNull : (document.tags as Prisma.InputJsonValue),
      changeNote,
      createdById
    };
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
