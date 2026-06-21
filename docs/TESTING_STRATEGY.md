# TaskBricks Backend Testing Strategy

## Test Layers

- Unit tests: pure services, policies, DTO validators, retry logic, security helpers.
- Integration tests: controllers with Nest testing module and isolated database.
- End-to-end tests: register, login, workspace, project, task, admin, AI, reporting, billing, integration, and document flows.
- Contract tests: Swagger/OpenAPI path, schema, auth, and DTO compatibility checks for the Next.js frontend.
- Migration tests: Prisma schema validation and migration diff checks before deployment.
- Security tests: production env validation, tenant isolation, auth rejection, session revocation, IP allowlist, and API key secrecy.
- Worker tests: queued job state transitions, idempotency, retry, dead-letter behavior, webhook delivery retry.

## CI Gates

- `npm run lint`
- `npx prisma validate`
- `npm run test:security`
- `npm run test:ci`
- `npm run build`
- `npm audit --audit-level=high --strict-ssl=false`

## Backend-To-Frontend Contract Gate

Frontend work should start in Phase 22 after these artifacts are stable:

- Swagger JSON is generated from the running backend.
- Auth flows are smoke-tested with real tokens.
- Core workspace/project/task/admin endpoints return stable DTO shapes.
- CORS is aligned to the Next.js origin.
- File upload, realtime, and API-key flows have documented client behavior.

The frontend can already begin using completed backend modules for login, tenant setup, workspaces, projects, tasks, reporting, AI, billing, integrations, admin, and observability. Phase 22 is the formal frontend compatibility pass where the Next.js app should switch API clients to `http://localhost:4070/api/v1` locally.

## Required Regression Areas

- Tenant isolation on every list/read/update/delete endpoint.
- Permission checks for read/manage variants.
- Audit records for critical writes.
- No secret/hash exposure from read APIs.
- Session revocation invalidates JWT usage.
- AI provider fallback and usage logging.
- Billing webhook signature validation.
- Integration/webhook secret rotation.
- Reporting exports and compliance jobs do not leak cross-tenant data.
