/**
 * @fileoverview Agnostic webhook notification dispatcher supporting Generic, Discord, and Slack schemas.
 * @module infrastructure/notifications/webhook-dispatcher
 */

import type { ProcessEventPayload } from '../../domain/events.ts';
import type { INotifier } from '../../domain/repositories/notifier.repository.interface.ts';
import type { AppConfig } from '../config/env.ts';

/**
 * Dispatcher that formats and sends HTTP POST webhooks to Discord, Slack, or generic endpoints.
 */
export class WebhookDispatcher implements INotifier {
  readonly name = 'WebhookDispatcher';

  constructor(private readonly config: AppConfig['webhook']) {}

  /**
   * Checks whether the dispatcher has an active URL and is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled && Boolean(this.config.url);
  }

  /**
   * Dispatches a process event payload over HTTP with a 5-second timeout.
   * @param payload - Process event domain payload.
   * @returns Resolves to `true` if dispatch returned HTTP 2xx.
   */
  async notify(payload: ProcessEventPayload): Promise<boolean> {
    if (!this.isEnabled() || !this.config.url) {
      return false;
    }

    // Check if event is in the allowed list
    const eventName = payload.event.toLowerCase();
    const isAllowed = this.config.events.some(
      (e) => e === '*' || e === eventName || (eventName === 'errored' && e === 'error'),
    );

    if (!isAllowed) {
      return false;
    }

    const body = this.formatPayload(payload);

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PM2-EID-Dashboard',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.error(
          `[Webhook] HTTP error ${response.status} sending to ${this.config.format} webhook`,
        );
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[Webhook] Request failed:`, err?.message || err);
      return false;
    }
  }

  /**
   * Formats event payload according to configured webhook target schema.
   */
  private formatPayload(payload: ProcessEventPayload): Record<string, any> {
    switch (this.config.format) {
      case 'discord':
        return this.formatDiscord(payload);
      case 'slack':
        return this.formatSlack(payload);
      default:
        return this.formatGeneric(payload);
    }
  }

  private formatGeneric(payload: ProcessEventPayload) {
    return {
      event: payload.event,
      process: {
        id: payload.processId,
        name: payload.processName,
      },
      message: payload.description,
      timestamp: payload.timestamp,
      metadata: payload.metadata || {},
    };
  }

  private formatDiscord(payload: ProcessEventPayload) {
    let color = 0x64748b; // Slate default
    let statusEmoji = '⚪';
    let statusLabel = payload.event.toUpperCase();

    switch (payload.event) {
      case 'online':
        color = 0x10b981; // Emerald
        statusEmoji = '🟢';
        statusLabel = 'ONLINE';
        break;
      case 'restart':
        color = 0xf59e0b; // Amber
        statusEmoji = '🟡';
        statusLabel = 'RESTARTED';
        break;
      case 'stop':
        color = 0x64748b; // Slate
        statusEmoji = '⏸️';
        statusLabel = 'STOPPED';
        break;
      case 'exit':
        color = 0x71717a; // Zinc
        statusEmoji = '⚪';
        statusLabel = 'EXITED';
        break;
      case 'errored':
        color = 0xef4444; // Red
        statusEmoji = '🔴';
        statusLabel = 'ERROR DETECTED';
        break;
      case 'crash_loop':
        color = 0x991b1b; // Core Red Crimson
        statusEmoji = '🚨';
        statusLabel = 'CRASH LOOP';
        break;
      case 'crash_loop_cleared':
        color = 0x059669; // Dark Emerald
        statusEmoji = '✅';
        statusLabel = 'RECOVERED';
        break;
    }

    const fields: Array<{ name: string; value: string; inline: boolean }> = [
      {
        name: '🏷️ Process',
        value: `\`${payload.processName}\` (ID: \`${payload.processId}\`)`,
        inline: true,
      },
      {
        name: '⚡ Status',
        value: `${statusEmoji} \`${statusLabel}\``,
        inline: true,
      },
    ];

    if (payload.metadata?.restarts !== undefined) {
      fields.push({
        name: '🔄 Restarts',
        value: `\`${payload.metadata.restarts}\``,
        inline: true,
      });
    }
    if (payload.metadata?.memoryFormatted) {
      fields.push({
        name: '💾 Memory',
        value: `\`${payload.metadata.memoryFormatted}\``,
        inline: true,
      });
    }
    if (payload.metadata?.cpu !== undefined) {
      fields.push({
        name: '📈 CPU',
        value: `\`${payload.metadata.cpu}%\``,
        inline: true,
      });
    }
    if (payload.metadata?.exitCode !== undefined) {
      fields.push({
        name: '🚪 Exit Code',
        value: `\`${payload.metadata.exitCode}\``,
        inline: true,
      });
    }
    if (payload.metadata?.linesCount !== undefined && payload.metadata.linesCount > 1) {
      fields.push({
        name: '📊 Throttled Lines',
        value: `\`${payload.metadata.linesCount} lines batched\``,
        inline: true,
      });
    }
    if (payload.metadata?.errorMessage) {
      const truncated = payload.metadata.errorMessage.slice(0, 1000);
      fields.push({
        name: '📜 Stderr Output',
        value: `\`\`\`diff\n- ${truncated.split('\n').join('\n- ')}\n\`\`\``,
        inline: false,
      });
    }

    return {
      embeds: [
        {
          author: {
            name: 'Core Red • PM2 Supervisor',
          },
          title: `${statusEmoji} ${payload.processName} • ${statusLabel}`,
          description: payload.description,
          color,
          fields,
          footer: {
            text: 'PM2 EID Dashboard • Core Red Project',
          },
          timestamp: payload.timestamp,
        },
      ],
    };
  }

  private formatSlack(payload: ProcessEventPayload) {
    const isError = payload.event === 'errored' || payload.event === 'crash_loop';
    const isOnline = payload.event === 'online' || payload.event === 'crash_loop_cleared';
    const color = isOnline ? '#10b981' : isError ? '#ef4444' : '#f59e0b';

    return {
      text: `[PM2 Alert] *${payload.processName}* (${payload.event.toUpperCase()}): ${payload.description}`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Process', value: payload.processName, short: true },
            { title: 'Status', value: payload.event.toUpperCase(), short: true },
            { title: 'Restarts', value: String(payload.metadata?.restarts ?? 'N/A'), short: true },
            { title: 'Time', value: payload.timestamp, short: true },
          ],
        },
      ],
    };
  }
}
