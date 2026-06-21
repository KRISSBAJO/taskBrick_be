import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'demo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  tenantSlug!: string;

  @ApiProperty({ example: 'admin@taskbricks.local' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
