/**
 * @fileoverview REST and HTMX process management routes.
 * Provides process lifecycle actions, safe log streams, deep inspection, and cluster scaling.
 * @module presentation/routes/process
 */

import { Hono } from 'hono';
import type { GetLogsUseCase } from '../../application/use-cases/get-logs.use-case.ts';
import type { GetProcessDetailUseCase } from '../../application/use-cases/get-process-detail.use-case.ts';
import type { ListProcessesUseCase } from '../../application/use-cases/list-processes.use-case.ts';
import type { ManageProcessUseCase } from '../../application/use-cases/manage-process.use-case.ts';
import type { ScaleProcessUseCase } from '../../application/use-cases/scale-process.use-case.ts';
import type { ProcessAction } from '../../domain/process.entity.ts';
import { getTranslations, resolveLocale } from '../i18n/i18n.service.ts';
import { LogContent, LogsSection } from '../views/components/LogViewer.tsx';
import { ProcessDetailModal } from '../views/components/ProcessDetailModal.tsx';
import { ProcessTable } from '../views/components/ProcessTable.tsx';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Partial markup component for presenting localized error banners in HTMX targets.
 */
function ErrorMessage({ message }: { message: string }) {
  return <div class="alert alert-error">{message}</div>;
}

/** Supported process lifecycle actions with identical table re-rendering behavior */
const LIFECYCLE_ACTIONS: readonly ProcessAction[] = [
  'start',
  'stop',
  'restart',
  'reload',
  'delete',
] as const;

/**
 * Creates the Hono router for process management endpoints.
 */
