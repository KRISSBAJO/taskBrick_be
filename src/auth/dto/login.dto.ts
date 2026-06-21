import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'acme' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  tenantSlug!: string;

  @ApiProperty({ example: 'ada@acme.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'UseARealPassword123!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ description: 'Trusted-device token issued after a remembered MFA login' })
  @IsOptional()
  @IsString()
  trustedDeviceToken?: string;
}
