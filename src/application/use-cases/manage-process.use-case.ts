/**
 * @fileoverview Use case for executing lifecycle actions on a PM2 process.
 * @module application/use-cases/manage-process
 */

import type { ProcessAction, ProcessActionResult } from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

/**
 * Use case that delegates lifecycle actions (start, stop, restart, reload, delete, flush).
 */
export class ManageProcessUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  /**
   * Executes a process lifecycle action.
   * @param action - Action to perform ('start' | 'stop' | 'restart' | 'reload' | 'delete' | 'flush').
   * @param nameOrId - Process name or PM2 ID.
   * @returns Action result confirmation.
   * @throws Error if an unsupported action is supplied.
   */
  async execute(action: ProcessAction, nameOrId: string | number): Promise<ProcessActionResult> {
    switch (action) {
      case 'start':
        return await this.pm2Repo.start(nameOrId);
      case 'stop':
        return await this.pm2Repo.stop(nameOrId);
      case 'restart':
        return await this.pm2Repo.restart(nameOrId);
      case 'reload':
        return await this.pm2Repo.reload(nameOrId);
      case 'delete':
        return await this.pm2Repo.delete(nameOrId);
      case 'flush':
        return await this.pm2Repo.flush(nameOrId);
      default:
        throw new Error(`Unsupported process action: ${action}`);
    }
  }
}
