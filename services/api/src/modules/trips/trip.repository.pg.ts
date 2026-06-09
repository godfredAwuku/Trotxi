import type { Pool } from 'pg';
import type { Trip, TripStatus } from '../routes/route.types';
import type { TripRepository } from './trip.repository';

interface TripRow {
  id: string;
  route_id: string;
  route_name: string;
  origin: string;
  destination: string;
  fare_tokens: number;
  vehicle_id: string | null;
  vehicle_label: string | null;
  scheduled_at: Date;
  status: TripStatus;
}

const SELECT = `
  SELECT t.id, t.route_id, r.name AS route_name, r.origin, r.destination,
         r.fare_tokens, t.vehicle_id, v.label AS vehicle_label,
         t.scheduled_at, t.status
  FROM trips t
  JOIN routes r ON r.id = t.route_id
  LEFT JOIN vehicles v ON v.id = t.vehicle_id`;

const toTrip = (r: TripRow): Trip => ({
  id: r.id,
  routeId: r.route_id,
  routeName: r.route_name,
  origin: r.origin,
  destination: r.destination,
  fareTokens: r.fare_tokens,
  vehicleId: r.vehicle_id,
  vehicleLabel: r.vehicle_label,
  scheduledAt: r.scheduled_at,
  status: r.status,
});

export class PgTripRepository implements TripRepository {
  constructor(private readonly pool: Pool) {}

  async listUpcoming(routeId?: string): Promise<Trip[]> {
    const where = `WHERE t.status IN ('scheduled', 'active')${routeId ? ' AND t.route_id = $1' : ''}`;
    const { rows } = await this.pool.query<TripRow>(
      `${SELECT} ${where} ORDER BY t.scheduled_at`,
      routeId ? [routeId] : [],
    );
    return rows.map(toTrip);
  }

  async findById(id: string): Promise<Trip | null> {
    const { rows } = await this.pool.query<TripRow>(`${SELECT} WHERE t.id = $1`, [id]);
    return rows[0] ? toTrip(rows[0]) : null;
  }
}
