# Trotxi

Subscription commuter-transport platform for Accra, Ghana. Workers pay a monthly
subscription, get 100 tokens, and redeem them for reliable daily commutes.

> Technology is not the product — mobility is the product.

See [CLAUDE.md](CLAUDE.md) for the full architecture and roadmap.

## Repo layout

```
trotxi/
├── services/api/     # Node.js + TypeScript (Fastify) — auth, users, subscriptions, tokens
├── apps/commuter/    # Flutter commuter app (subscribe, tokens, redeem)
├── infra/docker/     # docker-compose: Postgres+PostGIS, Redis, EMQX
├── Makefile          # `make help` lists all tasks
└── .github/workflows/ci.yml
```

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node | **20+** | `nvm use` (see `services/api/.nvmrc`) |
| Docker | any recent | for Postgres / Redis / EMQX |
| Flutter | 3.4+ | only for the mobile app |

## Quick start — backend

```bash
# 1. Install API dependencies
make install

# 2. Run the API (in-memory mode — zero infra needed)
make dev
#    → http://localhost:3000  ·  Swagger UI at /docs

# 3. Run the test suite
make test
```

The API runs with **in-memory repositories** by default, so you can develop and
test without any database. To use Postgres instead:

```bash
make up                              # start Postgres, Redis, EMQX
cp services/api/.env.example services/api/.env
# set DATABASE_URL in services/api/.env to:
#   postgres://trotxi:trotxi@localhost:5432/trotxi
make migrate                         # apply schema
make dev
```

## Quick start — mobile app

See [apps/commuter/README.md](apps/commuter/README.md). In short: install Flutter,
`cd apps/commuter && flutter create . && flutter pub get && flutter run`.

## API endpoints (today)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/healthz` | — | Liveness |
| GET | `/readyz` | — | Readiness (checks DB when configured) |
| POST | `/auth/register` | — | Create account, returns JWT |
| POST | `/auth/login` | — | Sign in, returns JWT |
| GET | `/users/me` | JWT | Current user profile |
| POST | `/subscriptions` | JWT | Subscribe (commuter_monthly, 100 tokens) |
| GET | `/subscriptions/me` | JWT | Active subscription + balance |
| POST | `/subscriptions/redeem` | JWT | Redeem token(s) for a trip |

## Common tasks

Run `make help` for the full list:

```
make up / down / logs / ps   # infra containers
make install                 # API deps
make dev                     # API watch mode
make test / coverage         # API tests
make check                   # typecheck + lint + test
make migrate                 # DB migrations (needs DATABASE_URL)
```
