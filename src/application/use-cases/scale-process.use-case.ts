/**
 * @fileoverview Use case for scaling process instances in cluster mode.
 * @module application/use-cases/scale-process
 */

import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

/**
 * Use case that adjusts worker instance counts for cluster-mode PM2 applications.
 */
export class ScaleProcessUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  /**
   * Scales worker instances with sanity bounds (1 to 32 instances).
   * @param nameOrId - Process name or PM2 ID.
   * @param instances - Desired target instances.
   * @returns Resolves to `true` when scaling succeeds.
   */
  async execute(nameOrId: string | number, instances: number): Promise<boolean> {
    const safeInstances = Math.max(1, Math.min(32, Math.floor(instances)));
    return await this.pm2Repo.scale(nameOrId, safeInstances);
  }
}
