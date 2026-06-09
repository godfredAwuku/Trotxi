import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySubscriptionRepository } from '../../src/modules/subscriptions/subscription.repository';
import { SubscriptionService } from '../../src/modules/subscriptions/subscription.service';
import { InMemoryBoardingRepository } from '../../src/modules/trips/boarding.repository';
import { BoardingService } from '../../src/modules/trips/boarding.service';
import { InMemoryTripRepository } from '../../src/modules/trips/trip.repository';

describe('BoardingService', () => {
  let subs: SubscriptionService;
  let service: BoardingService;
  const userId = 'rider-1';
  let tripId: string;

  beforeEach(async () => {
    const subRepo = new InMemorySubscriptionRepository();
    subs = new SubscriptionService(subRepo);
    const trips = new InMemoryTripRepository();
    service = new BoardingService(trips, new InMemoryBoardingRepository(), subs);
    tripId = (await trips.listUpcoming())[0]!.id;
  });

  it('spends the fare and records the boarding', async () => {
    await subs.subscribe(userId, 'commuter_monthly');
    const result = await service.board(userId, tripId);
    expect(result.subscription.tokenBalance).toBe(100 - result.trip.fareTokens);
    expect(result.boarding.tripId).toBe(tripId);
    expect(await service.history(userId)).toHaveLength(1);
  });

  it('rejects boarding without a subscription', async () => {
    await expect(service.board(userId, tripId)).rejects.toThrowError(/No active subscription/);
  });

  it('rejects an unknown trip', async () => {
    await subs.subscribe(userId, 'commuter_monthly');
    await expect(service.board(userId, 'nope')).rejects.toThrowError(/Trip not found/);
  });

  it('rejects boarding a second ride while one is active', async () => {
    await subs.subscribe(userId, 'commuter_monthly');
    const trips = await new InMemoryTripRepository().listUpcoming();
    await service.board(userId, tripId);
    const otherTrip = trips.find((t) => t.id !== tripId)!.id;
    await expect(service.board(userId, otherTrip)).rejects.toThrowError(/current ride/i);
  });

  it('allows boarding again after ending the active ride', async () => {
    await subs.subscribe(userId, 'commuter_monthly');
    const trips = await new InMemoryTripRepository().listUpcoming();
    await service.board(userId, tripId);
    await service.completeRide(userId);
    const otherTrip = trips.find((t) => t.id !== tripId)!.id;
    const result = await service.board(userId, otherTrip);
    expect(result.boarding.status).toBe('active');
  });

  it('exposes the active ride and ends it', async () => {
    await subs.subscribe(userId, 'commuter_monthly');
    await service.board(userId, tripId);
    const active = await service.activeRide(userId);
    expect(active?.boarding.tripId).toBe(tripId);
    expect(active?.trip?.id).toBe(tripId);

    await service.completeRide(userId);
    expect(await service.activeRide(userId)).toBeNull();
  });

  it('rejects ending a ride when none is active', async () => {
    await expect(service.completeRide(userId)).rejects.toThrowError(/No active ride/);
  });
});
