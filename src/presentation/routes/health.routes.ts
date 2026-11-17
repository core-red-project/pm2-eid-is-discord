/**
 * @fileoverview Unauthenticated health check probe endpoint for Docker and monitoring agents.
 * @module presentation/routes/health
 */

import { Hono } from 'hono';

/**
 * Health check router instance.
 */
export const healthRoutes = new Hono();

const isBun = typeof (globalThis as any).Bun !== 'undefined';

/**
 * GET /
 * Returns service status, active runtime engine, version, uptime, and timestamp.
 */
healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    runtime: isBun ? 'Bun' : 'Node.js',
    runtimeVersion: isBun ? (globalThis as any).Bun.version : process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});
