-- Per-user QR pass code + single active boarding per rider.

-- 1. Unique pass code on every user (encoded into their QR).
ALTER TABLE users ADD COLUMN IF NOT EXISTS pass_code TEXT;
UPDATE users SET pass_code = uuid_generate_v4()::text WHERE pass_code IS NULL;
ALTER TABLE users ALTER COLUMN pass_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_pass_code ON users (pass_code);

-- 2. Boardings gain a lifecycle status.
ALTER TABLE boardings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'completed'));

-- Close any pre-existing boardings so the active-uniqueness can be enforced.
UPDATE boardings SET status = 'completed' WHERE status = 'active';

-- A rider may hold at most one active boarding at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_boarding_per_user
  ON boardings (user_id) WHERE status = 'active';
