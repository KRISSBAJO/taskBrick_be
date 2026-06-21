wngrade to  the app # TaskBricks Backend Implementation Phases

Version: 1.0  
Status: Draft implementation plan  
Repository: `taskbricks-be`  
Stack: NestJS, Prisma, PostgreSQL, Redis, BullMQ, Swagger/OpenAPI  
Goal: production-ready enterprise SaaS backend, not a prototype

## 1. Purpose

This document defines the phased plan for implementing the full TaskBricks backend. It translates the product requirements into an engineering execution plan covering architecture, modules, APIs, database design, infrastructure, security, observability, testing, deployment, and launch readiness.

The backend must be built as a maintainable production system with strict tenant isolation, strong authentication, auditable actions, documented APIs, automated tests, and deployment-ready operational controls.

## 2. Engineering Principles

- Build domain modules with clear ownership and no controller-level business logic.
- Use DTO validation for every write endpoint.
- Use response DTOs or serializers to prevent accidental secret/data leakage.
- Enforce tenant scope at guard/service/query level.
- Prefer explicit transactions for multi-write workflows.
- Keep Swagger accurate as part of the definition of done.
- Treat audit logging, observability, pagination, and error handling as core platform behavior.
- Keep background work out of request handlers when the task can be retried or delayed.
- Design for production from the first milestone: secrets, rate limits, health checks, logs, metrics, tracing, migrations, and CI.

## 3. Cross-Cutting Backend Standards

### 3.1 API Standards

- Base path: `/api/v1`.
- Swagger UI: `/api/docs`.
- OpenAPI JSON: `/api/docs-json`.
- JSON request and response bodies.
- ISO 8601 timestamps.
- Stable error shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "BadRequestException",
  "requestId": "uuid"
}
```

- List endpoints must support `page`, `limit`, filtering, sorting, and search where useful.
- Pagination response shape:

```json
{
  "data": [],
  "page": 1,
  "limit": 25,
  "total": 0,
  "totalPages": 0
}
```

### 3.2 Module Pattern

Each mature domain module should contain:

- `*.module.ts`
- `*.controller.ts`
- `*.service.ts`
- `dto/`
- `entities/` or response models where useful
- `guards/` where module-specific authorization is needed
- `policies/` for permission checks
- `repositories/` only when query complexity justifies it
- `tests/` or colocated `*.spec.ts`

### 3.3 Production Readiness Definition of Done

For each module:

- Swagger docs exist for all public endpoints.
- DTO validation covers all writes.
- Authorization is enforced.
- Tenant boundaries are tested.
- Audit events are emitted for sensitive writes.
- Logs include request id and user/tenant context where available.
- Unit tests cover service logic.
- Integration tests cover main success and failure paths.
- Database indexes exist for expected high-traffic queries.
- No secrets are returned in API responses.

## 4. Phase 0: Project Foundation

### Objective

Establish the backend foundation that every future module depends on.

### Deliverables

- NestJS application scaffold.
- TypeScript strict configuration.
- Swagger/OpenAPI setup.
- Prisma Client and schema.
- PostgreSQL Docker service.
- Redis Docker service.
- Config module with env validation.
- Health endpoint.
- Request id middleware.
- Global validation pipe.
- Global exception filter.
- Logging interceptor.
- Docker Compose for local infrastructure.
- Initial database migration.
- README setup instructions.

### Production Requirements

- `.env.example` documents every required production variable.
- `.env.local` supports safe local development.
- App must fail fast when production secrets are missing.
- Health check must verify database availability.
- Build and lint must pass in CI.

### Acceptance Criteria

- `npm run build` passes.
- `npm run lint` passes.
- `npm run prisma:validate` passes.
- `npx prisma migrate dev --name init` creates and applies migration locally.
- `/api/v1/health` returns database status.
- `/api/docs` loads Swagger.

## 5. Phase 1: DevOps, CI, and Environment Management

### Objective

Make the backend safe to build, test, deploy, and operate across local, staging, and production.

### Deliverables

- Environment file strategy:
  - `.env.local` for local development.
  - `.env.example` for documented configuration.
  - secret manager for staging/production.
- CI pipeline:
  - install dependencies with lockfile.
  - run lint.
  - run unit tests.
  - run integration tests.
  - validate Prisma schema.
  - generate Prisma Client.
  - build application.
  - run audit checks.
- Dockerfile for production API image.
- Dockerfile or worker command for background workers.
- Database migration deployment command.
- Release checklist.
- Branch and PR quality gates.

### Infrastructure

- Postgres for primary relational data.
- Redis for cache, queues, rate limiting, and realtime coordination.
- Object storage for attachments.
- Email provider for transactional emails.
- Error monitoring.
- Metrics and tracing backend.

### Acceptance Criteria

- CI blocks broken builds.
- Production image starts with `node dist/main.js`.
- Migrations can be applied in a deployment pipeline.
- No production deploy requires local `.env` files.
- Secrets are injected by deployment platform or secret manager.

## 6. Phase 2: Database Hardening and Data Model Review

### Objective

Turn the initial Prisma schema into a durable production data model.

### Deliverables

- Review all tenant-owned models for `tenantId`.
- Add missing relations where scalar ids exist without relation definitions.
- Add indexes for common reads.
- Add unique constraints for tenant-scoped resources.
- Decide soft-delete policy.
- Decide archival policy.
- Decide audit retention policy.
- Add decimal precision for money fields.
- Add migration naming convention.
- Add seed strategy for system roles, permissions, plans, and features.

### Data Model Checks

- Tenant isolation:
  - `Tenant`
  - `Workspace`
  - `Team`
  - `User`
  - `Project`
  - `Task`
  - `Label`
  - `CustomField`
  - `Workflow`
  - `Approval`
  - `Document`
  - `Conversation`
  - `Notification`
  - `Integration`
  - `AuditLog`

- High-volume models:
  - `Task`
  - `TaskActivity`
  - `TaskComment`
  - `Message`
  - `Notification`
  - `AuditLog`
  - `TimeEntry`

### Production Requirements

- Every high-volume list query has an index strategy.
- Migrations are reviewed before applying to staging/production.
- Destructive schema changes require explicit migration notes.
- Seed scripts are idempotent.

### Acceptance Criteria

- Prisma schema validates.
- Initial seed can run repeatedly without duplicate system data.
- Cross-tenant access tests fail correctly.
- Database indexes are documented for main query paths.

## 7. Phase 3: Authentication and Identity

### Objective

Implement secure identity flows for users and admins.

### Deliverables

- Email/password login.
- Password hashing with Argon2 or bcrypt.
- JWT access tokens.
- Refresh token rotation.
- Logout and token revocation.
- Password reset.
- Email verification.
- Invite acceptance.
- Current user endpoint.
- Session/device tracking.
- Auth rate limiting.
- Auth audit logging.

### APIs

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/verify-email`
- `GET /api/v1/auth/me`

