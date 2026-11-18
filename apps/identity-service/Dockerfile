# syntax=docker/dockerfile:1
# Build from repository root:
#   docker build -f apps/identity-service/Dockerfile --build-arg SERVICE_DIR=identity-service --build-arg WORKSPACE=@abiturent/identity-service --build-arg PORT=3001 .
# Or: npm run docker:up
#
ARG SERVICE_DIR=identity-service
ARG WORKSPACE=@abiturent/identity-service
ARG PORT=3001
FROM node:22-alpine AS builder
ARG SERVICE_DIR
ARG WORKSPACE
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl libc6-compat
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm install && npm run build:packages
WORKDIR /app/apps/${SERVICE_DIR}
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi
WORKDIR /app
RUN npm run build -w ${WORKSPACE} && npm prune --omit=dev
FROM node:22-alpine AS runner
ARG SERVICE_DIR
ARG PORT
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat \
  && addgroup -S abiturent && adduser -S abiturent -G abiturent
ENV NODE_ENV=production
ENV PORT=${PORT}
COPY --from=builder --chown=abiturent:abiturent /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=abiturent:abiturent /app/node_modules ./node_modules
COPY --from=builder --chown=abiturent:abiturent /app/packages ./packages
COPY --from=builder --chown=abiturent:abiturent /app/apps/${SERVICE_DIR} ./apps/${SERVICE_DIR}
COPY infra/docker/node-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER abiturent
WORKDIR /app/apps/${SERVICE_DIR}
EXPOSE ${PORT}
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
