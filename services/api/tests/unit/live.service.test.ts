import { describe, expect, it } from 'vitest';
import { InMemoryRouteRepository } from '../../src/modules/routes/route.repository';
import { LivePositionService } from '../../src/modules/trips/live.service';
import { InMemoryTripRepository } from '../../src/modules/trips/trip.repository';

describe('LivePositionService', () => {
  const trips = new InMemoryTripRepository();
  const routes = new InMemoryRouteRepository();
  const service = new LivePositionService(trips, routes);

  it('returns a position within the route bounds', async () => {
    const tripId = (await trips.listUpcoming())[0]!.id;
    const pos = await service.positionFor(tripId, 0);
    expect(pos).not.toBeNull();
    expect(pos!.lat).toBeGreaterThan(5);
    expect(pos!.lat).toBeLessThan(6);
    expect(pos!.lng).toBeLessThan(0);
    expect(pos!.nextStop).toBeTypeOf('string');
    expect(pos!.progress).toBeGreaterThanOrEqual(0);
    expect(pos!.progress).toBeLessThan(1);
  });

  it('advances along the route as time passes', async () => {
    const tripId = (await trips.listUpcoming())[0]!.id;
    const start = await service.positionFor(tripId, 0);
    const later = await service.positionFor(tripId, 5 * 60 * 1000);
    expect(later!.progress).toBeGreaterThan(start!.progress);
  });

  it('returns null for an unknown trip', async () => {
    expect(await service.positionFor('nope')).toBeNull();
  });

  it('prefers a fresh driver-reported fix over the simulation', async () => {
    const tripId = (await trips.listUpcoming())[0]!.id;
    service.report(tripId, { lat: 5.6, lng: -0.2, bearing: 90 });
    const pos = await service.positionFor(tripId);
    expect(pos!.source).toBe('live');
    expect(pos!.lat).toBeCloseTo(5.6);
    expect(pos!.lng).toBeCloseTo(-0.2);
  });
});
