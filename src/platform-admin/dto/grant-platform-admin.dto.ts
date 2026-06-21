import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const platformLevels = ['OWNER', 'ADMIN', 'SUPPORT', 'AUDITOR'] as const;

export class GrantPlatformAdminDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: platformLevels })
  @IsIn(platformLevels)
  level!: (typeof platformLevels)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
