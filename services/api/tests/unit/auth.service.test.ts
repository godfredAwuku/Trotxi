import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../src/lib/errors';
import type { JwtConfig } from '../../src/lib/jwt';
import { AuthService } from '../../src/modules/auth/auth.service';
import { InMemoryUserRepository } from '../../src/modules/users/user.repository';

const jwt: JwtConfig = { secret: 'a'.repeat(32), expiresIn: '1h' };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(new InMemoryUserRepository(), jwt);
  });

  it('registers a new user and returns a token', async () => {
    const result = await service.register({ email: 'a@b.com', password: 'password123' });
    expect(result.token).toBeTypeOf('string');
    expect(result.user.email).toBe('a@b.com');
    expect(result.user.role).toBe('commuter');
  });

  it('rejects duplicate email', async () => {
    await service.register({ email: 'a@b.com', password: 'password123' });
    await expect(
      service.register({ email: 'a@b.com', password: 'password123' }),
    ).rejects.toThrowError(AppError);
  });

  it('logs in with correct credentials', async () => {
    await service.register({ email: 'a@b.com', password: 'password123' });
    const result = await service.login({ email: 'a@b.com', password: 'password123' });
    expect(result.user.email).toBe('a@b.com');
  });

  it('rejects login with wrong password', async () => {
    await service.register({ email: 'a@b.com', password: 'password123' });
    await expect(
      service.login({ email: 'a@b.com', password: 'wrongpass1' }),
    ).rejects.toThrowError(/Invalid email or password/);
  });

  it('rejects login for unknown user', async () => {
    await expect(
      service.login({ email: 'nobody@b.com', password: 'password123' }),
    ).rejects.toThrowError(AppError);
  });
});
