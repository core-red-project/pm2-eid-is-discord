/**
 * @fileoverview Real-time PM2 Event Bus listener with exponential backoff reconnection
 * and stderr log burst throttling to prevent webhook rate limits.
 * @module infrastructure/pm2/pm2-bus-listener
 */

import pm2 from 'pm2';
import type { NotifyEventUseCase } from '../../application/use-cases/notify-event.use-case.ts';
import type { ProcessEventType } from '../../domain/events.ts';

/** Pending stderr aggregation batch for a single process */
interface StderrBatch {
  processName: string;
  processId: number;
  lines: string[];
  timer: ReturnType<typeof setTimeout>;
}

/** State tracking for sliding window crash loop detection */
interface CrashLoopState {
  restartTimestamps: number[];
  inCrashLoop: boolean;
  recoveryTimer?: ReturnType<typeof setTimeout> | undefined;
}

/**
 * Daemon listener that taps into PM2's internal IPC message bus via `pm2.launchBus`.
 */
export class PM2BusListener {
  private isListening = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelayMs = 3000;
  private readonly maxRetryDelayMs = 30000;

  /** Active stderr log throttling batches keyed by process name */
  private stderrBatches = new Map<string, StderrBatch>();
  private readonly STDERR_BATCH_WINDOW_MS = 5000;

  /** Active crash loop tracking state per process */
  private crashLoopStates = new Map<string, CrashLoopState>();
  private readonly CRASH_LOOP_WINDOW_MS = 60000;
  private readonly CRASH_LOOP_THRESHOLD = 3;
  private readonly STABILITY_RECOVERY_MS = 45000;

  constructor(private readonly notifyEventUseCase: NotifyEventUseCase) {}

  /**
   * Starts listening to the PM2 event bus stream.
   */
  start(): void {
    if (this.isListening) return;
    this.connectAndListen();
  }

  /**
   * Stops listening and clears active reconnection, stderr batch, and crash loop timers.
   */
  stop(): void {
    this.isListening = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const batch of this.stderrBatches.values()) {
      clearTimeout(batch.timer);
    }
    this.stderrBatches.clear();

