import { ApiPropertyOptional } from '@nestjs/swagger';
import { ComplianceJobStatus, ComplianceJobType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ComplianceJobQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ComplianceJobType })
  @IsOptional()
  @IsEnum(ComplianceJobType)
  type?: ComplianceJobType;

  @ApiPropertyOptional({ enum: ComplianceJobStatus })
  @IsOptional()
  @IsEnum(ComplianceJobStatus)
  status?: ComplianceJobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  subjectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
