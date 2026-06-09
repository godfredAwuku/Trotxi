-- Trotxi initial schema
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'commuter'
                  CHECK (role IN ('commuter', 'driver', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL CHECK (plan IN ('commuter_monthly')),
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'expired', 'cancelled')),
  token_balance INTEGER NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

-- One active subscription per user.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_subscription_per_user
  ON subscriptions (user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);
