import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { IsBooleanString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ImportTasksDto {
  @ApiProperty({ description: 'Project that will receive every imported task.' })
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({ description: 'Optional board context for the import UX.' })
  @IsOptional()
  @IsString()
  boardId?: string;

  @ApiPropertyOptional({
    description: 'Validate the workbook without creating tasks.',
    example: 'true'
  })
  @IsOptional()
  @IsBooleanString()
  dryRun?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  defaultStatus?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  defaultPriority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  defaultType?: TaskType;
}

export class TaskImportRowIssueDto {
  @ApiProperty()
  row!: number;

  @ApiPropertyOptional()
  field?: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  value?: string;
}

export class ImportedTaskDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority!: TaskPriority;

  @ApiPropertyOptional()
  boardColumnId?: string | null;
}

export class ImportTasksResponseDto {
  @ApiProperty()
  dryRun!: boolean;

  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  validRows!: number;

  @ApiProperty()
  createdCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty({ type: [TaskImportRowIssueDto] })
  errors!: TaskImportRowIssueDto[];

  @ApiProperty({ type: [TaskImportRowIssueDto] })
  warnings!: TaskImportRowIssueDto[];

  @ApiProperty({ type: [ImportedTaskDto] })
  tasks!: ImportedTaskDto[];
}
