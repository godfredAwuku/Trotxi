import type { Pool } from 'pg';
import type { RouteRepository } from './route.repository';
import type { Route, Stop } from './route.types';

interface RouteRow {
  id: string;
  name: string;
  origin: string;
  destination: string;
  fare_tokens: number;
  active: boolean;
}

interface StopRow {
  id: string;
  route_id: string;
  name: string;
  lat: number;
  lng: number;
  seq: number;
}

const toRoute = (r: RouteRow): Route => ({
  id: r.id,
  name: r.name,
  origin: r.origin,
  destination: r.destination,
  fareTokens: r.fare_tokens,
  active: r.active,
});

const toStop = (s: StopRow): Stop => ({
  id: s.id,
  routeId: s.route_id,
  name: s.name,
  lat: s.lat,
  lng: s.lng,
  seq: s.seq,
});

export class PgRouteRepository implements RouteRepository {
  constructor(private readonly pool: Pool) {}

  async listActive(): Promise<Route[]> {
    const { rows } = await this.pool.query<RouteRow>(
      `SELECT id, name, origin, destination, fare_tokens, active
       FROM routes WHERE active = true ORDER BY name`,
    );
    return rows.map(toRoute);
  }

  async findById(id: string): Promise<Route | null> {
    const { rows } = await this.pool.query<RouteRow>(
      `SELECT id, name, origin, destination, fare_tokens, active FROM routes WHERE id = $1`,
      [id],
    );
    return rows[0] ? toRoute(rows[0]) : null;
  }

  async listStops(routeId: string): Promise<Stop[]> {
    const { rows } = await this.pool.query<StopRow>(
      `SELECT id, route_id, name, lat, lng, seq FROM stops WHERE route_id = $1 ORDER BY seq`,
      [routeId],
    );
    return rows.map(toStop);
  }
}
