import { describe, expect, it } from 'bun:test';
import { generateSessionToken } from '../src/presentation/middlewares/auth.middleware.ts';

describe('Auth Middleware & Tokens', () => {
  it('should generate deterministic session tokens for identical credentials', async () => {
    const token1 = await generateSessionToken('admin', 'password123');
    const token2 = await generateSessionToken('admin', 'password123');
    expect(token1).toBe(token2);
    expect(token1.length).toBe(64); // SHA-256 hex string length
  });

  it('should generate different tokens for different credentials', async () => {
    const token1 = await generateSessionToken('admin', 'password123');
    const token2 = await generateSessionToken('admin', 'otherpassword');
    expect(token1).not.toBe(token2);
  });
});
