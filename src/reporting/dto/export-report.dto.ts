import { ApiProperty } from '@nestjs/swagger';
import { ReportExportFormat } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ExportReportDto {
  @ApiProperty({ enum: ReportExportFormat })
  @IsEnum(ReportExportFormat)
  format!: ReportExportFormat;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  parameters?: unknown;
}
