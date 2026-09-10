import { describe, expect, it } from 'bun:test';
import type { ProcessEventPayload } from '../src/domain/events.ts';
import { WebhookDispatcher } from '../src/infrastructure/notifications/webhook-dispatcher.ts';

describe('WebhookDispatcher', () => {
  const sampleEvent: ProcessEventPayload = {
    event: 'restart',
    processName: 'my-discord-bot',
    processId: 3,
    description: 'Process "my-discord-bot" triggered restart event',
    timestamp: new Date().toISOString(),
    metadata: {
      restarts: 4,
      memoryFormatted: '124.5 MB',
    },
  };

  it('should be disabled when enabled is false or url is missing', () => {
    const disabledDispatcher = new WebhookDispatcher({
      enabled: false,
      format: 'generic',
      events: ['restart'],
    });

    expect(disabledDispatcher.isEnabled()).toBe(false);
  });

  it('should filter out events not in the allowed list', async () => {
    const filteredDispatcher = new WebhookDispatcher({
      enabled: true,
      url: 'https://example.com/webhook',
      format: 'generic',
      events: ['errored', 'exit'],
    });

    const result = await filteredDispatcher.notify(sampleEvent);
    expect(result).toBe(false);
  });
});