export function createProcessRoutes(
  listUseCase: ListProcessesUseCase,
  manageUseCase: ManageProcessUseCase,
  logsUseCase: GetLogsUseCase,
  detailUseCase: GetProcessDetailUseCase,
  scaleUseCase: ScaleProcessUseCase,
) {
  const router = new Hono();

  /**
   * GET /api/processes
   * Returns list of all PM2 processes (HTML table for HTMX, JSON otherwise)
   */
  router.get('/', async (c) => {
    const isHtmx = Boolean(c.req.header('hx-request'));
    const locale = resolveLocale(c);
    const t = getTranslations(locale);

    try {
      const processes = await listUseCase.execute();
      if (isHtmx) {
        return c.html(<ProcessTable processes={processes} t={t} />);
      }
      return c.json(processes);
    } catch (err: any) {
      console.error('[ProcessRoutes] Error listing processes:', err?.message || err);
      if (isHtmx) {
        return c.html(<ErrorMessage message={t.alerts.daemonFailed} />);
      }
      return c.json({ error: 'Failed to list processes' }, 500);
    }
  });

  /**
   * POST /api/processes/:name/:action (start, stop, restart, reload, delete)
   * Unified lifecycle action handlers.
   */
  for (const action of LIFECYCLE_ACTIONS) {
    router.post(`/:name/${action}`, async (c) => {
      const name = c.req.param('name');
      const isHtmx = Boolean(c.req.header('hx-request'));
      const locale = resolveLocale(c);
      const t = getTranslations(locale);

      try {
        await manageUseCase.execute(action, name);
        if (isHtmx) {
          await sleep(400);
          const processes = await listUseCase.execute();
          return c.html(<ProcessTable processes={processes} t={t} />);
        }
        return c.json({ success: true, action, process: name });
      } catch (err: any) {
        console.error(
          `[ProcessRoutes] Error executing '${action}' on '${name}':`,
          err?.message || err,
        );
        if (isHtmx) {
          return c.html(
            <ErrorMessage message={t.alerts.actionError(action, 'Operation failed')} />,
          );
        }
        return c.json({ error: `Failed to ${action} process` }, 500);
      }
    });
  }

  /**
   * POST /api/processes/:name/flush
   * Flushes log files for the target process.
   */
  router.post('/:name/flush', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));
    const locale = resolveLocale(c);
    const t = getTranslations(locale);

    try {
      await manageUseCase.execute('flush', name);
      if (isHtmx) {
        return c.html(<div class="alert alert-success">{t.logs.flushSuccess}</div>);
      }
      return c.json({ success: true, action: 'flush', process: name });
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error flushing '${name}':`, err?.message || err);
      if (isHtmx) {
        return c.html(<ErrorMessage message={t.alerts.actionError('flush', 'Operation failed')} />);
      }
      return c.json({ error: 'Failed to flush logs' }, 500);
    }
  });

  /**
   * Helper to parse and strictly validate the 'lines' query parameter.
   */
  function parseLinesParam(queryVal: string | undefined): { lines: number; error?: string } {
    if (queryVal === undefined) {
      return { lines: 100 };
    }
    const n = Number(queryVal);
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
      return {
        lines: 100,
        error: "Invalid 'lines' parameter. Must be an integer between 1 and 1000.",
      };
    }
    return { lines: n };
  }

  /**
   * GET /api/processes/:name/logs
   */
  router.get('/:name/logs', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));
    const parsed = parseLinesParam(c.req.query('lines'));

    if (parsed.error) {
      if (isHtmx) {
        return c.html(<ErrorMessage message={parsed.error} />);
      }
      return c.json({ error: parsed.error }, 400);
    }

    try {
      const result = await logsUseCase.execute(name, 'stdout', parsed.lines);
      if (isHtmx) {
        return c.html(<LogContent logs={result.content} type="stdout" />);
      }
      return c.json(result);
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error getting logs for '${name}':`, err?.message || err);
      if (isHtmx) {
        return c.html(<LogContent logs="Error reading logs" type="error" />);
      }
      return c.json({ error: 'Failed to get logs' }, 500);
    }
  });

  /**
   * GET /api/processes/:name/errors
   */
  router.get('/:name/errors', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));
    const parsed = parseLinesParam(c.req.query('lines'));

    if (parsed.error) {
      if (isHtmx) {
        return c.html(<ErrorMessage message={parsed.error} />);
      }
      return c.json({ error: parsed.error }, 400);
    }

    try {
      const result = await logsUseCase.execute(name, 'stderr', parsed.lines);
      if (isHtmx) {
        return c.html(<LogContent logs={result.content} type="stderr" />);
      }
      return c.json(result);
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error getting error logs for '${name}':`, err?.message || err);
      if (isHtmx) {
        return c.html(<LogContent logs="Error reading error logs" type="error" />);
      }
      return c.json({ error: 'Failed to get error logs' }, 500);
    }
  });

  /**
   * GET /api/processes/:name/logs-section
   * Returns the entire logs drawer pre-rendered with HTMX tabs
   */
  router.get('/:name/logs-section', async (c) => {
    const name = c.req.param('name');
    const locale = resolveLocale(c);
    const t = getTranslations(locale);

    try {
      const result = await logsUseCase.execute(name, 'stdout', 100);
      return c.html(
        <LogsSection processName={name} initialLogs={result.content} type="stdout" t={t} />,
      );
    } catch (err: any) {
      console.error(
        `[ProcessRoutes] Error rendering logs section for '${name}':`,
        err?.message || err,
      );
      return c.html(
        <LogsSection processName={name} initialLogs="Error loading logs" type="stdout" t={t} />,
      );
    }
  });

  /**
   * GET /api/processes/:name/detail
   */
  router.get('/:name/detail', async (c) => {
    const name = c.req.param('name');
    const locale = resolveLocale(c);
    const t = getTranslations(locale);
    const isHtmx = Boolean(c.req.header('hx-request'));

    try {
      const detail = await detailUseCase.execute(name);
      if (!detail) {
        if (isHtmx) {
          return c.html(<ErrorMessage message={`Process "${name}" not found`} />);
        }
        return c.json({ error: 'Process not found' }, 404);
      }
      if (isHtmx) {
        return c.html(<ProcessDetailModal detail={detail} t={t} />);
      }
      return c.json(detail);
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error describing '${name}':`, err?.message || err);
      if (isHtmx) {
        return c.html(<ErrorMessage message="Failed to inspect process" />);
      }
      return c.json({ error: 'Failed to inspect process' }, 500);
    }
  });

  /**
   * POST /api/processes/:name/scale
   */
  router.post('/:name/scale', async (c) => {
    const name = c.req.param('name');
    const locale = resolveLocale(c);
    const t = getTranslations(locale);
    const isHtmx = Boolean(c.req.header('hx-request'));

    let rawInstances: string | undefined = c.req.query('instances');
    if (rawInstances === undefined) {
      const body = c.req.header('content-type')?.includes('application/json')
        ? await c.req.json().catch(() => ({}))
        : await c.req.parseBody().catch(() => ({}));
      if (body.instances !== undefined) {
        rawInstances = String(body.instances);
      }
    }

    if (rawInstances === undefined) {
      const msg = "Missing required 'instances' parameter.";
      if (isHtmx) {
        return c.html(<ErrorMessage message={msg} />);
      }
      return c.json({ error: msg }, 400);
    }

    const n = Number(rawInstances);
    if (!Number.isInteger(n) || n < 1 || n > 32) {
      const msg = "Invalid 'instances' parameter. Must be an integer between 1 and 32.";
      if (isHtmx) {
        return c.html(<ErrorMessage message={msg} />);
      }
      return c.json({ error: msg }, 400);
    }

    const instances = n;

    try {
      await scaleUseCase.execute(name, instances);
      await sleep(400);
      const detail = await detailUseCase.execute(name);
      if (isHtmx && detail) {
        return c.html(<ProcessDetailModal detail={detail} t={t} />);
      }
      return c.json({ success: true, process: name, instances });
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error scaling '${name}':`, err?.message || err);
      if (isHtmx) {
        return c.html(<ErrorMessage message="Failed to scale process" />);
      }
      return c.json({ error: 'Failed to scale process' }, 500);
    }
  });

  return router;
}
