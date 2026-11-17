/**
 * @fileoverview Use case for retrieving operating system hardware and host metrics.
 * @module application/use-cases/get-system-metrics
 */

import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';
import type { SystemMetricsEntity } from '../../domain/system-metrics.entity.ts';

/**
 * Use case that queries host CPU, memory, load average, and uptime.
 */
export class GetSystemMetricsUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  /**
   * Retrieves current host system metrics snapshot.
   * @returns Snapshot of system metrics.
   */
  async execute(): Promise<SystemMetricsEntity> {
    return await this.pm2Repo.getSystemMetrics();
  }
}
