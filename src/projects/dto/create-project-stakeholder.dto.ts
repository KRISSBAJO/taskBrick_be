import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStakeholderInfluence } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectStakeholderDto {
  @ApiProperty({ example: 'Sarah Johnson' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'sarah@acme.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @ApiPropertyOptional({ example: 'Acme Corporation' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  organization?: string;

  @ApiPropertyOptional({ example: 'Executive sponsor' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @ApiPropertyOptional({ enum: ProjectStakeholderInfluence })
  @IsOptional()
  @IsEnum(ProjectStakeholderInfluence)
  influence?: ProjectStakeholderInfluence;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isExternal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
