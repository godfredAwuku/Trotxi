import { expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export const PASSWORD = 'e2e-password-123';

// MockMomoProvider determinism: phone ending "11" declines, "00" stays pending
// (until the webhook confirms), anything else succeeds instantly.
export const PHONES = {
  success: '0244000022',
  declined: '0244000011',
  pending: '0244000000',
} as const;

export interface TestUser {
  id: string;
  email: string;
  passCode: string;
  token: string;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 12)}@e2e.trotxi.test`;
}

export function auth(token: string): { headers: { Authorization: string } } {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function register(
  request: APIRequestContext,
  role?: 'commuter' | 'driver' | 'admin',
): Promise<TestUser> {
  const email = uniqueEmail(role ?? 'rider');
  const res = await request.post('/auth/register', {
    data: { email, password: PASSWORD, ...(role ? { role } : {}) },
  });
  expect(res.status(), await res.text()).toBe(201);
  const body = await res.json();
  return { id: body.user.id, email, passCode: body.user.passCode, token: body.token };
}

/** Register + pay for a subscription via the instantly-successful mock MoMo number. */
export async function registerSubscribed(request: APIRequestContext): Promise<TestUser> {
  const user = await register(request);
  const res = await request.post('/payments/checkout', {
    ...auth(user.token),
    data: { plan: 'commuter_monthly', phone: PHONES.success, network: 'mtn' },
  });
  expect(res.status(), await res.text()).toBe(201);
  return user;
}

export async function tokenBalance(
  request: APIRequestContext,
  token: string,
): Promise<number> {
  const res = await request.get('/subscriptions/me', auth(token));
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()).tokenBalance as number;
}
