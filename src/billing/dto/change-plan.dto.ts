import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class ChangePlanDto {
  @ApiProperty()
  @IsString()
  planId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  prorate = true;

  @ApiPropertyOptional({ enum: ['immediate', 'period_end'], default: 'immediate' })
  @IsOptional()
  @IsIn(['immediate', 'period_end'])
  changeTiming?: 'immediate' | 'period_end';

  @ApiPropertyOptional({
    enum: ['none', 'create_proration_invoice', 'credit_next_invoice'],
    default: 'create_proration_invoice'
  })
  @IsOptional()
  @IsIn(['none', 'create_proration_invoice', 'credit_next_invoice'])
  prorationBehavior?: 'none' | 'create_proration_invoice' | 'credit_next_invoice';
}
