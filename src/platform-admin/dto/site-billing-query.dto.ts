import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingEventStatus, BillingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SiteBillingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class SiteSubscriptionQueryDto extends SiteBillingQueryDto {
  @ApiPropertyOptional({ enum: BillingStatus })
  @IsOptional()
  @IsIn(Object.values(BillingStatus))
  status?: BillingStatus;
}

export class SiteBillingEventQueryDto extends SiteBillingQueryDto {
  @ApiPropertyOptional({ enum: BillingEventStatus })
  @IsOptional()
  @IsIn(Object.values(BillingEventStatus))
  status?: BillingEventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

export class SiteSubscriptionUpdateDto {
  @ApiPropertyOptional({ enum: BillingStatus })
  @IsOptional()
  @IsIn(Object.values(BillingStatus))
  status?: BillingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  seatCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SiteChangePlanDto {
  @ApiProperty()
  @IsString()
  planId!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SiteBillingActionDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
