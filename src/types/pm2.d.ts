declare module 'pm2' {
  export interface ProcessDescription {
    name?: string;
    pm_id?: number;
    pid?: number;
    monit?: {
      memory?: number;
      cpu?: number;
    };
    pm2_env?: {
      status?: string;
      pm_uptime?: number;
      restart_time?: number;
      exec_mode?: string;
      instances?: number;
      pm_out_log_path?: string;
      pm_err_log_path?: string;
      created_at?: number;
      pm_exec_path?: string;
      pm_cwd?: string;
      [key: string]: any;
    };
  }

  export interface Bus {
    on(event: string, listener: (data: any) => void): void;
    close(): void;
  }

  export function connect(noDaemon: boolean, callback: (err?: Error | null) => void): void;
  export function connect(callback: (err?: Error | null) => void): void;
  export function disconnect(): void;
  export function list(callback: (err: Error | null, list: ProcessDescription[]) => void): void;
  export function describe(
    process: string | number,
    callback: (err: Error | null, list: ProcessDescription[]) => void,
  ): void;
  export function start(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;
  export function stop(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;
  export function restart(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;
  export function reload(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;
  function deleteProcess(
    process: string | number,
    callback: (err: Error | null, proc: any) => void,
  ): void;

  export { deleteProcess as delete };
  export function flush(process: string | number, callback: (err: Error | null) => void): void;
  export function launchBus(callback: (err: Error | null, bus: Bus) => void): void;

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
  }

  const pm2: PM2Api;
  export default pm2;
}
