import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class OmoFlowMeetingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transcriptUrl?: string;
}

export class OmoFlowActionItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  storyPoints?: number;
}

export class OmoFlowRuntimeEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ example: 'meeting.completed' })
  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ type: OmoFlowMeetingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OmoFlowMeetingDto)
  meeting?: OmoFlowMeetingDto;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  agendaItems?: unknown[];

  @ApiPropertyOptional({ type: [OmoFlowActionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OmoFlowActionItemDto)
  actionItems?: OmoFlowActionItemDto[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  payload?: unknown;
}
