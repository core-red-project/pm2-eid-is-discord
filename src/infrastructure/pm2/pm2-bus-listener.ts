import pm2 from 'pm2';
import type { NotifyEventUseCase } from '../../application/use-cases/notify-event.use-case.ts';
import type { ProcessEventType } from '../../domain/events.ts';

export class PM2BusListener {
  private isListening = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelayMs = 3000;
  private readonly maxRetryDelayMs = 30000;

  constructor(private readonly notifyEventUseCase: NotifyEventUseCase) {}

  start(): void {
    if (this.isListening) return;
    this.connectAndListen();
  }

  stop(): void {
    this.isListening = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private connectAndListen(): void {
    pm2.connect((err) => {
      if (err) {
        console.error('[PM2BusListener] PM2 daemon connection failed:', err.message);
        this.scheduleReconnect();
        return;
      }

      pm2.launchBus((busErr, bus) => {
        if (busErr || !bus) {
          console.error('[PM2BusListener] Failed to launch event bus:', busErr?.message);
          this.scheduleReconnect();
          return;
        }

        this.isListening = true;
        this.retryDelayMs = 3000; // Reset backoff upon successful connection
        console.log('[PM2BusListener] Event bus connected to PM2 daemon');

        bus.on('process:event', (data: any) => {
          try {
            const rawEvent = data.event as string;
            const processName = data.process?.name || 'unknown';
            const processId = data.process?.pm_id ?? -1;

            let eventType: ProcessEventType | null = null;
            if (rawEvent === 'online') eventType = 'online';
            else if (rawEvent === 'restart') eventType = 'restart';
            else if (rawEvent === 'stop') eventType = 'stop';
            else if (rawEvent === 'exit') eventType = 'exit';

            if (!eventType) return;

            this.notifyEventUseCase.execute({
              event: eventType,
              processName,
              processId,
              description: `Process "${processName}" triggered ${eventType} event`,
              timestamp: new Date().toISOString(),
              metadata: {
                restarts: data.process?.restart_time,
                exitCode: data.process?.exit_code,
              },
            });
          } catch (e: any) {
            console.error('[PM2BusListener] Error processing bus event:', e?.message);
          }
        });

        bus.on('log:err', (data: any) => {
          try {
            const processName = data.process?.name || 'unknown';
            const processId = data.process?.pm_id ?? -1;
            const rawMessage = String(data.data || '').trim();

            if (!rawMessage) return;

            this.notifyEventUseCase.execute({
              event: 'errored',
              processName,
              processId,
              description: `Process "${processName}" emitted error in stderr`,
              timestamp: new Date().toISOString(),
              metadata: {
                errorMessage: rawMessage.slice(0, 1000),
              },
            });
          } catch (e: any) {
            console.error('[PM2BusListener] Error processing bus error log:', e?.message);
          }
        });

        bus.on('close', () => {
          console.warn('[PM2BusListener] PM2 event bus connection closed');
          this.isListening = false;
          this.scheduleReconnect();
        });

        bus.on('error', (bErr: any) => {
          console.error('[PM2BusListener] PM2 bus stream error:', bErr?.message || bErr);
          this.isListening = false;
          this.scheduleReconnect();
        });
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    console.log(`[PM2BusListener] Attempting reconnection in ${this.retryDelayMs / 1000}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.retryDelayMs = Math.min(this.retryDelayMs * 1.5, this.maxRetryDelayMs);
      this.connectAndListen();
    }, this.retryDelayMs);
  }
}
