import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  MeetingReminderChannel,
  MeetingReminderJobStatus,
  MeetingStatus,
  Visibility
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class MeetingAdminRangeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: MeetingStatus })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;
}

export class MeetingAdminLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional({ enum: MeetingReminderJobStatus })
  @IsOptional()
  @IsEnum(MeetingReminderJobStatus)
  status?: MeetingReminderJobStatus;

  @ApiPropertyOptional({ enum: MeetingReminderChannel })
  @IsOptional()
  @IsEnum(MeetingReminderChannel)
  channel?: MeetingReminderChannel;
}

export class UpdateMeetingPolicyDto {
  @IsOptional()
  @IsBoolean()
  publicBookingEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  publicBookingCreatorPermissions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  calendarConnectionPermissions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  whatsappConnectionPermissions?: string[];

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  defaultMeetingVisibility?: Visibility;

  @IsOptional()
  @IsBoolean()
  allowExternalGuests?: boolean;

  @IsOptional()
  @IsBoolean()
  requireApprovalForExternalGuests?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  maxAdvanceBookingDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  minBookingNoticeMins?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  maxMeetingDurationMins?: number;

  @IsOptional()
  @IsBoolean()
  aiMeetingProcessingEnabled?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  policyConfig?: Record<string, unknown> | null;
}
