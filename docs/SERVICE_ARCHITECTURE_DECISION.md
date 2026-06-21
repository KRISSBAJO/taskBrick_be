# Service Architecture Decision

Status: Accepted for initial production build  
Date: 2026-06-15

## Decision

TaskBricks will start as one deployable NestJS backend service with strong internal module boundaries.

The service will contain an Identity domain and Operations domains, but they will not be deployed as separate services during the first production build.

## Why

- Identity and authorization are needed by almost every backend workflow.
- Splitting identity into a separate service now would add network hops, token introspection complexity, distributed tracing requirements, deployment coordination, and harder local development.
- The current product risk is domain correctness and tenant isolation, not independent scaling of identity traffic.
- NestJS modules give us clean boundaries now while keeping the option to extract services later.

## Internal Boundaries

- Identity: auth, users, sessions, tenant bootstrap, roles, permissions, invitations, password reset, email verification.
- Operations: workspaces, teams, projects, tasks, sprints, documents, time tracking, workflows, reporting, billing, integrations, AI.
- Platform: config, audit, observability, health, queues, storage, notifications.

## Extraction Rule

Extract Identity into a separate service only when at least one of these is true:

- Identity has independent scaling requirements.
- A dedicated team owns identity separately from work management.
- Multiple external products need the same identity platform.
- Compliance boundaries require separate deployment and data ownership.

Until then, keep one service and enforce boundaries in code.
