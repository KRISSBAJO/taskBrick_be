import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CompleteSprintDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moveIncompleteToSprintId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  moveIncompleteToBacklog?: boolean;
}
