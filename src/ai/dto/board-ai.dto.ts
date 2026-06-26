import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ProjectAiDto } from './project-ai.dto';

export class BoardAiDto extends ProjectAiDto {
  @ApiPropertyOptional({ description: 'Specific board to analyze. Defaults to the project default board.' })
  @IsOptional()
  @IsString()
  boardId?: string;
}

export class BoardAiHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  boardId?: string;

  @ApiPropertyOptional({ enum: ['board_summary', 'board_risk_scan', 'board_action_plan', 'board_actions_apply'] })
  @IsOptional()
  @IsString()
  @IsIn(['board_summary', 'board_risk_scan', 'board_action_plan', 'board_actions_apply'])
  type?: string;
}
