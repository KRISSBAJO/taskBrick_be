import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AiActionStatus,
  AiConversationStatus,
  AiRequestStatus,
  ApprovalStatus,
  ComplianceJobStatus,
  ComplianceJobType,
  IntegrationProvider,
  IntegrationStatus,
  MeetingReminderJobStatus,
  MeetingStatus,
  ReportExecutionStatus,
  ReportExportStatus,
  ReportStatus,
  WorkflowRunStatus,
  WebhookDeliveryStatus
} from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const siteSearchCategories = ['ALL', 'TENANTS', 'USERS', 'PROJECTS', 'TASKS', 'EVENTS', 'AUDIT'] as const;

export class SiteIntegrationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: IntegrationProvider })
  @IsOptional()
  @IsEnum(IntegrationProvider)
  provider?: IntegrationProvider;

  @ApiPropertyOptional({ enum: IntegrationStatus })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @ApiPropertyOptional({ description: 'true or false' })
  @IsOptional()
  @IsString()
  enabled?: string;
}

export class SitePlatformSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: siteSearchCategories })
  @IsOptional()
  @IsIn(siteSearchCategories)
  category?: (typeof siteSearchCategories)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class SiteWorkflowQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiPropertyOptional({ description: 'true or false' })
  @IsOptional()
  @IsString()
  active?: string;
}

export class SiteWorkflowRunQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  runId?: string;

  @ApiPropertyOptional({ enum: WorkflowRunStatus })
  @IsOptional()
  @IsEnum(WorkflowRunStatus)
  status?: WorkflowRunStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SiteApprovalQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;
}

export class SiteAiSettingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'true or false' })
  @IsOptional()
  @IsString()
  enabled?: string;
}

export class SiteAiAgentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'true or false' })
  @IsOptional()
  @IsString()
  enabled?: string;
}

export class SiteAiConversationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ enum: AiConversationStatus })
  @IsOptional()
  @IsEnum(AiConversationStatus)
  status?: AiConversationStatus;
}

export class SiteAiActionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ enum: AiActionStatus })
  @IsOptional()
  @IsEnum(AiActionStatus)
  status?: AiActionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

export class SiteAiUsageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ enum: AiRequestStatus })
  @IsOptional()
  @IsEnum(AiRequestStatus)
  status?: AiRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SiteReportingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

export class SiteReportExecutionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ReportExecutionStatus })
  @IsOptional()
  @IsEnum(ReportExecutionStatus)
  status?: ReportExecutionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SiteReportExportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportId?: string;

  @ApiPropertyOptional({ enum: ReportExportStatus })
  @IsOptional()
  @IsEnum(ReportExportStatus)
  status?: ReportExportStatus;
}

export class SiteWebhookQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'true or false' })
  @IsOptional()
  @IsString()
  enabled?: string;
}

export class SiteWebhookDeliveryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webhookId?: string;

  @ApiPropertyOptional({ enum: WebhookDeliveryStatus })
  @IsOptional()
  @IsEnum(WebhookDeliveryStatus)
  status?: WebhookDeliveryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SiteMessagingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SiteMeetingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: MeetingStatus })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SiteMeetingReminderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: MeetingReminderJobStatus })
  @IsOptional()
  @IsEnum(MeetingReminderJobStatus)
  status?: MeetingReminderJobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SiteComplianceJobQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: ComplianceJobType })
  @IsOptional()
  @IsEnum(ComplianceJobType)
  type?: ComplianceJobType;

  @ApiPropertyOptional({ enum: ComplianceJobStatus })
  @IsOptional()
  @IsEnum(ComplianceJobStatus)
  status?: ComplianceJobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}

export class SiteComplianceDecisionDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SiteIntegrationSecretRotationDto extends SiteComplianceDecisionDto {
  @ApiPropertyOptional({ default: 'apiKey', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  key?: string;

  @ApiPropertyOptional({ description: 'Optional caller-provided secret. A generated secret is used when omitted.' })
  @IsOptional()
  @IsString()
  value?: string;
}