### Production Requirements

- Password hashes are never returned.
- Refresh tokens are hashed at rest.
- Failed login attempts are rate limited.
- Auth events are audited.
- JWT secrets must be strong and environment-specific.
- Cookies must support secure production configuration if cookie auth is enabled.

### Acceptance Criteria

- Users can log in and refresh tokens.
- Revoked refresh tokens cannot be reused.
- Suspended users cannot authenticate.
- Auth Swagger docs are complete.
- Auth integration tests cover success and failure flows.

## 8. Phase 4: Tenant, Organization, RBAC, and Policy Enforcement

### Objective

Implement the enterprise access-control foundation.

### Deliverables

- Tenant CRUD for platform owners.
- Tenant bootstrap for organization owners.
- Role CRUD.
- Permission CRUD or seeded permission catalog.
- User role assignment.
- Permission guards.
- Tenant context resolver.
- Tenant-scoped Prisma query helpers.
- Admin-level authorization policies.
- Platform owner bypass rules.

### APIs

- `POST /api/v1/tenants`
- `GET /api/v1/tenants`
- `GET /api/v1/tenants/:id`
- `PATCH /api/v1/tenants/:id`
- `POST /api/v1/roles`
- `GET /api/v1/roles`
- `POST /api/v1/roles/:id/permissions`
- `POST /api/v1/users/:id/roles`

### Production Requirements

- All tenant-owned resources require tenant context.
- Permission checks must be centrally reusable.
- Cross-tenant reads/writes must be blocked.
- Role changes must be audited.

### Acceptance Criteria

- Organization admins cannot access other tenants.
- Members cannot perform admin-only actions.
- Platform owners can manage tenant status.
- Permission seed script creates stable permissions.

## 9. Phase 5: Users, Workspaces, and Teams

### Objective

Implement organization structure and team membership.

### Deliverables

- User profile CRUD.
- Admin user management.
- Invitations.
- Workspace CRUD.
- Team CRUD.
- Team membership management.
- User status lifecycle.
- Avatar/profile metadata support.

### APIs

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `POST /api/v1/users/invite`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces`
- `PATCH /api/v1/workspaces/:id`
- `POST /api/v1/teams`
- `POST /api/v1/teams/:id/members`

### Production Requirements

- Invite tokens expire.
- User email uniqueness is tenant-scoped.
- Workspace slugs are tenant-scoped.
- Team membership changes are audited.

### Acceptance Criteria

- Admins can invite and manage users.
- Users can update allowed profile fields only.
- Team membership is tenant-safe.
- Workspace/team list endpoints paginate.

## 10. Phase 6: Project Management Core

### Objective

Implement the project layer used by tasks, agile workflows, budgets, risks, and reporting.

### Deliverables

- Project CRUD.
- Project members.
- Project status lifecycle.
- Project visibility rules.
- Milestones.
- Risks.
- Budgets.
- Project documents linkage.
- Project progress calculations.

### APIs

- `POST /api/v1/projects`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id`
- `PATCH /api/v1/projects/:id`
- `DELETE /api/v1/projects/:id`
- `POST /api/v1/projects/:id/members`
- `POST /api/v1/projects/:id/milestones`
- `POST /api/v1/projects/:id/risks`
- `POST /api/v1/projects/:id/budgets`

### Production Requirements

- Project keys are tenant-unique.
- Visibility rules are enforced.
- Budget values use correct decimal precision.
- Project deletes should likely be soft deletes or archival.

### Acceptance Criteria

- Project managers can manage assigned projects.
- Members can only view allowed projects.
- Project reads include useful summary counts.
- Project activity is audited.

## 11. Phase 7: Task and Issue Management Core

### Objective

Implement the central work item system.

### Deliverables

- Task CRUD.
- Task assignment.
- Watchers.
- Labels.
- Comments.
- Attachments metadata.
- Checklists.
- Subtasks.
- Dependencies.
- Task activity stream.
- Custom field values.
- Status transitions.
- Task search/filter/sort.

### APIs

- `POST /api/v1/tasks`
- `GET /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `PATCH /api/v1/tasks/:id`
- `DELETE /api/v1/tasks/:id`
- `POST /api/v1/tasks/:id/assignees`
- `POST /api/v1/tasks/:id/comments`
- `POST /api/v1/tasks/:id/attachments`
- `POST /api/v1/tasks/:id/checklists`
- `POST /api/v1/tasks/:id/dependencies`

### Production Requirements

- Task keys are unique per project.
- Assignment changes emit notifications.
- Status changes emit audit/activity events.
- File uploads use signed URLs or managed upload tokens.
- Large task lists must be indexed and paginated.

### Acceptance Criteria

- Users can create and manage permitted tasks.
- Watchers receive notifications.
- Comments and activities are ordered correctly.
- Cross-project dependency rules are explicit.

## 12. Phase 8: Agile, Sprint, and Kanban Boards

### Objective

Implement agile planning and board execution.

### Deliverables

- Product backlog.
- Sprint CRUD.
- Sprint planning.
- Sprint task assignment.
- Sprint start/complete workflows.
- Board model.
- Columns.
- WIP limits.
- Drag/drop ordering persistence.
- Burndown data.
- Velocity data.
- Retrospectives.

### APIs

- `POST /api/v1/sprints`
- `GET /api/v1/sprints`
- `PATCH /api/v1/sprints/:id`
- `POST /api/v1/sprints/:id/start`
- `POST /api/v1/sprints/:id/complete`
- `GET /api/v1/projects/:id/board`
- `PATCH /api/v1/tasks/:id/status`
- `PATCH /api/v1/tasks/:id/order`

### Production Requirements

- Board ordering updates should be transactional.
- WIP limit validation should be enforced server-side.
- Sprint completion should preserve historical reporting data.

### Acceptance Criteria

- Sprint reports reflect completed tasks.
- Board order persists across clients.
- Status transitions are authorized and audited.

## 13. Phase 9: Collaboration and Realtime

### Objective

Implement realtime collaboration for chat, notifications, activity, and task updates.

### Deliverables

- Conversation CRUD.
- Direct messages.
- Group conversations.
- Message attachments metadata.
- Reactions.
- Typing indicators.
- Read receipts.
- Socket.IO gateway.
- Authenticated websocket connections.
- Tenant/project/team scoped rooms.
- Realtime task update events.

### APIs and Events

- `POST /api/v1/conversations`
- `GET /api/v1/conversations`
- `POST /api/v1/conversations/:id/messages`
- `POST /api/v1/messages/:id/reactions`
- WebSocket event: `message.created`
- WebSocket event: `task.updated`
- WebSocket event: `notification.created`

### Production Requirements

- Websocket auth must use verified JWTs.
- Users can only join rooms they are authorized to access.
- Message history is paginated.
- Realtime delivery failures do not break API writes.

### Acceptance Criteria

- Users receive realtime notifications for allowed resources.
- Unauthorized socket room joins are rejected.
- Chat messages persist and paginate.

## 14. Phase 10: Notifications

Status: Core notification center implemented.

### Objective

Build the notification center and delivery system.

### Deliverables

- In-app notifications.
- Email notifications.
- SMS provider abstraction.
- Push provider abstraction.
- Slack/Teams notifications.
- Notification preferences.
- Notification templates.
- BullMQ notification jobs.
- Retry and dead-letter handling.

### APIs

- `GET /api/v1/notifications/status`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `GET /api/v1/notifications/:id`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/:id/unread`
- `PATCH /api/v1/notifications/read-all`
- `DELETE /api/v1/notifications/read`
- `DELETE /api/v1/notifications/:id`
- `GET /api/v1/notification-preferences`
- `PATCH /api/v1/notification-preferences`
- `GET /api/v1/notification-templates`
- `POST /api/v1/notification-templates`
- `PATCH /api/v1/notification-templates/:id`
- `DELETE /api/v1/notification-templates/:id`
- `GET /api/v1/notification-deliveries`
- `PATCH /api/v1/notification-deliveries/:id/status`
- `POST /api/v1/notification-deliveries/:id/retry`

