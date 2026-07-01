import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingLeadStatus, MarketingLeadType } from '@prisma/client';
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateContactRequestDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(240)
  email!: string;

  @ApiPropertyOptional({ example: 'Acme Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  company?: string;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @ApiPropertyOptional({ example: 'Enterprise rollout' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  subject?: string;

  @ApiProperty({ example: 'We want to learn more about TaskBricks for our delivery team.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ example: 'landing-contact' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional({ example: 'https://taskbrick.com/contact' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;
}

export class CreateDemoRequestDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(240)
  email!: string;

  @ApiProperty({ example: 'Acme Inc.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  company!: string;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @ApiPropertyOptional({ example: 'VP Delivery' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ example: '51-200' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  teamSize?: string;

  @ApiPropertyOptional({ example: '2026-07-08' })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({ example: '10:00 AM' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  preferredTime?: string;

  @ApiPropertyOptional({ example: 'America/Chicago' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional({ example: 'We want to review project controls and mobile workflows.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @ApiPropertyOptional({ example: 'landing-floating-demo' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiPropertyOptional({ example: 'https://taskbrick.com/book-demo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;
}

export class MarketingLeadResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: MarketingLeadType })
  type!: MarketingLeadType;

  @ApiProperty({ enum: MarketingLeadStatus })
  status!: MarketingLeadStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  mailSent!: boolean;
}
