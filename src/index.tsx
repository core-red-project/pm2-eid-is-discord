/**
 * @file index.tsx
 * @description Application bootstrap and main entry point for the PM2 EID Dashboard.
 * Supports dual-runtime execution (native Bun or Node.js 20+ via `@hono/node-server`),
 * mounts presentation routes, wires domain use cases with infrastructure adapters,
 * and configures graceful shutdown handling.
 * @module index
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

// Ensure PM2 version check (version.pm2.io) is disabled by default
process.env.PM2_DISABLE_VERSION_CHECK = process.env.PM2_DISABLE_VERSION_CHECK || '1';

const currentFilename = fileURLToPath(import.meta.url);
const currentDirname = dirname(currentFilename);

/**
 * Resolves the absolute path to the static assets directory across development
 * and bundled production distributions (tsup / npm package).
 *
 * Checks in order:
 * 1. `../public` (relative to `dist/` or `src/`)
 * 2. `./public` (sibling to compiled index)
 * 3. `process.cwd()/public` (working directory fallback)
 *
 * @returns Absolute filesystem path to the public assets directory.
 */
function resolvePublicDir(): string {
  const parentPublic = resolve(currentDirname, '../public');
  if (existsSync(parentPublic)) {
    return parentPublic;
  }
  const siblingPublic = resolve(currentDirname, './public');
  if (existsSync(siblingPublic)) {
    return siblingPublic;
  }
  const cwdPublic = resolve(process.cwd(), 'public');
  if (existsSync(cwdPublic)) {
    return cwdPublic;
  }
  return parentPublic;
}

const publicDir = resolvePublicDir();

// Application Use Cases
import { GetLogsUseCase } from './application/use-cases/get-logs.use-case.ts';
import { GetProcessDetailUseCase } from './application/use-cases/get-process-detail.use-case.ts';
import { GetSystemMetricsUseCase } from './application/use-cases/get-system-metrics.use-case.ts';
import { ListProcessesUseCase } from './application/use-cases/list-processes.use-case.ts';
import { ManageProcessUseCase } from './application/use-cases/manage-process.use-case.ts';
import { NotifyEventUseCase } from './application/use-cases/notify-event.use-case.ts';
import { SaveProcessesUseCase } from './application/use-cases/save-processes.use-case.ts';
import { ScaleProcessUseCase } from './application/use-cases/scale-process.use-case.ts';

// Infrastructure
import { config } from './infrastructure/config/env.ts';
import { WebhookDispatcher } from './infrastructure/notifications/webhook-dispatcher.ts';
import { PM2BusListener } from './infrastructure/pm2/pm2-bus-listener.ts';
import { PM2ClientRepository } from './infrastructure/pm2/pm2-client.ts';
import { MetricsHistoryService } from './infrastructure/metrics/metrics-history.service.ts';

// Presentation & i18n
import { getTranslations, resolveLocale } from './presentation/i18n/i18n.service.ts';
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
} from './presentation/middlewares/auth.middleware.ts';
import { requestLogger } from './presentation/middlewares/logger.middleware.ts';
import { healthRoutes } from './presentation/routes/health.routes.ts';
import { createProcessRoutes } from './presentation/routes/process.routes.tsx';
import { SystemMetricsWidget } from './presentation/views/components/SystemMetricsWidget.tsx';
import { DashboardPage } from './presentation/views/pages/DashboardPage.tsx';
import { LoginPage } from './presentation/views/pages/LoginPage.tsx';

// 1. Initialize Repositories and Services
const pm2Repository = new PM2ClientRepository();
const webhookDispatcher = new WebhookDispatcher(config.webhook);

