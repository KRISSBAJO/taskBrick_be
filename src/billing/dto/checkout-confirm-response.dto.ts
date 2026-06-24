import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutConfirmResponseDto {
  @ApiProperty({ enum: ['stripe', 'paystack'] })
  provider!: 'stripe' | 'paystack';

  @ApiProperty()
  status!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  subscription?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  invoice?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object })
  account?: Record<string, unknown>;
}
