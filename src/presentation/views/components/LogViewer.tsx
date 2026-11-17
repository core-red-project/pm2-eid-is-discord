/**
 * @fileoverview Log viewer and log content stream components for HTMX partials.
 * @module presentation/views/components/LogViewer
 */

import type { Translations } from '../../i18n/types.ts';

/**
 * Properties for rendering raw preformatted log content.
 */
interface LogContentProps {
  /** Log output text content */
  logs: string;
  /** Channel stream type */
  type: 'stdout' | 'stderr' | 'error';
}

/**
 * Component that formats and styles stdout, stderr, or error log streams.
 */
export function LogContent({ logs, type }: LogContentProps) {
  const typeClass = type === 'stderr' || type === 'error' ? 'log-error' : 'log-stdout';
  return <pre class={`log-content ${typeClass}`}>{logs}</pre>;
}

/**
 * Properties for rendering the full interactive log viewer section.
 */
interface LogsSectionProps {
  /** Target process name */
  processName: string;
  /** Initial tail logs payload */
  initialLogs: string;
  /** Initial active tab */
  type?: 'stdout' | 'stderr';
  /** Translation catalog */
  t: Translations;
}

/**
 * Component rendering the interactive log viewer drawer with tabs and flush controls.
 */
export function LogsSection({ processName, initialLogs, type = 'stdout', t }: LogsSectionProps) {
  const encodedName = encodeURIComponent(processName);

  return (
    <section class="section logs-section" id="active-logs-section">
      <div class="section-header">
        <h2>{t.logs.title(processName)}</h2>
        <div class="logs-actions">
          <button
            type="button"
            class={`btn btn-tab ${type === 'stdout' ? 'active' : ''}`}
            hx-get={`/api/processes/${encodedName}/logs`}
            hx-target="#logs-display-area"
            hx-swap="innerHTML"
          >
            {t.logs.tabStdout}
          </button>
          <button
            type="button"
            class={`btn btn-tab ${type === 'stderr' ? 'active' : ''}`}
            hx-get={`/api/processes/${encodedName}/errors`}
            hx-target="#logs-display-area"
            hx-swap="innerHTML"
          >
            {t.logs.tabStderr}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            hx-get={`/api/processes/${encodedName}/logs`}
            hx-target="#logs-display-area"
            hx-swap="innerHTML"
          >
            {t.header.refresh}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            hx-post={`/api/processes/${encodedName}/flush`}
            hx-target="#logs-display-area"
            hx-swap="innerHTML"
            hx-confirm={t.confirm.flush(processName)}
          >
            {t.logs.btnFlush}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            id="btn-close-logs"
            data-action="close-logs"
          >
            {t.logs.btnClose}
          </button>
        </div>
      </div>
      <div class="logs-container">
        <div id="logs-display-area" class="logs-content">
          <LogContent logs={initialLogs} type={type} />
        </div>
      </div>
    </section>
  );
}
