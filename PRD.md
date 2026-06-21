# TaskBricks Enterprise Backend PRD

Version: 1.0  
Status: Draft  
Target repository: `taskbricks-be`  
Primary backend stack: NestJS, Swagger/OpenAPI, Prisma, PostgreSQL

## 1. Product Summary

TaskBricks Enterprise is a multi-tenant work management and collaboration platform for organizations that need to plan, track, automate, and report on work across teams, projects, and departments.

The backend will power an enterprise SaaS platform covering project management, task management, agile delivery, issue tracking, team collaboration, workflow automation, resource planning, time tracking, documents, AI assistance, reporting, notifications, integrations, and billing.

## 2. Product Goals

- Provide a secure multi-tenant API for organizations, workspaces, teams, users, projects, tasks, sprints, documents, reports, and billing.
- Support enterprise-grade access control through RBAC first, with room for ABAC policies as the platform matures.
- Expose complete, versioned REST APIs with Swagger/OpenAPI documentation.
- Use Prisma and PostgreSQL as the initial data foundation.
- Support real-time collaboration through WebSockets for notifications, chat, task updates, and activity feeds.
- Provide scalable background processing for notifications, workflows, email, integrations, reports, and AI jobs.
- Establish strong auditability for user actions, admin actions, billing changes, and security-sensitive events.

## 3. Target Customers

- Small businesses with 1-50 employees.
- Mid-market companies with 50-1000 employees.
- Enterprise organizations with 1000+ employees.
- Agencies and client-service teams.
- Software development teams.
- HR, marketing, construction, event, church, nonprofit, and operations teams.

## 4. Primary User Roles

- Platform Owner: global system administrator with platform-wide control.
- Organization Owner: owns a tenant and billing relationship.
- Organization Admin: manages users, roles, workspaces, teams, and settings.
- Project Manager: manages project scope, schedule, budget, risk, and reporting.
- Team Lead: manages team workload, sprint execution, and delivery.
- Member: contributes to assigned work.
- Client: external stakeholder with limited project visibility.
- Guest: limited access user for collaboration or review.

## 5. Success Metrics

- 99.99% target platform uptime for production services.
- Monthly active users.
- Daily active users.
- Task completion rate.
- Project success rate.
- User retention.
- Customer satisfaction.
- Revenue per workspace.
- Net revenue retention.
- Churn rate.
- API error rate.
- API p95 latency.
- Background job success rate.

## 6. Backend Architecture Requirements

### 6.1 Framework

The backend will use NestJS with a modular domain architecture.

Required NestJS capabilities:

- Dependency injection.
- Module boundaries by domain.
- Controllers for REST APIs.
- Providers/services for business logic.
- Guards for authentication and authorization.
- Interceptors for logging, response shaping, and request context.
- Pipes for validation and transformation.
- Filters for centralized exception handling.
- Scheduled tasks for recurring jobs.
- Gateways for WebSocket features.

### 6.2 API Documentation

The backend must use Swagger/OpenAPI through `@nestjs/swagger`.

Requirements:

- Swagger UI available at `/api/docs` in non-production environments by default.
- OpenAPI JSON available at `/api/docs-json`.
- All public endpoints documented with summaries, request DTOs, response DTOs, auth requirements, and error cases.
- APIs grouped by tags that match domain modules.
- API versioning enabled, starting with `/api/v1`.

### 6.3 Database

The backend will use PostgreSQL with Prisma.

Requirements:

- Prisma schema stored in `prisma/schema.prisma`.
- Prisma Client generated during install/build workflows.
- Migrations managed through Prisma Migrate.
- Database access routed through domain services and repositories where useful.
- No controller should directly contain complex Prisma query logic.
- Soft-delete should be evaluated for user-facing entities before launch.
- Tenant isolation must be enforced in queries for tenant-owned resources.

### 6.4 Recommended Advanced Packages

Initial backend package set should include:

- `@nestjs/config` for environment configuration.
- `@nestjs/swagger` for OpenAPI documentation.
- `@nestjs/passport`, `passport`, `passport-jwt` for authentication.
- `@nestjs/jwt` for JWT issuance and validation.
- `class-validator` and `class-transformer` for DTO validation.
- `@nestjs/throttler` for rate limiting.
- `@nestjs/cache-manager` and Redis cache adapter for caching.
- `@nestjs/bullmq` and BullMQ for background jobs.
- `@nestjs/websockets` and Socket.IO for realtime collaboration.
- `@nestjs/schedule` for scheduled jobs.
- `@nestjs/terminus` for health checks.
- `helmet`, `cors`, and `compression` for HTTP hardening.
- `pino` or `winston` for structured logs.
- OpenTelemetry for tracing.
- Sentry or equivalent error monitoring.
- Stripe SDK for billing.
- Cloud storage SDK for attachments.
- OpenAI and Anthropic SDKs for AI assistant features.

