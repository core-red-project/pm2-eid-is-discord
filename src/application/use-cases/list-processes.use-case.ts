/**
 * @fileoverview Use case for listing all active PM2 processes.
 * @module application/use-cases/list-processes
 */

import type { ProcessEntity } from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

/**
 * Use case that queries and returns all monitored processes from the PM2 daemon.
 */
export class ListProcessesUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  /**
   * Executes the list query against PM2 repository.
   * @returns Array of process entities.
   */
  async execute(): Promise<ProcessEntity[]> {
    return await this.pm2Repo.list();
  }
}
