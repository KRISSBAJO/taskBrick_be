import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SprintQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: ['planned', 'active', 'completed'] })
  @IsOptional()
  @IsIn(['planned', 'active', 'completed'])
  state?: 'planned' | 'active' | 'completed';
}
