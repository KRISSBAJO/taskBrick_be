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

  @IsOptional()
  @IsBoolean()
  calendarSyncEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailRemindersEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappRemindersEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsRemindersEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  webhookEventsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  requireApprovedWhatsappTemplates?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  manualLinkPolicy?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  providerConfig?: Record<string, unknown> | null;
}

export class CreateMeetingConferenceDto {
  @ApiPropertyOptional({ enum: MeetingConferenceProvider })
  @IsOptional()
  @IsEnum(MeetingConferenceProvider)
  provider?: MeetingConferenceProvider;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  calendarId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sendUpdates?: 'all' | 'externalOnly' | 'none';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class MeetingReminderJobQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MeetingReminderJobStatus)
  status?: MeetingReminderJobStatus;

  @IsOptional()
  @IsEnum(MeetingReminderChannel)
  channel?: MeetingReminderChannel;

  @IsOptional()
  @IsString()
  meetingId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  dueOnly?: boolean;
}

export class ProcessMeetingReminderJobsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
