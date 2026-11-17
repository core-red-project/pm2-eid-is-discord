/**
 * @fileoverview Domain Events for PM2 process lifecycle monitoring.
 * @module domain/events
 */

/**
 * Valid event lifecycle types emitted by PM2 daemon processes.
 */
export type ProcessEventType =
  | 'online'
  | 'restart'
  | 'stop'
  | 'exit'
  | 'errored'
  | 'crash_loop'
  | 'crash_loop_cleared';

/**
 * Standard domain event payload dispatched across notifications and webhooks.
 */
export interface ProcessEventPayload {
  /** The lifecycle event type */
  event: ProcessEventType;
  /** Name of the process registered in PM2 */
  processName: string;
  /** Numerical PM2 identifier (`pm_id`) */
  processId: number;
  /** Human-readable event description */
  description: string;
  /** ISO-8601 formatted timestamp of the event */
  timestamp: string;
  /** Additional execution metrics and runtime details */
  metadata?: {
    /** CPU utilization percentage at time of event */
    cpu?: number;
    /** Human-readable formatted memory string (e.g. "45.2 MB") */
    memoryFormatted?: string;
    /** Total restart count */
    restarts?: number;
    /** Process exit code when stopped or failed */
    exitCode?: number;
    /** Error message captured from stderr if available */
    errorMessage?: string;
    /** Aggregated log lines count when throttled */
    linesCount?: number;
    [key: string]: any;
  };
}
