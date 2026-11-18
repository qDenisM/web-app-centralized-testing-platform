#!/usr/bin/env bash
# Build app images with limited parallelism, then start the full stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f infra/docker-compose.yml -f infra/docker-compose.apps.yml)

echo "==> Starting infrastructure"
"${COMPOSE[@]}" up -d postgres redis rabbitmq minio clickhouse traefik

NODE_SERVICES=(
  analytics
  identity
  catalog
  applicant
  exam
  results
  chances
  notification
)

echo "==> Building node microservices (sequential, shared BuildKit cache)"
for svc in "${NODE_SERVICES[@]}"; do
  echo "---- build $svc ----"
  "${COMPOSE[@]}" build "$svc"
done

echo "==> Building web + ai"
"${COMPOSE[@]}" build web ai

echo "==> Starting all services"
"${COMPOSE[@]}" up -d

echo "==> Done. Web: http://localhost:3000"
"${COMPOSE[@]}" ps
