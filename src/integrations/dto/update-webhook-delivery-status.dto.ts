import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookDeliveryStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateWebhookDeliveryStatusDto {
  @ApiProperty({ enum: WebhookDeliveryStatus })
  @IsEnum(WebhookDeliveryStatus)
  status!: WebhookDeliveryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  responseStatus?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  responseBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  lastError?: string;
}
