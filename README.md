# Ориентир (abiturent) — платформа абитуриента РБ

Курсовой / дипломный проект: веб-платформа для абитуриентов централизованного тестирования и поступления в вузы Беларуси.

Monorepo на **npm workspaces**: Next.js 16 (UI + BFF) и Express-микросервисы с Prisma/Postgres, JWT/JWKS, RabbitMQ, MinIO.

## Архитектура (кратко)

```
Браузер → apps/web (Next.js :3000, BFF /api/*)
              ↓ HTTP
     identity :3001  catalog :3002  applicant :3003  exam :3004
     results :3005   chances :3006  notification :3007  analytics :3008
              ↓
  Postgres (БД на сервис) · RabbitMQ topic abiturent.events · MinIO · Redis · ClickHouse
```

- **web** — лендинг, кабинеты ролей, BFF-прокси к сервисам (httpOnly cookies для сессии).
- **identity** — пользователи, сессии, JWT RS256, публичный JWKS.
- **catalog** — предметы, учреждения, специальности, кампания.
- **applicant** — профиль, документы (MinIO), верификация, заявления.
- **exam** — площадки, экзамены, пропуска.
- **results** — публикация баллов.
- **chances** — оценка шансов поступления.
- **notification** — in-app уведомления (подписка на события RabbitMQ).
- **analytics** — заглушка поверх ClickHouse (`/health`, `/analytics/health/clickhouse`).
- **ai-service** — отдельный Python-каркас (порт 3010), не входит в `dev:services`.

Общие пакеты: `@abiturent/contracts` (Zod DTO, роли, события), `@abiturent/auth` (JWT/JWKS), `@abiturent/service-kit` (Express app, health, logger, RabbitMQ helpers).

События exchange `abiturent.events`: `verification.decided`, `application.approved`, `result.published`.

## Стек

| Слой | Технологии |
|------|------------|
| Web | Next.js 16, React 19, Tailwind 4 |
| API | Node ≥ 20, Express, TypeScript, Zod |
| Данные | Prisma, PostgreSQL 16 (отдельная БД на сервис) |
| Auth | JWT RS256, JWKS (`GET /.../.well-known/jwks.json`) |
| Очереди / файлы | RabbitMQ, MinIO (S3 API) |
| Infra | Docker Compose: Traefik, Redis, ClickHouse |

## Структура репозитория

```
apps/web                  — фронт + BFF
apps/*-service            — микросервисы
apps/ai-service           — Python (опционально)
packages/contracts|auth|service-kit
infra/                    — docker-compose, Postgres init, Traefik, …
scripts/dev-services.sh   — параллельный запуск backend
docs/                     — пояснительная, диаграммы
design/                   — макеты кабинетов
```

## Требования

- Node.js ≥ 20
- npm (workspaces)
- Docker + Docker Compose

## Быстрый старт

### Вариант A — всё в Docker (инфра + приложения)

Нужны JWT-ключи identity (один раз на хосте):

```bash
npm install
npm run keys:generate -w @abiturent/identity-service
npm run docker:up
```

| Контейнер | Порт |
|-----------|------|
| web | http://localhost:3000 |
| identity … notification, analytics, ai | 3001–3008, 3010 |
| Postgres / RabbitMQ / MinIO / … | как в таблице ниже |

Миграции Prisma выполняются при старте контейнеров (`prisma migrate deploy`).  
Остановка: `npm run docker:down`. Логи: `npm run docker:logs`.

> Первый `docker:up` долго собирает образы (monorepo build).

### Вариант B — локально (инфра в Docker, Node на хосте)

### 1. Установка и пакеты

```bash
npm install
npm run build:packages
```

### 2. Инфраструктура

```bash
npm run infra:up
```

| Сервис | URL / проверка |
|--------|----------------|
| Traefik dashboard | http://localhost:8080 |
| Postgres | `localhost:5432` · user/pass `abiturent` / `abiturent` |
| Redis | `localhost:6379` |
| RabbitMQ UI | http://localhost:15672 · `abiturent` / `abiturent` |
| MinIO console | http://localhost:9001 · `abiturent` / `abiturent_secret` |
| ClickHouse | http://localhost:8123/ping |

БД Postgres (создаёт `infra/postgres/init-databases.sql`):  
`identity`, `catalog`, `applicant`, `exam`, `results`, `chances`, `notification`.

Остановка: `npm run infra:down`. Логи: `npm run infra:logs`.

