import type { ProcessEntity } from '../../../domain/process.entity.ts';

export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
      return 'status-online';
    case 'stopped':
      return 'status-stopped';
    case 'errored':
      return 'status-errored';
    case 'launching':
      return 'status-launching';
    default:
      return 'status-unknown';
  }
}

export function renderProcessTable(processes: ProcessEntity[]): string {
  if (!processes || processes.length === 0) {
    return `
      <div class="empty-state">
        <p>No PM2 processes found</p>
        <p class="hint">Start a process on the server with: <code>pm2 start app.js</code></p>
      </div>
    `;
  }

  const rows = processes
    .map((proc) => {
      const statusClass = getStatusBadgeClass(proc.status);
      const isRunning = proc.status === 'online';
      const escapedName = escapeHtml(proc.name);
      const encodedName = encodeURIComponent(proc.name);

      return `
      <tr class="process-row" data-process="${escapedName}">
        <td class="col-id">${proc.pm_id}</td>
        <td class="col-name">
          <span class="process-name">${escapedName}</span>
        </td>
        <td class="col-status">
          <span class="status-badge ${statusClass}">${escapeHtml(proc.status)}</span>
        </td>
        <td class="col-cpu">${proc.cpu.toFixed(1)}%</td>
        <td class="col-memory">${escapeHtml(proc.memoryFormatted)}</td>
        <td class="col-restarts">${proc.restarts}</td>
        <td class="col-uptime">${escapeHtml(proc.uptimeFormatted)}</td>
        <td class="col-actions">
          <div class="action-buttons">
            ${
              isRunning
                ? `
              <button class="btn btn-stop" 
                      hx-post="/api/processes/${encodedName}/stop"
                      hx-target="#process-table"
                      hx-swap="innerHTML"
                      hx-confirm="Stop process &quot;${escapedName}&quot;?">
                Stop
              </button>
              <button class="btn btn-restart"
                      hx-post="/api/processes/${encodedName}/restart"
                      hx-target="#process-table"
                      hx-swap="innerHTML">
                Restart
              </button>
            `
                : `
              <button class="btn btn-start"
                      hx-post="/api/processes/${encodedName}/start"
                      hx-target="#process-table"
                      hx-swap="innerHTML">
                Start
              </button>
            `
            }
            <button class="btn btn-delete"
                    hx-post="/api/processes/${encodedName}/delete"
                    hx-target="#process-table"
                    hx-swap="innerHTML"
                    hx-confirm="Delete process &quot;${escapedName}&quot;? This cannot be undone.">
              Delete
            </button>
            <button class="btn btn-logs"
                    hx-get="/api/processes/${encodedName}/logs-section"
                    hx-target="#logs-mount"
                    hx-swap="innerHTML">
              Logs
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');

  return `
    <table class="process-table">
      <thead>
        <tr>
          <th class="col-id">ID</th>
          <th class="col-name">Name</th>
          <th class="col-status">Status</th>
          <th class="col-cpu">CPU</th>
          <th class="col-memory">Memory</th>
          <th class="col-restarts">Restarts</th>
          <th class="col-uptime">Uptime</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export function renderErrorMessage(message: string): string {
  return `<div class="alert alert-error">${escapeHtml(message)}</div>`;
}
