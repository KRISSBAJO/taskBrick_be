import { ApiPropertyOptional } from '@nestjs/swagger';
import { Matches, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLabelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: '#16a34a' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
  color?: string;
}
