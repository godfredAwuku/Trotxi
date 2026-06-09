-- Trotxi mobility domain: vehicles, routes, stops, trips, boardings.

CREATE TABLE IF NOT EXISTS vehicles (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate     TEXT NOT NULL UNIQUE,
  label     TEXT NOT NULL,
  capacity  INTEGER NOT NULL CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS routes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  origin       TEXT NOT NULL,
  destination  TEXT NOT NULL,
  fare_tokens  INTEGER NOT NULL DEFAULT 1 CHECK (fare_tokens > 0),
  active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS stops (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id  UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL,
  seq       INTEGER NOT NULL,
  geom      GEOGRAPHY(POINT, 4326),
  UNIQUE (route_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_stops_route ON stops (route_id);

CREATE TABLE IF NOT EXISTS trips (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id      UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  vehicle_id    UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_trips_route ON trips (route_id);
CREATE INDEX IF NOT EXISTS idx_trips_scheduled ON trips (scheduled_at);

CREATE TABLE IF NOT EXISTS boardings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  tokens_spent INTEGER NOT NULL CHECK (tokens_spent > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boardings_user ON boardings (user_id);
-- A commuter boards a given trip at most once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_boarding_user_trip ON boardings (user_id, trip_id);
