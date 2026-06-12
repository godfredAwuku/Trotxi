import { expect, test } from '@playwright/test';
import { PHONES, auth, register, tokenBalance } from './helpers';

function checkout(phone: string) {
  return { plan: 'commuter_monthly' as const, phone, network: 'mtn' as const };
}

test.describe('mobile-money subscription payments', () => {
  test('instant success activates the subscription with 100 tokens', async ({ request }) => {
    const user = await register(request);

    const res = await request.post('/payments/checkout', {
      ...auth(user.token),
      data: checkout(PHONES.success),
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = await res.json();
    expect(body.payment.status).toBe('paid');
    expect(body.subscription.tokenBalance).toBe(100);

    expect(await tokenBalance(request, user.token)).toBe(100);

    const history = await request.get('/payments/me', auth(user.token));
    expect(history.status()).toBe(200);
    const payments = await history.json();
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe('paid');
  });

  test('a declined charge leaves the rider unsubscribed', async ({ request }) => {
    const user = await register(request);

    const res = await request.post('/payments/checkout', {
      ...auth(user.token),
      data: checkout(PHONES.declined),
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('PAYMENT_FAILED');

    const sub = await request.get('/subscriptions/me', auth(user.token));
    expect(sub.status()).toBe(404);
  });

  test('a pending charge activates only after the webhook confirms', async ({ request }) => {
    const user = await register(request);

    const res = await request.post('/payments/checkout', {
      ...auth(user.token),
      data: checkout(PHONES.pending),
    });
    expect(res.status(), await res.text()).toBe(201);
    const { payment, subscription } = await res.json();
    expect(payment.status).toBe('pending');
    expect(subscription).toBeNull();

    const before = await request.get('/subscriptions/me', auth(user.token));
    expect(before.status()).toBe(404);

    const webhook = await request.post('/payments/webhook', {
      data: { reference: payment.reference, status: 'success' },
    });
    expect(webhook.status(), await webhook.text()).toBe(200);
    expect((await webhook.json()).status).toBe('paid');

    expect(await tokenBalance(request, user.token)).toBe(100);
  });

  test('a webhook failure cancels the pending payment', async ({ request }) => {
    const user = await register(request);

    const res = await request.post('/payments/checkout', {
      ...auth(user.token),
      data: checkout(PHONES.pending),
    });
    const { payment } = await res.json();

    const webhook = await request.post('/payments/webhook', {
      data: { reference: payment.reference, status: 'failed' },
    });
    expect(webhook.status()).toBe(200);
    expect((await webhook.json()).status).toBe('failed');

    const sub = await request.get('/subscriptions/me', auth(user.token));
    expect(sub.status()).toBe(404);
  });

  test('an already-subscribed rider cannot pay again', async ({ request }) => {
    const user = await register(request);
    await request.post('/payments/checkout', {
      ...auth(user.token),
      data: checkout(PHONES.success),
    });

    const second = await request.post('/payments/checkout', {
      ...auth(user.token),
      data: checkout(PHONES.success),
    });
    expect(second.status()).toBe(409);
    expect((await second.json()).error).toBe('ALREADY_SUBSCRIBED');
  });

  test('webhooks for unknown references are rejected', async ({ request }) => {
    const res = await request.post('/payments/webhook', {
      data: { reference: 'TX-DOES-NOT-EXIST', status: 'success' },
    });
    expect(res.status()).toBe(404);
  });
});
