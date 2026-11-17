/**
 * @file webhook.test.ts
 * @description Unit tests for WebhookDispatcher filtering, formatting, and payload dispatch.
 */

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

  it('should format Discord embeds with rich styling, badges, and fields', () => {
    const dispatcher = new WebhookDispatcher({
      enabled: true,
      url: 'https://discord.com/api/webhooks/test',
      format: 'discord',
      events: ['*'],
    });

    const crashEvent: ProcessEventPayload = {
      event: 'crash_loop',
      processName: 'failing-bot',
      processId: 1,
      description: 'Process entering crash loop',
      timestamp: new Date().toISOString(),
      metadata: {
        restarts: 6,
        unstableRestarts: 4,
        errorMessage: 'Error: Cannot connect to gateway\n  at login()',
      },
    };

    const formatted = (dispatcher as any).formatDiscord(crashEvent);
    expect(formatted.embeds).toBeDefined();
    expect(formatted.embeds.length).toBe(1);

    const embed = formatted.embeds[0];
    expect(embed.color).toBe(0x991b1b); // Core Red Crimson
    expect(embed.title).toContain('CRASH LOOP');
    expect(embed.footer.text).toContain('Core Red Project');

    const errorField = embed.fields.find((f: any) => f.name.includes('Stderr'));
    expect(errorField).toBeDefined();
    expect(errorField.value).toContain('```diff');
  });
});
