/**
 * @fileoverview In-memory ring buffer for 1-hour rolling system metrics history.
 * Zero database, zero disk I/O, volatile memory storage with instant SVG sparkline generation.
 * @module infrastructure/metrics/metrics-history
 */

import type { GetSystemMetricsUseCase } from '../../application/use-cases/get-system-metrics.use-case.ts';

/** Historical metrics snapshot point */
export interface MetricHistoryPoint {
  /** Timestamp in milliseconds */
  timestamp: number;
  /** CPU utilization percentage */
  cpu: number;
  /** RAM utilization percentage */
  memoryPercent: number;
  /** Used RAM in bytes */
  memoryUsedBytes: number;
}

/**
 * Service that maintains an in-memory rolling buffer of system metrics
 * over the last 60 minutes with zero database persistence.
 */
export class MetricsHistoryService {
  private readonly capacity: number;
  private readonly buffer: MetricHistoryPoint[] = [];
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly getMetricsUseCase: GetSystemMetricsUseCase,
    capacity = 60, // 60 points = 1 hour at 1 point per minute
  ) {
    this.capacity = capacity;
  }

  /**
   * Starts periodic sampling every intervalMs (default: 60,000ms = 1 min).
   */
  start(intervalMs = 60000): void {
    if (this.intervalTimer) return;
    // Sample once immediately
    this.sample().catch(() => {});
    this.intervalTimer = setInterval(() => {
      this.sample().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stops periodic sampling.
   */
  stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Takes a snapshot and records it into the circular buffer.
   */
  async sample(): Promise<MetricHistoryPoint | null> {
    try {
      const metrics = await this.getMetricsUseCase.execute();
      const point: MetricHistoryPoint = {
        timestamp: Date.now(),
        cpu: Math.round(metrics.cpuUsagePercent * 10) / 10,
        memoryPercent: Math.round(metrics.memoryUsagePercent * 10) / 10,
        memoryUsedBytes: metrics.usedMemoryBytes,
      };

      if (this.buffer.length >= this.capacity) {
        this.buffer.shift();
      }
      this.buffer.push(point);
      return point;
    } catch {
      return null;
    }
  }

  /**
   * Returns current rolling history array.
   */
  getHistory(): MetricHistoryPoint[] {
    return [...this.buffer];
  }

  /**
   * Generates SVG path coordinates for zero-JS inline sparklines.
   * @param metric - Target metric property
   * @param width - SVG viewBox width
   * @param height - SVG viewBox height
   */
  renderSparklineSvg(
    metric: 'cpu' | 'memoryPercent',
    width = 160,
    height = 32,
  ): { linePath: string; areaPath: string } {
    const points = this.buffer;
    if (points.length < 2) {
      const defaultY = height / 2;
      return { linePath: `M 0,${defaultY} L ${width},${defaultY}`, areaPath: '' };
    }

    const maxVal = Math.max(100, ...points.map((p) => p[metric]));
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const normalizedY = (p[metric] - minVal) / range;
      const y = height - normalizedY * (height - 6) - 3;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x},${c.y}`).join(' ');
    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

    return { linePath, areaPath };
  }
}
