import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { OpenAPIObject } from '@nestjs/swagger';

type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';
type OperationWithSecurity = {
  security?: Array<Record<string, unknown>>;
};

interface RequiredEndpoint {
  method: HttpMethod;
  path: string;
  workflow: string;
  auth: 'public' | 'bearer';
}

interface FrontendClientCheck {
  helper: string;
  routeSnippets: string[];
  workflow: string;
}

const requiredEndpoints: RequiredEndpoint[] = [
  { method: 'get', path: '/api/v1/health/ready', workflow: 'frontend readiness gate', auth: 'public' },
  { method: 'get', path: '/api/v1/auth/status', workflow: 'login screen API status', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/register', workflow: 'workspace signup', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/login', workflow: 'workspace login', auth: 'public' },
  { method: 'post', path: '/api/v1/auth/refresh', workflow: 'session refresh', auth: 'public' },
  { method: 'get', path: '/api/v1/auth/me', workflow: 'current user bootstrap', auth: 'bearer' },
  { method: 'get', path: '/api/v1/workspaces', workflow: 'workspace switcher and create project form', auth: 'bearer' },
  { method: 'get', path: '/api/v1/teams', workflow: 'team selector and capacity views', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects', workflow: 'project portfolio list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects', workflow: 'create project flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}', workflow: 'project detail load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}', workflow: 'update project flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/members', workflow: 'project member list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/members', workflow: 'project member upsert', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/members/{userId}', workflow: 'project member removal', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/milestones', workflow: 'project milestone list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/milestones', workflow: 'project milestone create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/milestones/{milestoneId}', workflow: 'project milestone update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/milestones/{milestoneId}', workflow: 'project milestone delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/risks', workflow: 'project risk list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/risks', workflow: 'project risk create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/risks/{riskId}', workflow: 'project risk update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/risks/{riskId}', workflow: 'project risk delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/budgets', workflow: 'project budget list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/budgets', workflow: 'project budget create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/budgets/{budgetId}', workflow: 'project budget update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/budgets/{budgetId}', workflow: 'project budget delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/stakeholders', workflow: 'project stakeholder list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/stakeholders', workflow: 'project stakeholder create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/stakeholders/{stakeholderId}', workflow: 'project stakeholder update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/stakeholders/{stakeholderId}', workflow: 'project stakeholder delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/dependencies', workflow: 'project dependency list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/dependencies', workflow: 'project dependency create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/dependencies/{dependencyId}', workflow: 'project dependency update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/dependencies/{dependencyId}', workflow: 'project dependency delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/decisions', workflow: 'project decision list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/decisions', workflow: 'project decision create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/decisions/{decisionId}', workflow: 'project decision update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/decisions/{decisionId}', workflow: 'project decision delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/projects/{projectId}/change-requests', workflow: 'project change request list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/projects/{projectId}/change-requests', workflow: 'project change request create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/projects/{projectId}/change-requests/{changeRequestId}', workflow: 'project change request update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/projects/{projectId}/change-requests/{changeRequestId}', workflow: 'project change request delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks', workflow: 'task list and board hydration', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks', workflow: 'create task flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}', workflow: 'task detail load', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/{taskId}', workflow: 'update task flow', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}', workflow: 'task delete flow', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/archive', workflow: 'task archive flow', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/restore', workflow: 'task restore flow', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/labels', workflow: 'task label list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/labels', workflow: 'task label create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/labels/{labelId}', workflow: 'task label update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/labels/{labelId}', workflow: 'task label delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/taxonomy', workflow: 'task taxonomy load', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/custom-fields', workflow: 'custom field list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/custom-fields', workflow: 'custom field create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/custom-fields/{customFieldId}', workflow: 'custom field update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/custom-fields/{customFieldId}', workflow: 'custom field delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/custom-fields/{customFieldId}/archive', workflow: 'custom field archive', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/custom-fields/{customFieldId}/restore', workflow: 'custom field restore', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/saved-views', workflow: 'task saved view list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/saved-views', workflow: 'task saved view create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/saved-views/{viewId}', workflow: 'task saved view update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/saved-views/{viewId}', workflow: 'task saved view delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/bulk', workflow: 'bulk task operation', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/assignees', workflow: 'task assignee list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/assignees', workflow: 'task assignee add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/assignees/{userId}', workflow: 'task assignee remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/watchers', workflow: 'task watcher list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/watchers', workflow: 'task watcher add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/watchers/{userId}', workflow: 'task watcher remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/comments', workflow: 'task comment list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/comments', workflow: 'task comment create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/comments/{commentId}', workflow: 'task comment delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/attachments', workflow: 'task attachment list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/attachments', workflow: 'task attachment create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/attachments/{attachmentId}', workflow: 'task attachment delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/checklists', workflow: 'task checklist list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/checklists', workflow: 'task checklist create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/checklists/{checklistId}', workflow: 'task checklist delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/checklists/{checklistId}/items', workflow: 'task checklist item create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}', workflow: 'task checklist item update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}', workflow: 'task checklist item delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/labels', workflow: 'task label assignment list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/labels', workflow: 'task label assignment add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/labels/{labelId}', workflow: 'task label assignment remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/dependencies', workflow: 'task dependency list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/tasks/{taskId}/dependencies', workflow: 'task dependency create', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/tasks/{taskId}/dependencies/{dependencyId}', workflow: 'task dependency delete', auth: 'bearer' },
  { method: 'get', path: '/api/v1/tasks/{taskId}/activities', workflow: 'task activity list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/agile/sprints', workflow: 'sprint list', auth: 'bearer' },
  { method: 'post', path: '/api/v1/agile/sprints', workflow: 'sprint create', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/agile/sprints/{sprintId}', workflow: 'sprint update', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/agile/sprints/{sprintId}', workflow: 'sprint delete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/agile/sprints/{sprintId}/start', workflow: 'sprint start', auth: 'bearer' },
  { method: 'post', path: '/api/v1/agile/sprints/{sprintId}/complete', workflow: 'sprint complete', auth: 'bearer' },
  { method: 'post', path: '/api/v1/agile/sprints/{sprintId}/tasks', workflow: 'sprint task add', auth: 'bearer' },
  { method: 'delete', path: '/api/v1/agile/sprints/{sprintId}/tasks/{taskId}', workflow: 'sprint task remove', auth: 'bearer' },
  { method: 'get', path: '/api/v1/agile/projects/{projectId}/board', workflow: 'kanban board hydration', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/agile/tasks/{taskId}/order', workflow: 'drag task board order update', auth: 'bearer' },
  { method: 'patch', path: '/api/v1/agile/tasks/{taskId}/status', workflow: 'drag task status update', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/dashboards', workflow: 'dashboard list', auth: 'bearer' },
  { method: 'get', path: '/api/v1/reporting/analytics/overview', workflow: 'executive metrics', auth: 'bearer' },
  { method: 'get', path: '/api/v1/ai/status', workflow: 'AI availability badge', auth: 'public' },
  { method: 'get', path: '/api/v1/admin/overview', workflow: 'admin console overview', auth: 'bearer' }
];

const frontendClientChecks: FrontendClientCheck[] = [
  {
    helper: 'listProjects',
    routeSnippets: ['/projects?${params.toString()}', '/api/v1/projects'],
    workflow: 'project portfolio list'
  },
  {
    helper: 'getProject',
    routeSnippets: ['/projects/${projectId}', '/api/v1/projects/{projectId}'],
    workflow: 'project detail load'
  },
  {
    helper: 'createProject',
    routeSnippets: ['"/projects"', '/api/v1/projects'],
    workflow: 'create project flow'
  },
  {
    helper: 'updateProject',
    routeSnippets: ['/projects/${projectId}', '/api/v1/projects/{projectId}'],
    workflow: 'update project flow'
  },
  {
    helper: 'listProjectMembers',
    routeSnippets: ['/api/v1/projects/{projectId}/members'],
    workflow: 'project member list'
  },
  {
    helper: 'upsertProjectMember',
    routeSnippets: ['/api/v1/projects/{projectId}/members'],
    workflow: 'project member upsert'
  },
  {
    helper: 'removeProjectMember',
    routeSnippets: ['/api/v1/projects/{projectId}/members/{userId}'],
    workflow: 'project member removal'
  },
  {
    helper: 'listProjectMilestones',
    routeSnippets: ['/api/v1/projects/{projectId}/milestones'],
    workflow: 'project milestone list'
  },
  {
    helper: 'createProjectMilestone',
    routeSnippets: ['/api/v1/projects/{projectId}/milestones'],
    workflow: 'project milestone create'
  },
  {
    helper: 'updateProjectMilestone',
    routeSnippets: ['/api/v1/projects/{projectId}/milestones/{milestoneId}'],
    workflow: 'project milestone update'
  },
  {
    helper: 'deleteProjectMilestone',
    routeSnippets: ['/api/v1/projects/{projectId}/milestones/{milestoneId}'],
    workflow: 'project milestone delete'
  },
  {
    helper: 'listProjectRisks',
    routeSnippets: ['/api/v1/projects/{projectId}/risks'],
    workflow: 'project risk list'
  },
  {
    helper: 'createProjectRisk',
    routeSnippets: ['/api/v1/projects/{projectId}/risks'],
    workflow: 'project risk create'
  },
  {
    helper: 'updateProjectRisk',
    routeSnippets: ['/api/v1/projects/{projectId}/risks/{riskId}'],
    workflow: 'project risk update'
  },
  {
    helper: 'deleteProjectRisk',
    routeSnippets: ['/api/v1/projects/{projectId}/risks/{riskId}'],
    workflow: 'project risk delete'
  },
  {
    helper: 'listProjectBudgets',
    routeSnippets: ['/api/v1/projects/{projectId}/budgets'],
    workflow: 'project budget list'
  },
  {
    helper: 'createProjectBudget',
    routeSnippets: ['/api/v1/projects/{projectId}/budgets'],
    workflow: 'project budget create'
  },
  {
    helper: 'updateProjectBudget',
    routeSnippets: ['/api/v1/projects/{projectId}/budgets/{budgetId}'],
    workflow: 'project budget update'
  },
  {
    helper: 'deleteProjectBudget',
    routeSnippets: ['/api/v1/projects/{projectId}/budgets/{budgetId}'],
    workflow: 'project budget delete'
  },
  {
    helper: 'listProjectStakeholders',
    routeSnippets: ['/api/v1/projects/{projectId}/stakeholders'],
    workflow: 'project stakeholder list'
  },
  {
    helper: 'createProjectStakeholder',
    routeSnippets: ['/api/v1/projects/{projectId}/stakeholders'],
    workflow: 'project stakeholder create'
  },
  {
    helper: 'updateProjectStakeholder',
    routeSnippets: ['/api/v1/projects/{projectId}/stakeholders/{stakeholderId}'],
    workflow: 'project stakeholder update'
  },
  {
    helper: 'deleteProjectStakeholder',
    routeSnippets: ['/api/v1/projects/{projectId}/stakeholders/{stakeholderId}'],
    workflow: 'project stakeholder delete'
  },
  {
    helper: 'listProjectDependencies',
    routeSnippets: ['/api/v1/projects/{projectId}/dependencies'],
    workflow: 'project dependency list'
  },
  {
    helper: 'createProjectDependency',
    routeSnippets: ['/api/v1/projects/{projectId}/dependencies'],
    workflow: 'project dependency create'
  },
  {
    helper: 'updateProjectDependency',
    routeSnippets: ['/api/v1/projects/{projectId}/dependencies/{dependencyId}'],
    workflow: 'project dependency update'
  },
  {
    helper: 'deleteProjectDependency',
    routeSnippets: ['/api/v1/projects/{projectId}/dependencies/{dependencyId}'],
    workflow: 'project dependency delete'
  },
  {
    helper: 'listProjectDecisions',
    routeSnippets: ['/api/v1/projects/{projectId}/decisions'],
    workflow: 'project decision list'
  },
  {
    helper: 'createProjectDecision',
    routeSnippets: ['/api/v1/projects/{projectId}/decisions'],
    workflow: 'project decision create'
  },
  {
    helper: 'updateProjectDecision',
    routeSnippets: ['/api/v1/projects/{projectId}/decisions/{decisionId}'],
    workflow: 'project decision update'
  },
  {
    helper: 'deleteProjectDecision',
    routeSnippets: ['/api/v1/projects/{projectId}/decisions/{decisionId}'],
    workflow: 'project decision delete'
  },
  {
    helper: 'listProjectChangeRequests',
    routeSnippets: ['/api/v1/projects/{projectId}/change-requests'],
    workflow: 'project change request list'
  },
  {
    helper: 'createProjectChangeRequest',
    routeSnippets: ['/api/v1/projects/{projectId}/change-requests'],
    workflow: 'project change request create'
  },
  {
    helper: 'updateProjectChangeRequest',
    routeSnippets: ['/api/v1/projects/{projectId}/change-requests/{changeRequestId}'],
    workflow: 'project change request update'
  },
  {
    helper: 'deleteProjectChangeRequest',
    routeSnippets: ['/api/v1/projects/{projectId}/change-requests/{changeRequestId}'],
    workflow: 'project change request delete'
  },
  {
    helper: 'listTasks',
    routeSnippets: ['/tasks?${params.toString()}', '/api/v1/tasks'],
    workflow: 'task list and board hydration'
  },
  {
    helper: 'getTask',
    routeSnippets: ['/tasks/${taskId}', '/api/v1/tasks/{taskId}'],
    workflow: 'task detail load'
  },
  {
    helper: 'createTask',
    routeSnippets: ['"/tasks"', '/api/v1/tasks'],
    workflow: 'create task flow'
  },
  {
    helper: 'updateTask',
    routeSnippets: ['/tasks/${taskId}', '/api/v1/tasks/{taskId}'],
    workflow: 'update task flow'
  },
  {
    helper: 'deleteTask',
    routeSnippets: ['/api/v1/tasks/{taskId}'],
    workflow: 'task delete flow'
  },
  {
    helper: 'archiveTask',
    routeSnippets: ['/api/v1/tasks/{taskId}/archive'],
    workflow: 'task archive flow'
  },
  {
    helper: 'restoreTask',
    routeSnippets: ['/api/v1/tasks/{taskId}/restore'],
    workflow: 'task restore flow'
  },
  {
    helper: 'listTaskComments',
    routeSnippets: ['/api/v1/tasks/{taskId}/comments'],
    workflow: 'task comment list'
  },
  {
    helper: 'createTaskComment',
    routeSnippets: ['/api/v1/tasks/{taskId}/comments'],
    workflow: 'task comment create'
  },
  {
    helper: 'deleteTaskComment',
    routeSnippets: ['/api/v1/tasks/{taskId}/comments/{commentId}'],
    workflow: 'task comment delete'
  },
  {
    helper: 'listTaskChecklists',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists'],
    workflow: 'task checklist list'
  },
  {
    helper: 'createTaskChecklist',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists'],
    workflow: 'task checklist create'
  },
  {
    helper: 'deleteTaskChecklist',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists/{checklistId}'],
    workflow: 'task checklist delete'
  },
  {
    helper: 'createTaskChecklistItem',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists/{checklistId}/items'],
    workflow: 'task checklist item create'
  },
  {
    helper: 'updateTaskChecklistItem',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}'],
    workflow: 'task checklist item update'
  },
  {
    helper: 'deleteTaskChecklistItem',
    routeSnippets: ['/api/v1/tasks/{taskId}/checklists/{checklistId}/items/{itemId}'],
    workflow: 'task checklist item delete'
  },
  {
    helper: 'listTaskActivities',
    routeSnippets: ['/api/v1/tasks/{taskId}/activities'],
    workflow: 'task activity list'
  },
  {
    helper: 'listTaskAttachments',
    routeSnippets: ['/api/v1/tasks/{taskId}/attachments'],
    workflow: 'task attachment list'
  },
  {
    helper: 'createTaskAttachment',
    routeSnippets: ['/api/v1/tasks/{taskId}/attachments'],
    workflow: 'task attachment create'
  },
  {
    helper: 'deleteTaskAttachment',
    routeSnippets: ['/api/v1/tasks/{taskId}/attachments/{attachmentId}'],
    workflow: 'task attachment delete'
  },
  {
    helper: 'listTaskDependencies',
    routeSnippets: ['/api/v1/tasks/{taskId}/dependencies'],
    workflow: 'task dependency list'
  },
  {
    helper: 'createTaskDependency',
    routeSnippets: ['/api/v1/tasks/{taskId}/dependencies'],
    workflow: 'task dependency create'
  },
  {
    helper: 'deleteTaskDependency',
    routeSnippets: ['/api/v1/tasks/{taskId}/dependencies/{dependencyId}'],
    workflow: 'task dependency delete'
  },
  {
    helper: 'getTaskTaxonomy',
    routeSnippets: ['/api/v1/tasks/taxonomy'],
    workflow: 'task taxonomy load'
  },
  {
    helper: 'listCustomFields',
    routeSnippets: ['/api/v1/tasks/custom-fields'],
    workflow: 'custom field list'
  },
  {
    helper: 'createCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields'],
    workflow: 'custom field create'
  },
  {
    helper: 'updateCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields/{customFieldId}'],
    workflow: 'custom field update'
  },
  {
    helper: 'archiveCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields/{customFieldId}/archive'],
    workflow: 'custom field archive'
  },
  {
    helper: 'restoreCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields/{customFieldId}/restore'],
    workflow: 'custom field restore'
  },
  {
    helper: 'deleteCustomField',
    routeSnippets: ['/api/v1/tasks/custom-fields/{customFieldId}'],
    workflow: 'custom field delete'
  },
  {
    helper: 'listTaskSavedViews',
    routeSnippets: ['/api/v1/tasks/saved-views'],
    workflow: 'task saved view list'
  },
  {
    helper: 'createTaskSavedView',
    routeSnippets: ['/api/v1/tasks/saved-views'],
    workflow: 'task saved view create'
  },
  {
    helper: 'updateTaskSavedView',
    routeSnippets: ['/api/v1/tasks/saved-views/{viewId}'],
    workflow: 'task saved view update'
  },
  {
    helper: 'deleteTaskSavedView',
    routeSnippets: ['/api/v1/tasks/saved-views/{viewId}'],
    workflow: 'task saved view delete'
  },
  {
    helper: 'bulkTaskOperation',
    routeSnippets: ['/api/v1/tasks/bulk'],
    workflow: 'bulk task operation'
  },
  {
    helper: 'listLabels',
    routeSnippets: ['/api/v1/tasks/labels'],
    workflow: 'task label list'
  },
  {
    helper: 'createLabel',
    routeSnippets: ['/api/v1/tasks/labels'],
    workflow: 'task label create'
  },
  {
    helper: 'updateLabel',
    routeSnippets: ['/api/v1/tasks/labels/{labelId}'],
    workflow: 'task label update'
  },
  {
    helper: 'deleteLabel',
    routeSnippets: ['/api/v1/tasks/labels/{labelId}'],
    workflow: 'task label delete'
  },
  {
    helper: 'listTaskLabels',
    routeSnippets: ['/api/v1/tasks/{taskId}/labels'],
    workflow: 'task label assignment list'
  },
  {
    helper: 'assignTaskLabel',
    routeSnippets: ['/api/v1/tasks/{taskId}/labels'],
    workflow: 'task label assignment add'
  },
  {
    helper: 'removeTaskLabel',
    routeSnippets: ['/api/v1/tasks/{taskId}/labels/{labelId}'],
    workflow: 'task label assignment remove'
  },
  {
    helper: 'listTaskAssignees',
    routeSnippets: ['/api/v1/tasks/{taskId}/assignees'],
    workflow: 'task assignee list'
  },
  {
    helper: 'addTaskAssignee',
    routeSnippets: ['/api/v1/tasks/{taskId}/assignees'],
    workflow: 'task assignee add'
  },
  {
    helper: 'removeTaskAssignee',
    routeSnippets: ['/api/v1/tasks/{taskId}/assignees/{userId}'],
    workflow: 'task assignee remove'
  },
  {
    helper: 'listTaskWatchers',
    routeSnippets: ['/api/v1/tasks/{taskId}/watchers'],
    workflow: 'task watcher list'
  },
  {
    helper: 'addTaskWatcher',
    routeSnippets: ['/api/v1/tasks/{taskId}/watchers'],
    workflow: 'task watcher add'
  },
  {
    helper: 'removeTaskWatcher',
    routeSnippets: ['/api/v1/tasks/{taskId}/watchers/{userId}'],
    workflow: 'task watcher remove'
  },
  {
    helper: 'listSprints',
    routeSnippets: ['/api/v1/agile/sprints'],
    workflow: 'sprint list'
  },
  {
    helper: 'createSprint',
    routeSnippets: ['/api/v1/agile/sprints'],
    workflow: 'sprint create'
  },
  {
    helper: 'updateSprint',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}'],
    workflow: 'sprint update'
  },
  {
    helper: 'startSprint',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}/start'],
    workflow: 'sprint start'
  },
  {
    helper: 'completeSprint',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}/complete'],
    workflow: 'sprint complete'
  },
  {
    helper: 'deleteSprint',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}'],
    workflow: 'sprint delete'
  },
  {
    helper: 'addSprintTasks',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}/tasks'],
    workflow: 'sprint task add'
  },
  {
    helper: 'removeSprintTask',
    routeSnippets: ['/api/v1/agile/sprints/{sprintId}/tasks/{taskId}'],
    workflow: 'sprint task remove'
  },
  {
    helper: 'getProjectBoard',
    routeSnippets: ['/agile/projects/${projectId}/board', '/api/v1/agile/projects/{projectId}/board'],
    workflow: 'kanban board hydration'
  },
  {
    helper: 'updateTaskBoardOrder',
    routeSnippets: ['/agile/tasks/${taskId}/order', '/api/v1/agile/tasks/{taskId}/order'],
    workflow: 'drag task board order update'
  },
  {
    helper: 'updateTaskStatus',
    routeSnippets: ['/agile/tasks/${taskId}/status', '/api/v1/agile/tasks/{taskId}/status'],
    workflow: 'direct task status update'
  }
];

