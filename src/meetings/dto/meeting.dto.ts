import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  MeetingAgendaStatus,
  MeetingApprovalStatus,
  MeetingAttendeeRole,
  MeetingAttendeeStatus,
  MeetingAvailabilityScope,
  MeetingLocationMode,
  MeetingReminderChannel,
  MeetingReminderStatus,
  MeetingStatus,
  MeetingTypeCategory,
  Visibility
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const toBoolean = (value: unknown) => value === true || value === 'true';

export class MeetingTypeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MeetingTypeCategory })
  @IsOptional()
  @IsEnum(MeetingTypeCategory)
  category?: MeetingTypeCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}

export class CreateMeetingTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(MeetingTypeCategory)
  category?: MeetingTypeCategory;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMins?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  bufferBeforeMins?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  bufferAfterMins?: number;

  @IsOptional()
  @IsEnum(MeetingLocationMode)
  locationMode?: MeetingLocationMode;

  @IsOptional()
  @IsEnum(Visibility)
  defaultVisibility?: Visibility;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  defaultReminderMins?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  defaultAgenda?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMeetingTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsEnum(MeetingTypeCategory)
  category?: MeetingTypeCategory;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  icon?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMins?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  bufferBeforeMins?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  bufferAfterMins?: number;

  @IsOptional()
  @IsEnum(MeetingLocationMode)
  locationMode?: MeetingLocationMode;

  @IsOptional()
  @IsEnum(Visibility)
  defaultVisibility?: Visibility;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  defaultReminderMins?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  defaultAgenda?: string[] | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ExternalAttendeeDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(MeetingAttendeeRole)
  role?: MeetingAttendeeRole;
}

export class MeetingAgendaInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMins?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class MeetingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  hostId?: string;

  @IsOptional()
  @IsString()
  meetingTypeId?: string;

  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeArchived?: boolean;
}

export class MeetingConflictQueryDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  hostId?: string;

  @IsOptional()
  @IsString()
  attendeeIds?: string;
}

export class CreateMeetingDto {
  @IsOptional()
  @IsString()
  meetingTypeId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  sprintId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  hostId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsEnum(MeetingLocationMode)
  locationMode?: MeetingLocationMode;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  locationName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  conferenceProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  clientName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(220)
  clientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  clientCompany?: string;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recurrenceRule?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @IsString({ each: true })
  attendeeIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => ExternalAttendeeDto)
  externalAttendees?: ExternalAttendeeDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => MeetingAgendaInputDto)
  agendaItems?: MeetingAgendaInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  reminderOffsets?: number[];

  @IsOptional()
  @IsBoolean()
  allowConflicts?: boolean;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  meetingTypeId?: string | null;

  @IsOptional()
  @IsString()
  projectId?: string | null;

  @IsOptional()
  @IsString()
  sprintId?: string | null;

  @IsOptional()
  @IsString()
  taskId?: string | null;

  @IsOptional()
  @IsString()
  teamId?: string | null;

  @IsOptional()
  @IsString()
  hostId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsEnum(MeetingLocationMode)
  locationMode?: MeetingLocationMode;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  locationName?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  meetingUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  conferenceProvider?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  clientName?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(220)
  clientEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  clientCompany?: string | null;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  recurrenceRule?: string | null;

  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @IsOptional()
  @IsEnum(MeetingApprovalStatus)
  approvalStatus?: MeetingApprovalStatus;

  @IsOptional()
  @IsBoolean()
  allowConflicts?: boolean;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CancelMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AddMeetingAttendeeDto {
  @ValidateIf((dto: AddMeetingAttendeeDto) => !dto.email)
  @IsString()
  userId?: string;

  @ValidateIf((dto: AddMeetingAttendeeDto) => !dto.userId)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(MeetingAttendeeRole)
  role?: MeetingAttendeeRole;
}

export class UpdateMeetingAttendeeDto {
  @IsOptional()
  @IsEnum(MeetingAttendeeRole)
  role?: MeetingAttendeeRole;

  @IsOptional()
  @IsEnum(MeetingAttendeeStatus)
  status?: MeetingAttendeeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  responseNote?: string | null;
}

export class CreateAgendaItemDto extends MeetingAgendaInputDto {}

export class UpdateAgendaItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsEnum(MeetingAgendaStatus)
  status?: MeetingAgendaStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMins?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateMeetingReminderDto {
  @IsEnum(MeetingReminderChannel)
  channel!: MeetingReminderChannel;

  @IsOptional()
  @IsString()
  attendeeId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(525600)
  offsetMinutes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateKey?: string;
}

export class UpdateMeetingReminderDto {
  @IsOptional()
  @IsEnum(MeetingReminderStatus)
  status?: MeetingReminderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  error?: string | null;
}

export class AvailabilityQueryDto {
  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsEnum(MeetingAvailabilityScope)
  scope?: MeetingAvailabilityScope;
}

export class CreateAvailabilityWindowDto {
  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsEnum(MeetingAvailabilityScope)
  scope?: MeetingAvailabilityScope;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @MaxLength(5)
  startTime!: string;

  @IsString()
  @MaxLength(5)
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;
}

export class UpdateAvailabilityWindowDto {
  @IsOptional()
  @IsString()
  ownerId?: string | null;

  @IsOptional()
  @IsString()
  teamId?: string | null;

  @IsOptional()
  @IsEnum(MeetingAvailabilityScope)
  scope?: MeetingAvailabilityScope;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBlackoutWindowDto {
  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;
}
