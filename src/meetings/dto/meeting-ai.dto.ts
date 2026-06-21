import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';

const toBoolean = (value: unknown) => value === true || value === 'true';

export enum MeetingAiRoleSummaryType {
  EXECUTIVE = 'EXECUTIVE',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  ASSIGNEE = 'ASSIGNEE'
}

export class MeetingAiGenerateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  transcript?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class MeetingAiRoleSummaryDto extends MeetingAiGenerateDto {
  @ApiPropertyOptional({ enum: MeetingAiRoleSummaryType })
  @IsOptional()
  @IsEnum(MeetingAiRoleSummaryType)
  role?: MeetingAiRoleSummaryType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class LinkMeetingContextDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  projectId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  sprintId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  taskId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  teamId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  clientName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(220)
  clientEmail?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  clientCompany?: string | null;
}

export class ConvertMeetingActionItemsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  actionItemIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultProjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultSprintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultAssigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  defaultDueDate?: string;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  defaultTaskType?: TaskType;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  defaultPriority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  createChecklist?: boolean;
}

export class ScheduleMeetingFollowUpsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  actionItemIds?: string[];

  @ApiPropertyOptional({ minimum: 0, maximum: 10080 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  dueOffsetMinutes?: number;
}
