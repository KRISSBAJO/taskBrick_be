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
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicBookingEnabled?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  publicBookingCreatorPermissions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  calendarConnectionPermissions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  whatsappConnectionPermissions?: string[];

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  defaultMeetingVisibility?: Visibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowExternalGuests?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireApprovalForExternalGuests?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  maxAdvanceBookingDays?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10080 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  minBookingNoticeMins?: number;

  @ApiPropertyOptional({ minimum: 15, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  maxMeetingDurationMins?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aiMeetingProcessingEnabled?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  @IsOptional()
  @IsObject()
  policyConfig?: Record<string, unknown> | null;
}
