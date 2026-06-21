import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength
} from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  url!: string;

  @ApiProperty({ type: [String], description: 'Event names. Use * to receive all events.' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ default: 'hmac-sha256' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  signingAlgorithm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
