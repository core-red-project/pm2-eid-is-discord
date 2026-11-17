/**
 * @fileoverview Use case for retrieving tail logs of PM2 processes safely.
 * @module application/use-cases/get-logs
 */

import type { ProcessLogsResult } from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

/**
 * Bounds-checked use case for fetching tail lines from process stdout/stderr logs.
 */
export class GetLogsUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  /**
   * Reads tail lines with bound enforcement (1 to 1000 lines).
   * @param nameOrId - Process name or PM2 ID.
   * @param type - Log stream to read ('stdout' or 'stderr').
   * @param lines - Requested line count (clamped to 1000).
   * @returns Formatted log result object.
   */
  async execute(
    nameOrId: string | number,
    type: 'stdout' | 'stderr' = 'stdout',
    lines: number = 100,
  ): Promise<ProcessLogsResult> {
    const safeLines = !Number.isInteger(lines) || lines < 1 ? 100 : Math.min(lines, 1000);
    const content =
      type === 'stderr'
        ? await this.pm2Repo.getErrorLogs(nameOrId, safeLines)
        : await this.pm2Repo.getLogs(nameOrId, safeLines);

    return {
      process: String(nameOrId),
      type,
      lines: safeLines,
      content,
    };
  }
}
