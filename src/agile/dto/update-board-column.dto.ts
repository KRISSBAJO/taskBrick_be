import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateBoardColumnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ enum: TaskStatus, nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus | null;

  @ApiPropertyOptional({ type: Number, minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  wipLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCollapsed?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
