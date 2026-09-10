import type { ProcessEventPayload } from '../../domain/events.ts';
import type { INotifier } from '../../domain/repositories/notifier.repository.interface.ts';

export class NotifyEventUseCase {
  private notifiers: INotifier[] = [];

  constructor(notifiers: INotifier[] = []) {
    this.notifiers = notifiers;
  }

  addNotifier(notifier: INotifier): void {
    this.notifiers.push(notifier);
  }

  async execute(event: ProcessEventPayload): Promise<void> {
    const activeNotifiers = this.notifiers.filter((n) => n.isEnabled());
    if (activeNotifiers.length === 0) return;

    await Promise.allSettled(
      activeNotifiers.map(async (notifier) => {
        try {
          await notifier.notify(event);
        } catch (error) {
          console.error(`[Notifier:${notifier.name}] Failed to dispatch notification:`, error);
        }
      }),
    );
  }
}
