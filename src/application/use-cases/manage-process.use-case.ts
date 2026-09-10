import type { ProcessAction, ProcessActionResult } from '../../domain/process.entity.ts';
import type { IPM2Repository } from '../../domain/repositories/pm2.repository.interface.ts';

export class ManageProcessUseCase {
  constructor(private readonly pm2Repo: IPM2Repository) {}

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
