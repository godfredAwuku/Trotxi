import type { SubscriptionPlan } from '../subscriptions/subscription.repository';

export type MomoNetwork = 'mtn' | 'telecel' | 'airteltigo';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Payment {
  id: string;
  userId: string;
  reference: string;
  plan: SubscriptionPlan;
  amount: number; // GHS major units
  currency: string;
  phone: string;
  network: MomoNetwork;
  provider: string;
  status: PaymentStatus;
  createdAt: Date;
  paidAt: Date | null;
}

export interface NewPayment {
  userId: string;
  reference: string;
  plan: SubscriptionPlan;
  amount: number;
  phone: string;
  network: MomoNetwork;
  provider: string;
}

// Price list in GHS (major units).
export const PLAN_PRICE: Record<SubscriptionPlan, number> = {
  commuter_monthly: 250,
};
