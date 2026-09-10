import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppConfig } from '../../infrastructure/config/env.ts';

export const SESSION_COOKIE_NAME = 'pm2_eid_session';

/**
 * Generates deterministic SHA-256 session token from credentials
 */
export async function generateSessionToken(user: string, pass: string): Promise<string> {
  const secret = `${user}:${pass}:pm2-eid-dashboard-session-key`;
  const data = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createAuthMiddleware(authConfig: AppConfig['auth']): MiddlewareHandler {
  if (!authConfig.enabled || !authConfig.user || !authConfig.pass) {
    // If auth is disabled, allow all requests (localhost/VPN mode)
    return async (_c, next) => {
      await next();
    };
  }

  const expectedUser = authConfig.user;
  const expectedPass = authConfig.pass;

  return async (c, next) => {
    // 1. Check Session Cookie
    const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
    if (cookieToken) {
      const validToken = await generateSessionToken(expectedUser, expectedPass);
      if (cookieToken === validToken) {
        return await next();
      }
    }

    // 2. Check Bearer or Basic Header for API scripts / automation
    const authHeader = c.req.header('authorization');
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        const validToken = await generateSessionToken(expectedUser, expectedPass);
        if (token === validToken || token === expectedPass) {
          return await next();
        }
      } else if (authHeader.startsWith('Basic ')) {
        const base64 = authHeader.substring(6).trim();
        try {
          const decoded = atob(base64);
          const [u, p] = decoded.split(':');
          if (u === expectedUser && p === expectedPass) {
            return await next();
          }
        } catch {
          // Ignore decode errors
        }
      }
    }

    // 3. Not authenticated -> Redirect without native browser prompt
    const isHtmx = Boolean(c.req.header('hx-request'));
    const isApi = c.req.path.startsWith('/api/');

    if (isHtmx) {
      // HTMX client-side redirect instruction
      c.header('HX-Redirect', '/login');
      return c.text('', 200);
    }

    if (isApi) {
      return c.json({ error: 'Unauthorized', loginUrl: '/login' }, 401);
    }

    // Browser navigation: clean redirect to /login page
    return c.redirect('/login');
  };
}
