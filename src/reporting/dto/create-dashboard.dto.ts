import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardVisibility } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateDashboardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: DashboardVisibility })
  @IsOptional()
  @IsEnum(DashboardVisibility)
  visibility?: DashboardVisibility;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  layout?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  filters?: unknown;

  @ApiPropertyOptional({ minimum: 15, maximum: 86400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(86400)
  refreshIntervalSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
