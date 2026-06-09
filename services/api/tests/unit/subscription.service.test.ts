import { beforeEach, describe, expect, it } from 'vitest';
import { SubscriptionService } from '../../src/modules/subscriptions/subscription.service';
import { InMemorySubscriptionRepository } from '../../src/modules/subscriptions/subscription.repository';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  const userId = 'user-1';

  beforeEach(() => {
    service = new SubscriptionService(new InMemorySubscriptionRepository());
  });

  it('grants 100 tokens on subscribe', async () => {
    const sub = await service.subscribe(userId, 'commuter_monthly');
    expect(sub.tokenBalance).toBe(100);
    expect(sub.status).toBe('active');
  });

  it('prevents double subscription', async () => {
    await service.subscribe(userId, 'commuter_monthly');
    await expect(service.subscribe(userId, 'commuter_monthly')).rejects.toThrowError(
      /already has an active subscription/,
    );
  });

  it('redeems a token per trip', async () => {
    await service.subscribe(userId, 'commuter_monthly');
    const sub = await service.redeem(userId, 1);
    expect(sub.tokenBalance).toBe(99);
  });

  it('rejects redeem without a subscription', async () => {
    await expect(service.redeem(userId, 1)).rejects.toThrowError(/No active subscription/);
  });

  it('rejects redeem when balance is insufficient', async () => {
    await service.subscribe(userId, 'commuter_monthly');
    await service.redeem(userId, 100);
    await expect(service.redeem(userId, 1)).rejects.toThrowError(/Insufficient token balance/);
  });

  it('getActive throws when no subscription', async () => {
    await expect(service.getActive(userId)).rejects.toThrowError(/No active subscription/);
  });
});
