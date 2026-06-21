import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class SetupTotpDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}

export class EnableTotpDto {
  @ApiProperty()
  @IsString()
  factorId!: string;

  @ApiProperty({ minLength: 6, maxLength: 8 })
  @IsString()
  @Length(6, 8)
  code!: string;
}

export class DisableMfaDto {
  @ApiPropertyOptional({ minLength: 6, maxLength: 32 })
  @IsOptional()
  @IsString()
  @Length(6, 32)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentPassword?: string;
}

export class RegenerateBackupCodesDto {
  @ApiProperty({ minLength: 6, maxLength: 8 })
  @IsString()
  @Length(6, 8)
  code!: string;
}
