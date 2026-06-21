import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Opaque password reset token from the reset email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;

  @ApiProperty({ example: 'UseARealPassword123!' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
