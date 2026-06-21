import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forwardedFromMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  attachments?: unknown[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: unknown;
}
