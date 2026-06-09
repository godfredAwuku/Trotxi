import { AppError } from '../../lib/errors';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionRepository,
} from './subscription.repository';

const TOKENS_PER_PLAN: Record<SubscriptionPlan, number> = {
  commuter_monthly: 100,
};

const PLAN_DURATION_DAYS = 30;

export class SubscriptionService {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async subscribe(userId: string, plan: SubscriptionPlan): Promise<Subscription> {
    const existing = await this.subscriptions.findActiveByUser(userId);
    if (existing) {
      throw AppError.conflict('User already has an active subscription', 'ALREADY_SUBSCRIBED');
    }
    const expiresAt = new Date(Date.now() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000);
    return this.subscriptions.create({
      userId,
      plan,
      tokenBalance: TOKENS_PER_PLAN[plan],
      expiresAt,
    });
  }

  async getActive(userId: string): Promise<Subscription> {
    const sub = await this.subscriptions.findActiveByUser(userId);
    if (!sub) {
      throw AppError.notFound('No active subscription', 'NO_SUBSCRIPTION');
    }
    return sub;
  }

  // Redeem one token per trip. Guards against missing subscription and zero balance.
  async redeem(userId: string, tokens = 1): Promise<Subscription> {
    if (tokens < 1) {
      throw AppError.badRequest('Must redeem at least one token');
    }
    const sub = await this.subscriptions.findActiveByUser(userId);
    if (!sub) {
      throw AppError.notFound('No active subscription', 'NO_SUBSCRIPTION');
    }
    if (sub.tokenBalance < tokens) {
      throw AppError.badRequest('Insufficient token balance', 'INSUFFICIENT_TOKENS');
    }
    return this.subscriptions.updateTokenBalance(sub.id, sub.tokenBalance - tokens);
  }
}
