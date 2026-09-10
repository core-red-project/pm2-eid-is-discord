import type { ProcessEventPayload } from '../../domain/events.ts';
import type { INotifier } from '../../domain/repositories/notifier.repository.interface.ts';
import type { AppConfig } from '../config/env.ts';

export class WebhookDispatcher implements INotifier {
  readonly name = 'WebhookDispatcher';

  constructor(private readonly config: AppConfig['webhook']) {}

  isEnabled(): boolean {
    return this.config.enabled && Boolean(this.config.url);
  }

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
          'User-Agent': 'PM2-EID-Dashboard/Bun',
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

  private formatPayload(payload: ProcessEventPayload): any {
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
    // Discord Embed Colors:
    // Green (Online): 0x22c55e
    // Yellow (Restarting): 0xeab308
    // Red (Crash/Error): 0xef4444
    // Gray (Stopped): 0x6b7280
    let color = 0x6b7280;
    if (payload.event === 'online') color = 0x22c55e;
    else if (payload.event === 'restart') color = 0xeab308;
    else if (payload.event === 'errored' || payload.event === 'exit') color = 0xef4444;

    const fields: Array<{ name: string; value: string; inline: boolean }> = [
      {
        name: 'Process',
        value: `\`${payload.processName}\` (ID: ${payload.processId})`,
        inline: true,
      },
      { name: 'Event', value: `**${payload.event.toUpperCase()}**`, inline: true },
    ];

    if (payload.metadata?.restarts !== undefined) {
      fields.push({ name: 'Restarts', value: String(payload.metadata.restarts), inline: true });
    }
    if (payload.metadata?.memoryFormatted) {
      fields.push({ name: 'Memory', value: payload.metadata.memoryFormatted, inline: true });
    }
    if (payload.metadata?.exitCode !== undefined) {
      fields.push({ name: 'Exit Code', value: String(payload.metadata.exitCode), inline: true });
    }
    if (payload.metadata?.errorMessage) {
      fields.push({
        name: 'Details',
        value: `\`\`\`${payload.metadata.errorMessage.slice(0, 500)}\`\`\``,
        inline: false,
      });
    }

    return {
      embeds: [
        {
          title: `PM2 Event: ${payload.processName} is ${payload.event}`,
          description: payload.description,
          color,
          fields,
          footer: {
            text: 'PM2 EID Dashboard',
          },
          timestamp: payload.timestamp,
        },
      ],
    };
  }

  private formatSlack(payload: ProcessEventPayload) {
    return {
      text: `[PM2 Alert] *${payload.processName}* event: *${payload.event}* - ${payload.description}`,
      attachments: [
        {
          color:
            payload.event === 'online'
              ? '#22c55e'
              : payload.event === 'restart'
                ? '#eab308'
                : '#ef4444',
          fields: [
            { title: 'Process', value: payload.processName, short: true },
            { title: 'Status', value: payload.event, short: true },
            { title: 'Time', value: payload.timestamp, short: false },
          ],
        },
      ],
    };
  }
}
