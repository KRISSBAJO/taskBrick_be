import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthLoginMethod,
  LoginAttemptStatus,
  SsoProviderStatus,
  TrustedDeviceStatus
} from '@prisma/client';
import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SiteLoginHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ enum: AuthLoginMethod })
  @IsOptional()
  @IsIn(Object.values(AuthLoginMethod))
  method?: AuthLoginMethod;

  @ApiPropertyOptional({ enum: LoginAttemptStatus })
  @IsOptional()
  @IsIn(Object.values(LoginAttemptStatus))
  status?: LoginAttemptStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  suspicious?: string;
}

export class SiteTrustedDeviceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ enum: TrustedDeviceStatus })
  @IsOptional()
  @IsIn(Object.values(TrustedDeviceStatus))
  status?: TrustedDeviceStatus;
}

export class SiteSsoProviderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: SsoProviderStatus })
  @IsOptional()
  @IsIn(Object.values(SsoProviderStatus))
  status?: SsoProviderStatus;
}

export class SiteSecurityPolicyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;
}