## 7. Domain Modules

The backend should be organized into these NestJS modules.

### 7.1 Core Platform

- Auth Module
- Tenants Module
- Organizations Module
- Workspaces Module
- Users Module
- Teams Module
- Roles and Permissions Module
- Audit Module
- Settings Module

### 7.2 Work Management

- Projects Module
- Project Members Module
- Tasks Module
- Task Comments Module
- Task Attachments Module
- Task Labels Module
- Task Dependencies Module
- Task Checklists Module
- Milestones Module
- Project Risks Module
- Project Budgets Module

### 7.3 Agile Delivery

- Backlog Module
- Sprint Module
- Kanban Board Module
- Retrospective Module
- Velocity and Burndown Module

### 7.4 Resource and Time

- Skills Module
- Resource Allocation Module
- Time Entries Module
- Timesheets Module
- Approvals Module

### 7.5 Collaboration

- Conversations Module
- Messages Module
- Reactions Module
- Notifications Module
- Activity Feed Module
- Documents Module
- Document Folders Module
- Document Versions Module

### 7.6 Automation and Integrations

- Workflow Module
- Workflow Runs Module
- Integration Module
- Webhooks Module
- Email Module
- External Calendar Module
- Git Provider Module

### 7.7 Commercial Platform

- Plans Module
- Features Module
- Subscriptions Module
- Invoices Module
- Billing Webhooks Module

### 7.8 Intelligence and Reporting

- AI Agents Module
- AI Conversations Module
- Dashboards Module
- Dashboard Widgets Module
- Reports Module
- Metrics Module

## 8. Functional Requirements

### 8.1 Authentication

- Users can register or be invited into a tenant.
- Users can log in with email and password.
- Users can refresh access tokens.
- Users can request password reset.
- Users can verify email addresses.
- Users can be suspended, deactivated, or reactivated by authorized admins.
- Future support must include SSO, OAuth, SAML, and 2FA.

### 8.2 Tenant and Workspace Management

- Organization owners can create and manage tenant settings.
- Admins can create workspaces under a tenant.
- Workspaces can contain teams and projects.
- Slugs must be unique within their intended scope.
- Tenant status must support trial, active, suspended, and cancelled states.

### 8.3 User, Team, and Role Management

- Admins can invite users.
- Admins can assign users to roles.
- Admins can create teams and add team members.
- Team leads can manage team-level membership when permitted.
- Permissions must be checked before protected operations.
- Permission checks must include tenant context.

### 8.4 Project Management

- Users can create projects inside workspaces.
- Projects support planning, active, on-hold, completed, and archived states.
- Projects support visibility levels: private, team, workspace, organization, and public.
- Projects track start date, due date, completion date, progress, team, risks, budgets, documents, members, milestones, and tasks.
- Project keys must be unique per tenant.

### 8.5 Task Management

- Users can create, update, assign, watch, comment on, and complete tasks.
- Supported task types include task, bug, story, epic, feature, incident, change request, and milestone.
- Supported task statuses include backlog, todo, in progress, review, testing, done, and cancelled.
- Supported priorities include low, medium, high, urgent, and critical.
- Tasks support subtasks, dependencies, labels, attachments, checklists, comments, time entries, custom field values, and activity history.
- Tasks must have unique keys within a project.

### 8.6 Agile and Kanban

- Projects can have sprints.
- Sprints can have goals, start dates, end dates, completion dates, and tasks.
- Kanban columns should be configurable in a future board model.
- The platform should support backlog, sprint planning, sprint boards, burndown charts, velocity reports, capacity planning, story points, retrospectives, and sprint goals.

### 8.7 Time Tracking and Resource Planning

- Users can create time entries against tasks.
- Time entries can be billable or non-billable.
- Resource allocation tracks user allocation percentage to projects over time.
- Skills and user skill levels support capacity planning and staffing.
- Future timesheet approvals and payroll exports should build on these models.

### 8.8 Documents and Knowledge Base

- Users can create document folders.
- Users can create project or tenant documents.
- Documents support visibility controls.
- Document versions preserve historical body content.
- Future support should include approval workflows, comments, and rich-text storage.

### 8.9 Collaboration

- Users can participate in conversations.
- Conversations support direct and group chat.
- Messages support attachments and reactions.
- Notifications support in-app, email, SMS, push, webhook, Slack, and Teams channels.
- Realtime events should be sent for messages, mentions, task changes, and assignment changes.

