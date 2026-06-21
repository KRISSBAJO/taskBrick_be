import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MeetingAgendaStatus,
  MeetingAttendeeStatus,
  MeetingReminderChannel,
  MeetingReminderStatus,
  MeetingStatus,
  Prisma,
  TaskPriority,
  TaskStatus,
  TaskType,
  Visibility
} from '@prisma/client';
import { AiService, TenantAiGenerationResult } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConvertMeetingActionItemsDto,
  LinkMeetingContextDto,
  MeetingAiGenerateDto,
  MeetingAiRoleSummaryDto,
  MeetingAiRoleSummaryType,
  ScheduleMeetingFollowUpsDto
} from './dto/meeting-ai.dto';
import { MeetingIntegrationsService } from './meeting-integrations.service';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

type MeetingAiArtifactKey =
  | 'agenda'
  | 'preparationBrief'
  | 'suggestedAttendees'
  | 'riskDetection'
  | 'followUp'
  | 'notes'
  | 'roleSummaries'
  | 'effectivenessScore'
  | 'missedDecisions'
  | 'actionItems'
  | 'followUpReminders';

export interface MeetingActionItem {
  id: string;
  title: string;
  description?: string | null;
  ownerId?: string | null;
  ownerEmail?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  projectId?: string | null;
  sprintId?: string | null;
  taskId?: string | null;
  status?: 'OPEN' | 'CONVERTED' | 'DONE' | 'DISMISSED';
  source?: string;
  reminderId?: string | null;
  convertedTaskId?: string | null;
  convertedTaskKey?: string | null;
}

const meetingAiSelect = {
  id: true,
  tenantId: true,
  meetingTypeId: true,
  projectId: true,
  sprintId: true,
  taskId: true,
  teamId: true,
  hostId: true,
  createdById: true,
  title: true,
  description: true,
  status: true,
  visibility: true,
  startAt: true,
  endAt: true,
  timezone: true,
  locationMode: true,
  locationName: true,
  meetingUrl: true,
  conferenceProvider: true,
  clientName: true,
  clientEmail: true,
  clientCompany: true,
  agendaLocked: true,
  aiEnabled: true,
  aiSummary: true,
  metadata: true,
  meetingType: {
    select: {
      id: true,
      name: true,
      category: true,
      durationMins: true,
      defaultAgenda: true
    }
  },
  project: {
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      status: true,
      progress: true,
      dueDate: true,
      teamId: true
    }
  },
  sprint: {
    select: {
      id: true,
      name: true,
      goal: true,
      startDate: true,
      endDate: true,
      completedAt: true
    }
  },
  task: {
    select: {
      id: true,
      key: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      sprintId: true,
      projectId: true,
      assignees: {
        select: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          }
        }
      }
    }
  },
  team: {
    select: {
      id: true,
      name: true
    }
  },
  host: {
    select: { id: true, email: true, firstName: true, lastName: true, timezone: true }
  },
  attendees: {
    select: {
      id: true,
      userId: true,
      email: true,
      name: true,
      role: true,
      status: true,
      isExternal: true,
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, timezone: true }
      }
    },
    orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }]
  },
  agendaItems: {
    select: {
      id: true,
      title: true,
      notes: true,
      status: true,
      durationMins: true,
      sortOrder: true,
      owner: {
        select: { id: true, email: true, firstName: true, lastName: true }
      }
    },
    orderBy: [{ sortOrder: 'asc' as const }]
  },
  reminders: {
    select: {
      id: true,
      channel: true,
      scheduledFor: true,
      status: true,
      templateKey: true,
      payload: true
    },
    orderBy: [{ scheduledFor: 'asc' as const }]
  },
  activities: {
    select: {
      id: true,
      action: true,
      newValue: true,
      createdAt: true
    },
    orderBy: [{ createdAt: 'desc' as const }],
    take: 20
  }
} satisfies Prisma.MeetingSelect;

type MeetingAiRecord = Prisma.MeetingGetPayload<{ select: typeof meetingAiSelect }>;

