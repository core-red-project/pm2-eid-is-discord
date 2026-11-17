/**
 * @file auth.test.ts
 * @description Unit tests for session management, constant-time comparison, rate limiting, and auth middleware.
 */

import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import {
  SESSION_COOKIE_NAME,
  checkLoginRateLimit,
  clearLoginAttempts,
  createAuthMiddleware,
  createSession,
  getClientIp,
  recordFailedLogin,
  revokeSession,
  safeCompare,
  validateSession,
} from '../src/presentation/middlewares/auth.middleware.ts';

describe('Auth Middleware & Security Subsystem', () => {
  describe('Session Management & Revocation', () => {
    it('should create random unique session tokens', () => {
      const token1 = createSession('admin');
      const token2 = createSession('admin');
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(10);
    });

    it('should validate active session tokens', () => {
      const token = createSession('admin');
      expect(validateSession(token)).toBe(true);
      expect(validateSession('non-existent-token')).toBe(false);
    });

    it('should immediately invalidate tokens upon revocation', () => {
      const token = createSession('admin');
      expect(validateSession(token)).toBe(true);
      revokeSession(token);
      expect(validateSession(token)).toBe(false);
    });
  });

  describe('Constant-Time Safe Comparison', () => {
    it('should return true for identical strings', () => {
      expect(safeCompare('secret_pass_123', 'secret_pass_123')).toBe(true);
    });

    it('should return false for differing strings or lengths', () => {
      expect(safeCompare('secret_pass_123', 'secret_pass_456')).toBe(false);
      expect(safeCompare('short', 'much_longer_string')).toBe(false);
    });

    it('should handle strings with multiple colons correctly', () => {
      expect(safeCompare('pass:with:colons:!', 'pass:with:colons:!')).toBe(true);
      expect(safeCompare('pass:with:colons:!', 'pass:with:different')).toBe(false);
    });
  });

  describe('Login Rate Limiter', () => {
    const testIp = '192.168.1.100';

    it('should allow initial attempts and block after threshold', () => {
      clearLoginAttempts(testIp);
      expect(checkLoginRateLimit(testIp).allowed).toBe(true);

      for (let i = 0; i < 5; i++) {
        recordFailedLogin(testIp);
      }

      const blockedCheck = checkLoginRateLimit(testIp);
      expect(blockedCheck.allowed).toBe(false);
      expect(blockedCheck.retryAfterSec).toBeGreaterThan(0);

      clearLoginAttempts(testIp);
      expect(checkLoginRateLimit(testIp).allowed).toBe(true);
    });
  });

  describe('createAuthMiddleware Integration with Hono app.request', () => {
    const authConfig = {
      enabled: true,
      user: 'admin',
      pass: 'p@ss:word:with:colons',
    };

    const app = new Hono();
    const middleware = createAuthMiddleware(authConfig);

    app.use('/dashboard', middleware);
    app.get('/dashboard', (c) => c.text('Dashboard Content'));

    app.use('/api/*', middleware);
    app.get('/api/processes', (c) => c.json({ ok: true }));

    it('should return 401 JSON for unauthenticated API requests', async () => {
      const res = await app.request('/api/processes');
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should redirect browser navigation to /login when unauthenticated', async () => {
      const res = await app.request('/dashboard');
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('/login');
    });

    it('should allow access with a valid session cookie', async () => {
      const sessionToken = createSession('admin');
      const req = new Request('http://localhost/dashboard', {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('Dashboard Content');
    });

    it('should reject access after session token has been revoked', async () => {
      const sessionToken = createSession('admin');
      revokeSession(sessionToken);

      const req = new Request('http://localhost/api/processes', {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(401);
    });

    it('should authenticate valid Bearer session tokens', async () => {
      const sessionToken = createSession('admin');
      const req = new Request('http://localhost/api/processes', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);
    });

    it('should reject raw password passed as Bearer token', async () => {
      const req = new Request('http://localhost/api/processes', {
        headers: {
          Authorization: `Bearer ${authConfig.pass}`,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(401);
    });

    it('should authenticate Basic auth even when password contains colons', async () => {
      const raw = `${authConfig.user}:${authConfig.pass}`;
      const base64 = btoa(raw);

      const req = new Request('http://localhost/api/processes', {
        headers: {
          Authorization: `Basic ${base64}`,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);
    });

    it('should throttle repeated invalid Basic Auth attempts with HTTP 429', async () => {
      clearLoginAttempts('127.0.0.1');
      const badHeader = `Basic ${btoa('admin:wrongpassword')}`;

      // 5 attempts should return 401
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/processes', {
          headers: { Authorization: badHeader },
        });
        expect(res.status).toBe(401);
      }

      // 6th attempt should be blocked with 429
      const resBlocked = await app.request('/api/processes', {
        headers: { Authorization: badHeader },
      });
      expect(resBlocked.status).toBe(429);
      expect(await resBlocked.text()).toContain('Too many failed authentication attempts');

      clearLoginAttempts('127.0.0.1');
    });

    it('should ignore spoofed X-Forwarded-For headers when TRUST_PROXY is not enabled', async () => {
      clearLoginAttempts('127.0.0.1');
      const badHeader = `Basic ${btoa('admin:wrong')}`;

      // Attacker sends different random X-Forwarded-For on each attempt
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/processes', {
          headers: {
            Authorization: badHeader,
            'X-Forwarded-For': `203.0.113.${i + 1}`,
          },
        });
        expect(res.status).toBe(401);
      }

      // 6th attempt with yet another IP must still be blocked because socket IP is used
      const resBlocked = await app.request('/api/processes', {
        headers: {
          Authorization: badHeader,
          'X-Forwarded-For': '198.51.100.99',
        },
      });
      expect(resBlocked.status).toBe(429);

      clearLoginAttempts('127.0.0.1');
    });

    it('should extract the last IP in X-Forwarded-For when TRUST_PROXY is true', () => {
      const original = process.env.TRUST_PROXY;
      process.env.TRUST_PROXY = 'true';
      try {
        const dummyContext: any = {
          req: {
            header: (name: string) => {
              if (name.toLowerCase() === 'x-forwarded-for') {
                return '1.1.1.1, 10.0.0.1, 192.168.1.50';
              }
              return undefined;
            },
          },
          env: {},
        };
        expect(getClientIp(dummyContext)).toBe('192.168.1.50');
      } finally {
        process.env.TRUST_PROXY = original;
      }
    });
  });
});
