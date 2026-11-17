/**
 * @fileoverview Concrete PM2 repository adapter implementing programmatic IPC management.
 * Features persistent connection pooling with auto-reconnection, memory-safe log tailing (256 KB window),
 * and Docker host-to-container log path mapping.
 * @module infrastructure/pm2/pm2-client
 */

import { existsSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pm2, { type ProcessDescription } from 'pm2';
import type {
  ProcessActionResult,
  ProcessDetailEntity,
  ProcessEntity,
  ProcessStatus,
} from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';
import type { SystemMetricsEntity } from '../../domain/system-metrics.entity.ts';

const PM2_CONNECT_TIMEOUT = 5000;
/** Maximum byte window read from log files to prevent Out-Of-Memory errors */
const MAX_LOG_READ_BYTES = 256 * 1024; // 256 KB

/**
 * Implementation of IPM2Repository that connects to the PM2 daemon over local domain sockets.
 * Reuses a single persistent daemon connection across concurrent operations.
 */
export class PM2ClientRepository implements IPM2Repository {
  private connectPromise: Promise<void> | null = null;
  private isConnected = false;

  /**
   * Ensures a persistent connection to the local PM2 daemon exists.
   * Concurrent calls reuse the in-flight connection promise.
   */
  private async ensureConnected(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.connectPromise = null;
        reject(new Error('PM2 connection timeout'));
      }, PM2_CONNECT_TIMEOUT);

      pm2.connect((err) => {
        clearTimeout(timer);
        this.connectPromise = null;
        if (err) {
          this.isConnected = false;
          reject(err);
        } else {
          this.isConnected = true;
          resolve();
        }
      });
    });

    return this.connectPromise;
  }

  /**
   * Closes the connection to the PM2 daemon during graceful shutdown.
   */
  disconnect(): void {
    this.isConnected = false;
    this.connectPromise = null;
    try {
      pm2.disconnect();
    } catch {
      // Ignore disconnect error
    }
  }

  /** Operation timeout to prevent hung socket promises */
  private readonly OPERATION_TIMEOUT_MS = 10000;

  /**
   * Executes a PM2 operation ensuring connection availability with timeout enforcement.
   * If an operation fails, times out, or detects daemon restart, resets connection
   * and retries once automatically before throwing.
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('PM2 operation timed out after 10000ms')),
        this.OPERATION_TIMEOUT_MS,
      );
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async withConnection<T>(operation: () => Promise<T>): Promise<T> {
    try {
      await this.ensureConnected();
      return await this.executeWithTimeout(operation);
    } catch {
      // Disconnect on any failure or timeout, then retry once with fresh connection
      this.disconnect();
      try {
        await this.ensureConnected();
        return await this.executeWithTimeout(operation);
      } catch (retryErr) {
        this.disconnect();
        throw retryErr;
      }
    }
  }

  async list(): Promise<ProcessEntity[]> {
    return this.withConnection(() => {
      return new Promise<ProcessEntity[]>((resolve, reject) => {
        pm2.list((err, processList) => {
          if (err) {
            return reject(err);
          }
          const formatted = (processList || []).map((p) => this.mapProcess(p));
          resolve(formatted);
        });
      });
    });
  }

  async get(nameOrId: string | number): Promise<ProcessEntity | null> {
    return this.withConnection(() => {
      return new Promise<ProcessEntity | null>((resolve, reject) => {
        pm2.describe(nameOrId, (err, processList) => {
          if (err) {
            return reject(err);
          }
          if (!processList || processList.length === 0) {
            return resolve(null);
          }
          const first = processList[0];
          if (!first) {
            return resolve(null);
          }
          resolve(this.mapProcess(first));
        });
      });
    });
  }

  async start(nameOrId: string | number): Promise<ProcessActionResult> {
    return this.withConnection(() => {
      return new Promise<ProcessActionResult>((resolve, reject) => {
        pm2.restart(nameOrId, (err) => {
          if (err) return reject(err);
          resolve({ success: true, action: 'start', process: String(nameOrId) });
        });
      });
    });
  }

  async stop(nameOrId: string | number): Promise<ProcessActionResult> {
    return this.withConnection(() => {
      return new Promise<ProcessActionResult>((resolve, reject) => {
        pm2.stop(nameOrId, (err) => {
          if (err) return reject(err);
          resolve({ success: true, action: 'stop', process: String(nameOrId) });
        });
      });
    });
  }

  async restart(nameOrId: string | number): Promise<ProcessActionResult> {
    return this.withConnection(() => {
      return new Promise<ProcessActionResult>((resolve, reject) => {
        pm2.restart(nameOrId, (err) => {
          if (err) return reject(err);
          resolve({ success: true, action: 'restart', process: String(nameOrId) });
        });
      });
    });
  }

  async reload(nameOrId: string | number): Promise<ProcessActionResult> {
    return this.withConnection(() => {
      return new Promise<ProcessActionResult>((resolve, reject) => {
        pm2.reload(nameOrId, (err) => {
          if (err) return reject(err);
          resolve({ success: true, action: 'reload', process: String(nameOrId) });
        });
      });
    });
  }

  async delete(nameOrId: string | number): Promise<ProcessActionResult> {
    return this.withConnection(() => {
      return new Promise<ProcessActionResult>((resolve, reject) => {
        pm2.delete(nameOrId, (err) => {
          if (err) return reject(err);
          resolve({ success: true, action: 'delete', process: String(nameOrId) });
        });
      });
    });
  }

  async flush(nameOrId: string | number): Promise<ProcessActionResult> {
    return this.withConnection(() => {
      return new Promise<ProcessActionResult>((resolve, reject) => {
        pm2.flush(nameOrId, (err) => {
          if (err) return reject(err);
          resolve({ success: true, action: 'flush', process: String(nameOrId) });
        });
      });
    });
  }

  async getLogs(nameOrId: string | number, lines: number = 100): Promise<string> {
    const proc = await this.get(nameOrId);
    if (!proc) throw new Error(`Process ${nameOrId} not found`);
    if (!proc.outLogPath) return 'No stdout log path configured for this process';
    return this.readTailLines(proc.outLogPath, lines);
  }

  async getErrorLogs(nameOrId: string | number, lines: number = 100): Promise<string> {
    const proc = await this.get(nameOrId);
    if (!proc) throw new Error(`Process ${nameOrId} not found`);
    if (!proc.errLogPath) return 'No stderr log path configured for this process';
    return this.readTailLines(proc.errLogPath, lines);
  }

  async dump(): Promise<boolean> {
    return this.withConnection(() => {
      return new Promise<boolean>((resolve, reject) => {
        pm2.dump((err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  }

  async scale(nameOrId: string | number, instances: number): Promise<boolean> {
    return this.withConnection(() => {
      return new Promise<boolean>((resolve, reject) => {
        pm2.scale(nameOrId, instances, (err) => {
          if (err) return reject(err);
          resolve(true);
        });
      });
    });
  }

  async describeDetail(nameOrId: string | number): Promise<ProcessDetailEntity | null> {
    return this.withConnection(() => {
      return new Promise<ProcessDetailEntity | null>((resolve, reject) => {
        pm2.describe(nameOrId, (err, processList) => {
          if (err) return reject(err);
          if (!processList || processList.length === 0) return resolve(null);
          const raw = processList[0];
          if (!raw) return resolve(null);
          const base = this.mapProcess(raw);
          const pm2Env = raw.pm2_env || {};
          const versioning = pm2Env.versioning || {};

          // Extract custom metrics from axm_monitor
          const customMetrics: Record<string, string | number> = {};
          if (pm2Env.axm_monitor && typeof pm2Env.axm_monitor === 'object') {
            for (const [key, val] of Object.entries(pm2Env.axm_monitor)) {
              if (val && typeof val === 'object' && 'value' in (val as any)) {
                customMetrics[key] = (val as any).value;
              } else if (typeof val === 'string' || typeof val === 'number') {
                customMetrics[key] = val;
              }
            }
          }

          // Safe env vars filtering (mask secrets, credentials, and connection URIs)
          const rawEnv = (pm2Env.env as Record<string, string>) || {};
          const envVars: Record<string, string> = {};
          const secretPattern =
            /password|secret|token|key|auth|credential|url|uri|dsn|pass|pwd|private|cookie|session|bearer/i;
          for (const [k, v] of Object.entries(rawEnv)) {
            const isSecretKey = secretPattern.test(k);
            const isSecretValue = /:\/\/.*:.*@/.test(String(v));
            envVars[k] = isSecretKey || isSecretValue ? '••••••••' : String(v);
          }

          resolve({
            ...base,
            nodeVersion: pm2Env.node_version || null,
            gitBranch: versioning.branch || null,
            gitCommit: versioning.revision ? String(versioning.revision).slice(0, 8) : null,
            unstableRestarts: pm2Env.unstable_restarts || 0,
            customMetrics,
            envVars,
          });
        });
      });
    });
  }

  async getSystemMetrics(): Promise<SystemMetricsEntity> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePct = totalMem > 0 ? (usedMem / totalMem) * 100 : 0;
    const loadAvg = os.loadavg() as [number, number, number];
    const uptimeSec = Math.floor(os.uptime());

    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type of Object.keys(cpu.times)) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }
    const cpuUsagePercent =
      totalTick > 0 ? Math.max(0, Math.min(100, ((totalTick - totalIdle) / totalTick) * 100)) : 0;

    return {
      cpuUsagePercent: Number(cpuUsagePercent.toFixed(1)),
      totalMemoryBytes: totalMem,
      totalMemoryFormatted: this.formatBytes(totalMem),
      freeMemoryBytes: freeMem,
      freeMemoryFormatted: this.formatBytes(freeMem),
      usedMemoryBytes: usedMem,
      usedMemoryFormatted: this.formatBytes(usedMem),
      memoryUsagePercent: Number(memUsagePct.toFixed(1)),
      loadAverage: [
        Number(loadAvg[0].toFixed(2)),
        Number(loadAvg[1].toFixed(2)),
        Number(loadAvg[2].toFixed(2)),
      ],
      uptimeSeconds: uptimeSec,
      uptimeFormatted: this.formatUptime(uptimeSec * 1000),
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuCores: cpus.length,
    };
  }

  private mapProcess(proc: ProcessDescription): ProcessEntity {
    const monit = proc.monit || {};
    const pm2Env = proc.pm2_env || {};
    const memoryBytes = monit.memory || 0;
    const uptimeMs = pm2Env.pm_uptime ? Math.max(0, Date.now() - pm2Env.pm_uptime) : 0;

    return {
      pm_id: proc.pm_id ?? -1,
      name: proc.name || 'unnamed',
      status: (pm2Env.status as ProcessStatus) || 'unknown',
      cpu: Number(monit.cpu || 0),
      memory: memoryBytes,
      memoryFormatted: this.formatBytes(memoryBytes),
      restarts: pm2Env.restart_time || 0,
      uptimeMs,
      uptimeFormatted: pm2Env.pm_uptime ? this.formatUptime(uptimeMs) : '-',
      pid: proc.pid || '-',
      execMode: pm2Env.exec_mode || 'fork',
      instances: pm2Env.instances || 1,
      outLogPath: pm2Env.pm_out_log_path || null,
      errLogPath: pm2Env.pm_err_log_path || null,
      createdAt: pm2Env.created_at || null,
      scriptPath: pm2Env.pm_exec_path || null,
      cwd: pm2Env.pm_cwd || null,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
  }

  private formatUptime(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  /**
   * Resolves log paths with Docker host-to-container volume translation.
   * If a host absolute path cannot be found, resolves against container PM2_HOME.
   */
  private resolveLogPath(filePath: string): string {
    const normalized = path.normalize(filePath);
    if (existsSync(normalized)) {
      return normalized;
    }

    const pm2Home = process.env.PM2_HOME;
    if (pm2Home) {
      const pm2LogsIndex = normalized.indexOf('/.pm2/logs/');
      if (pm2LogsIndex !== -1) {
        const relativeLog = normalized.slice(pm2LogsIndex + '/.pm2/logs/'.length);
        const mappedPath = path.join(pm2Home, 'logs', relativeLog);
        if (existsSync(mappedPath)) {
          return mappedPath;
        }
      }
    }

    return normalized;
  }

  /**
   * Reads up to the last 256 KB of a file to extract tail lines without loading
   * multi-gigabyte log files into process memory.
   */
  private async readTailLines(filePath: string, lineCount: number): Promise<string> {
    const resolvedPath = this.resolveLogPath(filePath);
    try {
      const stat = await fs.stat(resolvedPath);
      if (stat.size === 0) {
        return 'Log file is empty';
      }

      const readSize = Math.min(stat.size, MAX_LOG_READ_BYTES);
      const position = stat.size - readSize;

      const fileHandle = await fs.open(resolvedPath, 'r');
      try {
        const buffer = Buffer.alloc(readSize);
        await fileHandle.read(buffer, 0, readSize, position);
        let content = buffer.toString('utf-8');

        // If we read from the middle of the file, discard partial first line
        if (position > 0) {
          const firstNewline = content.indexOf('\n');
          if (firstNewline !== -1) {
            content = content.slice(firstNewline + 1);
          }
        }

        const lines = content.split('\n');
        return lines.slice(-lineCount).join('\n') || 'Log file is empty';
      } finally {
        await fileHandle.close();
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return 'Log file does not exist or has not been created yet';
      }
      return 'Error reading log file';
    }
  }
}
