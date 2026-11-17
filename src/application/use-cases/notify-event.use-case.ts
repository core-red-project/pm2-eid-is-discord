/**
 * @fileoverview Use case for dispatching domain events to notification sinks.
 * @module application/use-cases/notify-event
 */

import type { ProcessEventPayload } from '../../domain/events.ts';
import type { INotifier } from '../../domain/repositories/notifier.repository.interface.ts';

/**
 * Multi-channel event dispatcher use case using Promise.allSettled for fault isolation.
 */
export class NotifyEventUseCase {
  private notifiers: INotifier[] = [];

  constructor(notifiers: INotifier[] = []) {
    this.notifiers = notifiers;
  }

  /**
   * Registers a new notification channel.
   * @param notifier - Notifier implementation.
   */
  addNotifier(notifier: INotifier): void {
    this.notifiers.push(notifier);
  }

  /**
   * Dispatches an event payload concurrently to all active notification channels.
   * @param event - Process lifecycle event payload.
   */
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
