import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  MeetingConferenceProvider,
  MeetingReminderChannel,
  MeetingReminderJobStatus
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
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
  IsUrl,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const toBoolean = (value: unknown) => value === true || value === 'true';

export class UpdateMeetingIntegrationSettingsDto {
  @ApiPropertyOptional({ enum: MeetingConferenceProvider })
  @IsOptional()
  @IsEnum(MeetingConferenceProvider)
  defaultConferenceProvider?: MeetingConferenceProvider;

  @ApiPropertyOptional({ enum: MeetingConferenceProvider, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(MeetingConferenceProvider, { each: true })
  allowedConferenceProviders?: MeetingConferenceProvider[];

  @ApiPropertyOptional({ enum: MeetingReminderChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsEnum(MeetingReminderChannel, { each: true })
  defaultReminderChannels?: MeetingReminderChannel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  calendarSyncEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailRemindersEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappRemindersEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smsRemindersEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  webhookEventsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireApprovedWhatsappTemplates?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  @IsOptional()
  @IsObject()
  manualLinkPolicy?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  @IsOptional()
  @IsObject()
  providerConfig?: Record<string, unknown> | null;
}

export class CreateMeetingConferenceDto {
  @ApiPropertyOptional({ enum: MeetingConferenceProvider })
  @IsOptional()
  @IsEnum(MeetingConferenceProvider)
  provider?: MeetingConferenceProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  meetingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(220)
  locationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  calendarId?: string;

  @ApiPropertyOptional({ enum: ['all', 'externalOnly', 'none'] })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sendUpdates?: 'all' | 'externalOnly' | 'none';

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class MeetingReminderJobQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MeetingReminderJobStatus })
  @IsOptional()
  @IsEnum(MeetingReminderJobStatus)
  status?: MeetingReminderJobStatus;

  @ApiPropertyOptional({ enum: MeetingReminderChannel })
  @IsOptional()
  @IsEnum(MeetingReminderChannel)
  channel?: MeetingReminderChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingId?: string;

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
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  dueOnly?: boolean;
}

export class ProcessMeetingReminderJobsDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
