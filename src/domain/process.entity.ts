/**
 * @fileoverview Domain Entities and Value Objects for PM2 processes.
 * @module domain/process.entity
 */

/**
 * Normalized runtime status of a PM2 process.
 */
export type ProcessStatus =
  | 'online'
  | 'stopping'
  | 'stopped'
  | 'launching'
  | 'errored'
  | 'one-launch-status'
  | 'unknown';

/**
 * Metric snapshot for CPU and memory usage of a process.
 */
export interface ProcessMetrics {
  /** CPU percentage utilization */
  cpu: number;
  /** Memory usage in raw bytes */
  memoryBytes: number;
  /** Formatted memory string (e.g. "24.5 MB") */
  memoryFormatted: string;
}

/**
 * Core business entity representing a monitored PM2 process.
 */
export interface ProcessEntity {
  /** Unique PM2 process identifier */
  pm_id: number;
  /** Application or process name */
  name: string;
  /** Current execution status */
  status: ProcessStatus;
  /** Instantaneous CPU percentage utilization */
  cpu: number;
  /** RSS memory utilization in bytes */
  memory: number;
  /** Human-readable formatted memory string */
  memoryFormatted: string;
  /** Number of times the process has restarted */
  restarts: number;
  /** Process uptime in milliseconds */
  uptimeMs: number;
  /** Formatted uptime duration string (e.g. "3d 4h") */
  uptimeFormatted: string;
  /** Operating system process ID */
  pid: number | string;
  /** Execution mode ('fork' or 'cluster') */
  execMode: string;
  /** Number of active instances configured */
  instances: number;
  /** Absolute path to standard output log file */
  outLogPath: string | null;
  /** Absolute path to standard error log file */
  errLogPath: string | null;
  /** Timestamp when the process was originally created */
  createdAt: number | null;
  /** Path to the executed script */
  scriptPath: string | null;
  /** Current working directory of the application */
  cwd: string | null;
}

/**
 * Extended process entity containing detailed inspection metadata.
 */
export interface ProcessDetailEntity extends ProcessEntity {
  /** Target Node.js or Bun runtime version */
  nodeVersion: string | null;
  /** Active Git branch if running from a repository */
  gitBranch: string | null;
  /** Git commit hash / revision */
  gitCommit: string | null;
  /** Number of unstable restarts detected by PM2 */
  unstableRestarts: number;
  /** Custom application metrics reported via PM2 axm_monitor / @pm2/io */
  customMetrics: Record<string, string | number>;
  /** Safe masked environment variables of the process */
  envVars: Record<string, string>;
}

/**
 * Valid management lifecycle actions that can be performed on a process.
 */
export type ProcessAction = 'start' | 'stop' | 'restart' | 'reload' | 'delete' | 'flush';

/**
 * Result representation of a management action execution.
 */
export interface ProcessActionResult {
  /** Whether the action succeeded */
  success: boolean;
  /** The action performed */
  action: ProcessAction;
  /** Name of the target process */
  process: string;
  /** Optional informational or error message */
  message?: string;
}

/**
 * Result representation of tail log reading.
 */
export interface ProcessLogsResult {
  /** Target process name */
  process: string;
  /** Log channel type */
  type: 'stdout' | 'stderr';
  /** Number of lines requested */
  lines: number;
  /** Raw content of the log lines */
  content: string;
}
