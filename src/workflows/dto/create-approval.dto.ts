import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ApprovalDefinitionStepDto } from './approval-definition-step.dto';

export class CreateApprovalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  definitionId?: string;

  @ApiProperty({ example: 'DOCUMENT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  entityType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: unknown;

  @ApiPropertyOptional({ type: [ApprovalDefinitionStepDto] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ApprovalDefinitionStepDto)
  steps?: ApprovalDefinitionStepDto[];
}
