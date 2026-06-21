import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectDecisionStatus } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDecisionDto {
  @ApiProperty({ example: 'Use Cloudinary for user profile uploads' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ProjectDecisionStatus })
  @IsOptional()
  @IsEnum(ProjectDecisionStatus)
  status?: ProjectDecisionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  ownerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  ownerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  decidedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outcome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
