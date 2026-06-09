import { randomBytes } from 'node:crypto';
import { AppError } from '../../lib/errors';
import type { Subscription, SubscriptionPlan } from '../subscriptions/subscription.repository';
import type { SubscriptionService } from '../subscriptions/subscription.service';
import type { PaymentProvider } from './payment.provider';
import type { PaymentRepository } from './payment.repository';
import { PLAN_PRICE, type MomoNetwork, type Payment } from './payment.types';

export interface CheckoutInput {
  plan: SubscriptionPlan;
  phone: string;
  network: MomoNetwork;
}

export interface CheckoutResult {
  payment: Payment;
  subscription: Subscription | null; // present once paid
}

function newReference(): string {
  return `TX-${randomBytes(5).toString('hex').toUpperCase()}`;
}

export class PaymentService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly provider: PaymentProvider,
    private readonly subscriptions: SubscriptionService,
  ) {}

  /**
   * Start a subscription payment. Charges via the provider; if approved
   * instantly the subscription is activated now, otherwise the payment stays
   * pending until the provider's webhook confirms it.
   */
  async checkout(userId: string, input: CheckoutInput): Promise<CheckoutResult> {
    if (await this.subscriptions.findActive(userId)) {
      throw AppError.conflict('You already have an active subscription', 'ALREADY_SUBSCRIBED');
    }
    const amount = PLAN_PRICE[input.plan];
    const payment = await this.payments.create({
      userId,
      reference: newReference(),
      plan: input.plan,
      amount,
      phone: input.phone,
      network: input.network,
      provider: this.provider.name,
    });

    const result = await this.provider.charge({
      reference: payment.reference,
      amount,
      currency: 'GHS',
      phone: input.phone,
      network: input.network,
    });

    if (result.status === 'failed') {
      await this.payments.updateStatus(payment.reference, 'failed', null);
      throw AppError.badRequest('Payment was declined', 'PAYMENT_FAILED');
    }

    if (result.status === 'success') {
      return this.settle(payment.reference);
    }

    // pending — rider approves on their phone; confirmed later via webhook
    return { payment, subscription: null };
  }

  /** Provider webhook callback: confirm or fail a pending payment. */
  async handleWebhook(reference: string, status: 'success' | 'failed'): Promise<Payment> {
    const payment = await this.payments.findByReference(reference);
    if (!payment) {
      throw AppError.notFound('Unknown payment reference', 'PAYMENT_NOT_FOUND');
    }
    if (payment.status === 'paid') return payment; // idempotent
    if (status === 'failed') {
      return this.payments.updateStatus(reference, 'failed', null);
    }
    const { payment: settled } = await this.settle(reference);
    return settled;
  }

  async history(userId: string): Promise<Payment[]> {
    return this.payments.listByUser(userId);
  }

  // Mark paid and grant the subscription.
  private async settle(reference: string): Promise<CheckoutResult> {
    const payment = await this.payments.updateStatus(reference, 'paid', new Date());
    const existing = await this.subscriptions.findActive(payment.userId);
    const subscription = existing ?? (await this.subscriptions.subscribe(payment.userId, payment.plan));
    return { payment, subscription };
  }
}
