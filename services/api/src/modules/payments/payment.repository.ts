import { randomUUID } from 'node:crypto';
import type { NewPayment, Payment, PaymentStatus } from './payment.types';

export interface PaymentRepository {
  create(input: NewPayment): Promise<Payment>;
  findByReference(reference: string): Promise<Payment | null>;
  updateStatus(reference: string, status: PaymentStatus, paidAt: Date | null): Promise<Payment>;
  listByUser(userId: string): Promise<Payment[]>;
}

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly rows: Payment[] = [];

  async create(input: NewPayment): Promise<Payment> {
    const payment: Payment = {
      id: randomUUID(),
      userId: input.userId,
      reference: input.reference,
      plan: input.plan,
      amount: input.amount,
      currency: 'GHS',
      phone: input.phone,
      network: input.network,
      provider: input.provider,
      status: 'pending',
      createdAt: new Date(),
      paidAt: null,
    };
    this.rows.push(payment);
    return payment;
  }

  async findByReference(reference: string): Promise<Payment | null> {
    return this.rows.find((p) => p.reference === reference) ?? null;
  }

  async updateStatus(reference: string, status: PaymentStatus, paidAt: Date | null): Promise<Payment> {
    const payment = this.rows.find((p) => p.reference === reference);
    if (!payment) throw new Error(`Payment ${reference} not found`);
    payment.status = status;
    payment.paidAt = paidAt;
    return payment;
  }

  async listByUser(userId: string): Promise<Payment[]> {
    return this.rows
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
