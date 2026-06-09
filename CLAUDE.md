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

Legend: ✅ exists today · 🔭 planned (not built yet).

```
trotxi/
├── services/
│   └── api/          # ✅ Node.js + TypeScript — auth, users, subscriptions, mobility
│       ├── src/
│       │   ├── app.ts              # Fastify app builder (DI entry point)
│       │   ├── server.ts           # Entrypoint — picks repos by env, starts listening
│       │   ├── config/
│       │   │   ├── env.ts          # Zod-validated app environment config
│       │   │   └── dotenv.ts       # .env loader + requireDatabaseUrl (for DB scripts)
│       │   ├── lib/                # errors, password (scrypt), jwt, validate, auth.guard
│       │   ├── db/
│       │   │   ├── migrations/     # 001_init.sql (users, subscriptions),
│       │   │   │                   # 002_mobility.sql (vehicles, routes, stops, trips, boardings)
│       │   │   ├── migrate.ts      # idempotent migration runner (_migrations table)
│       │   │   ├── seed.ts         # seeds demo Accra routes/trips/vehicles into Postgres
│       │   │   └── seed-data.ts    # shared demo data (in-memory repos + SQL seed)
│       │   └── modules/
│       │       ├── health/         # /healthz, /readyz (readyz checks DB when wired)
│       │       ├── auth/           # register, login (AuthService)
│       │       ├── users/          # /users/me, UserRepository (memory + pg)
│       │       ├── subscriptions/  # subscribe, redeem tokens (memory + pg)
│       │       ├── routes/         # /routes, /routes/:id + stops (memory + pg)
│       │       └── trips/          # /trips, /trips/:id, board, boardings (BoardingService)
│       └── tests/                  # Unit + integration tests (vitest), fastify.inject()
├── apps/
│   └── commuter/     # ✅ Flutter app — auth, subscribe, token balance, browse + board trips
│       └── lib/src/  # config (platform-aware API URL), api_client, models, theme, screens
├── infra/docker/     # ✅ docker-compose: Postgres+PostGIS (5432), Redis (6379), EMQX (1883/18083)
├── .github/workflows/
│   └── ci.yml        # ✅ Node 22 — typecheck, lint, test:coverage, build for services/api
├── Makefile          # ✅ `make help` lists all tasks (up/down, dev, test, migrate, seed…)
├── README.md         # ✅ quick start (in-memory + Postgres), endpoint table
│
│   # 🔭 Planned, not yet created:
├── services/geo/     # 🔭 Go — MQTT GPS ingestion → Redis → WebSocket
├── services/dashboard/  # 🔭 Next.js ops dashboard
└── apps/driver/      # 🔭 Flutter driver app (background GPS → MQTT)
```

## Current State (what works today)

### API service (services/api)
- **34 tests passing** (unit + integration via fastify.inject)
- Typecheck clean (strict mode), lint clean (ESLint flat config), coverage gate 70% lines
- Builds via tsup → dist/server.js
- Runs with **in-memory repositories by default** (zero infra) OR **Postgres** when `DATABASE_URL` is set — repo choice happens in server.ts
- Swagger UI at /docs; `GET /` returns service info
- **Auth/account**: POST /auth/register, POST /auth/login, GET /users/me (JWT)
- **Subscriptions/tokens**: POST /subscriptions, GET /subscriptions/me, POST /subscriptions/redeem (JWT). 100 tokens per commuter_monthly plan; insufficient-balance and no-subscription guards
- **Mobility**: GET /routes, GET /routes/:id (with ordered stops), GET /trips (`?routeId`), GET /trips/:id, POST /trips/:id/board (JWT — spends the route fare in tokens, records a boarding), GET /boardings/me (JWT). Guards: unknown/non-boardable trip, double-boarding, plus the subscription guards
- **Postgres path verified end-to-end**: `make up` → `make migrate` → `make seed` → register → subscribe → board (token decrement persists). Demo data = 3 Accra routes, 11 stops, 2 vehicles, 4 trips
- CORS enabled (Flutter web), graceful shutdown, `.env` auto-loaded in dev

### Commuter app (apps/commuter)
- Flutter app, branded UI (theme.dart), `flutter analyze` clean + widget test passing
- Flows wired to the live API: register/sign in → subscribe → token balance → **browse upcoming trips → board** (balance refreshes on return)
- Platform-aware API base URL (localhost for macOS/iOS/web/desktop, 10.0.2.2 for Android emulator; override via `--dart-define=API_BASE_URL=...`)
- macOS network-client entitlement set; runs on macOS desktop and Chrome web

### Infrastructure
- Docker Compose: Postgres+PostGIS (5432), Redis (6379), EMQX (1883/18083). Postgres exercised by the API; Redis + EMQX are running but **not yet consumed** (await the geo/telemetry path)
- CI: single GitHub Actions job (Node 22) — typecheck, lint, test:coverage, build for services/api
- `.claude/settings.json` holds a dev-command permission allowlist
- Note: conventional-commits/CODEOWNERS/PR-template/husky and the staged deploy pipeline are conventions we follow but are **not yet configured** in the repo

## What to Build Next (priority order)

> ✅ **Done already:** API wired to Postgres (Pg repos for users/subscriptions/routes/trips/boardings, migration runner, seed); mobility domain (routes/stops/vehicles/trips/boardings) with token-spending boarding flow; commuter app browse + board.

### 1. Mobile-money payments (highest value — this is the revenue mechanism)
- Integrate MTN MoMo first, via Paystack or Hubtel (Node SDK)
- Subscription = a real recurring MoMo charge; verify webhook + reconcile to the subscriptions table
- Handle pending/failed/retry states; never grant tokens before payment confirms
- Phone-number-first onboarding (Ghana is phone-first, not email-first as built today) — add SMS OTP

### 2. Driver app + telemetry path (services/geo — does not exist yet)
- Flutter driver app: auth, today's route, check-ins, **background GPS → MQTT publish (EMQX, QoS 1)**
- Go geo-processor: consume MQTT → parse fix → write live position to Redis (GEO commands) → publish to a Redis channel (e.g. trip:{tripId})
- Go WebSocket server: subscribe to Redis channels → push to connected commuter apps
- Commuter app: live vehicle map consuming the WebSocket; arrival alerts
- Test with a mock MQTT publisher (mosquitto_pub or a script)

### 3. Operations Dashboard (services/dashboard)
- Next.js app: login via the API, live fleet map (WebSocket positions), trip list, subscription/driver overview
- Add to CI

### 4. Production hardening
- Auth: refresh tokens, password reset, rate limiting, RBAC enforced per role
- Observability: Sentry, structured logs, metrics/traces, alerting
- Infra: AWS (RDS, ElastiCache, ECS/EKS), staged CI/CD with manual prod approval, secrets management, TLS
- Compliance: Ghana Data Protection Act (Act 843), BoG payment regs, DVLA driver/vehicle KYC

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