> MinIO в compose — образ `pgsty/silo` (S3-совместимый fork): официальные образы MinIO без логина могут быть недоступны.

### 3. Env и миграции (один раз)

Скопировать примеры окружения:

```bash
cp apps/web/.env.example apps/web/.env.local
for d in identity catalog applicant exam results chances notification analytics; do
  cp "apps/${d}-service/.env.example" "apps/${d}-service/.env"
done
```

Ключи JWT для identity:

```bash
npm run keys:generate -w @abiturent/identity-service
```

Миграции Prisma (по сервисам с БД):

```bash
npm run migrate -w @abiturent/identity-service
npm run migrate -w @abiturent/catalog-service
npm run migrate -w @abiturent/applicant-service
npm run migrate -w @abiturent/exam-service
npm run migrate -w @abiturent/results-service
npm run migrate -w @abiturent/chances-service
npm run migrate -w @abiturent/notification-service
```

Seed (демо-данные):

```bash
npm run seed -w @abiturent/identity-service
npm run seed -w @abiturent/catalog-service
npm run seed -w @abiturent/exam-service   # нужен seed catalog
```

Buckets MinIO (документы / пропуска), если сервисы ещё не создали сами:

```bash
npm run storage:init -w @abiturent/applicant-service
npm run storage:init -w @abiturent/exam-service
```

### 4. Backend + web

```bash
npm run dev:services   # 3001–3007 (см. scripts/dev-services.sh)

cd apps/ai-service
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 3010 --reload

# в другом терминале:
npm run dev:web        # http://localhost:3000
```

Либо одной командой инфру + сервисы: `npm run dev:stack` (web всё равно отдельно).

Analytics (не в `dev:services`):

```bash
npm run dev -w @abiturent/analytics-service   # :3008
```

Только identity: `npm run dev:identity`.

## Порты

| Порт | Сервис |
|------|--------|
| 3000 | web (Next.js) |
| 3001 | identity |
| 3002 | catalog |
| 3003 | applicant |
| 3004 | exam |
| 3005 | results |
| 3006 | chances |
| 3007 | notification |
| 3008 | analytics |
| 3010 | ai-service (опц.) |
| 5432 / 5672 / 6379 / 9000 / 8123 / 80·8080 | Postgres / RabbitMQ / Redis / MinIO / ClickHouse / Traefik |

## Демо-аккаунты (после seed identity)

| Роль | Email | Пароль |
|------|-------|--------|
| applicant | `applicant@demo.local` | `Applicant1!` |
| moderator | `moderator@demo.local` | `Moderator1!` |
| examiner | `examiner@demo.local` | `Examiner1!` |
| admin | `admin@demo.local` | `Admin1234!` |

Вход: http://localhost:3000/login · регистрация абитуриента: `/register` · кабинет: `/app`.

JWKS: http://localhost:3001/.well-known/jwks.json

## npm-скрипты (корень)

| Скрипт | Назначение |
|--------|------------|
| `build:packages` | сборка contracts → auth → service-kit |
| `typecheck` | typecheck пакетов + основных сервисов + web |
| `infra:up` / `infra:down` / `infra:logs` | Docker Compose |
| `dev:services` | параллельно identity…notification |
| `dev:stack` | `infra:up` + `dev:services` |
| `dev:identity` | только identity |
| `dev:web` / `build:web` | Next.js |

В workspace сервиса обычно: `dev`, `migrate`, `seed` (где есть), `prisma:generate`, `typecheck`.

## Env (без секретов)

Значения для локалки уже в `apps/*/.env.example`. Общие идеи:

- `DATABASE_URL` — своя БД на сервис в том же Postgres.
- `JWKS_URL` / `JWT_ISSUER` / `JWT_AUDIENCE` — проверка токенов у identity.
- `RABBITMQ_URL` — у applicant, exam, results, notification.
- `MINIO_*` — у applicant и exam.
- web (`.env.local`): `IDENTITY_URL`, `CATALOG_URL`, `APPLICANT_URL`, `EXAM_URL`, `RESULTS_URL`, `CHANCES_URL`, `NOTIFICATION_URL`.

Не коммитьте рабочие `.env` / `.env.local` и приватные ключи identity.

## Заметки

- Микросервисы в Docker по умолчанию **не** поднимаются — только инфровые контейнеры; Node крутится на хосте.
- `ai-service` и полный analytics-пайплайн — задел, не обязательны для основного локального сценария.
- Диаграммы и пояснительная: `docs/`; макеты UI: `design/`.
