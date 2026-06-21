import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const searchCategories = [
  'all',
  'projects',
  'tasks',
  'files',
  'people',
  'teams',
  'workspaces',
  'messages'
] as const;

export type SearchCategory = (typeof searchCategories)[number];

export class GlobalSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: searchCategories,
    default: 'all',
    description: 'Restrict search to one result family.'
  })
  @IsOptional()
  @IsIn(searchCategories)
  category: SearchCategory = 'all';

  @ApiPropertyOptional({ description: 'Optional context entity, such as project, task, or conversation.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  contextType?: string;

  @ApiPropertyOptional({ description: 'Optional context id used to bias or restrict command-center results.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contextId?: string;
}
