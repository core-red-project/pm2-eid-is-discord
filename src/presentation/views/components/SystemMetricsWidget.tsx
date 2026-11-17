/**
 * @file SystemMetricsWidget.tsx
 * @description HTMX-enabled live host hardware and system metrics widget for PM2 EID Dashboard.
 * Displays CPU utilization percentage, memory usage, load averages, and uptime with automatic polling.
 * @module presentation/views/components/SystemMetricsWidget
 */

import type { SystemMetricsEntity } from '../../../domain/system-metrics.entity.ts';
import type { Translations } from '../../i18n/types.ts';

/**
 * Props passed to the {@link SystemMetricsWidget} component.
 */
interface SystemMetricsWidgetProps {
  /** Real-time system hardware and operating system metrics snapshot. */
  metrics: SystemMetricsEntity;
  /** Active localized translation bundle. */
  t: Translations;
  /** Optional SVG path data for 60-minute CPU history sparkline */
  cpuSparkline?: { linePath: string; areaPath: string } | undefined;
  /** Optional SVG path data for 60-minute Memory history sparkline */
  ramSparkline?: { linePath: string; areaPath: string } | undefined;
}

/**
 * Renders the system hardware metrics dashboard card.
 *
 * Configured with HTMX attributes to poll `/api/system/metrics` every 10 seconds
 * and replace the outer card element seamlessly via AJAX without full page reloads.
 *
 * @param props - Component properties containing the metrics entity, translation catalog, and optional sparklines.
 * @returns JSX markup for the system metrics widget.
 */
export function SystemMetricsWidget({
  metrics,
  t,
  cpuSparkline,
  ramSparkline,
}: SystemMetricsWidgetProps) {
  return (
    <div
      class="system-metrics-card"
      id="system-metrics"
      hx-get="/api/system/metrics"
      hx-trigger="every 10s"
      hx-swap="outerHTML"
    >
      <div class="metrics-grid">
        {/* Host CPU */}
        <div class="metric-item">
          <div class="metric-label">
            <span>{t.system.hostCpu}</span>
            <span class="metric-value">{metrics.cpuUsagePercent}%</span>
          </div>
          <div class="metric-bar-bg">
            <div
              class={`metric-bar-fill ${metrics.cpuUsagePercent > 80 ? 'danger' : metrics.cpuUsagePercent > 60 ? 'warning' : ''}`}
              style={`width: ${Math.min(100, metrics.cpuUsagePercent)}%`}
            />
          </div>
          {cpuSparkline && (
            <svg class="sparkline-svg" viewBox="0 0 160 32" preserveAspectRatio="none">
              <title>CPU 1-Hour Trend</title>
              <defs>
                <linearGradient id="cpu-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#b91c1c" stop-opacity="0.35" />
                  <stop offset="100%" stop-color="#b91c1c" stop-opacity="0.0" />
                </linearGradient>
              </defs>
              {cpuSparkline.areaPath && <path d={cpuSparkline.areaPath} fill="url(#cpu-grad)" />}
              <path
                d={cpuSparkline.linePath}
                fill="none"
                stroke="#ef4444"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          )}
          <span class="metric-subtext">
            {metrics.cpuCores} {t.system.cores} (1h trend)
          </span>
        </div>

        {/* Memory */}
        <div class="metric-item">
          <div class="metric-label">
            <span>{t.system.hostRam}</span>
            <span class="metric-value">{metrics.memoryUsagePercent}%</span>
          </div>
          <div class="metric-bar-bg">
            <div
              class={`metric-bar-fill ${metrics.memoryUsagePercent > 85 ? 'danger' : metrics.memoryUsagePercent > 70 ? 'warning' : ''}`}
              style={`width: ${Math.min(100, metrics.memoryUsagePercent)}%`}
            />
          </div>
          {ramSparkline && (
            <svg class="sparkline-svg" viewBox="0 0 160 32" preserveAspectRatio="none">
              <title>RAM 1-Hour Trend</title>
              <defs>
                <linearGradient id="ram-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35" />
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
                </linearGradient>
              </defs>
              {ramSparkline.areaPath && <path d={ramSparkline.areaPath} fill="url(#ram-grad)" />}
              <path
                d={ramSparkline.linePath}
                fill="none"
                stroke="#60a5fa"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          )}
          <span class="metric-subtext">
            {metrics.usedMemoryFormatted} / {metrics.totalMemoryFormatted} (1h trend)
          </span>
        </div>

        {/* Load Average */}
        <div class="metric-item">
          <div class="metric-label">
            <span>{t.system.loadAvg}</span>
            <span class="metric-value">{metrics.loadAverage[0]}</span>
          </div>
          <span class="metric-subtext">
            5m: {metrics.loadAverage[1]} | 15m: {metrics.loadAverage[2]}
          </span>
        </div>

        {/* System Uptime */}
        <div class="metric-item">
          <div class="metric-label">
            <span>{t.system.uptime}</span>
            <span class="metric-value">{metrics.uptimeFormatted}</span>
          </div>
          <span class="metric-subtext">
            {metrics.hostname} ({metrics.platform})
          </span>
        </div>
      </div>
    </div>
  );
}
