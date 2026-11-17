/**
 * @fileoverview Notifier repository contract for multi-channel event dispatching.
 * @module domain/repositories/notifier.repository.interface
 */

import type { ProcessEventPayload } from '../events.ts';

/**
 * Output port contract for event notification dispatchers.
 */
export interface INotifier {
  /** Identifier name of the notifier channel */
  readonly name: string;

  /**
   * Dispatches a process lifecycle event to the configured notification channel.
   * @param event - The process event payload to broadcast.
   * @returns Resolves to `true` if dispatch was successful, otherwise `false`.
   */
  notify(event: ProcessEventPayload): Promise<boolean>;

  /**
   * Determines whether the notification channel is enabled and configured.
   * @returns `true` if notifications are active.
   */
  isEnabled(): boolean;
}