@Injectable()
export class MeetingAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly auditService: AuditService,
    private readonly meetingIntegrationsService: MeetingIntegrationsService
  ) {}

  async getState(user: AuthenticatedUser, meetingId: string) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const summary = this.aiState(meeting);
    return {
      meetingId,
      enabled: meeting.aiEnabled,
      links: this.linksForMeeting(meeting),
      summary,
      actionItems: this.stateArray(summary, 'actionItems'),
      health: this.healthSignals(meeting, summary)
    };
  }

  async linkContext(user: AuthenticatedUser, meetingId: string, dto: LinkMeetingContextDto, meta: RequestMeta) {
    this.assertCanManageMeetings(user);
    const before = await this.getMeetingForTenant(user.tenantId, meetingId);
    await this.assertLinkedRecords(user.tenantId, dto);
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        projectId: dto.projectId,
        sprintId: dto.sprintId,
        taskId: dto.taskId,
        teamId: dto.teamId,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail === undefined ? undefined : dto.clientEmail?.toLowerCase() ?? null,
        clientCompany: dto.clientCompany
      },
      select: meetingAiSelect
    });
    await this.recordMeetingAiAction(user, meetingId, 'meeting.ai_context_link', this.linksForMeeting(before), this.linksForMeeting(updated), meta);
    return this.getState(user, meetingId);
  }

  async generateAgenda(user: AuthenticatedUser, meetingId: string, dto: MeetingAiGenerateDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const generation = await this.runAi(user, 'meeting_agenda_builder', meeting, context, dto, [
      'Return JSON with {items:[{title,objective,durationMins,ownerHint}], facilitationTips:string[], expectedOutcomes:string[]}.',
      'Build a focused agenda for this TaskBricks meeting using the meeting, project, sprint, task, attendees, risks, and notes context.'
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const fallbackItems = [
      ...meeting.agendaItems.map((item) => ({
        title: item.title,
        objective: item.notes || 'Discuss and close the agenda item.',
        durationMins: item.durationMins ?? 10,
        ownerHint: this.displayUser(item.owner) || this.displayUser(meeting.host)
      })),
      ...this.contextTasks(context).slice(0, 4).map((task) => ({
        title: `Unblock ${task.key}: ${task.title}`,
        objective: `Review status ${task.status} and agree the next owner/action.`,
        durationMins: 8,
        ownerHint: 'Project owner'
      }))
    ];
    const artifact = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      items: this.arrayValue(parsed.items).length ? this.arrayValue(parsed.items) : fallbackItems.slice(0, 8),
      facilitationTips: this.stringArray(parsed.facilitationTips, [
        'Start with expected decisions, not status narration.',
        'Convert every ownerless follow-up into a TaskBricks task before closing.'
      ]),
      expectedOutcomes: this.stringArray(parsed.expectedOutcomes, ['Clear decisions, assigned follow-ups, and updated delivery risk.']),
      providerDraft: generation.content
    };
    return this.storeArtifact(user, meetingId, 'agenda', artifact, meta);
  }

  async generatePreparationBrief(user: AuthenticatedUser, meetingId: string, dto: MeetingAiGenerateDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const generation = await this.runAi(user, 'meeting_preparation_brief', meeting, context, dto, [
      'Return JSON with {brief, attendeePrep:[], risks:[], questions:[], recommendedMaterials:[]}.',
      'Create a preparation brief that helps each attendee enter the meeting with context and decisions ready.'
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const artifact = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      brief: this.stringValue(parsed.brief) ?? this.prepBriefFallback(meeting, context),
      attendeePrep: this.stringArray(parsed.attendeePrep, this.attendeePrepFallback(meeting)),
      risks: this.stringArray(parsed.risks, this.riskFallback(context)),
      questions: this.stringArray(parsed.questions, this.questionFallback(meeting, context)),
      recommendedMaterials: this.stringArray(parsed.recommendedMaterials, this.materialFallback(meeting, context)),
      providerDraft: generation.content
    };
    return this.storeArtifact(user, meetingId, 'preparationBrief', artifact, meta);
  }

  async suggestAttendees(user: AuthenticatedUser, meetingId: string, dto: MeetingAiGenerateDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const generation = await this.runAi(user, 'meeting_attendee_suggestions', meeting, context, dto, [
      'Return JSON with {attendees:[{userId,email,name,reason,confidence}], externalRoles:[]}.',
      'Suggest only tenant-scoped users when userId is available. Explain why each person belongs in the meeting.'
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const alreadyInvited = new Set(meeting.attendees.map((attendee) => attendee.userId).filter(Boolean));
    const suggestions = this.contextUsers(context)
      .filter((member) => !alreadyInvited.has(member.id))
      .slice(0, 8)
      .map((member) => ({
        userId: member.id,
        email: member.email,
        name: this.displayUser(member),
        reason: member.reason ?? 'Linked to the selected project, team, task ownership, or delivery context.',
        confidence: member.confidence ?? 0.72
      }));
    const artifact = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      attendees: this.arrayValue(parsed.attendees).length ? this.arrayValue(parsed.attendees) : suggestions,
      externalRoles: this.stringArray(parsed.externalRoles, meeting.clientEmail ? [`Client contact: ${meeting.clientEmail}`] : []),
      providerDraft: generation.content
    };
    return this.storeArtifact(user, meetingId, 'suggestedAttendees', artifact, meta);
  }

  async detectRisks(user: AuthenticatedUser, meetingId: string, dto: MeetingAiGenerateDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const generation = await this.runAi(user, 'meeting_risk_detection', meeting, context, dto, [
      'Return JSON with {conflicts:[], deliveryRisks:[], decisionRisks:[], recommendedMitigations:[]}.',
      'Detect schedule conflicts, delivery risk, missing owners, open blockers, and ambiguous decisions before the meeting.'
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const artifact = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      conflicts: this.arrayValue(parsed.conflicts).length ? this.arrayValue(parsed.conflicts) : this.conflictFallback(context),
      deliveryRisks: this.arrayValue(parsed.deliveryRisks).length ? this.arrayValue(parsed.deliveryRisks) : this.deliveryRiskFallback(context),
      decisionRisks: this.arrayValue(parsed.decisionRisks).length ? this.arrayValue(parsed.decisionRisks) : this.decisionRiskFallback(meeting),
      recommendedMitigations: this.stringArray(parsed.recommendedMitigations, ['Assign owners before ending the meeting.', 'Create follow-up tasks for every unresolved blocker.']),
      providerDraft: generation.content
    };
    return this.storeArtifact(user, meetingId, 'riskDetection', artifact, meta);
  }

  async generateNotes(user: AuthenticatedUser, meetingId: string, dto: MeetingAiGenerateDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const generation = await this.runAi(user, 'meeting_notes_action_items', meeting, context, dto, [
      'Return JSON with {summary, decisions:[{title,evidence}], actionItems:[{title,description,ownerEmail,dueDate,priority}], openQuestions:[]}.',
      'Extract concise notes, decisions, and actionable follow-ups from transcript/notes. Every action item needs a title and owner hint when possible.'
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const existing = this.aiState(meeting);
    const actionItems = this.normalizeActionItems(
      this.arrayValue(parsed.actionItems).length ? this.arrayValue(parsed.actionItems) : this.extractActionItemFallback(dto, meeting),
      meeting
    );
    const artifact = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      summary: this.stringValue(parsed.summary) ?? this.notesFallback(dto, meeting),
      decisions: this.arrayValue(parsed.decisions).length ? this.arrayValue(parsed.decisions) : this.decisionFallback(dto),
      actionItems,
      openQuestions: this.stringArray(parsed.openQuestions, this.openQuestionsFallback(dto)),
      providerDraft: generation.content
    };
    const state = this.mergeAiState(existing, 'notes', artifact);
    state.actionItems = this.mergeActionItems(this.stateArray(existing, 'actionItems'), actionItems);
    return this.persistAiState(user, meeting.id, 'meeting.ai_notes_generate', state, meta);
  }

  async generateFollowUp(user: AuthenticatedUser, meetingId: string, dto: MeetingAiGenerateDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const generation = await this.runAi(user, 'meeting_follow_up', meeting, context, dto, [
      'Return JSON with {subject, body, actionItemSummary:[], ownerReminders:[]}.',
      'Generate a professional follow-up for attendees. Include decisions, owner-specific next steps, and due dates.'
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const state = this.aiState(meeting);
    const actionItems = this.normalizeExistingActionItems(this.stateArray(state, 'actionItems'));
    const artifact = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      subject: this.stringValue(parsed.subject) ?? `Follow-up: ${meeting.title}`,
      body: this.stringValue(parsed.body) ?? this.followUpBodyFallback(meeting, state, actionItems),
      actionItemSummary: this.stringArray(parsed.actionItemSummary, actionItems.map((item) => item.title)),
      ownerReminders: this.arrayValue(parsed.ownerReminders).length ? this.arrayValue(parsed.ownerReminders) : this.ownerReminderFallback(actionItems),
      providerDraft: generation.content
    };
    return this.storeArtifact(user, meetingId, 'followUp', artifact, meta);
  }

  async generateRoleSummary(user: AuthenticatedUser, meetingId: string, dto: MeetingAiRoleSummaryDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const role = dto.role ?? MeetingAiRoleSummaryType.PROJECT_MANAGER;
    const generation = await this.runAi(user, `meeting_role_summary_${role.toLowerCase()}`, meeting, context, dto, [
      'Return JSON with {headline, summary, risks:[], decisions:[], actions:[]}.',
      `Create a role-specific summary for ${role}. Keep it useful for that audience only.`
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const summary = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      role,
      assigneeId: dto.assigneeId ?? null,
      headline: this.stringValue(parsed.headline) ?? `${humanize(role)} summary for ${meeting.title}`,
      summary: this.stringValue(parsed.summary) ?? this.roleSummaryFallback(role, meeting, this.aiState(meeting)),
      risks: this.stringArray(parsed.risks, []),
      decisions: this.arrayValue(parsed.decisions),
      actions: this.arrayValue(parsed.actions),
      providerDraft: generation.content
    };
    const state = this.aiState(meeting);
    const existing = this.asRecord(state.roleSummaries);
    const key = dto.assigneeId ? `${role}:${dto.assigneeId}` : role;
    return this.persistAiState(user, meetingId, 'meeting.ai_role_summary', {
      ...state,
      roleSummaries: {
        ...existing,
        [key]: summary
      },
      lastGeneratedAt: new Date().toISOString()
    }, meta);
  }

  async scoreEffectiveness(user: AuthenticatedUser, meetingId: string, dto: MeetingAiGenerateDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const generation = await this.runAi(user, 'meeting_effectiveness_score', meeting, context, dto, [
      'Return JSON with {score:number, grade, strengths:[], weaknesses:[], improvements:[]}.',
      'Score meeting effectiveness using agenda completion, attendance, decisions, owner assignment, and follow-up quality.'
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const fallbackScore = this.calculateEffectiveness(meeting, this.aiState(meeting));
    const score = Math.max(0, Math.min(100, this.numberValue(parsed.score) ?? fallbackScore));
    const artifact = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      score,
      grade: this.stringValue(parsed.grade) ?? (score >= 80 ? 'Strong' : score >= 60 ? 'Needs follow-through' : 'At risk'),
      strengths: this.stringArray(parsed.strengths, this.effectivenessStrengths(meeting)),
      weaknesses: this.stringArray(parsed.weaknesses, this.effectivenessWeaknesses(meeting, this.aiState(meeting))),
      improvements: this.stringArray(parsed.improvements, ['Close decisions in writing.', 'Assign due dates to all follow-up work.']),
      providerDraft: generation.content
    };
    return this.storeArtifact(user, meetingId, 'effectivenessScore', artifact, meta);
  }

  async detectMissedDecisions(user: AuthenticatedUser, meetingId: string, dto: MeetingAiGenerateDto, meta: RequestMeta) {
    const meeting = await this.getMeetingForRead(user, meetingId);
    const context = await this.buildContext(user, meeting, dto);
    const generation = await this.runAi(user, 'meeting_missed_decisions', meeting, context, dto, [
      'Return JSON with {missedDecisions:[{topic,evidence,suggestedDecisionOwner}], ambiguousAreas:[], nextQuestions:[]}.',
      'Detect areas where the meeting discussed a topic but did not record a decision, owner, or next step.'
    ], meta);
    const parsed = this.parseJsonObject(generation.content);
    const artifact = {
      generatedAt: new Date().toISOString(),
      provider: generation.provider,
      model: generation.model,
      usageLogId: generation.usage.id,
      missedDecisions: this.arrayValue(parsed.missedDecisions).length ? this.arrayValue(parsed.missedDecisions) : this.missedDecisionFallback(dto, meeting, this.aiState(meeting)),
      ambiguousAreas: this.stringArray(parsed.ambiguousAreas, []),
      nextQuestions: this.stringArray(parsed.nextQuestions, this.questionFallback(meeting, context)),
      providerDraft: generation.content
    };
    return this.storeArtifact(user, meetingId, 'missedDecisions', artifact, meta);
  }

  async convertActionItems(user: AuthenticatedUser, meetingId: string, dto: ConvertMeetingActionItemsDto, meta: RequestMeta) {
    if (!this.canManageTasks(user)) throw new ForbiddenException('Cannot create tasks from meeting action items');
    const meeting = await this.getMeetingForTenant(user.tenantId, meetingId);
    const state = this.aiState(meeting);
    const actionItems = this.normalizeExistingActionItems(this.stateArray(state, 'actionItems'));
    if (actionItems.length === 0) throw new BadRequestException('No AI action items are available for this meeting');
    const selectedIds = dto.actionItemIds?.length ? new Set(dto.actionItemIds) : null;
    const selectedItems = actionItems.filter((item) => (!selectedIds || selectedIds.has(item.id)) && !item.convertedTaskId);
    if (selectedItems.length === 0) throw new BadRequestException('No unconverted action items matched this request');

    const createdTasks: Array<Record<string, unknown>> = [];
    const updatedItems = [...actionItems];

    for (const item of selectedItems) {
      const projectId = item.projectId ?? dto.defaultProjectId ?? meeting.projectId ?? meeting.task?.projectId;
      if (!projectId) throw new BadRequestException(`Action item "${item.title}" needs a project before it can become a task`);
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, tenantId: user.tenantId },
        select: { id: true, key: true }
      });
      if (!project) throw new NotFoundException('Project not found for action item conversion');
      const sprintId = item.sprintId ?? dto.defaultSprintId ?? meeting.sprintId ?? meeting.task?.sprintId ?? undefined;
      if (sprintId) await this.assertSprintBelongsToProject(project.id, sprintId);
      const assigneeId = item.ownerId ?? dto.defaultAssigneeId;
      if (assigneeId) await this.assertUserBelongsToTenant(user.tenantId, assigneeId);
      const taskCount = await this.prisma.task.count({ where: { projectId: project.id } });
      const task = await this.prisma.task.create({
        data: {
          tenantId: user.tenantId,
          projectId: project.id,
          sprintId,
          reporterId: user.id,
          key: `${project.key.toUpperCase()}-${taskCount + 1}`,
          title: item.title.slice(0, 240),
          description: this.actionItemTaskDescription(meeting, item),
          type: dto.defaultTaskType ?? TaskType.TASK,
          status: TaskStatus.TODO,
          priority: item.priority ?? dto.defaultPriority ?? TaskPriority.MEDIUM,
          dueDate: item.dueDate ? new Date(item.dueDate) : dto.defaultDueDate ? new Date(dto.defaultDueDate) : undefined,
          meetings: { connect: { id: meeting.id } },
          assignees: assigneeId ? { create: { userId: assigneeId } } : undefined,
          checklists: dto.createChecklist
            ? {
                create: {
                  title: 'AI follow-up checklist',
                  items: {
                    create: [
                      { text: 'Confirm owner and due date', sortOrder: 0 },
                      { text: 'Post progress update before next meeting', sortOrder: 1 }
                    ]
                  }
                }
              }
            : undefined
        },
        select: {
          id: true,
          key: true,
          title: true,
          projectId: true,
          sprintId: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true
        }
      });
      await this.prisma.taskActivity.create({
        data: {
          taskId: task.id,
          actorId: user.id,
          action: 'meeting.ai_action_item_convert',
          newValue: this.toJsonValue({ meetingId: meeting.id, actionItemId: item.id, key: task.key })
        }
      });
      createdTasks.push(task);
      const index = updatedItems.findIndex((candidate) => candidate.id === item.id);
      if (index >= 0) {
        updatedItems[index] = {
          ...updatedItems[index],
          status: 'CONVERTED',
          convertedTaskId: task.id,
          convertedTaskKey: task.key,
          taskId: task.id
        };
      }
    }

    const nextState = {
      ...state,
      actionItems: updatedItems,
      lastGeneratedAt: new Date().toISOString()
    };
    await this.persistAiState(user, meeting.id, 'meeting.ai_action_items_convert', nextState, meta);
    return {
      meetingId,
      converted: createdTasks.length,
      tasks: createdTasks,
      actionItems: updatedItems
    };
  }

  async scheduleFollowUpReminders(user: AuthenticatedUser, meetingId: string, dto: ScheduleMeetingFollowUpsDto, meta: RequestMeta) {
    this.assertCanManageMeetings(user);
    const meeting = await this.getMeetingForTenant(user.tenantId, meetingId);
    const state = this.aiState(meeting);
    const actionItems = this.normalizeExistingActionItems(this.stateArray(state, 'actionItems'));
    const selectedIds = dto.actionItemIds?.length ? new Set(dto.actionItemIds) : null;
    const offset = dto.dueOffsetMinutes ?? 1440;
    const updatedItems = [...actionItems];
    const created: Array<Record<string, unknown>> = [];

    for (const item of actionItems) {
      if (selectedIds && !selectedIds.has(item.id)) continue;
      if (item.reminderId || item.status === 'DONE' || item.status === 'DISMISSED') continue;
      const due = item.dueDate ? new Date(item.dueDate) : null;
      if (!due || Number.isNaN(due.getTime())) continue;
      const scheduledFor = new Date(Math.max(Date.now(), due.getTime() - offset * 60_000));
      const reminder = await this.prisma.meetingReminder.create({
        data: {
          tenantId: user.tenantId,
          meetingId: meeting.id,
          channel: MeetingReminderChannel.IN_APP,
          offsetMinutes: offset,
          scheduledFor,
          status: MeetingReminderStatus.PENDING,
          templateKey: 'meeting_action_item_follow_up',
          payload: this.toJsonValue({
            actionItemId: item.id,
            title: item.title,
            convertedTaskId: item.convertedTaskId ?? item.taskId,
            dueDate: item.dueDate
          })
        },
        select: { id: true, scheduledFor: true, channel: true, status: true }
      });
      created.push(reminder);
      const index = updatedItems.findIndex((candidate) => candidate.id === item.id);
      if (index >= 0) updatedItems[index] = { ...updatedItems[index], reminderId: reminder.id };
    }

    const nextState = {
      ...state,
      actionItems: updatedItems,
      followUpReminders: {
        generatedAt: new Date().toISOString(),
        created
      },
      lastGeneratedAt: new Date().toISOString()
    };
    await this.persistAiState(user, meeting.id, 'meeting.ai_follow_up_reminders', nextState, meta);
    await this.meetingIntegrationsService.afterMeetingUpdated(user.tenantId, meeting.id);
    return { meetingId, created, actionItems: updatedItems };
  }

  private async runAi(
    user: AuthenticatedUser,
    requestType: string,
    meeting: MeetingAiRecord,
    context: Record<string, unknown>,
    dto: MeetingAiGenerateDto,
    instructions: string[],
    meta: RequestMeta
  ): Promise<TenantAiGenerationResult> {
    await this.meetingIntegrationsService.assertCanUseMeetingAi(user);
    const prompt = [
      'You are TaskBricks Meeting AI for an enterprise work-management platform.',
      'Use only the tenant-scoped context provided. Do not invent private data, external systems, or attendees.',
      'Return valid JSON only. If evidence is missing, say what is missing in the JSON.',
      ...instructions,
      dto.prompt ? `User direction: ${dto.prompt}` : '',
      dto.focusAreas?.length ? `Focus areas: ${dto.focusAreas.join(', ')}` : '',
      dto.transcript ? `Transcript:\n${dto.transcript.slice(0, 20000)}` : '',
      dto.notes ? `Notes:\n${dto.notes.slice(0, 12000)}` : '',
      `Meeting: ${meeting.title}`
    ].filter(Boolean).join('\n\n');
    return this.aiService.generateTenantContent(user, {
      prompt,
      context,
      requestType,
      metadata: {
        meetingId: meeting.id,
        projectId: meeting.projectId,
        sprintId: meeting.sprintId,
        taskId: meeting.taskId,
        teamId: meeting.teamId
      }
    }, meta);
  }

  private async buildContext(user: AuthenticatedUser, meeting: MeetingAiRecord, dto: MeetingAiGenerateDto) {
    const projectId = meeting.projectId ?? meeting.task?.projectId;
    const [projectTasks, projectRisks, projectMembers, sprints, teamMembers, conflicts] = await Promise.all([
      projectId
        ? this.prisma.task.findMany({
            where: {
              tenantId: user.tenantId,
              projectId,
              archivedAt: null,
              deletedAt: null
            },
            select: {
              id: true,
              key: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              storyPoints: true,
              sprintId: true,
              assignees: {
                select: {
                  user: { select: { id: true, email: true, firstName: true, lastName: true } }
                }
              }
            },
            orderBy: [{ updatedAt: 'desc' }],
            take: 40
          })
        : Promise.resolve([]),
      projectId
        ? this.prisma.projectRisk.findMany({
            where: { projectId, isOpen: true },
            select: { id: true, title: true, description: true, severity: true, mitigation: true },
            orderBy: [{ updatedAt: 'desc' }],
            take: 20
          })
        : Promise.resolve([]),
      projectId
        ? this.prisma.projectMember.findMany({
            where: { projectId },
            select: {
              role: true,
              user: { select: { id: true, email: true, firstName: true, lastName: true } }
            },
            take: 50
          })
        : Promise.resolve([]),
      projectId
        ? this.prisma.sprint.findMany({
            where: { projectId },
            select: { id: true, name: true, goal: true, startDate: true, endDate: true, completedAt: true },
            orderBy: [{ createdAt: 'desc' }],
            take: 10
          })
        : Promise.resolve([]),
      meeting.teamId
        ? this.prisma.teamMember.findMany({
            where: { teamId: meeting.teamId },
            select: {
              role: true,
              user: { select: { id: true, email: true, firstName: true, lastName: true } }
            },
            take: 50
          })
        : Promise.resolve([]),
      this.findMeetingConflicts(meeting)
    ]);

    return {
      meeting: this.serializableMeeting(meeting),
      transcript: dto.transcript,
      notes: dto.notes,
      focusAreas: dto.focusAreas ?? [],
      links: this.linksForMeeting(meeting),
      aiState: this.aiState(meeting),
      projectTasks,
      projectRisks,
      projectMembers: projectMembers.map((item) => ({ role: item.role, ...item.user, reason: `Project ${item.role ?? 'member'}` })),
      teamMembers: teamMembers.map((item) => ({ role: item.role, ...item.user, reason: `Team ${item.role ?? 'member'}` })),
      sprints,
      conflicts
    };
  }

  private async findMeetingConflicts(meeting: MeetingAiRecord) {
    const participantIds = [
      meeting.hostId,
      ...meeting.attendees.map((attendee) => attendee.userId)
    ].filter((value): value is string => Boolean(value));
    if (participantIds.length === 0) return [];
    return this.prisma.meeting.findMany({
      where: {
        tenantId: meeting.tenantId,
        id: { not: meeting.id },
        archivedAt: null,
        status: { notIn: [MeetingStatus.CANCELLED, MeetingStatus.ARCHIVED] },
        startAt: { lt: meeting.endAt },
        endAt: { gt: meeting.startAt },
        OR: [
          { hostId: { in: participantIds } },
          { attendees: { some: { userId: { in: participantIds }, status: { not: MeetingAttendeeStatus.REMOVED } } } }
        ]
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        hostId: true
      },
      orderBy: [{ startAt: 'asc' }],
      take: 20
    });
  }

  private async storeArtifact(
    user: AuthenticatedUser,
    meetingId: string,
    key: MeetingAiArtifactKey,
    artifact: Record<string, unknown>,
    meta: RequestMeta
  ) {
    const meeting = await this.getMeetingForTenant(user.tenantId, meetingId);
    const state = this.mergeAiState(this.aiState(meeting), key, artifact);
    return this.persistAiState(user, meetingId, `meeting.ai_${key}`, state, meta);
  }

  private async persistAiState(
    user: AuthenticatedUser,
    meetingId: string,
    action: string,
    state: Record<string, unknown>,
    meta: RequestMeta
  ) {
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { aiSummary: this.toJsonValue(state) },
      select: meetingAiSelect
    });
    await this.recordMeetingAiAction(user, meetingId, action, undefined, { artifactKeys: Object.keys(state) }, meta);
    return {
      meetingId,
      summary: this.aiState(updated),
      health: this.healthSignals(updated, this.aiState(updated))
    };
  }

  private mergeAiState(state: Record<string, unknown>, key: MeetingAiArtifactKey, artifact: Record<string, unknown>) {
    return {
      ...state,
      version: 1,
      [key]: artifact,
      lastGeneratedAt: new Date().toISOString()
    };
  }

  private normalizeActionItems(items: unknown[], meeting: MeetingAiRecord): MeetingActionItem[] {
    return items
      .map((item, index): MeetingActionItem | null => {
        const record = this.asRecord(item);
        const title = this.stringValue(record.title) ?? this.stringValue(record.text) ?? this.stringValue(record.name);
        if (!title) return null;
        const ownerEmail = this.stringValue(record.ownerEmail) ?? this.stringValue(record.assigneeEmail);
        const owner = ownerEmail ? this.findAttendeeByEmail(meeting, ownerEmail) : undefined;
        return {
          id: this.stringValue(record.id) ?? `mai_${Date.now()}_${index}`,
          title,
          description: this.stringValue(record.description) ?? this.stringValue(record.notes) ?? null,
          ownerId: this.stringValue(record.ownerId) ?? owner?.userId ?? null,
          ownerEmail: ownerEmail ?? owner?.email ?? null,
          priority: this.enumValue(record.priority, TaskPriority) ?? TaskPriority.MEDIUM,
          dueDate: this.stringValue(record.dueDate) ?? null,
          projectId: this.stringValue(record.projectId) ?? meeting.projectId ?? meeting.task?.projectId ?? null,
          sprintId: this.stringValue(record.sprintId) ?? meeting.sprintId ?? meeting.task?.sprintId ?? null,
          status: 'OPEN',
          source: 'AI_MEETING_NOTES'
        };
      })
      .filter((item): item is MeetingActionItem => Boolean(item));
  }

  private normalizeExistingActionItems(items: unknown[]): MeetingActionItem[] {
    return items
      .map((item) => this.asRecord(item))
      .filter((item) => this.stringValue(item.id) && this.stringValue(item.title))
      .map((item) => ({
        id: String(item.id),
        title: String(item.title),
        description: this.stringValue(item.description) ?? null,
        ownerId: this.stringValue(item.ownerId) ?? null,
        ownerEmail: this.stringValue(item.ownerEmail) ?? null,
        priority: this.enumValue(item.priority, TaskPriority) ?? TaskPriority.MEDIUM,
        dueDate: this.stringValue(item.dueDate) ?? null,
        projectId: this.stringValue(item.projectId) ?? null,
        sprintId: this.stringValue(item.sprintId) ?? null,
        taskId: this.stringValue(item.taskId) ?? null,
        status: this.stringValue(item.status) as MeetingActionItem['status'] ?? 'OPEN',
        source: this.stringValue(item.source),
        reminderId: this.stringValue(item.reminderId) ?? null,
        convertedTaskId: this.stringValue(item.convertedTaskId) ?? null,
        convertedTaskKey: this.stringValue(item.convertedTaskKey) ?? null
      }));
  }

  private mergeActionItems(existing: unknown[], generated: MeetingActionItem[]) {
    const normalized = this.normalizeExistingActionItems(existing);
    const byTitle = new Map(normalized.map((item) => [item.title.toLowerCase(), item]));
    for (const item of generated) {
      const key = item.title.toLowerCase();
      byTitle.set(key, { ...byTitle.get(key), ...item });
    }
    return [...byTitle.values()];
  }

  private async getMeetingForRead(user: AuthenticatedUser, meetingId: string) {
    const where: Prisma.MeetingWhereInput = this.canManageMeetings(user)
      ? { id: meetingId, tenantId: user.tenantId }
      : {
          id: meetingId,
          tenantId: user.tenantId,
          OR: [
            { visibility: { in: [Visibility.ORGANIZATION, Visibility.PUBLIC] } },
            { hostId: user.id },
            { createdById: user.id },
            { attendees: { some: { userId: user.id, status: { not: MeetingAttendeeStatus.REMOVED } } } }
          ]
        };
    const meeting = await this.prisma.meeting.findFirst({ where, select: meetingAiSelect });
    if (!meeting) throw new NotFoundException('Meeting not found');
    if (!meeting.aiEnabled) throw new BadRequestException('AI is disabled for this meeting');
    return meeting;
  }

  private async getMeetingForTenant(tenantId: string, meetingId: string) {
    const meeting = await this.prisma.meeting.findFirst({ where: { id: meetingId, tenantId }, select: meetingAiSelect });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  private async assertLinkedRecords(tenantId: string, dto: LinkMeetingContextDto) {
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, tenantId }, select: { id: true } });
      if (!project) throw new NotFoundException('Project not found');
    }
    if (dto.sprintId) {
      const sprint = await this.prisma.sprint.findFirst({
        where: { id: dto.sprintId, project: { tenantId } },
        select: { id: true, projectId: true }
      });
      if (!sprint) throw new NotFoundException('Sprint not found');
      if (dto.projectId && sprint.projectId !== dto.projectId) throw new BadRequestException('Sprint does not belong to the supplied project');
    }
    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: dto.taskId, tenantId },
        select: { id: true, projectId: true, sprintId: true }
      });
      if (!task) throw new NotFoundException('Task not found');
      if (dto.projectId && task.projectId !== dto.projectId) throw new BadRequestException('Task does not belong to the supplied project');
      if (dto.sprintId && task.sprintId && task.sprintId !== dto.sprintId) throw new BadRequestException('Task does not belong to the supplied sprint');
    }
    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({ where: { id: dto.teamId, tenantId }, select: { id: true } });
      if (!team) throw new NotFoundException('Team not found');
    }
  }

  private async assertSprintBelongsToProject(projectId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findFirst({ where: { id: sprintId, projectId }, select: { id: true } });
    if (!sprint) throw new BadRequestException('Sprint does not belong to the target project');
  }

  private async assertUserBelongsToTenant(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
  }

  private async recordMeetingAiAction(
    user: AuthenticatedUser,
    meetingId: string,
    action: string,
    oldValue: unknown,
    newValue: unknown,
    meta: RequestMeta
  ) {
    await this.prisma.meetingActivity.create({
      data: {
        tenantId: user.tenantId,
        meetingId,
        actorId: user.id,
        action,
        oldValue: oldValue === undefined ? undefined : this.toJsonValue(oldValue),
        newValue: newValue === undefined ? undefined : this.toJsonValue(newValue)
      }
    });
    await this.auditService.record({
      tenantId: user.tenantId,
      actorId: user.id,
      action,
      entityType: 'Meeting',
      entityId: meetingId,
      oldValue: oldValue === undefined ? undefined : this.toJsonValue(oldValue),
      newValue: newValue === undefined ? undefined : this.toJsonValue(newValue),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }

  private aiState(meeting: Pick<MeetingAiRecord, 'aiSummary'>): Record<string, unknown> {
    return this.asRecord(meeting.aiSummary);
  }

  private stateArray(state: Record<string, unknown>, key: string) {
    const value = state[key];
    return Array.isArray(value) ? value : [];
  }

  private linksForMeeting(meeting: MeetingAiRecord) {
    return {
      projectId: meeting.projectId,
      sprintId: meeting.sprintId,
      taskId: meeting.taskId,
      teamId: meeting.teamId,
      clientName: meeting.clientName,
      clientEmail: meeting.clientEmail,
      clientCompany: meeting.clientCompany
    };
  }

  private healthSignals(meeting: MeetingAiRecord, state: Record<string, unknown>) {
    const actionItems = this.normalizeExistingActionItems(this.stateArray(state, 'actionItems'));
    const openActionItems = actionItems.filter((item) => item.status !== 'DONE' && item.status !== 'DISMISSED');
    return {
      hasAgenda: meeting.agendaItems.length > 0 || Boolean(state.agenda),
      hasNotes: Boolean(state.notes),
      openActionItems: openActionItems.length,
      convertedActionItems: actionItems.filter((item) => item.convertedTaskId).length,
      missingOwners: openActionItems.filter((item) => !item.ownerId && !item.ownerEmail).length,
      missingDueDates: openActionItems.filter((item) => !item.dueDate).length,
      effectivenessScore: this.numberValue(this.asRecord(state.effectivenessScore).score) ?? null
    };
  }

  private serializableMeeting(meeting: MeetingAiRecord) {
    return {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      status: meeting.status,
      startAt: meeting.startAt,
      endAt: meeting.endAt,
      timezone: meeting.timezone,
      locationMode: meeting.locationMode,
      locationName: meeting.locationName,
      meetingUrl: meeting.meetingUrl,
      conferenceProvider: meeting.conferenceProvider,
      clientName: meeting.clientName,
      clientEmail: meeting.clientEmail,
      clientCompany: meeting.clientCompany,
      meetingType: meeting.meetingType,
      project: meeting.project,
      sprint: meeting.sprint,
      task: meeting.task,
      team: meeting.team,
      host: meeting.host,
      attendees: meeting.attendees,
      agendaItems: meeting.agendaItems,
      reminders: meeting.reminders
    };
  }

  private contextTasks(context: Record<string, unknown>) {
    return this.arrayValue(context.projectTasks).map((item) => this.asRecord(item));
  }

  private contextUsers(context: Record<string, unknown>) {
    const users = [...this.arrayValue(context.projectMembers), ...this.arrayValue(context.teamMembers)]
      .map((item) => this.asRecord(item))
      .filter((item) => this.stringValue(item.id) && this.stringValue(item.email));
    const byId = new Map<string, Record<string, unknown>>();
    for (const user of users) byId.set(String(user.id), user);
    return [...byId.values()] as Array<Record<string, unknown> & { id: string; email: string; reason?: string; confidence?: number }>;
  }

  private prepBriefFallback(meeting: MeetingAiRecord, context: Record<string, unknown>) {
    const project = this.asRecord(this.asRecord(context.meeting).project);
    const projectName = this.stringValue(project.name) ?? meeting.project?.name ?? 'the linked work';
    return `${meeting.title} is scheduled to move ${projectName} forward. Review the agenda, current blockers, and expected decisions before joining.`;
  }

  private attendeePrepFallback(meeting: MeetingAiRecord) {
    return meeting.attendees.slice(0, 6).map((attendee) => `${this.displayAttendee(attendee)}: come prepared with blockers, decisions needed, and owner-ready follow-ups.`);
  }

  private riskFallback(context: Record<string, unknown>) {
    const risks = this.arrayValue(context.projectRisks);
    return risks.length ? risks.slice(0, 5).map((risk) => String(this.asRecord(risk).title ?? 'Open project risk')) : ['No open project risk was found in the linked context.'];
  }

  private questionFallback(meeting: MeetingAiRecord, context: Record<string, unknown>) {
    const tasks = this.contextTasks(context).filter((task) => task.status !== TaskStatus.DONE);
    return [
      meeting.project ? `What decision is needed to improve ${meeting.project.name}?` : 'What decision should this meeting close?',
      tasks.length ? `Which of the ${tasks.length} open linked tasks needs immediate ownership?` : 'Are there follow-ups that should become tracked tasks?'
    ];
  }

  private materialFallback(meeting: MeetingAiRecord, context: Record<string, unknown>) {
    return [
      meeting.project ? `${meeting.project.key} project summary` : 'Meeting context note',
      this.contextTasks(context).length ? 'Open task list and blockers' : 'Agenda and expected outcomes'
    ];
  }

  private conflictFallback(context: Record<string, unknown>) {
    return this.arrayValue(context.conflicts).map((conflict) => ({
      type: 'SCHEDULE_CONFLICT',
      title: this.asRecord(conflict).title,
      startAt: this.asRecord(conflict).startAt,
      endAt: this.asRecord(conflict).endAt
    }));
  }

  private deliveryRiskFallback(context: Record<string, unknown>) {
    const now = Date.now();
    return this.contextTasks(context)
      .filter((task) => task.status !== TaskStatus.DONE && (task.priority === TaskPriority.CRITICAL || task.priority === TaskPriority.URGENT || (task.dueDate && new Date(String(task.dueDate)).getTime() < now)))
      .slice(0, 8)
      .map((task) => ({ type: 'TASK_RISK', key: task.key, title: task.title, priority: task.priority, dueDate: task.dueDate }));
  }

  private decisionRiskFallback(meeting: MeetingAiRecord) {
    return meeting.agendaItems
      .filter((item) => /decid|approve|confirm|choose|sign[- ]?off/i.test(`${item.title} ${item.notes ?? ''}`) && item.status !== MeetingAgendaStatus.DONE)
      .map((item) => ({ type: 'UNRESOLVED_DECISION', title: item.title, evidence: item.notes }));
  }

  private extractActionItemFallback(dto: MeetingAiGenerateDto, meeting: MeetingAiRecord) {
    const source = `${dto.notes ?? ''}\n${dto.transcript ?? ''}`;
    const lines = source
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter((line) => /todo|action|follow|send|create|update|review|approve|confirm|fix|owner/i.test(line))
      .slice(0, 12);
    if (lines.length) return lines.map((line) => ({ title: line, priority: TaskPriority.MEDIUM }));
    return meeting.agendaItems.slice(0, 3).map((item) => ({ title: `Follow up: ${item.title}`, description: item.notes, priority: TaskPriority.MEDIUM }));
  }

  private notesFallback(dto: MeetingAiGenerateDto, meeting: MeetingAiRecord) {
    const source = dto.notes || dto.transcript;
    return source ? source.slice(0, 900) : `${meeting.title} notes were generated from the current meeting context.`;
  }

  private decisionFallback(dto: MeetingAiGenerateDto) {
    const source = `${dto.notes ?? ''}\n${dto.transcript ?? ''}`;
    return source
      .split(/\r?\n/)
      .filter((line) => /decid|approved|agreed|confirmed/i.test(line))
      .slice(0, 8)
      .map((line) => ({ title: line.trim(), evidence: line.trim() }));
  }

  private openQuestionsFallback(dto: MeetingAiGenerateDto) {
    const source = `${dto.notes ?? ''}\n${dto.transcript ?? ''}`;
    return source
      .split(/\r?\n/)
      .filter((line) => line.includes('?'))
      .map((line) => line.trim())
      .slice(0, 8);
  }

  private followUpBodyFallback(meeting: MeetingAiRecord, state: Record<string, unknown>, actionItems: MeetingActionItem[]) {
    const notes = this.asRecord(state.notes);
    const decisions = this.arrayValue(notes.decisions);
    return [
      `Thanks for joining ${meeting.title}.`,
      decisions.length ? `Decisions: ${decisions.map((decision) => this.stringValue(this.asRecord(decision).title) ?? 'Decision recorded').join('; ')}.` : 'No formal decisions were recorded yet.',
      actionItems.length ? `Open follow-ups: ${actionItems.map((item) => item.title).join('; ')}.` : 'No follow-up tasks were recorded yet.',
      'Please update ownership and due dates in TaskBricks.'
    ].join('\n\n');
  }

  private ownerReminderFallback(actionItems: MeetingActionItem[]) {
    return actionItems.map((item) => ({
      owner: item.ownerEmail ?? item.ownerId ?? 'Unassigned',
      reminder: `${item.title}${item.dueDate ? ` is due ${item.dueDate}` : ' needs a due date'}.`
    }));
  }

  private roleSummaryFallback(role: MeetingAiRoleSummaryType, meeting: MeetingAiRecord, state: Record<string, unknown>) {
    const actionItems = this.normalizeExistingActionItems(this.stateArray(state, 'actionItems'));
    if (role === MeetingAiRoleSummaryType.EXECUTIVE) {
      return `${meeting.title}: ${actionItems.length} follow-ups, ${this.healthSignals(meeting, state).missingOwners} missing owners, and ${meeting.project?.name ?? 'no linked project'} context.`;
    }
    if (role === MeetingAiRoleSummaryType.ASSIGNEE) {
      return `Your focus is to close assigned follow-ups and update TaskBricks before the next checkpoint.`;
    }
    return `Review decisions, convert follow-ups into tasks, and keep the linked project/sprint status current.`;
  }

  private calculateEffectiveness(meeting: MeetingAiRecord, state: Record<string, unknown>) {
    const actionItems = this.normalizeExistingActionItems(this.stateArray(state, 'actionItems'));
    const decisions = this.arrayValue(this.asRecord(state.notes).decisions);
    let score = 50;
    if (meeting.agendaItems.length) score += 10;
    if (decisions.length) score += 15;
    if (actionItems.length) score += 10;
    if (actionItems.every((item) => item.ownerId || item.ownerEmail)) score += 10;
    if (actionItems.every((item) => item.dueDate || item.convertedTaskId)) score += 10;
    if (meeting.status === MeetingStatus.COMPLETED) score += 5;
    return Math.max(0, Math.min(100, score));
  }

  private effectivenessStrengths(meeting: MeetingAiRecord) {
    return [
      meeting.agendaItems.length ? 'Agenda is available.' : '',
      meeting.attendees.length ? `${meeting.attendees.length} attendees are tracked.` : '',
      meeting.project ? 'Meeting is linked to project context.' : ''
    ].filter(Boolean);
  }

  private effectivenessWeaknesses(meeting: MeetingAiRecord, state: Record<string, unknown>) {
    const health = this.healthSignals(meeting, state);
    return [
      !state.notes ? 'No AI notes are stored yet.' : '',
      health.missingOwners ? `${health.missingOwners} action items are missing owners.` : '',
      health.missingDueDates ? `${health.missingDueDates} action items are missing due dates.` : ''
    ].filter(Boolean);
  }

  private missedDecisionFallback(dto: MeetingAiGenerateDto, meeting: MeetingAiRecord, state: Record<string, unknown>) {
    const decisions = this.arrayValue(this.asRecord(state.notes).decisions);
    if (decisions.length) return [];
    const source = `${dto.notes ?? ''}\n${dto.transcript ?? ''}`;
    const candidates = source
      .split(/\r?\n/)
      .filter((line) => /decid|approve|confirm|choose|option|sign[- ]?off/i.test(line))
      .slice(0, 8)
      .map((line) => ({ topic: line.trim(), evidence: line.trim(), suggestedDecisionOwner: this.displayUser(meeting.host) }));
    return candidates.length
      ? candidates
      : meeting.agendaItems
          .filter((item) => /decid|approve|confirm|choose|option|sign[- ]?off/i.test(`${item.title} ${item.notes ?? ''}`))
          .map((item) => ({ topic: item.title, evidence: item.notes, suggestedDecisionOwner: this.displayUser(meeting.host) }));
  }

  private actionItemTaskDescription(meeting: MeetingAiRecord, item: MeetingActionItem) {
    return [
      item.description ?? '',
      '',
      `Created from meeting: ${meeting.title}`,
      `Meeting ID: ${meeting.id}`,
      item.ownerEmail ? `Owner hint: ${item.ownerEmail}` : '',
      item.source ? `Source: ${item.source}` : ''
    ].filter(Boolean).join('\n');
  }

  private findAttendeeByEmail(meeting: MeetingAiRecord, email: string) {
    const normalized = email.toLowerCase();
    return meeting.attendees.find((attendee) =>
      attendee.email?.toLowerCase() === normalized || attendee.user?.email?.toLowerCase() === normalized
    );
  }

  private canManageMeetings(user: AuthenticatedUser) {
    return user.permissions.includes('manage:all') || user.permissions.includes('manage:meetings');
  }

  private canManageTasks(user: AuthenticatedUser) {
    return user.permissions.includes('manage:all') || user.permissions.includes('manage:tasks');
  }

  private assertCanManageMeetings(user: AuthenticatedUser) {
    if (!this.canManageMeetings(user)) throw new ForbiddenException('Cannot manage meeting AI');
  }

  private parseJsonObject(content: string) {
    try {
      return this.asRecord(JSON.parse(content));
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return {};
      try {
        return this.asRecord(JSON.parse(match[0]));
      } catch {
        return {};
      }
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private arrayValue(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private stringArray(value: unknown, fallback: string[] = []) {
    const items = this.arrayValue(value).map((item) => this.stringValue(item)).filter((item): item is string => Boolean(item));
    return items.length ? items : fallback;
  }

  private numberValue(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }

  private enumValue<T extends Record<string, string>>(value: unknown, enumeration: T): T[keyof T] | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().replace(/[\s-]+/g, '_').toUpperCase();
    return Object.values(enumeration).includes(normalized as T[keyof T])
      ? (normalized as T[keyof T])
      : undefined;
  }

  private displayUser(user?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null) {
    if (!user) return undefined;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.email || undefined;
  }

  private displayAttendee(attendee: MeetingAiRecord['attendees'][number]) {
    return attendee.name || this.displayUser(attendee.user) || attendee.email || 'Attendee';
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new BadRequestException('Value must be JSON serializable');
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  }
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
