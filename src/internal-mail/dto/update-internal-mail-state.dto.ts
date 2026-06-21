import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InternalMailFolder } from '@prisma/client';
import { IsBoolean, IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class InternalMailBooleanStateDto {
  @ApiProperty()
  @IsBoolean()
  value!: boolean;
}

export class SnoozeInternalMailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  snoozedUntil?: string;
}

export class MoveInternalMailDto {
  @ApiProperty({ enum: InternalMailFolder })
  @IsEnum(InternalMailFolder)
  folder!: InternalMailFolder;
}
