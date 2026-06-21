import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuthLoginMethod } from '@prisma/client';
import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SiteSessionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional({ enum: AuthLoginMethod })
  @IsOptional()
  @IsIn(Object.values(AuthLoginMethod))
  authMethod?: AuthLoginMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  active?: string;
}
