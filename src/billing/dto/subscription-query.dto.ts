import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SubscriptionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: BillingStatus })
  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;
}
