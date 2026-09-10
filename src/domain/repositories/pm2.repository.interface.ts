import type { ProcessActionResult, ProcessEntity } from '../process.entity.ts';

export interface IPM2Repository {
  list(): Promise<ProcessEntity[]>;
  get(nameOrId: string | number): Promise<ProcessEntity | null>;
  start(nameOrId: string | number): Promise<ProcessActionResult>;
  stop(nameOrId: string | number): Promise<ProcessActionResult>;
  restart(nameOrId: string | number): Promise<ProcessActionResult>;
  reload(nameOrId: string | number): Promise<ProcessActionResult>;
  delete(nameOrId: string | number): Promise<ProcessActionResult>;
  flush(nameOrId: string | number): Promise<ProcessActionResult>;
  getLogs(nameOrId: string | number, lines?: number): Promise<string>;
  getErrorLogs(nameOrId: string | number, lines?: number): Promise<string>;
}