function readOpenApiContract(): OpenAPIObject {
  const contractPath = join(process.cwd(), 'docs', 'api', 'openapi.json');
  return JSON.parse(readFileSync(contractPath, 'utf8')) as OpenAPIObject;
}

function getOperation(document: OpenAPIObject, endpoint: RequiredEndpoint) {
  return document.paths[endpoint.path]?.[endpoint.method] as OperationWithSecurity | undefined;
}

function operationHasBearerAuth(operation: OperationWithSecurity | undefined) {
  if (!operation?.security) return false;

  return operation.security.some((requirement) => Object.keys(requirement).includes('bearer'));
}

function readFrontendClient() {
  const frontendClientPath = resolve(process.cwd(), '..', 'taskbricks-fe', 'src', 'lib', 'api.ts');
  return readFileSync(frontendClientPath, 'utf8');
}

function findMissingFrontendClientChecks(frontendClient: string) {
  return frontendClientChecks.filter((check) => {
    const helperMatch = new RegExp(`(?:export\\s+)?function\\s+${check.helper}\\s*\\(`).exec(frontendClient);
    if (!helperMatch) return true;

    const helperIndex = helperMatch.index;

    const nextFunctionIndex = frontendClient.indexOf('\nexport function ', helperIndex + 1);
    const helperSource =
      nextFunctionIndex === -1
        ? frontendClient.slice(helperIndex)
        : frontendClient.slice(helperIndex, nextFunctionIndex);

    return !check.routeSnippets.some((routeSnippet) => helperSource.includes(routeSnippet));
  });
}

