import { promises as fs } from 'node:fs';
import path from 'node:path';
import pm2, { type ProcessDescription } from 'pm2';
import type {
  ProcessActionResult,
  ProcessEntity,
  ProcessStatus,
} from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

const PM2_CONNECT_TIMEOUT = 5000;

export class PM2ClientRepository implements IPM2Repository {
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('PM2 connection timeout'));
      }, PM2_CONNECT_TIMEOUT);

      pm2.connect((err) => {
        clearTimeout(timer);
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private disconnect(): void {
    try {
      pm2.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }

  private async withConnection<T>(operation: () => Promise<T>): Promise<T> {
    await this.connect();
    try {
      return await operation();
    } finally {
      this.disconnect();
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
          resolve(this.mapProcess(processList[0]));
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

  private async readTailLines(filePath: string, lineCount: number): Promise<string> {
    // Basic path validation: ensure absolute path and normalized
    const normalized = path.normalize(filePath);
    try {
      await fs.access(normalized);
      const data = await fs.readFile(normalized, 'utf-8');
      const lines = data.split('\n');
      return lines.slice(-lineCount).join('\n') || 'Log file is empty';
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return 'Log file does not exist or has not been created yet';
      }
      return `Error reading log file: ${err.message}`;
    }
  }
}
