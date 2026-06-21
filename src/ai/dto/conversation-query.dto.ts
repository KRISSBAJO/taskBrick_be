import { ApiPropertyOptional } from '@nestjs/swagger';
import { AiConversationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ConversationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ enum: AiConversationStatus })
  @IsOptional()
  @IsEnum(AiConversationStatus)
  status?: AiConversationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contextType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contextId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  includeArchived?: boolean;
}
