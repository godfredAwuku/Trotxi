import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { InMemorySubscriptionRepository } from '../../src/modules/subscriptions/subscription.repository';
import { InMemoryUserRepository } from '../../src/modules/users/user.repository';
import { InMemoryRouteRepository } from '../../src/modules/routes/route.repository';
import { InMemoryTripRepository } from '../../src/modules/trips/trip.repository';
import { InMemoryBoardingRepository } from '../../src/modules/trips/boarding.repository';

async function makeApp(): Promise<FastifyInstance> {
  return buildApp({
    users: new InMemoryUserRepository(),
    subscriptions: new InMemorySubscriptionRepository(),
    routes: new InMemoryRouteRepository(),
    trips: new InMemoryTripRepository(),
    boardings: new InMemoryBoardingRepository(),
    jwt: { secret: 'a'.repeat(32), expiresIn: '1h' },
  });
}

async function authToken(app: FastifyInstance, email: string): Promise<string> {
  const reg = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'password123' },
  });
  return reg.json().token as string;
}

describe('API integration', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await makeApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET / returns service info', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.json().service).toBe('trotxi-api');
    expect(res.json().docs).toBe('/docs');
  });

  it('GET /healthz returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });

  it('GET /readyz returns ready', async () => {
    const res = await app.inject({ method: 'GET', url: '/readyz' });
    expect(res.statusCode).toBe(200);
  });

  it('registers, logs in, and reads profile', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'rider@trotxi.com', password: 'password123' },
    });
    expect(reg.statusCode).toBe(201);
    const token = reg.json().token as string;

    const me = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe('rider@trotxi.com');
  });

  it('rejects /users/me without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/me' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects registration with invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'not-an-email', password: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('full subscription + redeem flow', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'rider2@trotxi.com', password: 'password123' },
    });
    const token = reg.json().token as string;
    const auth = { authorization: `Bearer ${token}` };

    const sub = await app.inject({
      method: 'POST',
      url: '/subscriptions',
      headers: auth,
      payload: { plan: 'commuter_monthly' },
    });
    expect(sub.statusCode).toBe(201);
    expect(sub.json().tokenBalance).toBe(100);

    const redeem = await app.inject({
      method: 'POST',
      url: '/subscriptions/redeem',
      headers: auth,
      payload: { tokens: 1 },
    });
    expect(redeem.statusCode).toBe(200);
    expect(redeem.json().tokenBalance).toBe(99);

    const mine = await app.inject({ method: 'GET', url: '/subscriptions/me', headers: auth });
    expect(mine.json().tokenBalance).toBe(99);
  });

  it('rejects redeem with no subscription', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'rider3@trotxi.com', password: 'password123' },
    });
    const token = reg.json().token as string;
    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/redeem',
      headers: { authorization: `Bearer ${token}` },
      payload: { tokens: 1 },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('Mobility: routes, trips, boarding', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await makeApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists active routes (public)', async () => {
    const res = await app.inject({ method: 'GET', url: '/routes' });
    expect(res.statusCode).toBe(200);
    const routes = res.json() as Array<{ name: string }>;
    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0]).toHaveProperty('fareTokens');
  });

  it('returns a route with ordered stops', async () => {
    const list = await app.inject({ method: 'GET', url: '/routes' });
    const routeId = (list.json() as Array<{ id: string }>)[0]!.id;
    const res = await app.inject({ method: 'GET', url: `/routes/${routeId}` });
    expect(res.statusCode).toBe(200);
    const stops = res.json().stops as Array<{ seq: number }>;
    expect(stops.length).toBeGreaterThan(0);
    expect(stops[0]!.seq).toBe(1);
  });

  it('lists upcoming trips', async () => {
    const res = await app.inject({ method: 'GET', url: '/trips' });
    expect(res.statusCode).toBe(200);
    expect((res.json() as unknown[]).length).toBeGreaterThan(0);
  });

  it('boards a trip, spending the fare in tokens', async () => {
    const token = await authToken(app, 'boarder@trotxi.com');
    const auth = { authorization: `Bearer ${token}` };
    await app.inject({ method: 'POST', url: '/subscriptions', headers: auth, payload: {} });

    const trips = (await app.inject({ method: 'GET', url: '/trips' })).json() as Array<{
      id: string;
      fareTokens: number;
    }>;
    const trip = trips[0]!;

    const board = await app.inject({
      method: 'POST',
      url: `/trips/${trip.id}/board`,
      headers: auth,
    });
    expect(board.statusCode).toBe(201);
    expect(board.json().subscription.tokenBalance).toBe(100 - trip.fareTokens);
    expect(board.json().trip.id).toBe(trip.id);

    const history = await app.inject({ method: 'GET', url: '/boardings/me', headers: auth });
    expect((history.json() as unknown[]).length).toBe(1);
  });

  it('rejects double-boarding the same trip', async () => {
    const token = await authToken(app, 'double@trotxi.com');
    const auth = { authorization: `Bearer ${token}` };
    await app.inject({ method: 'POST', url: '/subscriptions', headers: auth, payload: {} });
    const trips = (await app.inject({ method: 'GET', url: '/trips' })).json() as Array<{ id: string }>;
    const tripId = trips[0]!.id;

    await app.inject({ method: 'POST', url: `/trips/${tripId}/board`, headers: auth });
    const again = await app.inject({ method: 'POST', url: `/trips/${tripId}/board`, headers: auth });
    expect(again.statusCode).toBe(409);
  });

  it('rejects boarding without a subscription', async () => {
    const token = await authToken(app, 'nosub@trotxi.com');
    const trips = (await app.inject({ method: 'GET', url: '/trips' })).json() as Array<{ id: string }>;
    const res = await app.inject({
      method: 'POST',
      url: `/trips/${trips[0]!.id}/board`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 boarding a non-existent trip', async () => {
    const token = await authToken(app, 'ghost@trotxi.com');
    const auth = { authorization: `Bearer ${token}` };
    await app.inject({ method: 'POST', url: '/subscriptions', headers: auth, payload: {} });
    const res = await app.inject({ method: 'POST', url: '/trips/does-not-exist/board', headers: auth });
    expect(res.statusCode).toBe(404);
  });
});