### Implemented Notes

- Tenant-scoped notification templates, preferences, notifications, and delivery records are implemented.
- In-app realtime notification events are emitted for created in-app notifications.
- Non-in-app channels are tracked through delivery records with pending, failed, sent, retry, and audit lifecycle endpoints.
- Provider-specific background workers for actual email, SMS, push, Slack, and Teams sends remain the next infrastructure step.

### Production Requirements

- Notification jobs are idempotent.
- Email/SMS provider failures are retried.
- Users can opt out of optional channels.
- Critical security notifications cannot be disabled.

### Acceptance Criteria

- Assignment, mention, due date, and approval notifications are delivered.
- Notification preferences are respected.
- Failed jobs are visible operationally.

## 15. Phase 11: Documents and Knowledge Base

Status: Core document and versioning system implemented.

### Objective

Implement project and tenant knowledge management.

### Deliverables

- Document folders.
- Documents.
- Version history.
- Visibility controls.
- Project document linking.
- Requirements documents.
- Decision logs.
- Meeting notes.
- Approval workflows for documents.

### APIs

- `GET /api/v1/documents/status`
- `GET /api/v1/document-folders/tree`
- `POST /api/v1/document-folders`
- `GET /api/v1/document-folders`
- `GET /api/v1/document-folders/:id`
- `PATCH /api/v1/document-folders/:id`
- `POST /api/v1/document-folders/:id/archive`
- `POST /api/v1/document-folders/:id/restore`
- `DELETE /api/v1/document-folders/:id`
- `POST /api/v1/documents`
- `GET /api/v1/documents`
- `GET /api/v1/documents/:id`
- `PATCH /api/v1/documents/:id`
- `POST /api/v1/documents/:id/publish`
- `POST /api/v1/documents/:id/archive`
- `POST /api/v1/documents/:id/restore`
- `DELETE /api/v1/documents/:id`
- `DELETE /api/v1/documents/:id/hard-delete`
- `GET /api/v1/documents/:id/versions`
- `GET /api/v1/documents/:id/versions/:version`
- `POST /api/v1/documents/:id/versions/:version/restore`

### Implemented Notes

- Folder CRUD, folder tree, archive/restore, document CRUD, publish/archive/restore, hard delete, and document version restore are implemented.
- Document updates create transactional version snapshots.
- Tenant scope, project/folder validation, private-document visibility, and audit logging are enforced.
- Document approval workflows and large-object storage strategy remain dedicated follow-up work.

### Production Requirements

- Document visibility must be enforced.
- Large content strategy must be explicit.
- Version creation must be transactional with updates.

### Acceptance Criteria

- Users can create and version documents.
- Project documents are visible only to permitted users.
- Version history is preserved.

## 16. Phase 12: Time Tracking and Resource Planning

Status: Core time tracking, timesheets, skills, allocations, and reports implemented.

### Objective

Implement time, utilization, capacity, and allocation features.

### Deliverables

- Time entries.
- Start/stop timer.
- Timesheets.
- Timesheet approvals.
- Billable/non-billable tracking.
- Skills.
- User skill levels.
- Resource allocations.
- Capacity planning reports.
- Utilization reports.

### APIs

- `GET /api/v1/time-tracking/status`
- `POST /api/v1/time-entries`
- `GET /api/v1/time-entries`
- `GET /api/v1/time-entries/:id`
- `PATCH /api/v1/time-entries/:id`
- `DELETE /api/v1/time-entries/:id`
- `GET /api/v1/time-timers/current`
- `POST /api/v1/time-timers/start`
- `PATCH /api/v1/time-timers/current`
- `POST /api/v1/time-timers/stop`
- `DELETE /api/v1/time-timers/current`
- `POST /api/v1/timesheets`
- `GET /api/v1/timesheets`
- `GET /api/v1/timesheets/:id`
- `PATCH /api/v1/timesheets/:id`
- `POST /api/v1/timesheets/:id/entries`
- `DELETE /api/v1/timesheets/:id/entries/:entryId`
- `POST /api/v1/timesheets/:id/submit`
- `POST /api/v1/timesheets/:id/approve`
- `POST /api/v1/timesheets/:id/reject`
- `POST /api/v1/timesheets/:id/reopen`
- `DELETE /api/v1/timesheets/:id`
- `GET /api/v1/skills`
- `POST /api/v1/skills`
- `GET /api/v1/skills/:id`
- `PATCH /api/v1/skills/:id`
- `POST /api/v1/skills/:id/archive`
- `POST /api/v1/skills/:id/restore`
- `DELETE /api/v1/skills/:id`
- `GET /api/v1/user-skills`
- `POST /api/v1/user-skills`
- `PATCH /api/v1/user-skills/:id`
- `DELETE /api/v1/user-skills/:id`
- `POST /api/v1/resource-allocations`
- `GET /api/v1/resource-allocations`
- `GET /api/v1/resource-allocations/:id`
- `PATCH /api/v1/resource-allocations/:id`
- `DELETE /api/v1/resource-allocations/:id`
- `GET /api/v1/resource-planning/capacity`
- `GET /api/v1/resource-planning/utilization`
- `GET /api/v1/resource-planning/availability`

### Implemented Notes

