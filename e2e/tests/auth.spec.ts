import { expect, test } from '@playwright/test';
import { PASSWORD, auth, register, uniqueEmail } from './helpers';

test.describe('auth & accounts', () => {
  test('register returns a JWT and a profile with a pass code', async ({ request }) => {
    const user = await register(request);
    expect(user.token.split('.')).toHaveLength(3);
    expect(user.passCode.length).toBeGreaterThan(0);
  });

  test('email cannot be registered twice', async ({ request }) => {
    const user = await register(request);
    const res = await request.post('/auth/register', {
      data: { email: user.email, password: PASSWORD },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toBe('EMAIL_TAKEN');
  });

  test('short passwords are rejected', async ({ request }) => {
    const res = await request.post('/auth/register', {
      data: { email: uniqueEmail('shortpw'), password: 'short' },
    });
    expect(res.status()).toBe(400);
  });

  test('login succeeds with the right password and fails with the wrong one', async ({
    request,
  }) => {
    const user = await register(request);

    const ok = await request.post('/auth/login', {
      data: { email: user.email, password: PASSWORD },
    });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).token).toBeTruthy();

    const bad = await request.post('/auth/login', {
      data: { email: user.email, password: 'wrong-password' },
    });
    expect(bad.status()).toBe(401);
    expect((await bad.json()).error).toBe('INVALID_CREDENTIALS');
  });

  test('/users/me requires a token and returns the profile with it', async ({ request }) => {
    const anonymous = await request.get('/users/me');
    expect(anonymous.status()).toBe(401);

    const user = await register(request);
    const res = await request.get('/users/me', auth(user.token));
    expect(res.status()).toBe(200);
    const me = await res.json();
    expect(me.email).toBe(user.email);
    expect(me.role).toBe('commuter');
    expect(me.passCode).toBe(user.passCode);
  });
});
