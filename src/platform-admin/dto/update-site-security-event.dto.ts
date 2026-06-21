import { ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityEventSeverity, SecurityEventStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateSiteSecurityEventDto {
  @ApiPropertyOptional({ enum: SecurityEventStatus })
  @IsOptional()
  @IsEnum(SecurityEventStatus)
  status?: SecurityEventStatus;

  @ApiPropertyOptional({ enum: SecurityEventSeverity })
  @IsOptional()
  @IsEnum(SecurityEventSeverity)
  severity?: SecurityEventSeverity;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: unknown;
}
