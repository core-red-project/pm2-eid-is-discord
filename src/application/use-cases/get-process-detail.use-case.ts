/**
 * @fileoverview Use case for retrieving deep diagnostic details of a PM2 process.
 * @module application/use-cases/get-process-detail
 */

import type { ProcessDetailEntity } from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

/**
 * Use case that inspects process runtime metadata, environment variables, and Git context.
 */
export class GetProcessDetailUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  /**
   * Fetches detailed inspection metadata for a process.
   * @param nameOrId - Process name or PM2 ID.
   * @returns Detailed process entity or `null` if not found.
   */
  async execute(nameOrId: string | number): Promise<ProcessDetailEntity | null> {
    return await this.pm2Repo.describeDetail(nameOrId);
  }
}
