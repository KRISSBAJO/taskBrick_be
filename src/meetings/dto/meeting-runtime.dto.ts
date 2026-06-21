import { ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingAttendeeStatus, MeetingReminderChannel, TaskPriority, TaskType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator';

export const MEETING_DECISION_STATUSES = ['OPEN', 'APPROVED', 'REJECTED', 'DEFERRED', 'SUPERSEDED'] as const;

export class UpdateLiveMeetingNotesDto {
  @IsString()
  @MaxLength(100000)
  notes!: string;

  @ApiPropertyOptional({ description: 'Optional optimistic concurrency version from the last live notes payload.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number;

  @IsOptional()
  @IsObject()
  cursor?: Record<string, unknown>;
}

export class CreateMeetingCommentDto {
  @IsString()
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMeetingCommentDto {
  @IsString()
  @MaxLength(10000)
  body!: string;
}

export class CreateMeetingDecisionDto {
  @IsString()
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  impact?: string;

  @IsOptional()
  @IsIn(MEETING_DECISION_STATUSES)
  status?: typeof MEETING_DECISION_STATUSES[number];

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMeetingDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  impact?: string | null;

  @IsOptional()
  @IsIn(MEETING_DECISION_STATUSES)
  status?: typeof MEETING_DECISION_STATUSES[number];

  @IsOptional()
  @IsString()
  ownerId?: string | null;

  @IsOptional()
  @IsString()
  taskId?: string | null;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateMeetingChecklistItemDto {
  @IsString()
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMeetingChecklistItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;

  @IsOptional()
  @IsString()
  ownerId?: string | null;

  @IsOptional()
  @IsString()
  taskId?: string | null;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMeetingAttendanceDto {
  @IsEnum(MeetingAttendeeStatus)
  status!: MeetingAttendeeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  responseNote?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AssignMeetingActionItemDto {
  @IsString()
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  sprintId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsString()
  actionItemId?: string;
}

export class SendMeetingFollowUpDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  subject?: string;

  @IsString()
  @MaxLength(20000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsEnum(MeetingReminderChannel, { each: true })
  channels?: MeetingReminderChannel[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsEmail({}, { each: true })
  recipients?: string[];

  @IsOptional()
  @IsBoolean()
  includeActionItems?: boolean;

  @IsOptional()
  @IsBoolean()
  syncToOmoFlow?: boolean;
}

export class SyncMeetingRuntimeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
