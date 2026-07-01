import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  QaEvidenceType,
  QaExecutionStatus,
  QaTaskLinkType,
  QaTestCasePriority,
  QaTestCaseStatus,
  QaTestCaseType,
  QaTestPlanStatus,
  QaTestRunSource,
  QaTestRunStatus,
  TaskPriority,
  TaskType
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min
} from 'class-validator';

export class QaListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;
}

export class QaTestCaseQueryDto extends QaListQueryDto {
  @ApiPropertyOptional({ enum: QaTestCaseStatus })
  @IsOptional()
  @IsEnum(QaTestCaseStatus)
  status?: QaTestCaseStatus;

  @ApiPropertyOptional({ enum: QaTestCaseType })
  @IsOptional()
  @IsEnum(QaTestCaseType)
  type?: QaTestCaseType;

  @ApiPropertyOptional({ enum: QaTestCasePriority })
  @IsOptional()
  @IsEnum(QaTestCasePriority)
  priority?: QaTestCasePriority;
}

export class CreateQaTestCaseDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ enum: QaTestCaseType })
  @IsOptional()
  @IsEnum(QaTestCaseType)
  type?: QaTestCaseType;

  @ApiPropertyOptional({ enum: QaTestCasePriority })
  @IsOptional()
  @IsEnum(QaTestCasePriority)
  priority?: QaTestCasePriority;

  @ApiPropertyOptional({ enum: QaTestCaseStatus })
  @IsOptional()
  @IsEnum(QaTestCaseStatus)
  status?: QaTestCaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  preconditions?: string;

  @ApiPropertyOptional({ description: 'Ordered manual test steps as JSON.' })
  @IsOptional()
  steps?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  expectedResult?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  automationKey?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimateMins?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: unknown;

  @ApiPropertyOptional({ description: 'Optional initial task to link this test case to.' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ enum: QaTaskLinkType })
  @IsOptional()
  @IsEnum(QaTaskLinkType)
  linkType?: QaTaskLinkType;
}

export class UpdateQaTestCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @ApiPropertyOptional({ enum: QaTestCaseType })
  @IsOptional()
  @IsEnum(QaTestCaseType)
  type?: QaTestCaseType;

  @ApiPropertyOptional({ enum: QaTestCasePriority })
  @IsOptional()
  @IsEnum(QaTestCasePriority)
  priority?: QaTestCasePriority;

  @ApiPropertyOptional({ enum: QaTestCaseStatus })
  @IsOptional()
  @IsEnum(QaTestCaseStatus)
  status?: QaTestCaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  preconditions?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  steps?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  expectedResult?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  automationKey?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimateMins?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: unknown;
}

export class LinkQaTestCaseTaskDto {
  @ApiProperty()
  @IsString()
  taskId!: string;

  @ApiPropertyOptional({ enum: QaTaskLinkType })
  @IsOptional()
  @IsEnum(QaTaskLinkType)
  linkType?: QaTaskLinkType;
}

export class CreateQaTestPlanDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: QaTestPlanStatus })
  @IsOptional()
  @IsEnum(QaTestPlanStatus)
  status?: QaTestPlanStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  releaseName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  milestone?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testCaseIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: unknown;
}

export class UpdateQaTestPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ enum: QaTestPlanStatus })
  @IsOptional()
  @IsEnum(QaTestPlanStatus)
  status?: QaTestPlanStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  releaseName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  milestone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: unknown;
}

export class AddQaTestPlanItemDto {
  @ApiProperty()
  @IsString()
  testCaseId!: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class QaTestRunQueryDto extends QaListQueryDto {
  @ApiPropertyOptional({ enum: QaTestRunStatus })
  @IsOptional()
  @IsEnum(QaTestRunStatus)
  status?: QaTestRunStatus;

  @ApiPropertyOptional({ enum: QaTestRunSource })
  @IsOptional()
  @IsEnum(QaTestRunSource)
  source?: QaTestRunSource;
}

export class CreateQaTestRunDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  name!: string;

  @ApiPropertyOptional({ enum: QaTestRunSource })
  @IsOptional()
  @IsEnum(QaTestRunSource)
  source?: QaTestRunSource;

  @ApiPropertyOptional({ enum: QaTestRunStatus })
  @IsOptional()
  @IsEnum(QaTestRunStatus)
  status?: QaTestRunStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalRunId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  environment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  buildVersion?: string;

  @ApiPropertyOptional({ type: [String], description: 'Explicit test cases. Defaults to plan/task linked cases.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testCaseIds?: string[];
}

export class UpdateQaTestExecutionDto {
  @ApiPropertyOptional({ enum: QaExecutionStatus })
  @IsOptional()
  @IsEnum(QaExecutionStatus)
  status?: QaExecutionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  actualResult?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMs?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  failureMessage?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  failureStack?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsDateString()
  executedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: unknown;
}

export class CreateQaExecutionDto extends UpdateQaTestExecutionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testCaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  title!: string;
}

export class CreateQaEvidenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testCaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ enum: QaEvidenceType })
  @IsOptional()
  @IsEnum(QaEvidenceType)
  type?: QaEvidenceType;

  @ApiProperty()
  @IsString()
  @MaxLength(240)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileAssetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: unknown;
}

export class CreateQaDefectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

export class UpdateQaProjectSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  qaGateEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  qaGateMinimumPassRate?: number;
}

export class ImportJunitResultsDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalRunId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  environment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  buildVersion?: string;

  @ApiProperty({ description: 'JUnit XML content.' })
  @IsString()
  xml!: string;
}
