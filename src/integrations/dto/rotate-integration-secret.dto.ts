import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RotateIntegrationSecretDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value!: string;
}
