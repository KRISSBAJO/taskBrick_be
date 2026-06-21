import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportExportFormat, ReportExportStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ExportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportId?: string;

  @ApiPropertyOptional({ enum: ReportExportFormat })
  @IsOptional()
  @IsEnum(ReportExportFormat)
  format?: ReportExportFormat;

  @ApiPropertyOptional({ enum: ReportExportStatus })
  @IsOptional()
  @IsEnum(ReportExportStatus)
  status?: ReportExportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
