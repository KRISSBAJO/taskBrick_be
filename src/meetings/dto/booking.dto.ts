import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  BookingFormFieldType,
  BookingPageScope,
  BookingRoutingStrategy,
  MeetingLocationMode
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
  ValidateNested
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const toBoolean = (value: unknown) => value === true || value === 'true';

export class BookingPageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BookingPageScope)
  scope?: BookingPageScope;

  @IsOptional()
  @IsEnum(BookingRoutingStrategy)
  routingStrategy?: BookingRoutingStrategy;

  @IsOptional()
  @IsString()
  meetingTypeId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}

export class BookingFormFieldInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  fieldKey!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  label!: string;

  @IsOptional()
  @IsEnum(BookingFormFieldType)
  type?: BookingFormFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  placeholder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateBookingPageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  path!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1400)
  description?: string;

  @IsOptional()
  @IsEnum(BookingPageScope)
  scope?: BookingPageScope;

  @IsOptional()
  @IsEnum(BookingRoutingStrategy)
  routingStrategy?: BookingRoutingStrategy;

  @IsOptional()
  @IsString()
  meetingTypeId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  minNoticeMins?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  rollingWindowDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  dailyLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  weeklyLimit?: number;

  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  allowReschedule?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCancel?: boolean;

  @IsOptional()
  @IsBoolean()
  collectCompanyName?: boolean;

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
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  brandColor?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  logoUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  heroImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => BookingFormFieldInputDto)
  fields?: BookingFormFieldInputDto[];
}

export class UpdateBookingPageDto extends PartialType(CreateBookingPageDto) {}

export class CreateBookingFormFieldDto extends BookingFormFieldInputDto {}

export class UpdateBookingFormFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fieldKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  label?: string;

  @IsOptional()
  @IsEnum(BookingFormFieldType)
  type?: BookingFormFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  placeholder?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  options?: string[] | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PublicBookingPageQueryDto {
  @IsString()
  @IsNotEmpty()
  path!: string;
}

export class PublicBookingSlotsQueryDto extends PublicBookingPageQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PublicBookingIntakeResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  fieldKey!: string;

  @IsOptional()
  value?: unknown;
}

export class CreatePublicBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  path!: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsString()
  hostId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  guestName!: string;

  @IsEmail()
  guestEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  guestPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  guestCompany?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestTimezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => PublicBookingIntakeResponseDto)
  intakeResponses?: PublicBookingIntakeResponseDto[];
}

export class CancelPublicBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ReschedulePublicBookingDto {
  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsString()
  hostId?: string;
}
