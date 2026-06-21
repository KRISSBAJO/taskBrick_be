# TaskBricks Backend

NestJS backend for the TaskBricks Enterprise work management platform.

## Stack

- NestJS
- Swagger/OpenAPI
- Prisma
- PostgreSQL
- Redis
- BullMQ-ready background jobs
- WebSocket-ready realtime architecture

## Local Setup

1. Copy `.env.example` to `.env`.
2. Start infrastructure:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma Client:

```bash
npm run prisma:generate
```

5. Start the API:

```bash
npm run dev
```

Swagger will be available at `http://localhost:4070/api/docs`.

The included Docker Compose file maps Postgres to local port `55432` and Redis to local port `6380` to avoid common local service conflicts.
