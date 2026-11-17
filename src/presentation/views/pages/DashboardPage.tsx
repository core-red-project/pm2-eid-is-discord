/**
 * @file DashboardPage.tsx
 * @description Main dashboard page component rendered with Hono JSX.
 * Assembles the application header, system hardware metrics widget, real-time process table,
 * log viewer modal, process detail modal, and HTMX communication hooks.
 * @module presentation/views/pages/DashboardPage
 */

import type { SystemMetricsEntity } from '../../../domain/system-metrics.entity.ts';
import type { Translations } from '../../i18n/types.ts';
import { SystemMetricsWidget } from '../components/SystemMetricsWidget.tsx';

/**
 * Props passed to the {@link DashboardPage} component.
 */
interface DashboardPageProps {
  /** Whether authentication is enabled on the server instance. */
  hasAuth?: boolean | undefined;
  /** Real-time system hardware and operating system metrics snapshot. */
  systemMetrics: SystemMetricsEntity;
  /** Active localized translation bundle. */
  t: Translations;
  /** Optional SVG path data for 60-minute CPU history sparkline */
  cpuSparkline?: { linePath: string; areaPath: string } | undefined;
  /** Optional SVG path data for 60-minute Memory history sparkline */
  ramSparkline?: { linePath: string; areaPath: string } | undefined;
}

/**
 * Renders the full HTML document for the PM2 EID Dashboard.
 *
 * @param props - Component properties containing auth state, system metrics, and translations.
 * @returns Full HTML document markup for the dashboard interface.
 */
