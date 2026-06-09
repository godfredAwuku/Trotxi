import { demoRoutes, demoStops } from '../../db/seed-data';
import type { Route, Stop } from './route.types';

export interface RouteRepository {
  listActive(): Promise<Route[]>;
  findById(id: string): Promise<Route | null>;
  listStops(routeId: string): Promise<Stop[]>;
}

export class InMemoryRouteRepository implements RouteRepository {
  private readonly routes: Route[];
  private readonly stops: Stop[];

  constructor(routes: Route[] = demoRoutes, stops: Stop[] = demoStops) {
    this.routes = routes.map((r) => ({ ...r }));
    this.stops = stops.map((s) => ({ ...s }));
  }

  async listActive(): Promise<Route[]> {
    return this.routes.filter((r) => r.active);
  }

  async findById(id: string): Promise<Route | null> {
    return this.routes.find((r) => r.id === id) ?? null;
  }

  async listStops(routeId: string): Promise<Stop[]> {
    return this.stops.filter((s) => s.routeId === routeId).sort((a, b) => a.seq - b.seq);
  }
}
