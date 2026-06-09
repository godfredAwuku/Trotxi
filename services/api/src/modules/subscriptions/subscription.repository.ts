import { randomUUID } from 'node:crypto';

export type SubscriptionPlan = 'commuter_monthly';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  tokenBalance: number;
  startedAt: Date;
  expiresAt: Date;
}

export interface NewSubscription {
  userId: string;
  plan: SubscriptionPlan;
  tokenBalance: number;
  expiresAt: Date;
}

export interface SubscriptionRepository {
  create(input: NewSubscription): Promise<Subscription>;
  findActiveByUser(userId: string): Promise<Subscription | null>;
  updateTokenBalance(id: string, balance: number): Promise<Subscription>;
}

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly byId = new Map<string, Subscription>();

  async create(input: NewSubscription): Promise<Subscription> {
    const sub: Subscription = {
      id: randomUUID(),
      userId: input.userId,
      plan: input.plan,
      status: 'active',
      tokenBalance: input.tokenBalance,
      startedAt: new Date(),
      expiresAt: input.expiresAt,
    };
    this.byId.set(sub.id, sub);
    return sub;
  }

  async findActiveByUser(userId: string): Promise<Subscription | null> {
    for (const sub of this.byId.values()) {
      if (sub.userId === userId && sub.status === 'active') return sub;
    }
    return null;
  }

  async updateTokenBalance(id: string, balance: number): Promise<Subscription> {
    const sub = this.byId.get(id);
    if (!sub) throw new Error(`Subscription ${id} not found`);
    const updated = { ...sub, tokenBalance: balance };
    this.byId.set(id, updated);
    return updated;
  }
}
