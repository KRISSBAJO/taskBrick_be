import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Visibility } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export class CreateUploadIntentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ description: 'Attachment scope such as TASK, PROJECT, CHAT, DOCUMENT, WORKFLOW, or OMOFLOW.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  scope?: string;

  @ApiProperty({ description: 'Entity type this upload will be attached to, such as TASK, PROJECT, CONVERSATION, MESSAGE, DOCUMENT, or WORKFLOW_RUN.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  entityType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;
}
