import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UsageRecordSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateUsageRecordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  featureKey!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional({ enum: UsageRecordSource })
  @IsOptional()
  @IsEnum(UsageRecordSource)
  source?: UsageRecordSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  idempotencyKey?: string;

  @ApiProperty()
  @IsDateString()
  periodStart!: string;

  @ApiProperty()
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: unknown;
}
