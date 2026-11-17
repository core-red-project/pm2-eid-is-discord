/**
 * @file use-cases.test.ts
 * @description Unit tests for application use cases, parameter boundary safety, and NaN defense.
 */

import { describe, expect, it } from 'bun:test';
import { GetLogsUseCase } from '../src/application/use-cases/get-logs.use-case.ts';
import { ScaleProcessUseCase } from '../src/application/use-cases/scale-process.use-case.ts';
import type { IPM2Repository } from '../src/domain/repositories/pm2.repository.interface.ts';

class MockPM2Repository implements Partial<IPM2Repository> {
  lastRequestedLines = 0;
  lastRequestedScaleInstances = 0;

  async getLogs(_nameOrId: string | number, lines: number): Promise<string> {
    this.lastRequestedLines = lines;
    return `stdout mock with ${lines} lines`;
  }

  async getErrorLogs(_nameOrId: string | number, lines: number): Promise<string> {
    this.lastRequestedLines = lines;
    return `stderr mock with ${lines} lines`;
  }

  async scale(_nameOrId: string | number, instances: number): Promise<boolean> {
    this.lastRequestedScaleInstances = instances;
    return true;
  }
}

describe('Use Cases & Parameter Validation', () => {
  describe('GetLogsUseCase boundary enforcement', () => {
    it('should clamp line counts above 1000 down to 1000', async () => {
      const mockRepo = new MockPM2Repository();
      const useCase = new GetLogsUseCase(mockRepo as unknown as IPM2Repository);

      const result = await useCase.execute('test-bot', 'stdout', 5000);
      expect(result.lines).toBe(1000);
      expect(mockRepo.lastRequestedLines).toBe(1000);
    });

    it('should fall back to safe default of 100 when passed NaN', async () => {
      const mockRepo = new MockPM2Repository();
      const useCase = new GetLogsUseCase(mockRepo as unknown as IPM2Repository);

      const result = await useCase.execute('test-bot', 'stdout', Number.NaN);
      expect(result.lines).toBe(100);
      expect(mockRepo.lastRequestedLines).toBe(100);
    });

    it('should fall back to safe default of 100 when passed negative numbers', async () => {
      const mockRepo = new MockPM2Repository();
      const useCase = new GetLogsUseCase(mockRepo as unknown as IPM2Repository);

      const result = await useCase.execute('test-bot', 'stdout', -50);
      expect(result.lines).toBe(100);
      expect(mockRepo.lastRequestedLines).toBe(100);
    });

    it('should route stderr correctly', async () => {
      const mockRepo = new MockPM2Repository();
      const useCase = new GetLogsUseCase(mockRepo as unknown as IPM2Repository);

      const result = await useCase.execute('test-bot', 'stderr', 50);
      expect(result.type).toBe('stderr');
      expect(result.content).toContain('stderr mock');
    });
  });

  describe('ScaleProcessUseCase', () => {
    it('should pass instances to repository', async () => {
      const mockRepo = new MockPM2Repository();
      const useCase = new ScaleProcessUseCase(mockRepo as unknown as IPM2Repository);

      const success = await useCase.execute('test-bot', 4);
      expect(success).toBe(true);
      expect(mockRepo.lastRequestedScaleInstances).toBe(4);
    });
  });
});
