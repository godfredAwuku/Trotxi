import type { MomoNetwork } from './payment.types';

export interface ChargeRequest {
  reference: string;
  amount: number;
  currency: string;
  phone: string;
  network: MomoNetwork;
}

export interface ChargeResult {
  // success  → approved instantly (sandbox / already-authorized)
  // pending  → rider must approve the prompt on their phone; confirmed via webhook
  // failed   → declined
  status: 'success' | 'pending' | 'failed';
  providerRef?: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/**
 * Stand-in for a real MoMo aggregator (Paystack / Hubtel). Deterministic so it
 * is demoable and testable without provider credentials:
 *   - phone ending in "00" → pending (exercises the webhook confirmation path)
 *   - phone ending in "11" → failed
 *   - otherwise            → success (instant sandbox approval)
 *
 * Swap this for a PaystackProvider (returns pending, confirmed via webhook)
 * once API keys are configured — the PaymentService is provider-agnostic.
 */
export class MockMomoProvider implements PaymentProvider {
  readonly name = 'mock-momo';

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const digits = req.phone.replace(/\D/g, '');
    if (digits.endsWith('11')) return { status: 'failed', providerRef: req.reference };
    if (digits.endsWith('00')) return { status: 'pending', providerRef: req.reference };
    return { status: 'success', providerRef: req.reference };
  }
}