- Time entries are tenant-scoped, owner/manager protected, auditable, task-linked, and locked after timesheet submission or approval.
- Active timers enforce one running timer per user and convert into time entries on stop.
- Timesheets support draft, submit, approve, reject, reopen, cancel, entry attach/detach, totals, and approval locking.
- Skills and user skills support skill catalogs, levels, years of experience, archiving, and assignment audits.
- Resource allocations validate overlapping capacity so a user cannot exceed 100 percent allocation.
- Capacity, availability, and utilization reports calculate planned and actual minutes over a date range.

### Production Requirements

- Time entries cannot be edited after approval unless policy allows.
- Billable data must be auditable.
- Resource allocation percentages should be validated.

### Acceptance Criteria

- Users can track work against tasks.
- Managers can approve timesheets.
- Resource reports calculate utilization accurately.

## 17. Phase 13: Workflow Automation and Approvals

Status: Core workflow definitions, run tracing, event triggers, and approval engine implemented.

### Objective

Build an automation engine for entity events, conditions, and actions.

### Deliverables

- Workflow definitions.
- Workflow nodes.
- Workflow triggers.
- Workflow conditions.
- Workflow actions.
- Workflow runs.
- Workflow run logs.
- Approval definitions.
- Approval steps.
- Approval notifications.
- Retryable worker execution.

### Triggers

- Task created.
- Task updated.
- Status changed.
- Due date reached.
- Comment added.
- Project status changed.
- Approval requested.

### Actions

- Assign user.
- Notify team.
- Create task.
- Update status.
- Call API.
- Send email.
- Send SMS.
- Request approval.

### APIs

- `GET /api/v1/workflows/status`
- `GET /api/v1/workflows`
- `POST /api/v1/workflows`
- `GET /api/v1/workflows/:id`
- `PATCH /api/v1/workflows/:id`
- `POST /api/v1/workflows/:id/archive`
- `POST /api/v1/workflows/:id/restore`
- `DELETE /api/v1/workflows/:id`
- `POST /api/v1/workflows/:id/nodes`
- `PUT /api/v1/workflows/:id/nodes`
- `PATCH /api/v1/workflows/:id/nodes/:nodeId`
- `DELETE /api/v1/workflows/:id/nodes/:nodeId`
- `POST /api/v1/workflows/:id/run`
- `POST /api/v1/workflow-events`
- `GET /api/v1/workflow-runs`
- `GET /api/v1/workflow-runs/:id`
- `POST /api/v1/workflow-runs/:id/retry`
- `POST /api/v1/workflow-runs/:id/cancel`
- `GET /api/v1/approval-definitions`
- `POST /api/v1/approval-definitions`
- `GET /api/v1/approval-definitions/:id`
- `PATCH /api/v1/approval-definitions/:id`
- `POST /api/v1/approval-definitions/:id/archive`
- `POST /api/v1/approval-definitions/:id/restore`
- `GET /api/v1/approvals`
- `GET /api/v1/approvals/my-pending`
- `POST /api/v1/approvals`
- `GET /api/v1/approvals/:id`
- `POST /api/v1/approvals/:id/steps/:stepId/approve`
- `POST /api/v1/approvals/:id/steps/:stepId/reject`
- `POST /api/v1/approvals/:id/cancel`
- `POST /api/v1/approvals/:id/reopen`

### Implemented Notes

- Workflow definitions support tenant scoping, active/archive state, trigger type, event type, config, and ordered nodes.
- Workflow runs support idempotency keys, manual execution, event-triggered fan-out, retry, cancel, terminal status, and trace logs.
- Core node actions implemented: no-op/log, condition, in-app notification, task status update, approval request, and external-call queue logging.
- Approval definitions support ordered reusable approval steps with explicit approver or approver-role resolution.
- Approval requests support direct or definition-based creation, approver notifications, pending queues, approve/reject decisions, cancel, reopen, and audit records.
- Durable background worker execution for long-running external HTTP/provider actions remains the next operational step.

### Production Requirements

- Workflow runs must be traceable.
- Actions must be idempotent where possible.
- External API calls must have timeouts and retries.
- Workflow errors must not corrupt source entity writes.

### Acceptance Criteria

- Admins can define workflows.
- Workflows run from entity events.
- Run history explains success/failure.
- Approval decisions are audited.

## 18. Phase 14: Billing, Plans, and Subscriptions

Status: Implemented in the NestJS API.

### Objective

Implement SaaS billing and entitlement enforcement.

### Deliverables

- Billing module with `BillingController`, `BillingService`, DTO validation, Swagger metadata, tenant scoping, and audit logging.
- Plan catalog with active/archive lifecycle, provider price ids, metadata, seat limits, trial days, pricing interval, and plan-feature limits.
- Billable feature catalog with categories, units, default limits, metering flags, enable/disable lifecycle, and plan assignment.
- Current tenant subscription lifecycle: create, update, change plan, cancel, resume, start trial, and provider state mapping.
- Invoice lifecycle for manual and provider invoices, including due dates, paid timestamps, hosted invoice URLs, PDFs, tax/subtotal/total metadata, and status updates.
- Usage metering with idempotency keys, feature keys, period boundaries, source tracking, and usage summaries.
- Entitlement service response for seats, plan, subscription period, feature limits, used quantity, remaining quota, and allowed/blocked state.
- Billing account status endpoint for the current tenant.
- Stripe-ready checkout and billing portal creation through Stripe HTTP APIs when configured; local continuation responses when billing provider is disabled.
- Stripe webhook ingestion with raw-body signature verification, idempotent `BillingEvent` storage, event status tracking, subscription reconciliation, invoice reconciliation, and duplicate event handling.
- Tenant status synchronization from subscription status.

### APIs

- `GET /api/v1/billing/status`
- `GET /api/v1/billing/account`
- `GET /api/v1/plans`
- `POST /api/v1/plans`
- `GET /api/v1/plans/:planId`
- `PATCH /api/v1/plans/:planId`
- `POST /api/v1/plans/:planId/archive`
- `POST /api/v1/plans/:planId/restore`
- `DELETE /api/v1/plans/:planId`
- `PUT /api/v1/plans/:planId/features`
- `POST /api/v1/plans/:planId/features`
- `PATCH /api/v1/plans/:planId/features/:featureId`
- `DELETE /api/v1/plans/:planId/features/:featureId`
- `GET /api/v1/features`
- `POST /api/v1/features`
- `GET /api/v1/features/:featureId`
- `PATCH /api/v1/features/:featureId`
- `DELETE /api/v1/features/:featureId`
- `GET /api/v1/subscriptions`
- `POST /api/v1/subscriptions`
- `GET /api/v1/subscriptions/current`
- `GET /api/v1/subscriptions/:subscriptionId`
- `PATCH /api/v1/subscriptions/:subscriptionId`
- `POST /api/v1/subscriptions/:subscriptionId/change-plan`
- `POST /api/v1/subscriptions/:subscriptionId/cancel`
- `POST /api/v1/subscriptions/:subscriptionId/resume`
- `POST /api/v1/subscriptions/:subscriptionId/start-trial`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `GET /api/v1/invoices/:invoiceId`
- `PATCH /api/v1/invoices/:invoiceId/status`
- `GET /api/v1/entitlements`
- `GET /api/v1/entitlements/:featureKey`
- `GET /api/v1/usage-records`
- `GET /api/v1/usage-records/summary`
- `POST /api/v1/usage-records`
- `POST /api/v1/billing/checkout`
- `POST /api/v1/billing/portal`
- `POST /api/v1/billing/webhooks/stripe`
- `GET /api/v1/billing/events`
- `GET /api/v1/billing/events/:eventId`

