import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Version
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateDocumentFolderDto } from './dto/create-document-folder.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentFolderQueryDto } from './dto/document-folder-query.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { RestoreDocumentVersionDto } from './dto/restore-document-version.dto';
import { UpdateDocumentFolderDto } from './dto/update-document-folder.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents/status')
  @Version('1')
  @ApiOperation({ summary: 'Documents module readiness check' })
  status() {
    return {
      module: 'documents',
      status: 'ready'
    };
  }

  @Get('document-folders/tree')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get document folder tree' })
  getFolderTree(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeArchived') includeArchived?: string
  ) {
    return this.documentsService.getFolderTree(user, includeArchived === 'true');
  }

  @Get('document-folders')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List document folders' })
  @ApiOkResponse({ description: 'Paginated document folders' })
  listFolders(@CurrentUser() user: AuthenticatedUser, @Query() query: DocumentFolderQueryDto) {
    return this.documentsService.listFolders(user, query);
  }

  @Post('document-folders')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a document folder' })
  @ApiCreatedResponse({ description: 'Created document folder' })
  createFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentFolderDto,
    @Req() request: Request
  ) {
    return this.documentsService.createFolder(user, dto, this.getRequestMeta(request));
  }

  @Get('document-folders/:folderId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a document folder' })
  getFolder(@CurrentUser() user: AuthenticatedUser, @Param('folderId') folderId: string) {
    return this.documentsService.getFolder(user, folderId);
  }

  @Patch('document-folders/:folderId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a document folder' })
  updateFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('folderId') folderId: string,
    @Body() dto: UpdateDocumentFolderDto,
    @Req() request: Request
  ) {
    return this.documentsService.updateFolder(user, folderId, dto, this.getRequestMeta(request));
  }

  @Post('document-folders/:folderId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a document folder' })
  archiveFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('folderId') folderId: string,
    @Req() request: Request
  ) {
    return this.documentsService.archiveFolder(user, folderId, this.getRequestMeta(request));
  }

  @Post('document-folders/:folderId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived document folder' })
  restoreFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('folderId') folderId: string,
    @Req() request: Request
  ) {
    return this.documentsService.restoreFolder(user, folderId, this.getRequestMeta(request));
  }

  @Delete('document-folders/:folderId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an empty document folder' })
  deleteFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('folderId') folderId: string,
    @Req() request: Request
  ) {
    return this.documentsService.deleteFolder(user, folderId, this.getRequestMeta(request));
  }

  @Get('documents')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List documents' })
  listDocuments(@CurrentUser() user: AuthenticatedUser, @Query() query: DocumentQueryDto) {
    return this.documentsService.listDocuments(user, query);
  }

  @Post('documents')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a document and first version' })
  createDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentDto,
    @Req() request: Request
  ) {
    return this.documentsService.createDocument(user, dto, this.getRequestMeta(request));
  }

  @Get('documents/:documentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a document' })
  getDocument(@CurrentUser() user: AuthenticatedUser, @Param('documentId') documentId: string) {
    return this.documentsService.getDocument(user, documentId);
  }

  @Patch('documents/:documentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a document and append a version snapshot' })
  updateDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
    @Req() request: Request
  ) {
    return this.documentsService.updateDocument(user, documentId, dto, this.getRequestMeta(request));
  }

  @Post('documents/:documentId/publish')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a document' })
  publishDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Req() request: Request
  ) {
    return this.documentsService.publishDocument(user, documentId, this.getRequestMeta(request));
  }

  @Post('documents/:documentId/archive')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a document' })
  archiveDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Req() request: Request
  ) {
    return this.documentsService.archiveDocument(user, documentId, this.getRequestMeta(request));
  }

  @Post('documents/:documentId/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived document' })
  restoreDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Req() request: Request
  ) {
    return this.documentsService.restoreDocument(user, documentId, this.getRequestMeta(request));
  }

  @Delete('documents/:documentId')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a document using delete semantics' })
  archiveDocumentByDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Req() request: Request
  ) {
    return this.documentsService.archiveDocument(user, documentId, this.getRequestMeta(request));
  }

  @Delete('documents/:documentId/hard-delete')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hard delete a document and all versions' })
  hardDeleteDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Req() request: Request
  ) {
    return this.documentsService.hardDeleteDocument(user, documentId, this.getRequestMeta(request));
  }

  @Get('documents/:documentId/versions')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List document version snapshots' })
  listVersions(@CurrentUser() user: AuthenticatedUser, @Param('documentId') documentId: string) {
    return this.documentsService.listVersions(user, documentId);
  }

  @Get('documents/:documentId/versions/:version')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one document version snapshot' })
  getVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Param('version') version: string
  ) {
    return this.documentsService.getVersion(user, documentId, Number(version));
  }

  @Post('documents/:documentId/versions/:version/restore')
  @Version('1')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a document from a previous version snapshot' })
  restoreVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Param('version') version: string,
    @Body() dto: RestoreDocumentVersionDto,
    @Req() request: Request
  ) {
    return this.documentsService.restoreVersion(
      user,
      documentId,
      Number(version),
      dto,
      this.getRequestMeta(request)
    );
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