### 8.10 Workflow Automation

- Admins can define workflows by entity type.
- Workflows contain nodes with type, configuration, and canvas position.
- Workflow runs track status and context.
- Triggers should include task created, task updated, due date reached, and status changed.
- Actions should include assign user, notify team, create task, update status, call API, send email, and send SMS.
- Conditions should include field value, role, team, priority, and project.

### 8.11 Approvals

- Users can create approvals against entities.
- Approval steps track approver, status, comments, and decision date.
- Approval status supports pending, approved, rejected, and cancelled.
- Approval events must be audited.

### 8.12 Billing and Subscriptions

- Platform owners can manage plans and features.
- Tenants can subscribe to plans.
- Subscriptions support trialing, active, past due, cancelled, and expired states.
- Invoices track amount, currency, status, due date, and paid date.
- Stripe integration should be the first billing provider.

### 8.13 Integrations

- Tenants can configure third-party integrations.
- Initial integration providers include GitHub, GitLab, Bitbucket, Slack, Teams, Google, Microsoft, Zoom, Stripe, PayPal, OpenAI, Anthropic, Zapier, and custom providers.
- Integrations must store secrets securely and avoid exposing secrets through API responses.
- Webhooks support event lists, enablement status, and shared secrets.

### 8.14 AI Assistant

- Tenants can configure AI agents.
- AI agents can have system prompts and enabled status.
- AI conversations store user-specific AI interactions.
- AI messages store role, content, and metadata.
- AI features should include project summaries, sprint planning, task creation, status summaries, meeting notes, risk detection, capacity prediction, deadline prediction, report generation, and knowledge search.
- AI usage must be auditable and configurable per tenant.

### 8.15 Reporting and Dashboards

- Users can create dashboards.
- Dashboards contain widgets with type, title, config, and position.
- Reports support type, query configuration, and schedule.
- Reporting must support project health, team performance, task completion, cycle time, lead time, velocity, utilization, budget tracking, SLA compliance, and custom reports.

### 8.16 Audit and System Events

- The platform must record audit logs for login, create, update, delete, export, share, billing, approval, and permission-sensitive actions.
- Audit entries include tenant, actor, action, entity type, entity id, old value, new value, IP address, user agent, and timestamp.
- System events support asynchronous platform processing and should be consumed by workers.

## 9. Non-Functional Requirements

### 9.1 Security

- All protected routes require authentication.
- Tenant-owned resources require tenant-scoped authorization.
- Passwords must be hashed with a strong algorithm such as Argon2 or bcrypt.
- JWT secrets and integration secrets must come from environment variables or a secret manager.
- API responses must never expose password hashes, tokens, or provider secrets.
- Rate limiting must protect auth endpoints and write-heavy APIs.
- CORS must be restricted by environment.
- Security headers must be enabled through Helmet.
- Audit logs must be immutable from normal application APIs.

### 9.2 Performance

- Common list endpoints must support pagination, search, sorting, and filtering.
- Large exports and reports must run as background jobs.
- Frequently accessed metadata should be cached.
- API p95 response time target should be below 300 ms for standard CRUD endpoints under normal load.
- Database indexes should be reviewed before launch based on actual query patterns.

### 9.3 Reliability

- Health checks must cover API process, database, Redis, and external dependencies where applicable.
- Background jobs must support retries and dead-letter handling.
- Webhook delivery must support retries, signing, and delivery history.
- Critical state transitions must be transactional.

### 9.4 Observability

- Structured logs must include request id, tenant id when available, user id when available, method, path, status, and latency.
- Metrics should include request count, latency, error count, job queue depth, job success rate, and database latency.
- Distributed tracing should be enabled for API requests, database calls, queues, and external API calls.
- Errors should be reported to an error monitoring platform.

### 9.5 Compliance and Governance

- The platform should be designed for future SOC 2 readiness.
- Sensitive actions must be auditable.
- Data export and deletion workflows should be planned for privacy requirements.
- Role and permission changes must be tracked.
- Billing and subscription changes must be tracked.

## 10. API Standards

- Base path: `/api/v1`.
- Swagger path: `/api/docs`.
- Use JSON request and response bodies.
- Use DTO classes for all request payloads.
- Use response DTOs or serializers for all outward-facing responses.
- Use consistent pagination fields: `page`, `limit`, `total`, `totalPages`.
- Use consistent error response shape with `statusCode`, `message`, `error`, `requestId`, and optional validation details.
- Use ISO 8601 timestamps.
- Use cuid or uuid identifiers consistently according to the Prisma schema.
- Use optimistic or transactional handling for important state changes.

