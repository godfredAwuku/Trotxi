import type { Pool } from 'pg';
import type { SubscriptionPlan } from '../subscriptions/subscription.repository';
import type { PaymentRepository } from './payment.repository';
import type { MomoNetwork, NewPayment, Payment, PaymentStatus } from './payment.types';

interface PaymentRow {
  id: string;
  user_id: string;
  reference: string;
  plan: SubscriptionPlan;
  amount: number;
  currency: string;
  phone: string;
  network: MomoNetwork;
  provider: string;
  status: PaymentStatus;
  created_at: Date;
  paid_at: Date | null;
}

const COLS =
  'id, user_id, reference, plan, amount, currency, phone, network, provider, status, created_at, paid_at';

const toPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  userId: r.user_id,
  reference: r.reference,
  plan: r.plan,
  amount: r.amount,
  currency: r.currency,
  phone: r.phone,
  network: r.network,
  provider: r.provider,
  status: r.status,
  createdAt: r.created_at,
  paidAt: r.paid_at,
});

export class PgPaymentRepository implements PaymentRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: NewPayment): Promise<Payment> {
    const { rows } = await this.pool.query<PaymentRow>(
      `INSERT INTO payments (user_id, reference, plan, amount, phone, network, provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${COLS}`,
      [input.userId, input.reference, input.plan, input.amount, input.phone, input.network, input.provider],
    );
    return toPayment(rows[0]!);
  }

  async findByReference(reference: string): Promise<Payment | null> {
    const { rows } = await this.pool.query<PaymentRow>(
      `SELECT ${COLS} FROM payments WHERE reference = $1`,
      [reference],
    );
    return rows[0] ? toPayment(rows[0]) : null;
  }

  async updateStatus(reference: string, status: PaymentStatus, paidAt: Date | null): Promise<Payment> {
    const { rows } = await this.pool.query<PaymentRow>(
      `UPDATE payments SET status = $2, paid_at = $3 WHERE reference = $1 RETURNING ${COLS}`,
      [reference, status, paidAt],
    );
    if (!rows[0]) throw new Error(`Payment ${reference} not found`);
    return toPayment(rows[0]);
  }

  async listByUser(userId: string): Promise<Payment[]> {
    const { rows } = await this.pool.query<PaymentRow>(
      `SELECT ${COLS} FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(toPayment);
  }
}
