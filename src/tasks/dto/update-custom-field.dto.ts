import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';
import { CustomFieldOptionInputDto } from './custom-field-option-input.dto';

export class UpdateCustomFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: CustomFieldType })
  @IsOptional()
  @IsEnum(CustomFieldType)
  type?: CustomFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workspaceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [CustomFieldOptionInputDto], description: 'When supplied, replaces all options.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldOptionInputDto)
  options?: CustomFieldOptionInputDto[];
}
