# CLAUDE.md — Trotxi Ride Platform

## What This Is

Trotxi Ride is a subscription commuter-transport platform for Accra, Ghana. Workers pay a monthly subscription, get 100 tokens, and redeem them for reliable daily commutes. The long-term vision: Transportation App → Mobility Platform → Mobility Ecosystem → National Mobility Infrastructure.

The guiding principle: **technology is not the product — mobility is the product.**

## Architecture

Two decoupled paths through the system:

- **Telemetry path** (latency-critical): Driver app → MQTT (EMQX, QoS 1) → Go geo-processor → Redis (live cache + pub/sub) → WebSocket (Go) → commuter app. Target: <100ms end-to-end.
- **Transactional path** (product iteration): Apps → Node.js + TypeScript API (Fastify) → PostgreSQL + PostGIS. Handles auth, users, subscriptions, tokens, payments.

They meet at Redis (dispatch reads live positions) and Kafka (event backbone, post-MVP).

## Finalized Stack

| Layer | Technology | Why |
|---|---|---|
| Mobile apps | Flutter / Dart | Native ARM, no JS bridge, 60fps live map |
| Real-time services | Go | Goroutines, sub-ms latency, minimal memory |
| Business logic API | Node.js + TypeScript (Fastify) | Fast iteration, huge ecosystem, easiest Ghana hire |
| ML / Analytics | Python FastAPI | Owns ML ecosystem, off critical path |
| GPS protocol | MQTT (EMQX) | 2-byte headers, QoS buffering for dead-zones |
| Client push | Raw WebSockets (Go) | Lower overhead than Socket.io |
| Relational DB | PostgreSQL + PostGIS | State, trips, users, tokens, geospatial |
| GPS time-series | TimescaleDB | Postgres extension, fast range queries |
| Cache + Pub/Sub | Redis | Live positions, sessions, ingestion↔delivery bridge |
| Analytics DB | ClickHouse | Columnar, real-time analytical queries (post-MVP) |
| Event backbone | Apache Kafka | Durable event log (post-MVP) |
| Cloud | AWS (multi-AZ) | Most mature tooling |

## Repo Structure

```
trotxi/
├── services/
│   ├── api/          # Node.js + TypeScript — auth, users, subscriptions, tokens
│   │   ├── src/
│   │   │   ├── app.ts              # Fastify app builder (DI entry point)
│   │   │   ├── server.ts           # Entrypoint — wires repos, starts listening
│   │   │   ├── config/env.ts       # Zod-validated environment config
│   │   │   ├── lib/                # errors, password (scrypt), jwt, validate, auth.guard
│   │   │   ├── db/migrations/      # SQL migrations (001_init.sql)
│   │   │   └── modules/
│   │   │       ├── health/         # /healthz, /readyz
│   │   │       ├── auth/           # register, login (AuthService)
│   │   │       ├── users/          # /users/me, UserRepository (memory + pg)
│   │   │       └── subscriptions/  # subscribe, redeem tokens (SubscriptionService)
│   │   └── tests/                  # Unit + integration tests (vitest)
│   └── geo/          # Go — MQTT GPS ingestion service
│       ├── cmd/geo/main.go
│       └── internal/
│           ├── config/             # Env-based MQTT config
│           └── ingest/             # Fix parsing, MQTT consumer, tests
├── infra/docker/     # docker-compose: Postgres+PostGIS, Redis, EMQX
├── .github/workflows/
│   ├── ci.yml        # Path-filtered lint/typecheck/test/build per service
│   └── deploy.yml    # Build images → staging (smoke test) → production (manual approval)
├── Makefile          # `make help` lists all tasks
└── .husky/           # pre-commit (lint-staged) + commit-msg (commitlint)
```

## Current State (what works today)

### API service (services/api)
- **19 tests passing** (unit + integration via fastify.inject)
- ~95% line coverage
- Typecheck clean (strict mode), lint clean (ESLint flat config)
- Builds via tsup → dist/server.js
- Runs with in-memory repositories (zero infra needed)
- Swagger UI at /docs when running
- Endpoints: /healthz, /readyz, POST /auth/register, POST /auth/login, GET /users/me (JWT), POST /subscriptions (JWT), GET /subscriptions/me (JWT), POST /subscriptions/redeem (JWT)
- Token model: 100 tokens per commuter_monthly subscription, redeem per trip, insufficient-balance and no-subscription guards implemented

### Geo service (services/geo)
- ParseFix tests passing (valid, empty, out-of-range)
- MQTT consumer skeleton (EMQX, QoS 1, auto-reconnect)
- Not yet wired to Redis or TimescaleDB

### Infrastructure
- Docker Compose: Postgres+PostGIS (5432), Redis (6379), EMQX (1883/18083) — all healthy
- CI/CD: GitHub Actions with path-filtered jobs, OIDC-based deploy pipeline
- Quality gates: conventional commits, CODEOWNERS, PR template, coverage thresholds