### Production Requirements

- Billing webhooks must verify signatures.
- Webhook processing must be idempotent.
- Subscription state must be reconciled with provider state.
- Entitlements must be checked before gated actions.
- Billing mutations require `manage:billing`, `manage:tenant`, or `manage:all`.
- Entitlement and current subscription reads require authenticated tenant context.
- Cross-tenant billing reads and writes are blocked at service level.
- Billing provider secrets come from environment variables only.
- Stripe webhook signature validation uses the raw request body.
- Manual local billing mode must remain usable in development without provider credentials.
- Provider webhook processing must store success, ignored, duplicate, and failed states for auditability.
- Usage metering must support idempotency keys to prevent double counting.
- Billing changes are written to the audit log.

### Acceptance Criteria

- Tenants can start trials.
- Plans enforce feature limits.
- Stripe events update subscription state correctly.
- Billing changes are audited.
- Swagger documents the full billing surface.
- Build, lint, Prisma validation, and CI test commands pass.
- Live smoke tests cover plans, features, plan limits, subscription lifecycle, invoices, usage, entitlements, checkout/portal, and provider event ingestion.

## 19. Phase 15: Integrations and Webhooks

Status: Implemented in the NestJS API.

### Objective

Support external systems and outbound event delivery.

### Deliverables

- Integrations module with `IntegrationsController`, `IntegrationsService`, DTO validation, Swagger metadata, tenant scoping, and audit logging.
- Provider integration records for GitHub, GitLab, Bitbucket, Slack, Teams, Google, Microsoft, Zoom, Stripe, PayPal, OpenAI, Anthropic, Zapier, and custom integrations.
- AES-256-GCM encryption for provider secrets using `ENCRYPTION_KEY` with secure deterministic local fallback derived from application secrets.
- Sanitized integration responses that expose `hasSecrets` and `secretKeys` but never plaintext or encrypted secret values.
- Integration enable/disable lifecycle, status updates, secret rotation, external account ids, scopes, config metadata, and provider-sync handoff logs.
- Integration log list endpoint with level, event type, date, search, and pagination filters.
- Outbound webhook subscriptions with names, URLs, events, enable/disable lifecycle, HMAC signing secrets, signing algorithm metadata, failure counters, and last delivery state.
- Webhook signing using timestamped HMAC SHA-256 over `timestamp.payload`.
- Event trigger endpoint that matches tenant webhooks by exact event name or `*`, creates delivery records, signs payloads, attempts HTTP delivery with timeout, stores response metadata, and schedules retries after failures.
- Webhook delivery list/detail endpoints with status, event type, webhook, date, and search filters.
- Retry endpoint for failed deliveries.
- Manual delivery status correction endpoint for operational repair.

### APIs

- `GET /api/v1/integrations/status`
- `GET /api/v1/integrations`
- `POST /api/v1/integrations`
- `GET /api/v1/integrations/:integrationId`
- `PATCH /api/v1/integrations/:integrationId`
- `DELETE /api/v1/integrations/:integrationId`
- `POST /api/v1/integrations/:integrationId/enable`
- `POST /api/v1/integrations/:integrationId/disable`
- `POST /api/v1/integrations/:integrationId/rotate-secret`
- `POST /api/v1/integrations/:integrationId/sync`
- `GET /api/v1/integrations/:integrationId/logs`
- `GET /api/v1/webhooks`
- `POST /api/v1/webhooks`
- `GET /api/v1/webhooks/:webhookId`
- `PATCH /api/v1/webhooks/:webhookId`
- `DELETE /api/v1/webhooks/:webhookId`
- `POST /api/v1/webhooks/:webhookId/enable`
- `POST /api/v1/webhooks/:webhookId/disable`
- `POST /api/v1/webhooks/:webhookId/rotate-secret`
- `POST /api/v1/webhook-events`
- `GET /api/v1/webhook-deliveries`
- `GET /api/v1/webhook-deliveries/:deliveryId`
- `POST /api/v1/webhook-deliveries/:deliveryId/retry`
- `PATCH /api/v1/webhook-deliveries/:deliveryId/status`

### Production Requirements

- Integration secrets are encrypted at rest.
- Webhook payloads are signed.
- Webhook delivery supports retries.
- Provider API failures are isolated from core requests.
- Integration and webhook mutations require `manage:integrations`, `manage:tenant`, or `manage:all`.
- Cross-tenant integration, webhook, log, and delivery access is blocked at service level.
- Secret values are never returned by integration read APIs.
- Webhook signing secrets are encrypted at rest and only returned once when generated or rotated.
- Webhook delivery attempts use an HTTP timeout and persist response status/body snippets for operations.
- Failed deliveries record retry timestamps and increment webhook failure counters.
- Integration sync endpoints write operational logs that provider-specific workers can consume.

### Acceptance Criteria

- Tenants can configure integrations.
- Secrets are never exposed by read APIs.
- Outbound webhooks are delivered and logged.
- Webhook failures can be retried and inspected.
- Integration secret rotation updates encrypted storage without exposing other secrets.
- Swagger documents the full integrations and webhooks surface.
- Build, lint, Prisma validation, and CI test commands pass.

## 20. Phase 16: AI Assistant

### Objective

Implement AI-powered work assistance safely and auditably.

### Deliverables

- AI agents.
- AI conversations.
- AI messages.
- Provider abstraction.
- OpenAI integration.
- Anthropic integration.
- AI usage logging.
- Tenant-level AI controls.
- AI-generated task creation.
- Project summaries.
- Sprint planning support.
- Risk detection.
- Report generation.
- Knowledge search.

### Production Requirements

- AI features must be disabled per tenant if needed.
- Sensitive data sent to providers must be minimized.
- AI requests must be audited.
- Provider errors must fail gracefully.
- Token/cost usage should be tracked.

