import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class VerifyMfaLoginDto {
  @ApiProperty()
  @IsString()
  mfaToken!: string;

  @ApiProperty({ minLength: 6, maxLength: 32 })
  @IsString()
  @Length(6, 32)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}