export function DashboardPage({
  hasAuth = false,
  systemMetrics,
  t,
  cpuSparkline,
  ramSparkline,
}: DashboardPageProps) {
  const currentLang = t.locale;

  return (
    <html lang={currentLang}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#0d0d0d" />
        <meta
          name="description"
          content="PM2 EID Is Discord Dashboard - Minimal, secure PM2 process manager and dashboard for production infrastructure. Developed by Core Red Project."
        />
        <title>PM2 EID Is Discord Dashboard | Core Red Project</title>
        <link rel="icon" type="image/webp" href="/static/icon.webp" />
        <link rel="apple-touch-icon" href="/static/icon.webp" />
        <link rel="stylesheet" href="/static/css/main.css" />
        <script src="/static/js/htmx.min.js" />
        <script src="/static/js/dashboard.js" defer />
      </head>
      <body>
        <div class="dashboard">
          {/* Header */}
          <header class="header">
            <div class="header-content">
              <img src="/static/icon.webp" alt="PM2 EID Icon" class="header-logo-img" />
              <div class="header-titles">
                <h1 class="logo" title="PM2 EID Is Discord Dashboard">
                  PM2 <span class="accent">EID</span>
                </h1>
                <div class="header-meta">
                  <span class="header-subtitle">{t.header.subtitle}</span>
                  <span class="header-org">Core Red Project</span>
                </div>
              </div>
            </div>
            <div class="header-actions">
              {/* Language Switcher */}
              <div
                class="lang-switcher"
                style="display: inline-flex; gap: 6px; margin-right: 12px; font-size: 0.85rem;"
              >
                <a
                  href="?lang=en"
                  class={`btn-link ${currentLang === 'en' ? 'active' : ''}`}
                  style={
                    currentLang === 'en'
                      ? 'color: var(--accent); font-weight: bold;'
                      : 'color: var(--text-muted);'
                  }
                  title="Switch to English"
                >
                  EN
                </a>
                <span style="color: var(--border);">|</span>
                <a
                  href="?lang=es"
                  class={`btn-link ${currentLang === 'es' ? 'active' : ''}`}
                  style={
                    currentLang === 'es'
                      ? 'color: var(--accent); font-weight: bold;'
                      : 'color: var(--text-muted);'
                  }
                  title="Cambiar a Español"
                >
                  ES
                </a>
              </div>

              {/* PM2 Dump / Save Button */}
              <button
                type="button"
                class="btn btn-secondary"
                hx-post="/api/pm2/save"
                hx-target="#save-alert-mount"
                hx-swap="innerHTML"
                hx-confirm={t.confirm.save}
                title="pm2 save"
              >
                {t.header.btnSave}
              </button>

              <button
                type="button"
                class="btn btn-refresh"
                hx-get="/api/processes"
                hx-target="#process-table"
                hx-swap="innerHTML"
                hx-indicator="#loading-indicator"
              >
                {t.header.refresh}
              </button>
              {hasAuth && (
                <form method="post" action="/logout" style="display: inline;">
                  <button type="submit" class="btn btn-secondary" title="Sign out">
                    {t.header.logout}
                  </button>
                </form>
              )}
              <span id="loading-indicator" class="htmx-indicator">
                {t.header.syncing}
              </span>
            </div>
          </header>

          {/* Main Content */}
          <main class="main">
            {/* Host System Monit */}
            <SystemMetricsWidget
              metrics={systemMetrics}
              t={t}
              cpuSparkline={cpuSparkline}
              ramSparkline={ramSparkline}
            />

            {/* Save state notification mount */}
            <div id="save-alert-mount" />

            {/* Process Table Section */}
            <section class="section">
              <div class="section-header">
                <h2>{t.toolbar.processes}</h2>
                <div class="auto-refresh">
                  <label>
                    <input type="checkbox" id="auto-refresh-toggle" checked />{' '}
                    {t.toolbar.autoRefresh}
                  </label>
                </div>
              </div>

              {/* Process Toolbar (Search & Filter Chips) */}
              <div class="process-toolbar">
                <div class="search-box">
                  <input
                    type="text"
                    id="process-search-input"
                    class="search-input"
                    placeholder={t.toolbar.searchPlaceholder}
                    autocomplete="off"
                  />
                </div>
                <div class="status-chips" id="status-filter-chips">
                  <button type="button" class="chip active" data-status="all">
                    {t.toolbar.filterAll}
                  </button>
                  <button type="button" class="chip" data-status="online">
                    {t.toolbar.filterOnline}
                  </button>
                  <button type="button" class="chip" data-status="stopped">
                    {t.toolbar.filterStopped}
                  </button>
                  <button type="button" class="chip" data-status="errored">
                    {t.toolbar.filterErrored}
                  </button>
                </div>
              </div>

              <div
                id="process-table"
                hx-get="/api/processes"
                hx-trigger="load, every 10s [checkAutoRefresh()]"
                hx-swap="innerHTML"
              >
                <div class="loading-state">
                  <p>Connecting to PM2 daemon...</p>
                </div>
              </div>
            </section>

            {/* Dynamic Logs Mountpoint (Ergonomic HTMX swap) */}
            <div id="logs-mount" />

            {/* Dynamic Process Detail Mountpoint */}
            <div id="detail-mount" />
          </main>

          {/* Footer */}
          <footer class="footer">
            <div class="footer-content">
              <span>
                Developed by{' '}
                <a
                  href="https://sxnnysideproject.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="footer-link"
                >
                  Core Red Project
                </a>
              </span>
              <span class="separator">|</span>
              <span id="server-time">--:--:--</span>
              <div class="footer-meta">
                <span>Sxnnyside Project</span>
              </div>
            </div>
          </footer>
        </div>

        {/* Non-native Dialog Modal for HTMX Confirmations */}
        <dialog id="confirm-modal" class="modal-dialog">
          <div class="modal-header">
            <svg
              class="modal-icon-danger"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              role="img"
              aria-label="Warning"
            >
              <title>Warning</title>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span class="modal-title" id="confirm-modal-title">
              Confirm Action
            </span>
          </div>
          <div class="modal-body" id="confirm-modal-message">
            Are you sure you want to perform this action?
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="confirm-modal-cancel">
              {t.confirm.btnCancel}
            </button>
            <button type="button" class="btn btn-delete" id="confirm-modal-confirm">
              {t.confirm.btnConfirm}
            </button>
          </div>
        </dialog>
      </body>
    </html>
  );
}
