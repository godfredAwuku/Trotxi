import { Pool } from 'pg';
import { requireDatabaseUrl } from '../config/dotenv';
import { demoRoutes, demoStops, demoTrips, demoVehicles } from './seed-data';

// Seeds demo Accra routes, stops, vehicles, and upcoming trips into Postgres.
// Idempotent: uses fixed IDs with ON CONFLICT DO NOTHING/UPDATE.
async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: requireDatabaseUrl() });

  for (const v of demoVehicles) {
    await pool.query(
      `INSERT INTO vehicles (id, plate, label, capacity) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET plate = EXCLUDED.plate, label = EXCLUDED.label, capacity = EXCLUDED.capacity`,
      [v.id, v.plate, v.label, v.capacity],
    );
  }

  for (const r of demoRoutes) {
    await pool.query(
      `INSERT INTO routes (id, name, origin, destination, fare_tokens, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, origin = EXCLUDED.origin,
         destination = EXCLUDED.destination, fare_tokens = EXCLUDED.fare_tokens, active = EXCLUDED.active`,
      [r.id, r.name, r.origin, r.destination, r.fareTokens, r.active],
    );
  }

  // Stops use generated UUIDs; replace cleanly per route to stay idempotent.
  for (const r of demoRoutes) {
    await pool.query('DELETE FROM stops WHERE route_id = $1', [r.id]);
  }
  for (const s of demoStops) {
    await pool.query(
      `INSERT INTO stops (route_id, name, lat, lng, seq, geom)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography)`,
      [s.routeId, s.name, s.lat, s.lng, s.seq],
    );
  }

  // Refresh upcoming trips relative to now (Postgres generates trip UUIDs).
  await pool.query(`DELETE FROM trips WHERE status IN ('scheduled', 'active')`);
  for (const t of demoTrips()) {
    await pool.query(
      `INSERT INTO trips (route_id, vehicle_id, scheduled_at, status)
       VALUES ($1, $2, $3, $4)`,
      [t.routeId, t.vehicleId, t.scheduledAt, t.status],
    );
  }

  await pool.end();
  console.log(`Seeded ${demoRoutes.length} routes, ${demoStops.length} stops, ${demoVehicles.length} vehicles, ${demoTrips().length} trips.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
