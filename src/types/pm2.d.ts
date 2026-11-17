/**
 * @file pm2.d.ts
 * @description Ambient TypeScript declarations for the official PM2 programmatic API.
 * Defines interfaces for process descriptions, event bus streams, and daemon management methods.
 * @module types/pm2
 */

declare module 'pm2' {
  /**
   * Detailed runtime metadata and environment descriptor for a managed PM2 process.
   */
  export interface ProcessDescription {
    /** Registered human-readable name of the application or service. */
    name?: string;
    /** Unique numerical identifier assigned by PM2 within the daemon registry. */
    pm_id?: number;
    /** Operating system process identifier (PID) assigned to the running instance. */
    pid?: number;
    /** Real-time CPU and memory hardware monitoring metrics. */
    monit?: {
      /** Memory consumption in bytes. */
      memory?: number;
      /** CPU utilization percentage (0 - 100). */
      cpu?: number;
    };
    /** PM2 execution environment variables, configuration parameters, and paths. */
    pm2_env?: {
      /** Current operational lifecycle status (e.g. `'online'`, `'stopped'`, `'errored'`). */
      status?: string;
      /** Epoch timestamp in milliseconds indicating when the process was started. */
      pm_uptime?: number;
      /** Number of times the process has been restarted by PM2 or crashed. */
      restart_time?: number;
      /** Execution mode (e.g. `'cluster_mode'` or `'fork_mode'`). */
      exec_mode?: string;
      /** Configured instance count in cluster mode. */
      instances?: number;
      /** Absolute path to the standard output log file. */
      pm_out_log_path?: string;
      /** Absolute path to the standard error log file. */
      pm_err_log_path?: string;
      /** Epoch timestamp when the process definition was first registered. */
      created_at?: number;
      /** Absolute script path executed by the runner. */
      pm_exec_path?: string;
      /** Working directory path for the process. */
      pm_cwd?: string;
      [key: string]: any;
    };
  }

  /**
   * Event bus stream interface returned by {@link launchBus} for real-time PM2 events.
   */
  export interface Bus {
    /**
     * Subscribes a listener callback to an event channel (e.g. `'process:event'`).
     *
     * @param event - Event name or pattern to listen for.
     * @param listener - Callback triggered when matching events occur.
     */
    on(event: string, listener: (data: any) => void): void;
    /**
     * Closes the event bus stream connection.
     */
    close(): void;
  }

  /**
   * Establishes a connection to the local PM2 daemon.
   *
   * @param noDaemon - If `true`, runs PM2 in the current process without background daemon.
   * @param callback - Invoked when connection succeeds or fails.
   */
  export function connect(noDaemon: boolean, callback: (err?: Error | null) => void): void;
  /**
   * Establishes a connection to the local background PM2 daemon.
   *
   * @param callback - Invoked when connection succeeds or fails.
   */
  export function connect(callback: (err?: Error | null) => void): void;
  /**
   * Disconnects from the PM2 RPC server and closes client socket.
   */
  export function disconnect(): void;
  /**
   * Retrieves an array of all processes currently registered with the PM2 daemon.
   *
   * @param callback - Callback receiving error or the process description list.
   */
  export function list(callback: (err: Error | null, list: ProcessDescription[]) => void): void;
  /**
   * Retrieves comprehensive metadata for a specific process identified by name or pm_id.
   *
   * @param process - Process name or numerical pm_id.
   * @param callback - Callback receiving error or process details array.
   */
  export function describe(
    process: string | number,
    callback: (err: Error | null, list: ProcessDescription[]) => void,
  ): void;
  /**
   * Starts a process by name, file path, or id.
   *
   * @param process - Process identifier or configuration target.
   * @param callback - Invoked upon completion.
   */
  export function start(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;
  /**
   * Stops a running process.
   *
   * @param process - Target process name or id.
   * @param callback - Invoked upon completion.
   */
  export function stop(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;
  /**
   * Restarts a process.
   *
   * @param process - Target process name or id.
   * @param callback - Invoked upon completion.
   */
  export function restart(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;
  /**
   * Gracefully reloads a process with zero downtime (cluster mode).
   *
   * @param process - Target process name or id.
   * @param callback - Invoked upon completion.
   */
  export function reload(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;
  /**
   * Deletes and deregisters a process from PM2 daemon.
   *
   * @param process - Target process name or id.
   * @param callback - Invoked upon completion.
   */
  function deleteProcess(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;

  export { deleteProcess as delete };
  /**
   * Flushes standard output and error log files for a process.
   *
   * @param process - Target process name or id (or `'all'`).
   * @param callback - Invoked upon completion.
   */
  export function flush(process: string | number, callback: (err: Error | null) => void): void;
  /**
   * Connects to the PM2 messaging bus for real-time daemon events and logs.
   *
   * @param callback - Callback receiving error or initialized {@link Bus} instance.
   */
  export function launchBus(callback: (err: Error | null, bus: Bus) => void): void;
  /**
   * Dumps the current PM2 process list to disk configuration (`pm2 save`).
   *
   * @param callback - Invoked upon completion.
   */
  export function dump(callback: (err: Error | null, result: any) => void): void;
  /**
   * Scales a cluster mode application to a specified number of worker instances.
   *
   * @param process - Target process name or id.
   * @param number - Desired number of worker instances.
   * @param callback - Invoked upon completion.
   */
  export function scale(
    process: string | number,
    number: number,
    callback: (err: Error | null, procs: any) => void,
  ): void;

  /**
   * Programmatic PM2 client interface exposing all lifecycle management commands.
   */
  interface PM2Api {
    connect: typeof connect;
    disconnect: typeof disconnect;
    list: typeof list;
    describe: typeof describe;
    start: typeof start;
    stop: typeof stop;
    restart: typeof restart;
    reload: typeof reload;
    delete: typeof deleteProcess;
    flush: typeof flush;
    launchBus: typeof launchBus;
    dump: typeof dump;
    scale: typeof scale;
  }

  const pm2: PM2Api;
  export default pm2;
}
