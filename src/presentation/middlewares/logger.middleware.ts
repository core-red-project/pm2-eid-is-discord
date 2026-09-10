import type { MiddlewareHandler } from 'hono';

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = (performance.now() - start).toFixed(1);
  const status = c.res.status;
  console.log(`[${new Date().toISOString()}] ${method} ${path} -> ${status} (${duration}ms)`);
};
