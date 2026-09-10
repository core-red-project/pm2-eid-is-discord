import { escapeHtml } from './process-table.ts';

export function renderLogContent(logs: string, type: 'stdout' | 'stderr' | 'error'): string {
  const typeClass = type === 'stderr' || type === 'error' ? 'log-error' : 'log-stdout';
  return `<pre class="log-content ${typeClass}">${escapeHtml(logs)}</pre>`;
}

export function renderLogsSection(
  processName: string,
  initialLogs: string,
  type: 'stdout' | 'stderr' = 'stdout',
): string {
  const escapedName = escapeHtml(processName);
  const encodedName = encodeURIComponent(processName);

  return `
    <section class="section logs-section" id="active-logs-section">
      <div class="section-header">
        <h2>Logs: <span class="accent">${escapedName}</span></h2>
        <div class="logs-actions">
          <button class="btn btn-tab ${type === 'stdout' ? 'active' : ''}" 
                  hx-get="/api/processes/${encodedName}/logs"
                  hx-target="#logs-display-area"
                  hx-swap="innerHTML"
                  onclick="this.parentElement.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active')); this.classList.add('active');">
            stdout
          </button>
          <button class="btn btn-tab ${type === 'stderr' ? 'active' : ''}" 
                  hx-get="/api/processes/${encodedName}/errors"
                  hx-target="#logs-display-area"
                  hx-swap="innerHTML"
                  onclick="this.parentElement.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active')); this.classList.add('active');">
            stderr
          </button>
          <button class="btn btn-secondary" 
                  hx-get="/api/processes/${encodedName}/logs"
                  hx-target="#logs-display-area"
                  hx-swap="innerHTML">
            Refresh
          </button>
          <button class="btn btn-secondary" 
                  hx-post="/api/processes/${encodedName}/flush"
                  hx-target="#logs-display-area"
                  hx-swap="innerHTML"
                  hx-confirm="Flush logs for &quot;${escapedName}&quot;?">
            Flush
          </button>
          <button class="btn btn-secondary" 
                  onclick="document.getElementById('logs-mount').innerHTML = '';">
            Close
          </button>
        </div>
      </div>
      <div class="logs-container">
        <div id="logs-display-area" class="logs-content">
          ${renderLogContent(initialLogs, type)}
        </div>
      </div>
    </section>
  `;
}
