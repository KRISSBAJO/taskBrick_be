import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSecurityPolicyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enforceIpAllowlist?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAllowlist?: string[];

  @ApiPropertyOptional({ minimum: 15, maximum: 525600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(525600)
  sessionTtlMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxSessionsPerUser?: number;

  @ApiPropertyOptional({ minimum: 8, maximum: 128 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(8)
  @Max(128)
  passwordMinLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passwordRequireUpper?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passwordRequireLower?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passwordRequireNumber?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passwordRequireSymbol?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  passwordHistoryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean;

  @ApiPropertyOptional({ minimum: 30, maximum: 3650 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3650)
  auditRetentionDays?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 3650 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  dataRetentionDays?: number;

  @ApiPropertyOptional({ minimum: 1024, maximum: 1073741824 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  @Max(1073741824)
  maxUploadBytes?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUploadMimeTypes?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: unknown;
}
