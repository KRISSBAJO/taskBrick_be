import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateWidgetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  type!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  config?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  position?: unknown;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  dataSource?: unknown;

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
  hidden?: boolean;
}
