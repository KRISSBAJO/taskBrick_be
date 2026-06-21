import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncIntegrationDto {
  @ApiPropertyOptional({ default: 'manual' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  cursor?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  payload?: unknown;
}
