import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplianceJobType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateComplianceJobDto {
  @ApiProperty({ enum: ComplianceJobType })
  @IsEnum(ComplianceJobType)
  type!: ComplianceJobType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  subjectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  parameters?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
