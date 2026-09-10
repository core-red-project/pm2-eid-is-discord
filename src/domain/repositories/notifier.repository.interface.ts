import type { ProcessEventPayload } from '../events.ts';

export interface INotifier {
  readonly name: string;
  notify(event: ProcessEventPayload): Promise<boolean>;
  isEnabled(): boolean;
}
