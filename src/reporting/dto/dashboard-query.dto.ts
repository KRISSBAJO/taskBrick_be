import { ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardVisibility } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class DashboardQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DashboardVisibility })
  @IsOptional()
  @IsEnum(DashboardVisibility)
  visibility?: DashboardVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  includeArchived?: boolean;
}
