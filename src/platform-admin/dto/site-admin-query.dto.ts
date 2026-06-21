import { ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus, UserStatus, SecurityEventSeverity, SecurityEventStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const platformLevels = ['OWNER', 'ADMIN', 'SUPPORT', 'AUDITOR'] as const;
const platformStatuses = ['ACTIVE', 'REVOKED'] as const;

export class SiteTenantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsIn(Object.values(TenantStatus))
  status?: TenantStatus;
}

export class SiteTenantUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsIn(Object.values(UserStatus))
  status?: UserStatus;
}

export class SiteTenantResourceQueryDto extends PaginationQueryDto {}

export class SiteUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsIn(Object.values(UserStatus))
  status?: UserStatus;
}

export class PlatformAuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;
}

export class SiteSecurityEventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: SecurityEventSeverity })
  @IsOptional()
  @IsIn(Object.values(SecurityEventSeverity))
  severity?: SecurityEventSeverity;

  @ApiPropertyOptional({ enum: SecurityEventStatus })
  @IsOptional()
  @IsIn(Object.values(SecurityEventStatus))
  status?: SecurityEventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

export class PlatformAdminQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: platformLevels })
  @IsOptional()
  @IsIn(platformLevels)
  level?: (typeof platformLevels)[number];

  @ApiPropertyOptional({ enum: platformStatuses })
  @IsOptional()
  @IsIn(platformStatuses)
  status?: (typeof platformStatuses)[number];
}
