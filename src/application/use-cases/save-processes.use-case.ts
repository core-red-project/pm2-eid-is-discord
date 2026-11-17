/**
 * @fileoverview Use case for persisting the active PM2 process list to disk.
 * @module application/use-cases/save-processes
 */

import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

/**
 * Use case that dumps the active PM2 process list to disk (equivalent to `pm2 save`).
 */
export class SaveProcessesUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  /**
   * Triggers the dump operation via the PM2 repository.
   * @returns Resolves to `true` when dump file is written successfully.
   */
  async execute(): Promise<boolean> {
    return await this.pm2Repo.dump();
  }
}