### Acceptance Criteria

- Users can ask AI for summaries on authorized data only.
- AI cannot access cross-tenant data.
- AI outputs are marked as generated content.
- Usage is logged by tenant and user.

### Implemented Slice

- Added tenant AI settings with enable/disable controls, default provider/model, allowed providers, monthly token budget, retention days, sensitive-data redaction, and optional data-retention controls.
- Added production AI agent lifecycle APIs for create, list, read, update, archive, restore, and delete-with-archive fallback when history exists.
- Added AI conversation and message APIs with project/team/task/workspace context support, deterministic local fallback responses, OpenAI-compatible chat completion support, Anthropic message support, provider error handling, and usage logging.
- Added AI action workflow APIs for creating, listing, running, and cancelling generated actions. The first executable action type creates a real tenant-scoped task while preserving audit history.
- Added AI project summary, sprint planning, risk detection, and knowledge-search endpoints. All project-scoped operations verify tenant ownership before reading data.
- Added usage listing and summary APIs for tenant/user/provider/model token and estimated cost tracking.
- Added audit events for AI settings, agents, conversations, messages, actions, and usage-producing operations.

### Implemented API Groups

- `GET /api/v1/ai/status`
- `GET /api/v1/ai/settings`
- `PATCH /api/v1/ai/settings`
- `GET /api/v1/ai/agents`
- `POST /api/v1/ai/agents`
- `GET /api/v1/ai/agents/:agentId`
- `PATCH /api/v1/ai/agents/:agentId`
- `POST /api/v1/ai/agents/:agentId/archive`
- `POST /api/v1/ai/agents/:agentId/restore`
- `DELETE /api/v1/ai/agents/:agentId`
- `GET /api/v1/ai/conversations`
- `POST /api/v1/ai/conversations`
- `GET /api/v1/ai/conversations/:conversationId`
- `PATCH /api/v1/ai/conversations/:conversationId`
- `POST /api/v1/ai/conversations/:conversationId/archive`
- `POST /api/v1/ai/conversations/:conversationId/restore`
- `POST /api/v1/ai/conversations/:conversationId/messages`
- `POST /api/v1/ai/conversations/:conversationId/summarize`
- `POST /api/v1/ai/chat`
- `POST /api/v1/ai/project-summary`
- `POST /api/v1/ai/sprint-planning`
- `POST /api/v1/ai/risk-detection`
- `POST /api/v1/ai/knowledge-search`
- `GET /api/v1/ai/actions`
- `POST /api/v1/ai/actions`
- `POST /api/v1/ai/actions/:actionId/run`
- `POST /api/v1/ai/actions/:actionId/cancel`
- `GET /api/v1/ai/usage`
- `GET /api/v1/ai/usage/summary`

## 21. Phase 17: Reporting, Dashboards, and Analytics

### Objective

Build dashboards and reporting for operational and executive visibility.

### Deliverables

- Dashboard CRUD.
- Dashboard widgets.
- Report definitions.
- Report query executor.
- Scheduled reports.
- Export jobs.
- Project health reports.
- Team performance reports.
- Cycle time and lead time reports.
- Velocity reports.
- Budget reports.
- SLA reports.

### Production Requirements

- Heavy reports run in workers.
- Export jobs are asynchronous.
- Report queries are tenant-scoped.
- Report data is cached or materialized where needed.

### Acceptance Criteria

- Users can create dashboards.
- Reports return accurate tenant-scoped data.
- Heavy reports do not block API workers.

### Implemented Slice

- Added dashboard lifecycle APIs for tenant-scoped create, list, read with resolved widget data, update, archive, restore, delete, and default-dashboard management.
- Added dashboard widget APIs for create, update, refresh, and delete. Widgets resolve against supported report/analytics data sources and preserve config, position, visibility, and refresh interval metadata.
- Added saved report lifecycle APIs with status, schedule, timezone, recipients, query payload, cache TTL, metadata, archive/restore, and delete-with-archive fallback when executions or exports exist.
- Added report execution records with queued/running/completed/failed status fields, request metadata, duration, result summary, and tenant/user scoping.
- Added export records for JSON, CSV, XLSX, and PDF formats with file metadata, MIME type, expiration, execution linkage, and audit records.
- Added analytics executors for overview, project health, team performance, cycle time, completed sprint velocity, budget utilization, and SLA/due-date compliance.
- Added audit events for dashboard, widget, report, execution, and export operations.
- Added schema indexes and relations for dashboard, widget, report, execution, and export queries so the module is ready for worker-backed report/export processing.

### Implemented API Groups

- `GET /api/v1/reporting/status`
- `GET /api/v1/reporting/dashboards`
- `POST /api/v1/reporting/dashboards`
- `GET /api/v1/reporting/dashboards/:dashboardId`
- `PATCH /api/v1/reporting/dashboards/:dashboardId`
- `POST /api/v1/reporting/dashboards/:dashboardId/archive`
- `POST /api/v1/reporting/dashboards/:dashboardId/restore`
- `DELETE /api/v1/reporting/dashboards/:dashboardId`
- `POST /api/v1/reporting/dashboards/:dashboardId/widgets`
- `PATCH /api/v1/reporting/widgets/:widgetId`
- `GET /api/v1/reporting/widgets/:widgetId/refresh`
- `DELETE /api/v1/reporting/widgets/:widgetId`
- `GET /api/v1/reporting/reports`
- `POST /api/v1/reporting/reports`
- `POST /api/v1/reporting/reports/run`
- `GET /api/v1/reporting/reports/:reportId`
- `PATCH /api/v1/reporting/reports/:reportId`
- `POST /api/v1/reporting/reports/:reportId/archive`
- `POST /api/v1/reporting/reports/:reportId/restore`
- `DELETE /api/v1/reporting/reports/:reportId`
- `POST /api/v1/reporting/reports/:reportId/run`
- `POST /api/v1/reporting/reports/:reportId/exports`
- `GET /api/v1/reporting/executions`
- `GET /api/v1/reporting/executions/:executionId`
- `GET /api/v1/reporting/exports`
- `GET /api/v1/reporting/exports/:exportId`
- `GET /api/v1/reporting/analytics/overview`
- `GET /api/v1/reporting/analytics/project-health`
- `GET /api/v1/reporting/analytics/team-performance`
- `GET /api/v1/reporting/analytics/cycle-time`
- `GET /api/v1/reporting/analytics/velocity`
- `GET /api/v1/reporting/analytics/budget`
- `GET /api/v1/reporting/analytics/sla`

## 22. Phase 18: Admin, Audit, and Compliance

### Objective

Provide platform control, traceability, and compliance foundations.

### Deliverables

