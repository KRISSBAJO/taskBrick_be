import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TriggerWorkflowEventDto {
  @ApiProperty({ example: 'TASK' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  entityType!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @ApiProperty({ example: 'STATUS_CHANGED' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  eventType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  idempotencyKey?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  context?: unknown;
}
