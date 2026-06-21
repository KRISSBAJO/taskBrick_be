import { ApiPropertyOptional } from '@nestjs/swagger';
import { InternalMailFolder } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class InternalMailQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: InternalMailFolder })
  @IsOptional()
  @IsEnum(InternalMailFolder)
  folder?: InternalMailFolder;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  starredOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  flaggedOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  pinnedOnly?: boolean;
}