## What to Build Next (priority order)

### 1. Wire API to Postgres
- Set DATABASE_URL in .env, create a pg Pool in server.ts
- Run 001_init.sql migration against the local Postgres
- Swap InMemoryUserRepository → PgUserRepository (already written)
- Write PgSubscriptionRepository (follow the pattern in user.repository.pg.ts)
- Add integration tests that hit real Postgres (use a test database)
- Ensure existing in-memory tests still pass (repo choice based on env)

### 2. Wire Geo → Redis → WebSocket
- In the Go geo service: after ParseFix, write live position to Redis (SET with geo commands)
- Publish to a Redis channel (e.g., trip:{tripId}) on each GPS update
- Build a Go WebSocket server that subscribes to Redis channels and pushes to connected clients
- Test with a mock MQTT publish (mosquitto_pub or a test script)

### 3. Operations Dashboard (services/dashboard)
- Next.js app in services/dashboard
- Auth: login via the API, store JWT
- Pages: live fleet map (consume WebSocket positions), trip list, subscription overview, driver list
- Wire to the API endpoints that exist today
- Add to CI workflow

### 4. Flutter Mobile Apps
- Commuter app: subscribe, live vehicle map, arrival alerts, offline caching
- Driver app: route display, check-ins, background GPS → MQTT publish, incident reporting
- Both need: auth flow, token display, push notifications

### 5. Post-MVP
- Kafka event backbone
- ClickHouse analytics
- Python FastAPI demand forecasting
- Corporate portal (Next.js)
- Full token economy (multi-use across transport, food, errands)

## Coding Conventions

### TypeScript (API)
- **Strict mode**, noUncheckedIndexedAccess, no unused locals/params
- **Layered architecture**: routes → services → repositories. Services are framework-agnostic. Repositories are the storage boundary.
- **Dependency injection**: buildApp(deps) accepts repositories. Tests pass in-memory repos; production passes pg repos.
- **Zod** for request validation (parse helper in lib/validate.ts). Zod also validates env config.
- **AppError** for domain errors (400/401/404/409) — centrally caught by Fastify error handler. Never throw raw strings.
- **Passwords**: Node built-in scrypt (no native deps). Hash format: `scrypt$<saltHex>$<hashHex>`.
- **JWT**: jsonwebtoken. Claims: { sub, email, role }. Auth guard in lib/auth.guard.ts.
- **No .js extensions** in imports (moduleResolution: Bundler; tsx/vitest/tsup all resolve correctly).
- **Tests**: vitest. Unit tests for services, integration tests via fastify.inject(). Coverage gate: 70% lines.
- **Build**: tsup (esbuild-based, ESM output). Dev: tsx watch.

### Go (Geo)
- Standard Go project layout: cmd/ for entrypoints, internal/ for packages
- JSON handler logging (slog)
- MQTT via paho.mqtt.golang
- Tests: standard go test

### Git
- **Conventional Commits**: `feat(api): add subscription endpoint`, `fix(geo): handle empty MQTT payload`
- **Scopes**: api, geo, infra, ci, docs, deps, release
- **Branch protection**: CI must pass, CODEOWNERS review required
- **AI code review rule**: every piece of AI-generated code must be reviewed by a human before merging

### Infrastructure
- Docker Compose for local dev (make up / make down)
- Postgres+PostGIS on 5432, Redis on 6379, EMQX on 1883
- AWS for production (ECS, multi-AZ)
- Monitoring from day one: Sentry for errors, CloudWatch for services, structured logging

## Ghana-Specific Context

- **Payments**: Mobile money first — MTN MoMo, Telecel Cash, AirtelTigo Money. Integrated via Hubtel/Paystack SDKs in Node.
- **Network**: Unreliable in parts of Accra, Kumasi. MQTT QoS buffering + app offline caching + graceful "last seen at HH:MM" degradation. Never show a blank screen on network loss.
- **Data costs**: MQTT's 2-byte headers matter. Keep GPS payloads minimal.
- **Regulatory**: Ghana Data Protection Act 2012 (Act 843), Bank of Ghana payment regs, DVLA driver/vehicle verification. Compliance is architecture, not afterthought.
- **Data ethics**: Trotxi does not sell personal data. Mobility intelligence built on aggregated, de-identified patterns only.

## Team Model

3 engineers + AI agents. AI contributes ~60-70% of code volume (scaffolding, CRUD, integration, tests, docs). The remaining 30-40% is architecture, distributed-systems debugging, security, and production incidents — humans own that.

- **Senior Backend / Architect**: Go real-time services, Node APIs, system design, reviews ALL AI output
- **Mobile Engineer**: Flutter apps, offline logic, GPS integration
- **DevOps / Full-stack**: AWS infra, CI/CD, ops dashboard, monitoring, databases

The architect has veto on scope. The biggest risk with AI-assisted development is that building becomes cheap and scope creeps. Ship the smallest thing that proves people will pay for reliable commuting.
