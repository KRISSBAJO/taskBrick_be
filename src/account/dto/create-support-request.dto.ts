import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum SupportRequestCategory {
  ACCOUNT = 'ACCOUNT',
  WORKSPACE = 'WORKSPACE',
  BILLING = 'BILLING',
  SECURITY = 'SECURITY',
  TECHNICAL = 'TECHNICAL',
  FEATURE = 'FEATURE'
}

export enum SupportRequestPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export class CreateSupportRequestDto {
  @ApiProperty({ enum: SupportRequestCategory, example: SupportRequestCategory.WORKSPACE })
  @IsEnum(SupportRequestCategory)
  category!: SupportRequestCategory;

  @ApiPropertyOptional({ enum: SupportRequestPriority, default: SupportRequestPriority.NORMAL })
  @IsOptional()
  @IsEnum(SupportRequestPriority)
  priority?: SupportRequestPriority;

  @ApiProperty({ example: 'Cannot invite a user into the delivery workspace' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  subject!: string;

  @ApiProperty({ example: 'The invite form returns Unauthorized even though I am the tenant owner.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ example: '/settings?tab=workspace' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourceUrl?: string;
}
