import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';

export class WorkflowNodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  key?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'NOTIFY' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  type!: string;

  @ApiPropertyOptional({ example: 'SEND_NOTIFICATION' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  actionType?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  config?: unknown;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  retryAttempts?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  timeoutSeconds?: number;

  @ApiPropertyOptional({ example: 'STOP' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  onFailure?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  dependsOn?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  positionX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  positionY?: number;
}
