/**
 * Process Entity & Value Objects
 * Clean Architecture - Domain Layer
 */

export type ProcessStatus =
  | 'online'
  | 'stopping'
  | 'stopped'
  | 'launching'
  | 'errored'
  | 'one-launch-status'
  | 'unknown';

export interface ProcessMetrics {
  cpu: number;
  memoryBytes: number;
  memoryFormatted: string;
}

export interface ProcessEntity {
  pm_id: number;
  name: string;
  status: ProcessStatus;
  cpu: number;
  memory: number;
  memoryFormatted: string;
  restarts: number;
  uptimeMs: number;
  uptimeFormatted: string;
  pid: number | string;
  execMode: string;
  instances: number;
  outLogPath: string | null;
  errLogPath: string | null;
  createdAt: number | null;
  scriptPath: string | null;
  cwd: string | null;
}

export type ProcessAction = 'start' | 'stop' | 'restart' | 'reload' | 'delete' | 'flush';

export interface ProcessActionResult {
  success: boolean;
  action: ProcessAction;
  process: string;
  message?: string;
}

export interface ProcessLogsResult {
  process: string;
  type: 'stdout' | 'stderr';
  lines: number;
  content: string;
}
