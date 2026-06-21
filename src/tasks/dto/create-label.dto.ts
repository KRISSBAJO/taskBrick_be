import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Matches, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: '#2563eb' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
  color?: string;
}
