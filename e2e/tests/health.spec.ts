import { expect, test } from '@playwright/test';

test.describe('service health', () => {
  test('root describes the service', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.service).toBe('trotxi-api');
    expect(body.docs).toBe('/docs');
  });

  test('liveness probe responds', async ({ request }) => {
    const res = await request.get('/healthz');
    expect(res.status()).toBe(200);
  });

  test('readiness probe confirms the database is reachable', async ({ request }) => {
    const res = await request.get('/readyz');
    expect(res.status()).toBe(200);
  });

  test('OpenAPI docs are served', async ({ request }) => {
    const res = await request.get('/docs');
    expect(res.ok()).toBeTruthy();
  });
});
