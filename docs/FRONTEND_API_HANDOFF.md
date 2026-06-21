# TaskBricks Frontend API Handoff

Phase 22 is the compatibility gate between the NestJS backend and the Next.js frontend.

## Local Runtime

- Backend API: `http://localhost:4070/api/v1`
- Swagger UI: `http://localhost:4070/api/docs`
- OpenAPI JSON: `C:\Users\kriss\taskBrick\taskbricks-be\docs\api\openapi.json`
- Next.js env: `NEXT_PUBLIC_API_URL=http://localhost:4070/api/v1`
- WebSocket origin: `http://localhost:4070`

## Contract Commands

Run these before frontend integration changes are merged:

```powershell
npm run openapi:export
npm run frontend:contract
npm run test:contract
```

`openapi:export` writes the current API contract to `docs/api/openapi.json`.
`frontend:contract` checks that the frontend-critical workflows still exist, remain versioned, and keep bearer auth metadata where required.

## Auth Strategy

The backend returns this shape from signup, login, and refresh:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "user_id",
    "tenantId": "tenant_id",
    "email": "admin@taskbricks.local",
    "firstName": "Demo",
    "lastName": "Admin",
    "status": "ACTIVE",
    "roles": ["Owner"],
    "permissions": ["read:projects", "manage:tasks"]
  }
}
```

The current frontend stores tokens under:

- `taskbricks.accessToken`
- `taskbricks.refreshToken`
- `taskbricks.user`

Phase 23 should move production web sessions to hardened cookie-backed refresh handling if the app is deployed across trusted first-party domains. For the current local Next.js migration, bearer access tokens are accepted by all protected routes.

## Required Frontend Workflows

| Workflow | Method | Path | Auth |
| --- | --- | --- | --- |
| Health/readiness gate | `GET` | `/api/v1/health/ready` | Public |
| Login status badge | `GET` | `/api/v1/auth/status` | Public |
| Signup | `POST` | `/api/v1/auth/register` | Public |
| Login | `POST` | `/api/v1/auth/login` | Public |
| Refresh session | `POST` | `/api/v1/auth/refresh` | Public |
| Current user bootstrap | `GET` | `/api/v1/auth/me` | Bearer |
| Workspaces | `GET` | `/api/v1/workspaces` | Bearer |
| Teams | `GET` | `/api/v1/teams` | Bearer |
| Projects | `GET` / `POST` | `/api/v1/projects` | Bearer |
| Tasks | `GET` / `POST` | `/api/v1/tasks` | Bearer |
| Kanban board | `GET` | `/api/v1/projects/{projectId}/board` | Bearer |
| Drag status update | `PATCH` | `/api/v1/tasks/{taskId}/status` | Bearer |
| Dashboards | `GET` | `/api/v1/reporting/dashboards` | Bearer |
| Analytics | `GET` | `/api/v1/reporting/analytics/overview` | Bearer |
| AI availability | `GET` | `/api/v1/ai/status` | Public |
| Admin overview | `GET` | `/api/v1/admin/overview` | Bearer |

## Response Conventions

Paginated list endpoints return:

```json
{
  "data": [],
  "page": 1,
  "limit": 25,
  "total": 0,
  "totalPages": 0
}
```

Validation errors use the global exception filter and include the HTTP status, message, timestamp, path, and request id. The frontend API client should surface `message` and keep `requestId` available for support/debugging.

## Demo Data

For local frontend integration, seed a usable workspace:

```powershell
$env:SEED_DEMO_DATA='true'
npm run prisma:seed
```

Then login with:

- Workspace: `demo`
- Email: `admin@taskbricks.local`
- Password: `ChangeMe12345!`

The seed creates a workspace, team, project, default board columns, sprint, task labels, and several tasks across backlog, in-progress, review, and done states.

## Uploads

Task and document upload flows should not send raw files to metadata-only routes. The backend metadata endpoints are already present; Phase 23 should add presigned upload or storage-driver-specific file transfer endpoints before large file UI is enabled in production.

## Realtime

The backend Socket.IO endpoint is configured by:

- `REALTIME_ENABLED=true`
- `SOCKET_CORS_ORIGINS=http://localhost:3000`
- `WEBSOCKET_PATH=/socket.io`

The Next.js client should use `NEXT_PUBLIC_WS_URL=http://localhost:4070` locally and pass the current access token during socket authentication when realtime task, notification, and conversation screens are wired.

## CORS

Local backend CORS allows:

- `http://localhost:3000`
- `http://localhost:3001`

Production must keep explicit HTTPS origins only. Wildcards, localhost, and loopback origins are rejected in production config validation.

## Frontend Migration Order

1. Auth screens: register, login, refresh, logout, current user.
2. Workspace shell: current user, workspaces, teams, API readiness.
3. Projects: list, create, update, members, budgets, risks, milestones.
4. Tasks and board: list, create, assignees, comments, checklist, status/order updates.
5. Reporting: dashboards, widgets, analytics, report runs, exports.
6. AI: settings, agents, conversations, project assistant.
7. Admin: audit logs, sessions, API keys, compliance jobs, security events.
8. Realtime and uploads after the main CRUD workflows are stable.
