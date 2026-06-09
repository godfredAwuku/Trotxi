import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { InMemorySubscriptionRepository } from '../../src/modules/subscriptions/subscription.repository';
import { InMemoryUserRepository } from '../../src/modules/users/user.repository';

async function makeApp(): Promise<FastifyInstance> {
  return buildApp({
    users: new InMemoryUserRepository(),
    subscriptions: new InMemorySubscriptionRepository(),
    jwt: { secret: 'a'.repeat(32), expiresIn: '1h' },
  });
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
