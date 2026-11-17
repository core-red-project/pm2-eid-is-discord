/**
 * @fileoverview Domain Entity for host system hardware and OS metrics.
 * @module domain/system-metrics.entity
 */

/**
 * Host operating system and hardware resource metrics snapshot.
 */
export interface SystemMetricsEntity {
  /** Aggregated CPU usage percentage across all cores */
  cpuUsagePercent: number;
  /** Total system RAM in bytes */
  totalMemoryBytes: number;
  /** Formatted total RAM string (e.g. "16.0 GB") */
  totalMemoryFormatted: string;
  /** Free available RAM in bytes */
  freeMemoryBytes: number;
  /** Formatted free RAM string */
  freeMemoryFormatted: string;
  /** Currently used RAM in bytes */
  usedMemoryBytes: number;
  /** Formatted used RAM string */
  usedMemoryFormatted: string;
  /** Memory utilization percentage */
  memoryUsagePercent: number;
  /** 1-minute, 5-minute, and 15-minute load averages */
  loadAverage: [number, number, number];
  /** Host operating system uptime in seconds */
  uptimeSeconds: number;
  /** Formatted uptime duration string (e.g. "12d 5h") */
  uptimeFormatted: string;
  /** Host system network name */
  hostname: string;
  /** OS platform string ('linux', 'darwin', 'win32') */
  platform: string;
  /** CPU architecture ('x64', 'arm64') */
  arch: string;
  /** Total number of logical CPU cores */
  cpuCores: number;
}
