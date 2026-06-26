import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiRequestStatus, TaskPriority, TaskStatus, TaskType } from '@prisma/client';

export class BoardAiUsageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  totalTokens!: number;
}

export class BoardAiRiskFindingDto {
  @ApiProperty()
  type!: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  evidence!: string;

  @ApiPropertyOptional()
  taskId?: string;

  @ApiPropertyOptional()
  columnId?: string;
}

export class BoardAiSummaryResponseDto {
  @ApiProperty()
  generated!: boolean;

  @ApiProperty()
  projectId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  boardId?: string | null;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: [String] })
  highlights!: string[];

  @ApiProperty({ type: [String] })
  risks!: string[];

  @ApiProperty({ type: [String] })
  recommendedActions!: string[];

  @ApiProperty({ type: BoardAiUsageDto })
  usage!: BoardAiUsageDto;
}

export class BoardAiRiskScanResponseDto {
  @ApiProperty()
  generated!: boolean;

  @ApiProperty()
  projectId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  boardId?: string | null;

  @ApiProperty({ type: [BoardAiRiskFindingDto] })
  findings!: BoardAiRiskFindingDto[];

  @ApiProperty()
  narrative!: string;

  @ApiProperty({ type: BoardAiUsageDto })
  usage!: BoardAiUsageDto;
}

export enum BoardAiActionType {
  CREATE_TASK = 'BOARD_CREATE_TASK',
  UPDATE_TASK = 'BOARD_UPDATE_TASK',
  MOVE_TASK = 'BOARD_MOVE_TASK'
}

export enum BoardAiActionRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export class BoardAiActionPayloadDto {
  @ApiProperty()
  projectId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  boardId?: string | null;

  @ApiPropertyOptional()
  taskId?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  boardColumnId?: string | null;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskType })
  type?: TaskType;

  @ApiPropertyOptional({ nullable: true, type: String })
  dueDate?: string | null;

  @ApiPropertyOptional()
  storyPoints?: number;

  @ApiPropertyOptional()
  estimateMins?: number;

  @ApiPropertyOptional()
  sortOrder?: number;
}

export class BoardAiActionProposalDto {
  @ApiProperty()
  actionId!: string;

  @ApiProperty({ enum: BoardAiActionType })
  type!: BoardAiActionType;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  rationale!: string;

  @ApiProperty()
  impact!: string;

  @ApiProperty({ enum: BoardAiActionRiskLevel })
  riskLevel!: BoardAiActionRiskLevel;

  @ApiProperty()
  confidence!: number;

  @ApiPropertyOptional()
  taskId?: string;

  @ApiPropertyOptional()
  taskKey?: string;

  @ApiPropertyOptional()
  taskTitle?: string;

  @ApiPropertyOptional()
  columnId?: string;

  @ApiPropertyOptional()
  columnName?: string;

  @ApiProperty({ type: BoardAiActionPayloadDto })
  payload!: BoardAiActionPayloadDto;
}

export class BoardAiActionPlanResponseDto {
  @ApiProperty()
  generated!: boolean;

  @ApiProperty()
  projectId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  boardId?: string | null;

  @ApiProperty()
  summary!: string;

  @ApiProperty({ type: [BoardAiActionProposalDto] })
  proposals!: BoardAiActionProposalDto[];

  @ApiProperty({ type: BoardAiUsageDto })
  usage!: BoardAiUsageDto;
}

export class BoardAiApplyResultDto {
  @ApiProperty()
  actionId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  entityType?: string;

  @ApiPropertyOptional()
  entityId?: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  error?: string;
}

export class BoardAiApplyResponseDto {
  @ApiProperty()
  projectId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  boardId?: string | null;

  @ApiProperty()
  applied!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: [BoardAiApplyResultDto] })
  results!: BoardAiApplyResultDto[];
}

export class BoardAiHistoryEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['generation', 'apply'] })
  kind!: 'generation' | 'apply';

  @ApiProperty()
  type!: string;

  @ApiProperty()
  projectId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  boardId?: string | null;

  @ApiProperty({ enum: AiRequestStatus })
  status!: AiRequestStatus | string;

  @ApiPropertyOptional()
  provider?: string;

  @ApiPropertyOptional()
  model?: string;

  @ApiPropertyOptional()
  totalTokens?: number;

  @ApiPropertyOptional()
  estimatedCost?: number;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional({ type: Object })
  artifact?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [BoardAiApplyResultDto] })
  results?: BoardAiApplyResultDto[];

  @ApiProperty()
  createdAt!: Date;
}

export class BoardAiHistoryResponseDto {
  @ApiProperty({ type: [BoardAiHistoryEntryDto] })
  data!: BoardAiHistoryEntryDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