- Platform admin APIs.
- Tenant admin APIs.
- Audit log service.
- Audit log search.
- Security event logging.
- Data export workflow.
- Data deletion workflow.
- Retention settings.
- IP restriction foundation.
- Session management.

### Production Requirements

- Audit logs cannot be modified by normal APIs.
- Sensitive admin actions require authorization and audit records.
- Export/delete workflows are tracked and asynchronous.
- Compliance logs are retained according to policy.

### Acceptance Criteria

- Admins can search audit logs.
- Critical actions create audit entries.
- User sessions can be revoked.

### Implemented Slice

- Added tenant-scoped Admin module for governance and compliance operations.
- Added immutable audit-log search APIs with filtering by action, actor, entity, IP address, and date range. Audit logs remain read-only through normal APIs.
- Added security policy storage with tenant-level IP allowlist enforcement settings, session TTL, max sessions per user, password policy fields, MFA flag, upload limits, audit retention, and data retention settings.
- Added security event records with severity, status lifecycle, actor, subject, source, request metadata, resolver, and audit trails.
- Added session management APIs for listing active/revoked sessions, reading one session, revoking one session, and revoking all sessions for a tenant user.
- Added compliance job workflow for data export, data deletion, and retention purge with request, approval, rejection, cancellation, execution, output metadata, and audit records.
- Added API key management with one-time token creation, SHA-256 hashed storage, prefix-only listing, scoped keys, expiry, and revocation.
- Added tenant admin overview with user/session/audit/security/compliance/API-key counts and runtime security checks.

### Implemented API Groups

- `GET /api/v1/admin/status`
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/security-checks`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/audit-logs/:auditLogId`
- `GET /api/v1/admin/security-policy`
- `PATCH /api/v1/admin/security-policy`
- `GET /api/v1/admin/sessions`
- `GET /api/v1/admin/sessions/:sessionId`
- `POST /api/v1/admin/sessions/:sessionId/revoke`
- `POST /api/v1/admin/users/:userId/sessions/revoke`
- `GET /api/v1/admin/security-events`
- `POST /api/v1/admin/security-events`
- `GET /api/v1/admin/security-events/:eventId`
- `PATCH /api/v1/admin/security-events/:eventId`
- `GET /api/v1/admin/compliance-jobs`
- `POST /api/v1/admin/compliance-jobs`
- `GET /api/v1/admin/compliance-jobs/:jobId`
- `POST /api/v1/admin/compliance-jobs/:jobId/approve`
- `POST /api/v1/admin/compliance-jobs/:jobId/reject`
- `POST /api/v1/admin/compliance-jobs/:jobId/run`
- `POST /api/v1/admin/compliance-jobs/:jobId/cancel`
- `GET /api/v1/admin/api-keys`
- `POST /api/v1/admin/api-keys`
- `GET /api/v1/admin/api-keys/:apiKeyId`
- `POST /api/v1/admin/api-keys/:apiKeyId/revoke`

## 23. Phase 19: Security Hardening

### Objective

Harden the backend against common production threats.

### Deliverables

- Helmet security headers.
- Strict CORS per environment.
- Rate limiting.
- Payload size limits.
- Request timeout limits.
- Password policy.
- Token rotation.
- Secret encryption.
- Input validation.
- Output serialization.
- Security audit tests.
- Dependency vulnerability scanning.

### Production Requirements

- Production cannot start with placeholder secrets.
- Swagger is disabled or protected in production unless explicitly enabled.
- CORS does not allow all origins in production.
- Auth routes have stronger rate limits.
- File uploads have size/type checks.

### Acceptance Criteria

- Security checks pass in CI.
- Placeholder secrets fail production validation.
- Unauthorized requests are rejected consistently.

### Implemented Slice

- Hardened production environment validation so placeholder/local secrets fail in production.
- Changed production Swagger default to disabled unless explicitly enabled.
- Added production CORS validation that rejects empty, wildcard, localhost, and loopback origins.
- Added explicit request body size and request timeout configuration.
- Switched bootstrap body parsing to configured JSON/urlencoded limits while preserving raw-body capture for signed webhook verification.
- Added stricter auth route throttling for register, login, and refresh endpoints.
- Added tenant security policy enforcement during JWT validation for IP allowlists, with blocked requests recorded as high-severity security events.
- Added tenant session TTL and maximum active-session enforcement during auth session creation/rotation.
- Added password complexity enforcement for tenant owner registration.
- Added tests for production Swagger default, placeholder secret rejection, and production CORS rejection.

### Implemented Security Checks

- `NODE_ENV=production` rejects local placeholder secrets.
- `SWAGGER_ENABLED` defaults to `false` in production.
- `CORS_ORIGINS` must be explicit and non-local in production.
- `REQUEST_BODY_LIMIT` controls JSON and urlencoded parser size.
- `REQUEST_TIMEOUT_MS` controls request and response timeout.
- JWT validation rejects revoked/expired sessions and tenant-disallowed source IPs.
- API key secrets are never returned after creation and are stored only as hashes.

## 24. Phase 20: Observability and Reliability

### Objective

Make the system observable, debuggable, and reliable in production.

### Deliverables

- Structured logging.
- Request ids.
- User and tenant context in logs.
- Error monitoring.
- Metrics.
- Distributed tracing.
- Health/readiness/liveness endpoints.
- Queue monitoring.
- Graceful shutdown.
- Retry policies.
- Circuit breaker strategy for external providers.

### Production Requirements

- Logs must be JSON in production.
- Errors must include request ids.
- Metrics must expose latency, error rate, queue depth, job failures, and DB latency.
- Traces must connect API requests, DB calls, jobs, and provider calls.

### Acceptance Criteria

- Production incidents can be debugged from logs/traces.
- Health checks reflect database and Redis availability.
- Workers recover from retryable failures.

### Implemented Slice

- Added Observability module with JSON metrics, Prometheus-compatible metrics text, database latency measurement, and provider-safe retry/circuit-breaker helper.
- Added global request metrics collection for method, route, status code, latency buckets, request id, user id, and tenant id.
- Added structured logging support that switches to JSON when `LOG_FORMAT=json`.
- Added error logging with request ids and observability hooks in the global exception filter.
- Added liveness and readiness endpoints. Liveness checks process state only; readiness checks database latency and optional Redis availability.
- Added optional Redis health requirement through `REDIS_HEALTH_REQUIRED`.
- Preserved raw request body capture for signed webhook verification while enforcing configured body-size limits.
- Added graceful Nest shutdown hooks for `SIGINT` and `SIGTERM`.
- Added in-memory queue/job metric primitives and retry/circuit-breaker tracking for external provider and worker integration.

### Implemented API Groups

