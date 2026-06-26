import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InternalMailboxMemberRole, InternalMailboxStatus, InternalMailboxType } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInternalMailboxDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  localPart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  address?: string;

  @ApiPropertyOptional({ enum: InternalMailboxType, default: InternalMailboxType.SHARED })
  @IsOptional()
  @IsEnum(InternalMailboxType)
  type?: InternalMailboxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  memberIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateInternalMailboxDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  localPart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  address?: string;

  @ApiPropertyOptional({ enum: InternalMailboxStatus })
  @IsOptional()
  @IsEnum(InternalMailboxStatus)
  status?: InternalMailboxStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateInternalMailboxAliasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  localPart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class RegenerateInternalMailboxAddressDto {
  @ApiPropertyOptional({
    description: 'Optional local part to use for the regenerated primary internal address.'
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  localPart?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Keep the previous primary address as an active alias so old references still resolve.'
  })
  @IsOptional()
  @IsBoolean()
  keepPreviousAsAlias?: boolean;
}

export class UpsertInternalMailboxMemberDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ enum: InternalMailboxMemberRole })
  @IsOptional()
  @IsEnum(InternalMailboxMemberRole)
  role?: InternalMailboxMemberRole;
}
