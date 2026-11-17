/**
 * @fileoverview Modal component for detailed process inspection and cluster scaling.
 * @module presentation/views/components/ProcessDetailModal
 */

import type { ProcessDetailEntity } from '../../../domain/process.entity.ts';
import type { Translations } from '../../i18n/types.ts';
import { getStatusBadgeClass } from './ProcessTable.tsx';

/**
 * Properties for rendering the process detail modal.
 */
interface ProcessDetailModalProps {
  /** Detailed process inspection entity */
  detail: ProcessDetailEntity;
  /** Active translation catalog */
  t: Translations;
}

/**
 * Component displaying exhaustive process diagnostics (env, Git, PM2 metrics, scaling).
 */
export function ProcessDetailModal({ detail, t }: ProcessDetailModalProps) {
  const statusClass = getStatusBadgeClass(detail.status);
  const encodedName = encodeURIComponent(detail.name);
  const isCluster = detail.execMode.toLowerCase().includes('cluster');
  const metricEntries = Object.entries(detail.customMetrics);
  const envEntries = Object.entries(detail.envVars);

  return (
    <div class="modal-backdrop" id="process-detail-modal">
      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-title-group">
            <h2>{t.detail.title(detail.name)}</h2>
            <span class={`status-badge ${statusClass}`}>{detail.status}</span>
          </div>
          <button
            type="button"
            class="btn btn-secondary"
            id="btn-close-detail"
            data-action="close-detail"
          >
            {t.detail.btnClose}
          </button>
        </div>

        <div class="detail-grid">
          {/* Main Attributes */}
          <div class="detail-box">
            <h3>General Info</h3>
            <div class="detail-rows">
              <div class="detail-row">
                <span class="label">PM2 ID:</span>
                <span class="value">{detail.pm_id}</span>
              </div>
              <div class="detail-row">
                <span class="label">{t.detail.pid}:</span>
                <span class="value">{detail.pid}</span>
              </div>
              <div class="detail-row">
                <span class="label">{t.detail.nodeVersion}:</span>
                <span class="value">{detail.nodeVersion || '-'}</span>
              </div>
              <div class="detail-row">
                <span class="label">{t.detail.execMode}:</span>
                <span class="value">{detail.execMode}</span>
              </div>
              <div class="detail-row">
                <span class="label">{t.detail.instances}:</span>
                <span class="value" style="display: inline-flex; align-items: center; gap: 8px;">
                  <span>{detail.instances}</span>
                  {isCluster && (
                    <>
                      <button
                        type="button"
                        class="btn btn-tab"
                        style="padding: 2px 8px; font-size: 0.75rem;"
                        hx-post={`/api/processes/${encodedName}/scale?instances=${detail.instances + 1}`}
                        hx-target="#detail-mount"
                        hx-swap="innerHTML"
                        hx-confirm={t.confirm.scale(detail.name, detail.instances + 1)}
                        title={t.detail.scaleUp}
                      >
                        +1
                      </button>
                      {detail.instances > 1 && (
                        <button
                          type="button"
                          class="btn btn-tab"
                          style="padding: 2px 8px; font-size: 0.75rem;"
                          hx-post={`/api/processes/${encodedName}/scale?instances=${detail.instances - 1}`}
                          hx-target="#detail-mount"
                          hx-swap="innerHTML"
                          hx-confirm={t.confirm.scale(detail.name, detail.instances - 1)}
                          title={t.detail.scaleDown}
                        >
                          -1
                        </button>
                      )}
                    </>
                  )}
                </span>
              </div>
              <div class="detail-row">
                <span class="label">{t.detail.unstableRestarts}:</span>
                <span class="value">{detail.unstableRestarts}</span>
              </div>
            </div>
          </div>

          {/* Paths and Git */}
          <div class="detail-box">
            <h3>Filesystem & Versioning</h3>
            <div class="detail-rows">
              <div class="detail-row">
                <span class="label">{t.detail.cwd}:</span>
                <span class="value path-value" title={detail.cwd || ''}>
                  {detail.cwd || '-'}
                </span>
              </div>
              <div class="detail-row">
                <span class="label">{t.detail.script}:</span>
                <span class="value path-value" title={detail.scriptPath || ''}>
                  {detail.scriptPath || '-'}
                </span>
              </div>
              <div class="detail-row">
                <span class="label">{t.detail.gitBranch}:</span>
                <span class="value">{detail.gitBranch || '-'}</span>
              </div>
              <div class="detail-row">
                <span class="label">{t.detail.gitCommit}:</span>
                <span class="value">{detail.gitCommit || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Metrics */}
        <div class="detail-section">
          <h3>{t.detail.customMetrics}</h3>
          {metricEntries.length > 0 ? (
            <div class="custom-metrics-grid">
              {metricEntries.map(([key, value]) => (
                <div class="metric-chip" key={key}>
                  <span class="metric-chip-key">{key}:</span>
                  <span class="metric-chip-val">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p class="muted-hint">{t.detail.noCustomMetrics}</p>
          )}
        </div>

        {/* Environment Variables */}
        <div class="detail-section">
          <h3>{t.detail.envVars}</h3>
          {envEntries.length > 0 ? (
            <div class="env-table-container">
              <table class="env-table">
                <tbody>
                  {envEntries.map(([k, v]) => (
                    <tr key={k}>
                      <td class="env-key">{k}</td>
                      <td class="env-val">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p class="muted-hint">{t.detail.noEnvVars}</p>
          )}
        </div>
      </div>
    </div>
  );
}