function main() {
  const document = readOpenApiContract();
  const missing = requiredEndpoints.filter((endpoint) => !getOperation(document, endpoint));
  const unsecured = requiredEndpoints.filter(
    (endpoint) =>
      endpoint.auth === 'bearer' && !operationHasBearerAuth(getOperation(document, endpoint))
  );
  const unversioned = Object.keys(document.paths).filter((path) => !path.startsWith('/api/v1/'));
  const bearerScheme = document.components?.securitySchemes?.bearer;
  const missingFrontendClientChecks = findMissingFrontendClientChecks(readFrontendClient());

  if (missing.length || unsecured.length || unversioned.length || !bearerScheme || missingFrontendClientChecks.length) {
    if (missing.length) {
      console.error('Missing frontend contract endpoints:');
      missing.forEach((endpoint) =>
        console.error(`- ${endpoint.method.toUpperCase()} ${endpoint.path} (${endpoint.workflow})`)
      );
    }

    if (unsecured.length) {
      console.error('Bearer endpoints without OpenAPI bearer metadata:');
      unsecured.forEach((endpoint) =>
        console.error(`- ${endpoint.method.toUpperCase()} ${endpoint.path} (${endpoint.workflow})`)
      );
    }

    if (unversioned.length) {
      console.error('Unversioned paths found:');
      unversioned.forEach((path) => console.error(`- ${path}`));
    }

    if (!bearerScheme) {
      console.error('Missing bearer security scheme.');
    }

    if (missingFrontendClientChecks.length) {
      console.error('Frontend client helper route checks failed:');
      missingFrontendClientChecks.forEach((check) =>
        console.error(`- ${check.helper} must call one of ${check.routeSnippets.join(', ')} (${check.workflow})`)
      );
    }

    process.exit(1);
  }

  console.log(`Frontend contract verified against ${Object.keys(document.paths).length} paths.`);
  console.log(`Required workflows covered: ${requiredEndpoints.length}`);
  console.log(`Frontend client helpers covered: ${frontendClientChecks.length}`);
}

main();
