import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ApiKeyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ApiKeyStatus })
  @IsOptional()
  @IsEnum(ApiKeyStatus)
  status?: ApiKeyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
