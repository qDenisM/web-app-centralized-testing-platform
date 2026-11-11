# Абитуриент.бел — monorepo

Платформа для абитуриентов: Next.js (UI + BFF) и Express-микросервисы.

## Структура

- `apps/web` — фронтенд (Next.js)
- `apps/*-service` — бэкенд-сервисы (каркас; логика — со следующих этапов)
- `packages/contracts` — Zod DTO, роли
- `packages/auth` — JWT / JWKS / `requireRole`
- `packages/service-kit` — `createApp`, `/health`, logger, error handler
- `infra/` — Docker Compose (Postgres, Redis, RabbitMQ, MinIO, Traefik, ClickHouse)

## Требования

- Node.js ≥ 20
- Docker + Docker Compose

## Этап 0: поднять инфраструктуру

```bash
npm install
npm run build:packages
npm run typecheck

npm run infra:up
# или: docker compose -f infra/docker-compose.yml up -d
```

Проверка:

| Сервис     | URL / команда                                      |
|------------|----------------------------------------------------|
| Traefik    | http://localhost:8080                              |
| Postgres   | `psql postgresql://abiturent:abiturent@localhost:5432/postgres` |
| Redis      | `redis-cli -h localhost ping`                      |
| RabbitMQ   | http://localhost:15672 (abiturent / abiturent)     |
| MinIO*     | http://localhost:9001 (abiturent / abiturent_secret) |
| ClickHouse | http://localhost:8123/ping                         |

\* образ `pgsty/silo` (S3-совместимый MinIO CE fork): официальные `minio/minio` / `quay.io/minio` с осени 2026 недоступны без логина.

БД Postgres (создаются init-скриптом): `identity`, `catalog`, `applicant`, `exam`, `results`, `chances`, `notification`.

Остановка:

```bash
npm run infra:down
```

## Этап 1: identity-service

```bash
# инфру (Postgres) уже должна быть поднята: npm run infra:up
cd apps/identity-service
cp .env.example .env
npm run keys:generate
npm run migrate        # prisma migrate + generate
npm run seed
npm run dev            # http://localhost:3001
```

Из корня: `npm run dev:identity`.

Демо-пользователи после seed: см. вывод `npm run seed`  
(`applicant@demo.local` / `Applicant1!`, …).

JWKS: `GET http://localhost:3001/.well-known/jwks.json`

## Этап 2: web auth (BFF + cookies)

В одном терминале — identity (см. Этап 1). В другом:

```bash
cd apps/web
cp .env.example .env.local   # IDENTITY_URL=http://localhost:3001
npm run dev                  # http://localhost:3000
```

Из корня: `npm run dev:web`.

| URL | Назначение |
|-----|------------|
| http://localhost:3000/login | вход |
| http://localhost:3000/register | регистрация абитуриента |
| http://localhost:3000/app | кабинет (после логина) |
| `/api/auth/login\|register\|refresh\|logout` | BFF → identity, httpOnly cookies |

Демо-логины — из seed identity (`applicant@demo.local` / `Applicant1!` и др.).

Остальные сервисы в `apps/` пока stubs и в Compose не поднимаются.
