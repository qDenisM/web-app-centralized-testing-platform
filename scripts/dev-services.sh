#!/usr/bin/env bash
# Run backend microservices locally (expects infra up and per-app .env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVICES=(
  "@abiturent/identity-service"
  "@abiturent/catalog-service"
  "@abiturent/applicant-service"
  "@abiturent/exam-service"
  "@abiturent/results-service"
  "@abiturent/chances-service"
  "@abiturent/notification-service"
)

pids=()

cleanup() {
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup INT TERM EXIT

for svc in "${SERVICES[@]}"; do
  npm run dev -w "$svc" &
  pids+=("$!")
done

echo "Started ${#SERVICES[@]} services (PIDs: ${pids[*]}). Ctrl+C to stop."
wait