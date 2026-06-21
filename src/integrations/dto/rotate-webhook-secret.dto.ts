import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RotateWebhookSecretDto {
  @ApiPropertyOptional({ description: 'Optional caller-provided secret; generated when omitted' })
  @IsOptional()
  @IsString()
  secret?: string;
}