// 2. Initialize Use Cases
const listProcessesUseCase = new ListProcessesUseCase(pm2Repository);
const manageProcessUseCase = new ManageProcessUseCase(pm2Repository);
const getLogsUseCase = new GetLogsUseCase(pm2Repository);
const notifyEventUseCase = new NotifyEventUseCase([webhookDispatcher]);
const saveProcessesUseCase = new SaveProcessesUseCase(pm2Repository);
const scaleProcessUseCase = new ScaleProcessUseCase(pm2Repository);
const getProcessDetailUseCase = new GetProcessDetailUseCase(pm2Repository);
const getSystemMetricsUseCase = new GetSystemMetricsUseCase(pm2Repository);

// 3. Initialize In-Memory Metrics History Service (1-hour zero-DB rolling buffer)
const metricsHistoryService = new MetricsHistoryService(getSystemMetricsUseCase);
metricsHistoryService.start(60000);

// 4. Start PM2 Real-time Bus Listener if Webhook is enabled
if (config.webhook.enabled) {
  const busListener = new PM2BusListener(notifyEventUseCase);
  busListener.start();
}

// 5. Create Hono Application
const app = new Hono();

// Global Logger
app.use('*', requestLogger);

// Security Headers & Content Security Policy (CSP)
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';",
  );
  await next();
});

// Static assets from public folder
app.use(
  '/static/*',
  serveStatic({
    root: publicDir,
    rewriteRequestPath: (path) => path.replace(/^\/static/, ''),
  }),
);

// Favicon and icon routes
app.get('/favicon.ico', serveStatic({ path: join(publicDir, 'icon.webp') }));
app.get('/favicon.webp', serveStatic({ path: join(publicDir, 'icon.webp') }));
app.get('/favicon.svg', serveStatic({ path: join(publicDir, 'favicon.svg') }));

// Public Health Check (No Auth required for Docker/Coolify health probes)
app.route('/health', healthRoutes);

// Public Login & Logout Routes (Not behind Auth Middleware)
app.get('/login', async (c) => {
  if (!config.auth.enabled) {
    return c.redirect('/');
  }
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
  if (cookieToken && validateSession(cookieToken)) {
    return c.redirect('/');
  }
  const locale = resolveLocale(c);
  const t = getTranslations(locale);
  return c.html(<LoginPage t={t} />);
});

app.post('/login', async (c) => {
  if (!config.auth.enabled) {
    return c.redirect('/');
  }

  const clientIp = getClientIp(c);
  const rateCheck = checkLoginRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return c.text(
      `Too many failed login attempts. Please retry in ${rateCheck.retryAfterSec} seconds.`,
      429,
    );
  }

  const body = await c.req.parseBody();
  const username = String(body.username || '').trim();
  const password = String(body.password || ''); // Preserve exact characters without trimming
  const locale = resolveLocale(c);
  const t = getTranslations(locale);

  if (
    config.auth.user &&
    config.auth.pass &&
    safeCompare(username, config.auth.user) &&
    safeCompare(password, config.auth.pass)
  ) {
    clearLoginAttempts(clientIp);
    const sessionToken = createSession(config.auth.user);
    const isHttps = c.req.url.startsWith('https:') || c.req.header('x-forwarded-proto') === 'https';

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: isHttps,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return c.redirect('/');
  }

  recordFailedLogin(clientIp);
  return c.html(<LoginPage errorMessage={t.login.invalidError} t={t} />, 401);
});

// Safe redirect for GET logout, state-changing revocation on POST logout
app.get('/logout', (c) => c.redirect('/login'));

