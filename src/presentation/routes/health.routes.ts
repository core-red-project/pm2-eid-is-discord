import { Hono } from 'hono';

export const healthRoutes = new Hono();

healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    runtime: 'Bun',
    bunVersion: Bun.version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});
