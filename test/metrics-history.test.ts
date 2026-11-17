import { describe, expect, it } from 'bun:test';
import type { GetSystemMetricsUseCase } from '../src/application/use-cases/get-system-metrics.use-case.ts';
import type { SystemMetricsEntity } from '../src/domain/system-metrics.entity.ts';
import { MetricsHistoryService } from '../src/infrastructure/metrics/metrics-history.service.ts';

describe('MetricsHistoryService (Ring Buffer & Sparkline)', () => {
  const mockSystemMetrics: SystemMetricsEntity = {
    cpuUsagePercent: 35.5,
    totalMemoryBytes: 16000000000,
    totalMemoryFormatted: '16.0 GB',
    freeMemoryBytes: 8000000000,
    freeMemoryFormatted: '8.0 GB',
    usedMemoryBytes: 8000000000,
    usedMemoryFormatted: '8.0 GB',
    memoryUsagePercent: 50.0,
    loadAverage: [1.2, 0.8, 0.5],
    uptimeSeconds: 7200,
    uptimeFormatted: '2h 0m',
    hostname: 'test-node',
    platform: 'linux',
    arch: 'x64',
    cpuCores: 8,
  };

  const mockUseCase = {
    execute: async () => mockSystemMetrics,
  } as unknown as GetSystemMetricsUseCase;

  it('should sample metrics and record data points', async () => {
    const service = new MetricsHistoryService(mockUseCase, 5);
    const point = await service.sample();

    expect(point).not.toBeNull();
    expect(point?.cpu).toBe(35.5);
    expect(point?.memoryPercent).toBe(50.0);
    expect(service.getHistory().length).toBe(1);
  });

  it('should enforce circular ring buffer capacity limit', async () => {
    const service = new MetricsHistoryService(mockUseCase, 3);
    await service.sample();
    await service.sample();
    await service.sample();
    await service.sample();

    const history = service.getHistory();
    expect(history.length).toBe(3);
  });

  it('should generate valid SVG sparkline coordinates', async () => {
    const service = new MetricsHistoryService(mockUseCase, 5);
    await service.sample();
    await service.sample();

    const cpuSparkline = service.renderSparklineSvg('cpu', 160, 32);
    expect(cpuSparkline.linePath).toContain('M 0,');
    expect(cpuSparkline.linePath).toContain('L 160,');
    expect(cpuSparkline.areaPath).toContain('L 160,32 L 0,32 Z');
  });
});
