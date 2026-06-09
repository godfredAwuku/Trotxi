import { demoTrips } from '../../db/seed-data';
import type { Trip } from '../routes/route.types';

export interface TripRepository {
  listUpcoming(routeId?: string): Promise<Trip[]>;
  findById(id: string): Promise<Trip | null>;
}

export class InMemoryTripRepository implements TripRepository {
  private readonly trips: Trip[];

  constructor(trips: Trip[] = demoTrips()) {
    this.trips = trips.map((t) => ({ ...t }));
  }

  async listUpcoming(routeId?: string): Promise<Trip[]> {
    return this.trips
      .filter((t) => t.status === 'scheduled' || t.status === 'active')
      .filter((t) => (routeId ? t.routeId === routeId : true))
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async findById(id: string): Promise<Trip | null> {
    return this.trips.find((t) => t.id === id) ?? null;
  }
}
