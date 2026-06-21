# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM deps AS build
COPY . .
RUN npm run prisma:generate
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
RUN addgroup -S taskbricks && adduser -S taskbricks -G taskbricks
COPY --from=build --chown=taskbricks:taskbricks /app/package.json ./package.json
COPY --from=build --chown=taskbricks:taskbricks /app/node_modules ./node_modules
COPY --from=build --chown=taskbricks:taskbricks /app/dist ./dist
COPY --from=build --chown=taskbricks:taskbricks /app/prisma ./prisma
USER taskbricks
EXPOSE 4070
CMD ["node", "dist/main.js"]
