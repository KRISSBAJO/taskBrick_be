import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ProjectAiDto } from './project-ai.dto';

export class BoardAiDto extends ProjectAiDto {
  @ApiPropertyOptional({ description: 'Specific board to analyze. Defaults to the project default board.' })
  @IsOptional()
  @IsString()
  boardId?: string;
}
