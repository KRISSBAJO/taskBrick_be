import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ enum: BookingPageScope })
  @IsOptional()
  @IsEnum(BookingPageScope)
  scope?: BookingPageScope;

  @ApiPropertyOptional({ enum: BookingRoutingStrategy })
  @IsOptional()
  @IsEnum(BookingRoutingStrategy)
  routingStrategy?: BookingRoutingStrategy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
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
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  fieldKey!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  label!: string;

  @ApiPropertyOptional({ enum: BookingFormFieldType })
  @IsOptional()
  @IsEnum(BookingFormFieldType)
  type?: BookingFormFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateBookingPageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  path!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1400)
  description?: string;

  @ApiPropertyOptional({ enum: BookingPageScope })
  @IsOptional()
  @IsEnum(BookingPageScope)
  scope?: BookingPageScope;

  @ApiPropertyOptional({ enum: BookingRoutingStrategy })
  @IsOptional()
  @IsEnum(BookingRoutingStrategy)
  routingStrategy?: BookingRoutingStrategy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMins?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 240 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  bufferBeforeMins?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 240 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  bufferAfterMins?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10080 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  minNoticeMins?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  rollingWindowDays?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  dailyLimit?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  weeklyLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowReschedule?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowCancel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  collectCompanyName?: boolean;

  @ApiPropertyOptional({ enum: MeetingLocationMode })
  @IsOptional()
  @IsEnum(MeetingLocationMode)
  locationMode?: MeetingLocationMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(220)
  locationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  meetingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  conferenceProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  brandColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  heroImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [BookingFormFieldInputDto] })
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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fieldKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(140)
  label?: string;

  @ApiPropertyOptional({ enum: BookingFormFieldType })
  @IsOptional()
  @IsEnum(BookingFormFieldType)
  type?: BookingFormFieldType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  placeholder?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  options?: string[] | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PublicBookingPageQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  path!: string;
}

export class PublicBookingSlotsQueryDto extends PublicBookingPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PublicBookingIntakeResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  fieldKey!: string;

  @ApiPropertyOptional({
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'array', items: {} },
      { type: 'object', additionalProperties: true }
    ],
    nullable: true
  })
  @IsOptional()
  value?: unknown;
}

export class CreatePublicBookingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  path!: string;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  guestName!: string;

  @ApiProperty()
  @IsEmail()
  guestEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  guestPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  guestCompany?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestTimezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;

  @ApiPropertyOptional({ type: [PublicBookingIntakeResponseDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => PublicBookingIntakeResponseDto)
  intakeResponses?: PublicBookingIntakeResponseDto[];
}

export class CancelPublicBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ReschedulePublicBookingDto {
  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostId?: string;
}
