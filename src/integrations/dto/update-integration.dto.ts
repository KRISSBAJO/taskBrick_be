import { ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  config?: unknown;

  @ApiPropertyOptional({ type: Object, description: 'Plaintext secrets encrypted before storage' })
  @IsOptional()
  secrets?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  externalAccountId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: IntegrationStatus })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;
}
