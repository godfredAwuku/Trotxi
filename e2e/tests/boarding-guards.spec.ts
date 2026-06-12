import { expect, test } from '@playwright/test';
import { auth, register, registerSubscribed } from './helpers';

test.describe('boarding business rules', () => {
  test('boarding requires an active subscription', async ({ request }) => {
    const user = await register(request);
    const trips = await (await request.get('/trips')).json();

    const res = await request.post(`/trips/${trips[0].id}/board`, auth(user.token));
    expect(res.status()).toBe(404);
    expect((await res.json()).error).toBe('NO_SUBSCRIPTION');
  });

  test('boarding an unknown trip fails cleanly', async ({ request }) => {
    const user = await registerSubscribed(request);
    const res = await request.post(
      '/trips/00000000-0000-0000-0000-000000000000/board',
      auth(user.token),
    );
    expect(res.status()).toBe(404);
    expect((await res.json()).error).toBe('TRIP_NOT_FOUND');
  });

  test('ending a ride without one fails cleanly', async ({ request }) => {
    const user = await registerSubscribed(request);
    const res = await request.post('/boardings/active/complete', auth(user.token));
    expect(res.status()).toBe(404);
    expect((await res.json()).error).toBe('NO_ACTIVE_RIDE');
  });

  test('an empty token balance blocks boarding', async ({ request }) => {
    const user = await registerSubscribed(request);

    // Drain the wallet via direct redemption, then try to board.
    const drain = await request.post('/subscriptions/redeem', {
      ...auth(user.token),
      data: { tokens: 100 },
    });
    expect(drain.status(), await drain.text()).toBe(200);
    expect((await drain.json()).tokenBalance).toBe(0);

    const trips = await (await request.get('/trips')).json();
    const res = await request.post(`/trips/${trips[0].id}/board`, auth(user.token));
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('INSUFFICIENT_TOKENS');
  });

  test('redeeming more tokens than the balance is rejected', async ({ request }) => {
    const user = await registerSubscribed(request);
    const res = await request.post('/subscriptions/redeem', {
      ...auth(user.token),
      data: { tokens: 101 },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('INSUFFICIENT_TOKENS');
  });
});
