#!/bin/sh
set -eu

if [ -f prisma/schema.prisma ]; then
  echo "[entrypoint] prisma migrate deploy ($(pwd))"
  npx prisma migrate deploy
fi

exec "$@"
