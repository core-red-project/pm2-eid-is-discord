import type { ProcessEntity } from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

export class ListProcessesUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

  async execute(): Promise<ProcessEntity[]> {
    return await this.pm2Repo.list();
  }
}
