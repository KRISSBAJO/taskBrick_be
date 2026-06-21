import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PortalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
