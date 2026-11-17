/**
 * @fileoverview Process management table component with HTMX action triggers.
 * @module presentation/views/components/ProcessTable
 */

import type { ProcessEntity } from '../../../domain/process.entity.ts';
import type { Translations } from '../../i18n/types.ts';

/**
 * Maps a process status string to its corresponding CSS badge class.
 * @param status - Raw PM2 status string.
 * @returns CSS class name.
 */
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

/**
 * Properties for rendering the process table.
 */
interface ProcessTableProps {
  /** Array of process entities */
  processes: ProcessEntity[];
  /** Active translation catalog */
  t: Translations;
}

/**
 * Component rendering the responsive processes table with start, stop, restart, delete, inspect, and log actions.
 */
export function ProcessTable({ processes, t }: ProcessTableProps) {
  if (!processes || processes.length === 0) {
    return (
      <div class="empty-state">
        <p>{t.table.emptyTitle}</p>
        <p class="hint">{t.table.emptyHint}</p>
      </div>
    );
  }

  return (
    <table class="process-table">
      <thead>
        <tr>
          <th class="col-id">{t.table.colId}</th>
          <th class="col-name">{t.table.colName}</th>
          <th class="col-status">{t.table.colStatus}</th>
          <th class="col-cpu">{t.table.colCpu}</th>
          <th class="col-memory">{t.table.colMemory}</th>
          <th class="col-restarts">{t.table.colRestarts}</th>
          <th class="col-uptime">{t.table.colUptime}</th>
          <th class="col-actions">{t.table.colActions}</th>
        </tr>
      </thead>
      <tbody>
        {processes.map((proc) => {
          const statusClass = getStatusBadgeClass(proc.status);
          const isRunning = proc.status === 'online';
          const encodedName = encodeURIComponent(proc.name);

          return (
            <tr class="process-row" data-process={proc.name} key={proc.pm_id}>
              <td class="col-id">{proc.pm_id}</td>
              <td class="col-name">
                <span class="process-name">{proc.name}</span>
              </td>
              <td class="col-status">
                <span class={`status-badge ${statusClass}`}>{proc.status}</span>
              </td>
              <td class="col-cpu">{proc.cpu.toFixed(1)}%</td>
              <td class="col-memory">{proc.memoryFormatted}</td>
              <td class="col-restarts">{proc.restarts}</td>
              <td class="col-uptime">{proc.uptimeFormatted}</td>
              <td class="col-actions">
                <div class="action-buttons">
                  {isRunning ? (
                    <>
                      <button
                        type="button"
                        class="btn btn-stop"
                        hx-post={`/api/processes/${encodedName}/stop`}
                        hx-target="#process-table"
                        hx-swap="innerHTML"
                        hx-confirm={t.confirm.stop(proc.name)}
                      >
                        {t.table.btnStop}
                      </button>
                      <button
                        type="button"
                        class="btn btn-restart"
                        hx-post={`/api/processes/${encodedName}/restart`}
                        hx-target="#process-table"
                        hx-swap="innerHTML"
                      >
                        {t.table.btnRestart}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      class="btn btn-start"
                      hx-post={`/api/processes/${encodedName}/start`}
                      hx-target="#process-table"
                      hx-swap="innerHTML"
                    >
                      {t.table.btnStart}
                    </button>
                  )}
                  <button
                    type="button"
                    class="btn btn-delete"
                    hx-post={`/api/processes/${encodedName}/delete`}
                    hx-target="#process-table"
                    hx-swap="innerHTML"
                    hx-confirm={t.confirm.delete(proc.name)}
                  >
                    {t.table.btnDelete}
                  </button>
                  <button
                    type="button"
                    class="btn btn-logs"
                    hx-get={`/api/processes/${encodedName}/logs-section`}
                    hx-target="#logs-mount"
                    hx-swap="innerHTML"
                  >
                    {t.table.btnLogs}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary"
                    hx-get={`/api/processes/${encodedName}/detail`}
                    hx-target="#detail-mount"
                    hx-swap="innerHTML"
                  >
                    {t.table.btnInspect}
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Component displaying an error alert message.
 */
export function ErrorMessage({ message }: { message: string }) {
  return <div class="alert alert-error">{message}</div>;
}
