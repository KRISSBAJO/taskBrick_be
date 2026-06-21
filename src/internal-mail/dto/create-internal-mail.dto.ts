import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InternalMailPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInternalMailDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  bodyText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @ApiProperty({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  toIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Internal mailbox addresses or aliases to deliver to.' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  toAddresses?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  ccIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Internal mailbox addresses or aliases to copy.' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  ccAddresses?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  bccIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Internal mailbox addresses or aliases to blind copy.' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  bccAddresses?: string[];

  @ApiPropertyOptional({ enum: InternalMailPriority })
  @IsOptional()
  @IsEnum(InternalMailPriority)
  priority?: InternalMailPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attachments?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  saveAsDraft?: boolean;
}
