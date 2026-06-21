import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { WorkflowNodeDto } from './workflow-node.dto';

export class CreateWorkflowDto {
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

  @ApiProperty({ example: 'TASK' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  entityType!: string;

  @ApiPropertyOptional({ example: 'EVENT' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  triggerType?: string;

  @ApiPropertyOptional({ example: 'STATUS_CHANGED' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventType?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  config?: unknown;

  @ApiPropertyOptional({ type: [WorkflowNodeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  nodes?: WorkflowNodeDto[];
}
