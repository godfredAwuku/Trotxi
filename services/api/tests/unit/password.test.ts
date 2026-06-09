import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password hashing', () => {
  it('produces scrypt-formatted hashes', async () => {
    const hash = await hashPassword('secret123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash.split('$')).toHaveLength(3);
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword('secret123', hash)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'not-a-valid-hash')).toBe(false);
  });
});
