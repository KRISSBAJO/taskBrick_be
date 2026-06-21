import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const TASK_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'dueDate',
  'startDate',
  'completedAt',
  'priority',
  'status',
  'type',
  'storyPoints',
  'estimateMins',
  'actualMins',
  'sortOrder',
  'key',
  'title',
  'sprintName'
] as const;

const toBoolean = (value: unknown) => value === true || value === 'true';

export class TaskQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentTaskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reporterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  watcherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  labelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  boardColumnId?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({ description: 'Comma-separated TaskStatus values.' })
  @IsOptional()
  @IsString()
  statuses?: string;

  @ApiPropertyOptional({ description: 'Comma-separated TaskPriority values.' })
  @IsOptional()
  @IsString()
  priorities?: string;

  @ApiPropertyOptional({ description: 'Comma-separated TaskType values.' })
  @IsOptional()
  @IsString()
  types?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  updatedFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  updatedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedTo?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  storyPointsMin?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  storyPointsMax?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimateMinsMin?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimateMinsMax?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualMinsMin?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualMinsMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  hasAttachments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  hasDependencies?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  hasSubtasks?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  unassigned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isOverdue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Return tasks blocked by another task.' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional({ description: 'Return tasks blocking other tasks.' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isBlocking?: boolean;

  @ApiPropertyOptional({ enum: TASK_SORT_FIELDS })
  @IsOptional()
  @IsIn(TASK_SORT_FIELDS)
  sortBy?: (typeof TASK_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
