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
  source: 'live' | 'simulated';
  updatedAt: string; // ISO
}

export interface ReportedPosition {
  lat: number;
  lng: number;
  bearing: number;
  at: number; // epoch ms
}

// How long a vehicle takes to traverse the full route before looping.
const CYCLE_MS = 12 * 60 * 1000;
// A driver-reported fix is considered "live" for this long before we fall back
// to the simulator (handles the driver app pausing / losing signal).
const LIVE_TTL_MS = 30 * 1000;

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
  private readonly reported = new Map<string, ReportedPosition>();

  constructor(
    private readonly trips: TripRepository,
    private readonly routes: RouteRepository,
  ) {}

  /** Driver app reports the vehicle's real GPS fix for a trip. */
  report(tripId: string, fix: { lat: number; lng: number; bearing?: number }): void {
    this.reported.set(tripId, {
      lat: fix.lat,
      lng: fix.lng,
      bearing: fix.bearing ?? 0,
      at: Date.now(),
    });
  }

  async positionFor(tripId: string, now: number = Date.now()): Promise<VehiclePosition | null> {
    const trip = await this.trips.findById(tripId);
    if (!trip) return null;
    const stops = await this.routes.listStops(trip.routeId);
    if (stops.length < 2) return null;

    // Prefer a fresh driver-reported fix; otherwise simulate.
    const live = this.reported.get(tripId);
    if (live && now - live.at <= LIVE_TTL_MS) {
      return {
        tripId,
        lat: live.lat,
        lng: live.lng,
        bearing: live.bearing,
        nextStop: nearestNextStop(stops, live),
        progress: 0,
        status: trip.status,
        source: 'live',
        updatedAt: new Date(live.at).toISOString(),
      };
    }

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
      source: 'simulated',
      updatedAt: new Date(now).toISOString(),
    };
  }
}

// Closest upcoming stop to a reported fix (simple nearest-by-distance).
function nearestNextStop(
  stops: Array<{ name: string; lat: number; lng: number }>,
  fix: { lat: number; lng: number },
): string {
  let best = stops[0]!;
  let bestD = Infinity;
  for (const s of stops) {
    const d = (s.lat - fix.lat) ** 2 + (s.lng - fix.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best.name;
}
