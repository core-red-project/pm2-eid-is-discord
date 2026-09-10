import type { ProcessLogsResult } from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

export class GetLogsUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  async execute(
    nameOrId: string | number,
    type: 'stdout' | 'stderr' = 'stdout',
    lines: number = 100,
  ): Promise<ProcessLogsResult> {
    const safeLines = Math.min(Math.max(1, lines), 1000);
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
