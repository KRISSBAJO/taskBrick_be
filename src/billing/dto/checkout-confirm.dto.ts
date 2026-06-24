import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CheckoutConfirmDto {
  @ApiPropertyOptional({ enum: ['stripe', 'paystack'] })
  @IsOptional()
  @IsIn(['stripe', 'paystack'])
  provider?: 'stripe' | 'paystack';

  @ApiPropertyOptional({ description: 'Stripe Checkout Session id returned as session_id.' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Paystack transaction reference returned as reference or trxref.' })
  @IsOptional()
  @IsString()
  reference?: string;
}