- `GET /api/v1/health`
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- `GET /api/v1/observability/status`
- `GET /api/v1/observability/metrics`
- `GET /api/v1/observability/db-latency`
- `GET /api/v1/metrics`

## 25. Phase 21: Testing Strategy

### Objective

Create confidence that the backend is correct, secure, and stable.

### Test Types

- Unit tests for services and policies.
- Integration tests for controllers and database behavior.
- End-to-end tests for core user flows.
- Contract tests for API compatibility.
- Authorization tests for tenant boundaries.
- Migration tests.
- Worker/job tests.
- Webhook signature tests.
- Load tests for high-traffic endpoints.
- Security regression tests.

### Production Requirements

- Tests run in CI.
- Integration tests use isolated test database.
- Every critical bug fix gets a regression test.
- Auth and tenant isolation tests are mandatory.

### Acceptance Criteria

- CI test suite is stable.
- Core flows are covered before launch.
- Tenant leakage tests exist for each major domain.

### Implemented Slice

- Added security regression tests for production Swagger default, placeholder secret rejection, and production CORS rejection.
- Added unit tests for request-id propagation.
- Added unit tests for observability HTTP metrics and retry behavior.
- Added backend testing strategy document with test layers, CI gates, contract gates, and required regression areas.
- Added package scripts for unit, coverage, security, contract, e2e, and migration-oriented test workflows.
- CI validation now has runnable security and observability tests instead of `passWithNoTests` only.

### Implemented Test Artifacts

- `test/env.validation.spec.ts`
- `test/observability.service.spec.ts`
- `test/request-id.middleware.spec.ts`
- `docs/TESTING_STRATEGY.md`

## 25.1 Frontend Handoff Point

The formal frontend jump is Phase 22: Frontend Compatibility and API Migration.

Frontend development can start consuming completed APIs earlier, but Phase 22 is where the Next.js application should switch its API client to the backend, align auth token storage, map DTO differences, configure CORS, and wire upload/realtime flows.

Recommended frontend start point:

- Start FE integration after Phase 21 is green in CI.
- Use `http://localhost:4070/api/v1` as the local API base URL.
- Use Swagger at `http://localhost:4070/api/docs` as the source of endpoint shape.
- Begin with auth, current tenant, users, workspaces, projects, tasks, reporting dashboards, AI, admin, and observability screens.

## 26. Phase 22: Frontend Compatibility and API Migration

### Objective

Connect the existing frontend to the new backend without breaking product workflows.

### Deliverables

- API inventory from existing frontend.
- Endpoint mapping.
- DTO compatibility review.
- Auth token storage strategy.
- CORS alignment.
- Upload flow alignment.
- Realtime integration plan.
- Deprecation plan for old endpoints.

### Acceptance Criteria

- Existing login and dashboard flows work against the new backend.
- Frontend API base URL points to the new backend.
- Breaking API differences are documented.

### Implemented Slice

- Centralized Swagger/OpenAPI generation in `src/openapi.ts` so live docs, exported JSON, and contract tests share the same source.
- Added `npm run openapi:export` to export `docs/api/openapi.json`.
- Added `npm run frontend:contract` to verify frontend-critical workflows, versioned `/api/v1` paths, and bearer auth metadata.
- Added contract tests under `test/contract/frontend-contract.spec.ts`.
- Added Phase 22 handoff documentation in `docs/FRONTEND_API_HANDOFF.md`.
- Added CI contract verification to `npm run ci:check`.
- Expanded demo seed data to create a usable frontend tenant workspace, team, project, sprint, board, labels, project budget/risk, and tasks.
- Confirmed Next.js should use `NEXT_PUBLIC_API_URL=http://localhost:4070/api/v1`.

### Frontend Handoff Artifacts

- OpenAPI contract: `docs/api/openapi.json`
- Frontend handoff guide: `docs/FRONTEND_API_HANDOFF.md`
- Contract command: `npm run frontend:contract`
- Demo seed command: `SEED_DEMO_DATA=true npm run prisma:seed`

### Next.js Integration Scope

- Auth: register, login, refresh, logout, current user.
- Shell: readiness checks, current user, workspaces, teams.
- Projects: list, create, update, members, budgets, risks, milestones.
- Tasks/board: list, create, assignees, labels, comments, checklist, status/order updates.
- Reporting: dashboards, widgets, analytics, report runs, exports.
- AI: status, settings, agents, conversations, project assistant.
- Admin: overview, audit logs, sessions, API keys, security events, compliance jobs.

## 27. Phase 23: Production Deployment

### Objective

Deploy the backend safely to staging and production.

### Deliverables

- Staging environment.
- Production environment.
- Managed Postgres.
- Managed Redis.
- Object storage bucket.
- Secret manager.
- Error monitoring project.
- Metrics/tracing backend.
- Deployment pipeline.
- Migration execution process.
- Rollback process.
- Backup and restore process.

### Launch Gates

- All critical env vars configured.
- Migrations applied in staging.
- Smoke tests pass in staging.
- Security validation passes.
- Load test baseline is acceptable.
- Backups are verified.
- Error monitoring is active.
- Logs and metrics are visible.

### Acceptance Criteria

- Staging deploy is repeatable.
- Production deploy is repeatable.
- Rollback process is documented.
- Database backup restore is tested.

## 28. Phase 24: Post-Launch Operations

### Objective

Operate and improve the backend after launch.

### Deliverables

- Incident response process.
- Monitoring dashboards.
- Alert rules.
- Error budget tracking.
- Slow query review process.
- Cost monitoring.
- Security patch process.
- Dependency upgrade schedule.
- Data retention jobs.
- Customer support diagnostics.

### Acceptance Criteria

- Alerts are actionable.
- Production errors are triaged.
- Slow queries are reviewed regularly.
- Dependency updates are planned and tested.

## 29. Suggested Build Order

1. Foundation, env, CI, Docker, migrations.
2. Auth and identity.
3. Tenant, RBAC, and policy enforcement.
4. Users, workspaces, and teams.
5. Projects.
6. Tasks and issue management.
7. Agile boards and sprints.
8. Notifications and realtime events.
9. Collaboration and chat.
10. Documents.
11. Time tracking and resource planning.
12. Workflow automation and approvals.
13. Billing and entitlements.
14. Integrations and webhooks.
15. Reporting and dashboards.
16. AI assistant.
17. Security, compliance, observability, and launch hardening.

## 30. First Production-Grade Implementation Slice

The next coding slice should implement:

- Auth module with real login, refresh, logout, and current user endpoint.
- Tenant bootstrap during registration.
- User invite and accept invite flow.
- Seeded roles and permissions.
- Tenant context guard.
- Audit log service.
- E2E tests for login, tenant isolation, and permission checks.

This slice creates the security foundation needed before building project and task CRUD.
