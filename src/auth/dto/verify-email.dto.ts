import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Opaque verification token from the email link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;
}