app.post('/logout', (c) => {
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
  if (cookieToken) {
    revokeSession(cookieToken);
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.redirect('/login');
});

// Auth Middleware for Dashboard & Management API
const authMiddleware = createAuthMiddleware(config.auth);
app.use('/', authMiddleware);
app.use('/api/*', authMiddleware);

// Main Dashboard
app.get('/', async (c) => {
  const locale = resolveLocale(c);
  const t = getTranslations(locale);
  const metrics = await getSystemMetricsUseCase.execute();
  const cpuSparkline = metricsHistoryService.renderSparklineSvg('cpu');
  const ramSparkline = metricsHistoryService.renderSparklineSvg('memoryPercent');
  return c.html(
    <DashboardPage
      hasAuth={config.auth.enabled}
      systemMetrics={metrics}
      t={t}
      cpuSparkline={cpuSparkline}
      ramSparkline={ramSparkline}
    />,
  );
});

// Process API Routes
const processRoutes = createProcessRoutes(
  listProcessesUseCase,
  manageProcessUseCase,
  getLogsUseCase,
  getProcessDetailUseCase,
  scaleProcessUseCase,
);
app.route('/api/processes', processRoutes);

// PM2 State Persistence (pm2.dump / pm2 save)
app.post('/api/pm2/save', async (c) => {
  const locale = resolveLocale(c);
  const t = getTranslations(locale);
  const isHtmx = Boolean(c.req.header('hx-request'));

  try {
    await saveProcessesUseCase.execute();
    if (isHtmx) {
      return c.html(
        <div class="alert alert-success" style="margin-bottom: 1.5rem;">
          {t.header.saveSuccess}
        </div>,
      );
    }
    return c.json({ success: true, message: t.header.saveSuccess });
  } catch (err: any) {
    console.error('[PM2 Save Error]', err?.message || err);
    if (isHtmx) {
      return c.html(
        <div class="alert alert-error" style="margin-bottom: 1.5rem;">
          Failed to save PM2 state
        </div>,
      );
    }
    return c.json({ error: 'Failed to save PM2 state' }, 500);
  }
});

// System Metrics Endpoint
app.get('/api/system/metrics', async (c) => {
  const locale = resolveLocale(c);
  const t = getTranslations(locale);
  const isHtmx = Boolean(c.req.header('hx-request'));

  const metrics = await getSystemMetricsUseCase.execute();
  const cpuSparkline = metricsHistoryService.renderSparklineSvg('cpu');
  const ramSparkline = metricsHistoryService.renderSparklineSvg('memoryPercent');

  if (isHtmx) {
    return c.html(
      <SystemMetricsWidget
        metrics={metrics}
        t={t}
        cpuSparkline={cpuSparkline}
        ramSparkline={ramSparkline}
      />,
    );
  }
  return c.json(metrics);
});

// System Metrics History Endpoint (Rolling 1-hour in-memory buffer)
app.get('/api/system/metrics/history', (c) => {
  return c.json(metricsHistoryService.getHistory());
});

// Global Error Handler
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

// 5. Dual-Runtime Server Startup (Bun or Node.js)
const isBun = typeof (globalThis as any).Bun !== 'undefined';
const runtimeName = isBun
  ? `Bun v${(globalThis as any).Bun.version}`
  : `Node.js ${process.version}`;

let stopServer: () => Promise<void> | void;

if (isBun) {
  const bunServer = (globalThis as any).Bun.serve({
    port: config.port,
    hostname: config.host,
    fetch: app.fetch,
  });
  stopServer = () => {
    bunServer.stop();
  };
} else {
  const { serve } = await import('@hono/node-server');
  const nodeServer = serve({
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  });
  stopServer = () =>
    new Promise((res) => {
      nodeServer.close(() => res());
    });
}

console.log('');
console.log('='.repeat(56));
console.log('  PM2 EID Is Discord Dashboard');
console.log('  Core Red Project');
console.log('='.repeat(56));
console.log(`  Runtime:      ${runtimeName}`);
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

/**
 * Handles graceful process termination upon receiving operating system signals.
 * Stops the active HTTP listener (Bun or Node.js) and terminates with exit code 0.
 *
 * @param signal - The POSIX signal received (`SIGTERM` or `SIGINT`).
 */
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Gracefully shutting down...`);
  try {
    metricsHistoryService.stop();
    if (stopServer) {
      await stopServer();
    }
    pm2Repository.disconnect();
  } catch (err) {
    console.error('Error during shutdown:', err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
