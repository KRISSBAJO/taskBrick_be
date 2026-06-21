import { ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationProvider, IntegrationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class IntegrationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: IntegrationProvider })
  @IsOptional()
  @IsEnum(IntegrationProvider)
  provider?: IntegrationProvider;

  @ApiPropertyOptional({ enum: IntegrationStatus })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  enabled?: boolean;
}