    for (const state of this.crashLoopStates.values()) {
      if (state.recoveryTimer) {
        clearTimeout(state.recoveryTimer);
      }
    }
    this.crashLoopStates.clear();
  }

  /**
   * Connects to PM2 daemon and hooks event listeners onto the launched bus.
   */
  private connectAndListen(): void {
    pm2.connect((err) => {
      if (err) {
        console.error('[PM2BusListener] PM2 daemon connection failed:', err.message);
        this.scheduleReconnect();
        return;
      }

      pm2.launchBus((busErr, bus) => {
        if (busErr || !bus) {
          console.error(
            '[PM2BusListener] Failed to launch bus:',
            busErr?.message || 'Unknown bus error',
          );
          this.scheduleReconnect();
          return;
        }

        this.isListening = true;
        this.retryDelayMs = 3000; // Reset backoff on success
        console.log('[PM2BusListener] Connected to PM2 message bus');

        bus.on('process:event', (data: any) => {
          try {
            this.handleProcessLifecycleEvent(data);
          } catch (e: any) {
            console.error('[PM2BusListener] Error processing bus event:', e?.message || e);
          }
        });

        bus.on('log:err', (data: any) => {
          try {
            const processName = data.process?.name || 'unknown';
            const processId = data.process?.pm_id ?? -1;
            const rawMessage = String(data.data || '').trim();

            if (!rawMessage) return;

            this.handleStderrMessage(processName, processId, rawMessage);
          } catch (e: any) {
            console.error('[PM2BusListener] Error processing bus error log:', e?.message || e);
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

  /**
   * Evaluates lifecycle events for rapid restarts, crash loops, and recovery stabilization.
   */
  private handleProcessLifecycleEvent(data: any): void {
    const rawEvent = data.event;
    const processName = data.process?.name || 'unknown';
    const processId = data.process?.pm_id ?? -1;

    let eventType: ProcessEventType | null = null;
    if (rawEvent === 'online') eventType = 'online';
    else if (rawEvent === 'restart') eventType = 'restart';
    else if (rawEvent === 'stop') eventType = 'stop';
    else if (rawEvent === 'exit') eventType = 'exit';

    if (!eventType) return;

    let state = this.crashLoopStates.get(processName);
    if (!state) {
      state = { restartTimestamps: [], inCrashLoop: false };
      this.crashLoopStates.set(processName, state);
    }

    const now = Date.now();

    // 1. Crash loop detection on restart or sudden exit
    if (eventType === 'restart' || eventType === 'exit') {
      if (state.recoveryTimer) {
        clearTimeout(state.recoveryTimer);
        state.recoveryTimer = undefined;
      }

      state.restartTimestamps = state.restartTimestamps.filter(
        (t) => now - t <= this.CRASH_LOOP_WINDOW_MS,
      );
      state.restartTimestamps.push(now);

      const unstableRestarts = Number(data.process?.unstable_restarts || 0);
      const isLoop =
        state.restartTimestamps.length >= this.CRASH_LOOP_THRESHOLD ||
        unstableRestarts >= this.CRASH_LOOP_THRESHOLD;

      if (isLoop) {
        if (!state.inCrashLoop) {
          state.inCrashLoop = true;
          this.notifyEventUseCase.execute({
            event: 'crash_loop',
            processName,
            processId,
            description: `Process "${processName}" has entered a crash loop (${state.restartTimestamps.length} restarts in 60s, unstable restarts: ${unstableRestarts}). Repeated restart alerts are now throttled.`,
            timestamp: new Date().toISOString(),
            metadata: {
              restarts: data.process?.restart_time,
              unstableRestarts,
              exitCode: data.process?.exit_code,
              restartsInWindow: state.restartTimestamps.length,
            },
          });
        }
        // Suppress individual restart notification spam while in crash loop
        return;
      }
    }

    // 2. Recovery tracking on online
    if (eventType === 'online') {
      if (state.inCrashLoop) {
        if (state.recoveryTimer) {
          clearTimeout(state.recoveryTimer);
        }
        state.recoveryTimer = setTimeout(() => {
          if (state?.inCrashLoop) {
            state.inCrashLoop = false;
            state.restartTimestamps = [];
            state.recoveryTimer = undefined;
            this.notifyEventUseCase.execute({
              event: 'crash_loop_cleared',
              processName,
              processId,
              description: `Process "${processName}" has stabilized and recovered from the crash loop.`,
              timestamp: new Date().toISOString(),
              metadata: {
                restarts: data.process?.restart_time,
              },
            });
          }
        }, this.STABILITY_RECOVERY_MS);
      }
    }

    this.notifyEventUseCase.execute({
      event: eventType,
      processName,
      processId,
      description: `Process "${processName}" triggered ${eventType} event`,
      timestamp: new Date().toISOString(),
      metadata: {
        restarts: data.process?.restart_time,
        exitCode: data.process?.exit_code,
        unstableRestarts: data.process?.unstable_restarts,
      },
    });
  }

  /**
   * Batches stderr log lines over a 5-second window per process to prevent
   * webhook spam and rate-limit blocks when processes crash or dump stack traces.
   */
  private handleStderrMessage(processName: string, processId: number, line: string): void {
    const existing = this.stderrBatches.get(processName);
    if (existing) {
      if (existing.lines.length < 50) {
        existing.lines.push(line);
      }
      return;
    }

    const timer = setTimeout(() => {
      const batch = this.stderrBatches.get(processName);
      this.stderrBatches.delete(processName);
      if (!batch) return;

      const aggregatedMessage = batch.lines.join('\n').slice(0, 1500);
      this.notifyEventUseCase.execute({
        event: 'errored',
        processName: batch.processName,
        processId: batch.processId,
        description: `Process "${batch.processName}" emitted error in stderr`,
        timestamp: new Date().toISOString(),
        metadata: {
          errorMessage: aggregatedMessage,
          linesCount: batch.lines.length,
        },
      });
    }, this.STDERR_BATCH_WINDOW_MS);

    this.stderrBatches.set(processName, {
      processName,
      processId,
      lines: [line],
      timer,
    });
  }

  /**
   * Schedules a reconnection attempt with exponential backoff up to 30s.
   */
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
