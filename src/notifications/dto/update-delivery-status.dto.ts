import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationDeliveryStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: NotificationDeliveryStatus })
  @IsEnum(NotificationDeliveryStatus)
  status!: NotificationDeliveryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lastError?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  attempts?: number;
}
