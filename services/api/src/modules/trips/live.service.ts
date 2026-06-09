import type { RouteRepository } from '../routes/route.repository';
import type { TripRepository } from './trip.repository';

export interface VehiclePosition {
  tripId: string;
  lat: number;
  lng: number;
  bearing: number; // degrees, 0 = north
  nextStop: string;
  progress: number; // 0..1 along the route
  status: string;
  updatedAt: string; // ISO
}

// How long a vehicle takes to traverse the full route before looping.
const CYCLE_MS = 12 * 60 * 1000;

function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/**
 * Simulated live vehicle positions: a deterministic interpolation of the
 * vehicle along its route's stops, looping every CYCLE_MS. In production this
 * is replaced by real GPS flowing through MQTT → geo-processor → Redis → here.
 */
export class LivePositionService {
  constructor(
    private readonly trips: TripRepository,
    private readonly routes: RouteRepository,
  ) {}

  async positionFor(tripId: string, now: number = Date.now()): Promise<VehiclePosition | null> {
    const trip = await this.trips.findById(tripId);
    if (!trip) return null;
    const stops = await this.routes.listStops(trip.routeId);
    if (stops.length < 2) return null;

    const segments = stops.length - 1;
    const t = (now % CYCLE_MS) / CYCLE_MS; // 0..1
    const pos = t * segments;
    const i = Math.min(Math.floor(pos), segments - 1);
    const frac = pos - i;
    const from = stops[i]!;
    const to = stops[i + 1]!;

    return {
      tripId,
      lat: from.lat + (to.lat - from.lat) * frac,
      lng: from.lng + (to.lng - from.lng) * frac,
      bearing: bearingDeg(from, to),
      nextStop: to.name,
      progress: t,
      status: trip.status,
      updatedAt: new Date(now).toISOString(),
    };
  }
}
