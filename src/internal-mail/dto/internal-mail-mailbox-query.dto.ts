import { ApiPropertyOptional } from '@nestjs/swagger';
import { InternalMailboxStatus, InternalMailboxType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class InternalMailMailboxQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: InternalMailboxStatus })
  @IsOptional()
  @IsEnum(InternalMailboxStatus)
  status?: InternalMailboxStatus;

  @ApiPropertyOptional({ enum: InternalMailboxType })
  @IsOptional()
  @IsEnum(InternalMailboxType)
  type?: InternalMailboxType;
}
