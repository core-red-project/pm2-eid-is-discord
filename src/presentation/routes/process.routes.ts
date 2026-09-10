import { Hono } from 'hono';
import type { GetLogsUseCase } from '../../application/use-cases/get-logs.use-case.ts';
import type { ListProcessesUseCase } from '../../application/use-cases/list-processes.use-case.ts';
import type { ManageProcessUseCase } from '../../application/use-cases/manage-process.use-case.ts';
import { renderLogContent, renderLogsSection } from '../views/components/log-viewer.ts';
import { renderErrorMessage, renderProcessTable } from '../views/components/process-table.ts';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createProcessRoutes(
  listUseCase: ListProcessesUseCase,
  manageUseCase: ManageProcessUseCase,
  logsUseCase: GetLogsUseCase,
) {
  const router = new Hono();

  /**
   * GET /api/processes
   * Returns list of all PM2 processes (HTML table for HTMX, JSON otherwise)
   */
  router.get('/', async (c) => {
    const isHtmx = Boolean(c.req.header('hx-request'));
    try {
      const processes = await listUseCase.execute();
      if (isHtmx) {
        return c.html(renderProcessTable(processes));
      }
      return c.json(processes);
    } catch (err: any) {
      console.error('[ProcessRoutes] Error listing processes:', err.message);
      if (isHtmx) {
        return c.html(
          renderErrorMessage(
            'Failed to connect to PM2 daemon. Make sure PM2 is running on the host.',
          ),
        );
      }
      return c.json({ error: 'Failed to list processes', message: err.message }, 500);
    }
  });

  /**
   * POST /api/processes/:name/start
   */
  router.post('/:name/start', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));

    try {
      await manageUseCase.execute('start', name);
      if (isHtmx) {
        await sleep(400);
        const processes = await listUseCase.execute();
        return c.html(renderProcessTable(processes));
      }
      return c.json({ success: true, action: 'start', process: name });
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error starting ${name}:`, err.message);
      if (isHtmx) return c.html(renderErrorMessage(`Failed to start process: ${err.message}`));
      return c.json({ error: 'Failed to start process', message: err.message }, 500);
    }
  });

  /**
   * POST /api/processes/:name/stop
   */
  router.post('/:name/stop', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));

    try {
      await manageUseCase.execute('stop', name);
      if (isHtmx) {
        await sleep(400);
        const processes = await listUseCase.execute();
        return c.html(renderProcessTable(processes));
      }
      return c.json({ success: true, action: 'stop', process: name });
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error stopping ${name}:`, err.message);
      if (isHtmx) return c.html(renderErrorMessage(`Failed to stop process: ${err.message}`));
      return c.json({ error: 'Failed to stop process', message: err.message }, 500);
    }
  });

  /**
   * POST /api/processes/:name/restart
   */
  router.post('/:name/restart', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));

    try {
      await manageUseCase.execute('restart', name);
      if (isHtmx) {
        await sleep(400);
        const processes = await listUseCase.execute();
        return c.html(renderProcessTable(processes));
      }
      return c.json({ success: true, action: 'restart', process: name });
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error restarting ${name}:`, err.message);
      if (isHtmx) return c.html(renderErrorMessage(`Failed to restart process: ${err.message}`));
      return c.json({ error: 'Failed to restart process', message: err.message }, 500);
    }
  });

  /**
   * POST /api/processes/:name/reload
   */
  router.post('/:name/reload', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));

    try {
      await manageUseCase.execute('reload', name);
      if (isHtmx) {
        await sleep(400);
        const processes = await listUseCase.execute();
        return c.html(renderProcessTable(processes));
      }
      return c.json({ success: true, action: 'reload', process: name });
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error reloading ${name}:`, err.message);
      if (isHtmx) return c.html(renderErrorMessage(`Failed to reload process: ${err.message}`));
      return c.json({ error: 'Failed to reload process', message: err.message }, 500);
    }
  });

  /**
   * POST /api/processes/:name/delete
   */
  router.post('/:name/delete', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));

    try {
      await manageUseCase.execute('delete', name);
      if (isHtmx) {
        await sleep(400);
        const processes = await listUseCase.execute();
        return c.html(renderProcessTable(processes));
      }
      return c.json({ success: true, action: 'delete', process: name });
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error deleting ${name}:`, err.message);
      if (isHtmx) return c.html(renderErrorMessage(`Failed to delete process: ${err.message}`));
      return c.json({ error: 'Failed to delete process', message: err.message }, 500);
    }
  });

  /**
   * POST /api/processes/:name/flush
   */
  router.post('/:name/flush', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));

    try {
      await manageUseCase.execute('flush', name);
      if (isHtmx) {
        return c.html('<div class="alert alert-success">Logs flushed successfully</div>');
      }
      return c.json({ success: true, action: 'flush', process: name });
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error flushing ${name}:`, err.message);
      if (isHtmx) return c.html(renderErrorMessage(`Failed to flush logs: ${err.message}`));
      return c.json({ error: 'Failed to flush logs', message: err.message }, 500);
    }
  });

  /**
   * GET /api/processes/:name/logs
   */
  router.get('/:name/logs', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));
    const lines = parseInt(c.req.query('lines') || '100', 10);

    try {
      const result = await logsUseCase.execute(name, 'stdout', lines);
      if (isHtmx) {
        return c.html(renderLogContent(result.content, 'stdout'));
      }
      return c.json(result);
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error getting logs for ${name}:`, err.message);
      if (isHtmx) return c.html(renderLogContent(`Error reading logs: ${err.message}`, 'error'));
      return c.json({ error: 'Failed to get logs', message: err.message }, 500);
    }
  });

  /**
   * GET /api/processes/:name/errors
   */
  router.get('/:name/errors', async (c) => {
    const name = c.req.param('name');
    const isHtmx = Boolean(c.req.header('hx-request'));
    const lines = parseInt(c.req.query('lines') || '100', 10);

    try {
      const result = await logsUseCase.execute(name, 'stderr', lines);
      if (isHtmx) {
        return c.html(renderLogContent(result.content, 'stderr'));
      }
      return c.json(result);
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error getting error logs for ${name}:`, err.message);
      if (isHtmx)
        return c.html(renderLogContent(`Error reading error logs: ${err.message}`, 'error'));
      return c.json({ error: 'Failed to get error logs', message: err.message }, 500);
    }
  });

  /**
   * GET /api/processes/:name/logs-section
   * Returns the entire logs drawer pre-rendered with HTMX tabs
   */
  router.get('/:name/logs-section', async (c) => {
    const name = c.req.param('name');
    try {
      const result = await logsUseCase.execute(name, 'stdout', 100);
      return c.html(renderLogsSection(name, result.content, 'stdout'));
    } catch (err: any) {
      console.error(`[ProcessRoutes] Error rendering logs section for ${name}:`, err.message);
      return c.html(renderLogsSection(name, `Error loading logs: ${err.message}`, 'stdout'));
    }
  });

  return router;
}
