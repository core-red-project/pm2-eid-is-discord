/**
 * Domain Events
 * Clean Architecture - Domain Layer
 */

export type ProcessEventType = 'online' | 'restart' | 'stop' | 'exit' | 'errored';

export interface ProcessEventPayload {
  event: ProcessEventType;
  processName: string;
  processId: number;
  description: string;
  timestamp: string;
  metadata?: {
    cpu?: number;
    memoryFormatted?: string;
    restarts?: number;
    exitCode?: number;
    errorMessage?: string;
  };
}
