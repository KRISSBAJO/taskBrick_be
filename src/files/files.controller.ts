import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards
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
import { CreateFileAssetDto } from './dto/create-file-asset.dto';
import { CreateUploadIntentDto } from './dto/create-upload-intent.dto';
import { FileAssetQueryDto } from './dto/file-asset-query.dto';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('status')
  @ApiOperation({ summary: 'Files and attachments module readiness check' })
  status() {
    return this.filesService.status();
  }

  @Post('upload-intents')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a provider-aware upload intent for S3, Cloudinary, or local storage' })
  createUploadIntent(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUploadIntentDto) {
    return this.filesService.createUploadIntent(user, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List file assets by scope, entity, provider, or search text' })
  @ApiOkResponse({ description: 'Paginated file assets' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: FileAssetQueryDto) {
    return this.filesService.list(user, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register uploaded file metadata and attach it to an entity' })
  @ApiCreatedResponse({ description: 'Created file asset metadata' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFileAssetDto,
    @Req() request: Request
  ) {
    return this.filesService.create(user, dto, this.getRequestMeta(request));
  }

  @Get(':fileId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('read:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a file asset' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('fileId') fileId: string) {
    return this.filesService.get(user, fileId);
  }

  @Post(':fileId/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a file asset without deleting provider storage' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
    @Req() request: Request
  ) {
    return this.filesService.archive(user, fileId, this.getRequestMeta(request));
  }

  @Post(':fileId/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived or soft-deleted file asset' })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
    @Req() request: Request
  ) {
    return this.filesService.restore(user, fileId, this.getRequestMeta(request));
  }

  @Delete(':fileId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a file asset' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('fileId') fileId: string,
    @Req() request: Request
  ) {
    return this.filesService.delete(user, fileId, this.getRequestMeta(request));
  }

  @Post('cleanup/expired')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenant')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete expired file assets for cleanup policies' })
  cleanupExpired(@CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.filesService.cleanupExpired(user, this.getRequestMeta(request));
  }

  private getRequestMeta(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')
    };
  }
}
