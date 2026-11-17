/**
 * @fileoverview PM2 Repository interface definition.
 * @module domain/repositories/pm2.repository.interface
 */

import type { ProcessActionResult, ProcessDetailEntity, ProcessEntity } from '../process.entity.ts';
import type { SystemMetricsEntity } from '../system-metrics.entity.ts';

/**
 * Primary repository contract for interacting with the local or host PM2 process daemon.
 */
export interface IPM2Repository {
  /**
   * Retrieves a snapshot list of all PM2-supervised processes.
   * @returns Array of process entities.
   */
  list(): Promise<ProcessEntity[]>;

  /**
   * Retrieves basic metadata for a specific process by name or numerical ID.
   * @param nameOrId - Process name or PM2 ID.
   * @returns Process entity or `null` if not found.
   */
  get(nameOrId: string | number): Promise<ProcessEntity | null>;

  /**
   * Starts an existing stopped process.
   * @param nameOrId - Process name or PM2 ID.
   */
  start(nameOrId: string | number): Promise<ProcessActionResult>;

  /**
   * Stops an active process without unregistering it from PM2.
   * @param nameOrId - Process name or PM2 ID.
   */
  stop(nameOrId: string | number): Promise<ProcessActionResult>;

  /**
   * Restarts an active or stopped process.
   * @param nameOrId - Process name or PM2 ID.
   */
  restart(nameOrId: string | number): Promise<ProcessActionResult>;

  /**
   * Performs zero-downtime reload for cluster-mode processes.
   * @param nameOrId - Process name or PM2 ID.
   */
  reload(nameOrId: string | number): Promise<ProcessActionResult>;

  /**
   * Deletes and unregisters a process from the PM2 daemon.
   * @param nameOrId - Process name or PM2 ID.
   */
  delete(nameOrId: string | number): Promise<ProcessActionResult>;

  /**
   * Flushes and truncates stdout and stderr log files for a process.
   * @param nameOrId - Process name or PM2 ID.
   */
  flush(nameOrId: string | number): Promise<ProcessActionResult>;

  /**
   * Reads standard output logs tail lines from the process log file.
   * @param nameOrId - Process name or PM2 ID.
   * @param lines - Maximum number of tail lines to retrieve.
   */
  getLogs(nameOrId: string | number, lines?: number): Promise<string>;

  /**
   * Reads standard error logs tail lines from the process error log file.
   * @param nameOrId - Process name or PM2 ID.
   * @param lines - Maximum number of tail lines to retrieve.
   */
  getErrorLogs(nameOrId: string | number, lines?: number): Promise<string>;

  /**
   * Dumps active PM2 processes configuration to disk (equivalent to `pm2 save`).
   * @returns `true` if dump succeeded.
   */
  dump(): Promise<boolean>;

  /**
   * Adjusts the number of cluster workers for a cluster-mode process.
   * @param nameOrId - Process name or PM2 ID.
   * @param instances - Target number of worker instances.
   */
  scale(nameOrId: string | number, instances: number): Promise<boolean>;

  /**
   * Fetches exhaustive diagnostic metadata including env vars, Git, and axm_monitor.
   * @param nameOrId - Process name or PM2 ID.
   */
  describeDetail(nameOrId: string | number): Promise<ProcessDetailEntity | null>;

  /**
   * Collects real-time operating system hardware and host metrics.
   */
  getSystemMetrics(): Promise<SystemMetricsEntity>;
}
