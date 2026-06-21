import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @ApiPropertyOptional({ enum: ['stripe', 'paystack', 'local'] })
  @IsOptional()
  @IsIn(['stripe', 'paystack', 'local'])
  provider?: 'stripe' | 'paystack' | 'local';
}
