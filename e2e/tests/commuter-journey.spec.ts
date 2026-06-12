import { expect, test, type APIRequestContext } from '@playwright/test';
import { auth, registerSubscribed } from './helpers';

interface TripSummary {
  id: string;
  routeId: string;
  fareTokens: number;
  status: string;
}

async function boardableTrips(request: APIRequestContext): Promise<TripSummary[]> {
  const res = await request.get('/trips');
  expect(res.status()).toBe(200);
  const trips = (await res.json()) as TripSummary[];
  return trips.filter((t) => t.status === 'scheduled' || t.status === 'active');
}

test('full commuter journey: subscribe → browse → board → verify pass → end ride → history', async ({
  request,
}) => {
  const user = await registerSubscribed(request);

  // Browse the network: seeded Accra routes with ordered stops.
  const routesRes = await request.get('/routes');
  expect(routesRes.status()).toBe(200);
  const routes = await routesRes.json();
  expect(routes.length).toBeGreaterThanOrEqual(3);

  const detailRes = await request.get(`/routes/${routes[0].id}`);
  expect(detailRes.status()).toBe(200);
  const detail = await detailRes.json();
  expect(detail.stops.length).toBeGreaterThanOrEqual(2);
  const seqs = detail.stops.map((s: { seq: number }) => s.seq);
  expect(seqs).toEqual([...seqs].sort((a, b) => a - b));

  // Pick two distinct boardable trips: one to ride, one to prove the
  // single-active-ride rule.
  const trips = await boardableTrips(request);
  expect(trips.length).toBeGreaterThanOrEqual(2);
  const [trip, otherTrip] = trips;

  // Board: fare is deducted from the token balance.
  const boardRes = await request.post(`/trips/${trip.id}/board`, auth(user.token));
  expect(boardRes.status(), await boardRes.text()).toBe(201);
  const boarded = await boardRes.json();
  expect(boarded.boarding.status).toBe('active');
  expect(boarded.subscription.tokenBalance).toBe(100 - trip.fareTokens);

  const activeRes = await request.get('/boardings/active', auth(user.token));
  expect((await activeRes.json()).active).toBe(true);

  // One active ride at a time.
  const doubleBoard = await request.post(`/trips/${otherTrip.id}/board`, auth(user.token));
  expect(doubleBoard.status()).toBe(409);
  expect((await doubleBoard.json()).error).toBe('ON_RIDE');

  // Driver-side check: the rider's QR pass code verifies with an active ride.
  const verifyRes = await request.post('/pass/verify', {
    data: { passCode: user.passCode },
  });
  expect(verifyRes.status(), await verifyRes.text()).toBe(200);
  const verdict = await verifyRes.json();
  expect(verdict.valid).toBe(true);
  expect(verdict.rider.email).toBe(user.email);
  expect(verdict.hasActiveRide).toBe(true);

  const badVerify = await request.post('/pass/verify', {
    data: { passCode: 'NOT-A-REAL-PASS' },
  });
  expect(badVerify.status()).toBe(404);

  // End the ride, then the rider may board again (even the same trip).
  const completeRes = await request.post('/boardings/active/complete', auth(user.token));
  expect(completeRes.status()).toBe(200);
  expect((await completeRes.json()).status).toBe('completed');

  const afterRes = await request.get('/boardings/active', auth(user.token));
  expect((await afterRes.json()).active).toBe(false);

  const reboardRes = await request.post(`/trips/${trip.id}/board`, auth(user.token));
  expect(reboardRes.status(), await reboardRes.text()).toBe(201);
  expect((await reboardRes.json()).subscription.tokenBalance).toBe(100 - 2 * trip.fareTokens);

  // History shows where each ride went, newest data included.
  const historyRes = await request.get('/boardings/me', auth(user.token));
  expect(historyRes.status()).toBe(200);
  const history = await historyRes.json();
  expect(history.length).toBe(2);
  for (const item of history) {
    expect(item.origin).toBeTruthy();
    expect(item.destination).toBeTruthy();
    expect(item.tokensSpent).toBe(trip.fareTokens);
  }
});
