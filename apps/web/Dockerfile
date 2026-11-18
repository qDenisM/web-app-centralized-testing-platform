# syntax=docker/dockerfile:1
# Build from repository root: docker build -f apps/web/Dockerfile .
# Or: npm run docker:up

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/identity-service/package.json ./apps/identity-service/package.json
COPY apps/catalog-service/package.json ./apps/catalog-service/package.json
COPY apps/applicant-service/package.json ./apps/applicant-service/package.json
COPY apps/exam-service/package.json ./apps/exam-service/package.json
COPY apps/results-service/package.json ./apps/results-service/package.json
COPY apps/chances-service/package.json ./apps/chances-service/package.json
COPY apps/notification-service/package.json ./apps/notification-service/package.json
COPY apps/analytics-service/package.json ./apps/analytics-service/package.json
RUN npm install --ignore-scripts && npm run build:packages && npm run build -w web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S abiturent && adduser -S abiturent -G abiturent
COPY --from=builder --chown=abiturent:abiturent /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=abiturent:abiturent /app/apps/web/.next/standalone ./
COPY --from=builder --chown=abiturent:abiturent /app/apps/web/.next/static ./apps/web/.next/static
USER abiturent
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
