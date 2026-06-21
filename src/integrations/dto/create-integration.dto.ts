import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationProvider } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';

export class CreateIntegrationDto {
  @ApiProperty({ enum: IntegrationProvider })
  @IsEnum(IntegrationProvider)
  provider!: IntegrationProvider;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  config?: unknown;

  @ApiPropertyOptional({ type: Object, description: 'Plaintext secrets encrypted before storage' })
  @IsOptional()
  secrets?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  externalAccountId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
