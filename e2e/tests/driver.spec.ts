import { expect, test } from '@playwright/test';
import { auth, register } from './helpers';

// A GPS fix near Kwame Nkrumah Circle.
const FIX = { lat: 5.5709, lng: -0.2074, bearing: 45 };

test.describe('driver position reporting & live map', () => {
  test('only drivers may publish positions', async ({ request }) => {
    const trips = await (await request.get('/trips')).json();
    const tripId = trips[0].id;

    const anonymous = await request.post(`/trips/${tripId}/position`, { data: FIX });
    expect(anonymous.status()).toBe(401);

    const commuter = await register(request);
    const forbidden = await request.post(`/trips/${tripId}/position`, {
      ...auth(commuter.token),
      data: FIX,
    });
    expect(forbidden.status()).toBe(403);
  });

  test('a driver-reported fix is served back as the live position', async ({ request }) => {
    const driver = await register(request, 'driver');
    const trips = await (await request.get('/trips')).json();
    const tripId = trips[0].id;

    const report = await request.post(`/trips/${tripId}/position`, {
      ...auth(driver.token),
      data: FIX,
    });
    expect(report.status(), await report.text()).toBe(200);

    const res = await request.get(`/trips/${tripId}/position`);
    expect(res.status()).toBe(200);
    const position = await res.json();
    expect(position.source).toBe('live');
    expect(position.lat).toBeCloseTo(FIX.lat, 4);
    expect(position.lng).toBeCloseTo(FIX.lng, 4);
  });

  test('trips with no recent fix fall back to a simulated position', async ({ request }) => {
    const trips = await (await request.get('/trips')).json();
    // The last seeded trip is never reported against in this suite.
    const tripId = trips[trips.length - 1].id;

    const res = await request.get(`/trips/${tripId}/position`);
    expect(res.status(), await res.text()).toBe(200);
    const position = await res.json();
    expect(position.source).toBe('simulated');
    expect(position.progress).toBeGreaterThanOrEqual(0);
    expect(position.progress).toBeLessThanOrEqual(1);
  });

  test('positions for unknown trips return 404', async ({ request }) => {
    const res = await request.get('/trips/00000000-0000-0000-0000-000000000000/position');
    expect(res.status()).toBe(404);
  });
});
