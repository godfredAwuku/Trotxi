-- Mobile-money payments backing subscriptions.

CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference   TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL CHECK (plan IN ('commuter_monthly')),
  amount      INTEGER NOT NULL CHECK (amount > 0),   -- in GHS major units
  currency    TEXT NOT NULL DEFAULT 'GHS',
  phone       TEXT NOT NULL,
  network     TEXT NOT NULL CHECK (network IN ('mtn', 'telecel', 'airteltigo')),
  provider    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'paid', 'failed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
