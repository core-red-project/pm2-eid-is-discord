import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { GetLogsUseCase } from './application/use-cases/get-logs.use-case.ts';
// Application Use Cases
import { ListProcessesUseCase } from './application/use-cases/list-processes.use-case.ts';
import { ManageProcessUseCase } from './application/use-cases/manage-process.use-case.ts';
import { NotifyEventUseCase } from './application/use-cases/notify-event.use-case.ts';
// Infrastructure
import { config } from './infrastructure/config/env.ts';
import { WebhookDispatcher } from './infrastructure/notifications/webhook-dispatcher.ts';
import { PM2BusListener } from './infrastructure/pm2/pm2-bus-listener.ts';
import { PM2ClientRepository } from './infrastructure/pm2/pm2-client.ts';
import {
  createAuthMiddleware,
  generateSessionToken,
  SESSION_COOKIE_NAME,
} from './presentation/middlewares/auth.middleware.ts';
import { requestLogger } from './presentation/middlewares/logger.middleware.ts';
import { healthRoutes } from './presentation/routes/health.routes.ts';
import { createProcessRoutes } from './presentation/routes/process.routes.ts';
import { renderDashboardPage } from './presentation/views/pages/dashboard.page.ts';
import { renderLoginPage } from './presentation/views/pages/login.page.ts';

// 1. Initialize Repositories and Services
const pm2Repository = new PM2ClientRepository();
const webhookDispatcher = new WebhookDispatcher(config.webhook);

// 2. Initialize Use Cases
const listProcessesUseCase = new ListProcessesUseCase(pm2Repository);
const manageProcessUseCase = new ManageProcessUseCase(pm2Repository);
const getLogsUseCase = new GetLogsUseCase(pm2Repository);
const notifyEventUseCase = new NotifyEventUseCase([webhookDispatcher]);

// 3. Start PM2 Real-time Bus Listener if Webhook is enabled
if (config.webhook.enabled) {
  const busListener = new PM2BusListener(notifyEventUseCase);
  busListener.start();
}

// 4. Create Hono Application
const app = new Hono();

// Global Logger
app.use('*', requestLogger);

// Static assets from /public folder
app.use(
  '/static/*',
  serveStatic({
    root: './public',
    rewriteRequestPath: (path) => path.replace(/^\/static/, ''),
  }),
);

// Favicon and icon routes
app.get('/favicon.ico', serveStatic({ path: './public/icon.webp' }));
app.get('/favicon.webp', serveStatic({ path: './public/icon.webp' }));
app.get('/favicon.svg', serveStatic({ path: './public/favicon.svg' }));

// Public Health Check (No Auth required for Docker/Coolify health probes)
app.route('/health', healthRoutes);

// Public Login & Logout Routes (Not behind Auth Middleware)
app.get('/login', async (c) => {
  if (!config.auth.enabled) {
    return c.redirect('/');
  }
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
  if (cookieToken && config.auth.user && config.auth.pass) {
    const valid = await generateSessionToken(config.auth.user, config.auth.pass);
    if (cookieToken === valid) return c.redirect('/');
  }
  return c.html(renderLoginPage());
});

app.post('/login', async (c) => {
  if (!config.auth.enabled) {
    return c.redirect('/');
  }
  const body = await c.req.parseBody();
  const username = String(body.username || '').trim();
  const password = String(body.password || '').trim();

  if (username === config.auth.user && password === config.auth.pass) {
    const token = await generateSessionToken(config.auth.user, config.auth.pass);
    setCookie(c, SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return c.redirect('/');
  }

  return c.html(renderLoginPage('Invalid username or password'), 401);
});

app.get('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.redirect('/login');
});

// Auth Middleware for Dashboard & Management API
const authMiddleware = createAuthMiddleware(config.auth);
app.use('/', authMiddleware);
app.use('/api/*', authMiddleware);

// Main Dashboard
app.get('/', (c) => {
  return c.html(renderDashboardPage(config.auth.enabled));
});

// Process API Routes
const processRoutes = createProcessRoutes(
  listProcessesUseCase,
  manageProcessUseCase,
  getLogsUseCase,
);
app.route('/api/processes', processRoutes);

// 404 Handler
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// Error Handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error('[App Error]', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: config.env === 'development' ? err.message : undefined,
    },
    500,
  );
});

// 5. Server Startup
const server = Bun.serve({
  port: config.port,
  hostname: config.host,
  fetch: app.fetch,
});

console.log('');
console.log('='.repeat(56));
console.log('  PM2 EID Is Discord Dashboard');
console.log('  Core Red Project');
console.log('='.repeat(56));
console.log(`  Runtime:      Bun v${Bun.version}`);
console.log(`  Host:         ${config.host}`);
console.log(`  Port:         ${config.port}`);
console.log(
  `  URL:          http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`,
);
console.log(
  `  Auth:         ${config.auth.enabled ? `Enabled (User: ${config.auth.user})` : 'Disabled (Localhost/VPN mode)'}`,
);
console.log(
  `  Webhook:      ${config.webhook.enabled ? `Enabled (${config.webhook.format.toUpperCase()} format)` : 'Disabled'}`,
);
if (config.pm2Home) {
  console.log(`  PM2_HOME:     ${config.pm2Home}`);
}
console.log('='.repeat(56));
console.log('');

// Graceful shutdown handling
const shutdown = (signal: string) => {
  console.log(`\n[${signal}] Gracefully shutting down...`);
  server.stop();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
