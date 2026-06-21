import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProjectAiDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  prompt?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  options?: unknown;
}
