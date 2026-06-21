import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(12000)
  content!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: unknown;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  generateResponse?: boolean;

  @ApiPropertyOptional({ description: 'Optional idempotency key for action-producing prompts' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  idempotencyKey?: string;
}
