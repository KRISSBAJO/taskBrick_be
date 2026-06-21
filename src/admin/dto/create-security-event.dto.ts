import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityEventSeverity } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSecurityEventDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  type!: string;

  @ApiPropertyOptional({ enum: SecurityEventSeverity })
  @IsOptional()
  @IsEnum(SecurityEventSeverity)
  severity?: SecurityEventSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

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

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: unknown;
}
