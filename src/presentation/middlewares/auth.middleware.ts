/**
 * @fileoverview Authentication middleware supporting revocable sessions, constant-time validation,
 * Basic auth with colon-safe parsing, and socket/proxy-aware login rate limiting.
 * @module presentation/middlewares/auth
 */

import { timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppConfig } from '../../infrastructure/config/env.ts';

/** Name of the session cookie */
export const SESSION_COOKIE_NAME = 'pm2_eid_session';

/** Session duration in milliseconds (7 days) */
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Metadata record for an active user session.
 */
interface SessionRecord {
  user: string;
  createdAt: number;
  expiresAt: number;
}

/** In-memory active session registry */
const activeSessions = new Map<string, SessionRecord>();

/**
 * Extracts the real client IP address from socket information, or from the
 * X-Forwarded-For header ONLY when TRUST_PROXY=true is explicitly configured.
 *
 * @param c - Hono request context.
 * @returns Resolved client IP address string.
 */
export function getClientIp(c: Context): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';

  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for');
    if (forwarded) {
      // In trusted reverse proxy setups, the IP appended by the nearest reverse proxy is the last element
      const parts = forwarded
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        return lastPart;
      }
    }
  }

  // Socket address resolution across Bun and Node runtimes
  try {
    const env = c.env as any;
    if (env && typeof env === 'object') {
      if (env.incoming?.socket?.remoteAddress) {
        return String(env.incoming.socket.remoteAddress);
      }
      if (typeof env.server?.requestIP === 'function') {
        const ip = env.server.requestIP(c.req.raw);
        if (ip?.address) return String(ip.address);
      }
      if (typeof env.requestIP === 'function') {
        const ip = env.requestIP(c.req.raw);
        if (ip?.address) return String(ip.address);
      }
    }
  } catch {
    // Ignore socket inspection errors
  }

  return '127.0.0.1';
}

/**
 * Performs a constant-time equality check between two UTF-8 strings.
 * Prevents timing attacks when comparing passwords, tokens, or usernames.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns `true` if strings are byte-for-byte identical, `false` otherwise.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Creates a cryptographically random, revocable session token.
 *
 * @param user - Username associated with the session.
 * @param ttlMs - Time to live in milliseconds (defaults to 7 days).
 * @returns Random UUID token string.
 */
export function createSession(user: string, ttlMs: number = DEFAULT_SESSION_TTL_MS): string {
  const token = crypto.randomUUID();
  const now = Date.now();
  activeSessions.set(token, {
    user,
    createdAt: now,
    expiresAt: now + ttlMs,
  });

  // Periodically clean up expired sessions
  if (activeSessions.size > 1000) {
    cleanupExpiredSessions();
  }

  return token;
}

/**
 * Validates whether a session token is active and unexpired.
 *
 * @param token - Session token to verify.
 * @returns `true` if valid and not expired, `false` otherwise.
 */
export function validateSession(token: string): boolean {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }

  return true;
}

/**
 * Revokes an active session immediately, making subsequent requests with this token invalid.
 *
 * @param token - Session token to revoke.
 */
export function revokeSession(token: string): void {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Cleans up expired sessions from the in-memory registry.
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(token);
    }
  }
}

/** Login rate limiting state */
interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RATE_LIMIT_ENTRIES = 5000; // Prevent memory exhaustion

/**
 * Checks if a client IP is currently rate-limited for authentication attempts.
 *
 * @param ip - Client IP address.
 * @returns Object indicating whether login is allowed and retry duration.
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) {
    return { allowed: true };
  }

  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  if (record.blockedUntil && now >= record.blockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (now - record.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Records a failed authentication attempt for a client IP.
 * Cleans up expired records when approaching the maximum entry ceiling.
 *
 * @param ip - Client IP address.
 */
export function recordFailedLogin(ip: string): void {
  const now = Date.now();

  // Guard against unbounded memory allocation
  if (loginAttempts.size >= MAX_RATE_LIMIT_ENTRIES) {
    for (const [k, v] of loginAttempts.entries()) {
      if (
        (v.blockedUntil && now >= v.blockedUntil) ||
        now - v.firstAttemptAt > RATE_LIMIT_WINDOW_MS
      ) {
        loginAttempts.delete(k);
      }
    }
    if (loginAttempts.size >= MAX_RATE_LIMIT_ENTRIES) {
      const keysToDelete = Array.from(loginAttempts.keys()).slice(0, 500);
      for (const k of keysToDelete) {
        loginAttempts.delete(k);
      }
    }
  }

  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { attempts: 1, firstAttemptAt: now });
    return;
  }

  record.attempts += 1;
  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + LOCKOUT_MS;
  }
}

/**
 * Clears recorded failed attempts upon successful login.
 *
 * @param ip - Client IP address.
 */
export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Factory that produces a Hono authentication middleware handler.
 * If authentication is disabled in config, all requests pass through automatically.
 *
 * @param authConfig - Authentication configuration slice.
 * @returns Configured Hono MiddlewareHandler.
 */
export function createAuthMiddleware(authConfig: AppConfig['auth']): MiddlewareHandler {
  if (!authConfig.enabled || !authConfig.user || !authConfig.pass) {
    return async (_c, next) => {
      await next();
    };
  }

  const expectedUser = authConfig.user;
  const expectedPass = authConfig.pass;

  return async (c, next) => {
    const clientIp = getClientIp(c);

    // 1. Check Session Cookie
    const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
    if (cookieToken && validateSession(cookieToken)) {
      return await next();
    }

    // 2. Check Authorization Header (Bearer session token or Basic auth)
    const authHeader = c.req.header('authorization');
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        if (validateSession(token)) {
          return await next();
        }
      } else if (authHeader.startsWith('Basic ')) {
        const rateCheck = checkLoginRateLimit(clientIp);
        if (!rateCheck.allowed) {
          return c.text(
            `Too many failed authentication attempts. Please retry in ${rateCheck.retryAfterSec} seconds.`,
            429,
          );
        }

        const base64 = authHeader.substring(6).trim();
        try {
          const decoded = atob(base64);
          const colonIndex = decoded.indexOf(':');
          if (colonIndex !== -1) {
            const u = decoded.slice(0, colonIndex);
            const p = decoded.slice(colonIndex + 1);
            if (safeCompare(u, expectedUser) && safeCompare(p, expectedPass)) {
              clearLoginAttempts(clientIp);
              return await next();
            }
          }
        } catch {
          // Ignore base64 decoding errors
        }

        // Record failed attempt for Basic Auth to throttle brute force
        recordFailedLogin(clientIp);
      }
    }

    // 3. Not authenticated -> Redirect without native browser prompt
    const isHtmx = Boolean(c.req.header('hx-request'));
    const isApi = c.req.path.startsWith('/api/');

    if (isHtmx) {
      c.header('HX-Redirect', '/login');
      return c.text('', 200);
    }

    if (isApi) {
      return c.json({ error: 'Unauthorized', loginUrl: '/login' }, 401);
    }

    return c.redirect('/login');
  };
}