## 11. Data Model Alignment

The initial Prisma schema should cover:

- Tenants, workspaces, teams, and team members.
- Users, roles, permissions, user roles, and role permissions.
- Projects, members, milestones, risks, and budgets.
- Tasks, assignees, watchers, comments, attachments, checklists, labels, dependencies, activities, custom fields, and time entries.
- Sprints and agile delivery data.
- Skills and resource allocations.
- Workflows, workflow nodes, workflow runs, approvals, and approval steps.
- Documents, folders, and versions.
- Conversations, members, messages, and reactions.
- Notifications and notification preferences.
- Plans, features, subscriptions, and invoices.
- Integrations and webhooks.
- AI agents, AI conversations, and AI messages.
- Dashboards, widgets, and reports.
- Audit logs and system events.

Before implementation, the Prisma schema should be validated for:

- Missing foreign key relations where tenant/user/project ids are currently scalar-only.
- Required indexes for high-volume query paths.
- Multi-tenant uniqueness constraints.
- Cascade behavior on destructive operations.
- Decimal precision for billing and budgets.
- Future soft-delete requirements.

## 12. MVP Scope

The first backend milestone should include:

- NestJS project setup.
- Configuration module.
- Prisma module.
- Swagger setup.
- Health checks.
- Auth with email/password and JWT.
- Tenant creation.
- User invitation basics.
- Workspace CRUD.
- Team CRUD.
- Project CRUD.
- Task CRUD.
- Task assignees, comments, labels, and attachments metadata.
- Role and permission seed data.
- Audit log service.
- In-app notification foundation.
- Basic dashboard/report placeholders.

## 13. Post-MVP Scope

- SSO, OAuth, SAML, and 2FA.
- Advanced ABAC policy engine.
- Full workflow builder and runner.
- Full Kanban board model.
- Timesheet approvals.
- Billing provider webhooks.
- Realtime chat and task activity streaming.
- AI assistant workflows.
- Document rich text and collaborative editing.
- Advanced reports and scheduled exports.
- Mobile-specific offline sync APIs.

## 14. Implementation Milestones

### Milestone 1: Foundation

- Initialize NestJS backend.
- Add Prisma/PostgreSQL.
- Add Swagger.
- Add configuration validation.
- Add health checks.
- Add logging and request ids.
- Add Docker Compose for Postgres and Redis.

### Milestone 2: Identity and Tenancy

- Auth module.
- User module.
- Tenant module.
- Roles and permissions.
- Invitation flow.
- Tenant-scoped guards.

### Milestone 3: Work Management Core

- Workspace, team, project, and task APIs.
- Comments, labels, checklists, attachments metadata, and watchers.
- Audit events for core writes.
- Pagination, filtering, and sorting.

### Milestone 4: Agile and Collaboration

- Sprint APIs.
- Board support.
- Notifications.
- WebSocket gateway.
- Conversations and messages.

### Milestone 5: Automation, Billing, and Reporting

- Workflow definitions and runs.
- Approvals.
- Billing plans, subscriptions, and invoices.
- Dashboards and reports.
- Integration framework.

### Milestone 6: AI and Enterprise Readiness

- AI agents and conversations.
- AI summaries and generated reports.
- SSO and 2FA.
- Advanced observability.
- Compliance exports and retention controls.

## 15. Risks and Mitigations

- Risk: Multi-tenant data leakage. Mitigation: tenant-scoped guards, service-level tenant filters, tests for cross-tenant access, and code review rules.
- Risk: Feature scope is very large. Mitigation: enforce MVP boundaries and phased milestones.
- Risk: Reporting queries become slow. Mitigation: background jobs, materialized views where needed, and query-specific indexes.
- Risk: Workflow automation becomes hard to debug. Mitigation: workflow run logs, retry visibility, and audit trails.
- Risk: AI features expose sensitive data. Mitigation: tenant-level AI controls, prompt/data minimization, audit logs, and provider configuration.
- Risk: Billing state drift. Mitigation: webhook idempotency, billing event logs, and periodic reconciliation.

## 16. Open Questions

- Should the product name be TaskBricks everywhere, or should TaskFlow remain as a customer-facing name?
- Which auth methods are required for MVP: password only, Google/Microsoft OAuth, or SSO?
- Should attachments use Cloudinary, S3-compatible storage, or both?
- Should realtime use Socket.IO or native WebSocket transport?
- Which billing provider launches first: Stripe only, or Stripe plus PayPal?
- Which AI provider launches first: OpenAI, Anthropic, or provider-agnostic routing?
- Which frontend API paths must remain backward compatible with the existing Vite app?
