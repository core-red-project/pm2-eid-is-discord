/**
 * @file memory-hog.js
 * @description Development fixture simulating a memory-intensive worker process.
 * Allocates and frees buffers to test live RAM monitoring, metrics history, and cluster scaling.
 */

console.log('[MemoryHog] Worker spawned. Allocating base buffers...');

const chunks = [];
let phase = 'growing';

const interval = setInterval(() => {
  const heapMb = process.memoryUsage().heapUsed / 1024 / 1024;

  if (phase === 'growing') {
    // Allocate ~5MB buffer
    chunks.push(Buffer.alloc(5 * 1024 * 1024, 0xaa));
    console.log(
      `[MemoryHog] Growing memory allocation. Chunks: ${chunks.length} (~${(chunks.length * 5).toFixed(0)} MB) | Heap: ${heapMb.toFixed(1)} MB`,
    );

    if (chunks.length >= 10) {
      phase = 'shrinking';
    }
  } else {
    chunks.pop();
    console.log(
      `[MemoryHog] Releasing memory chunks. Chunks remaining: ${chunks.length} | Heap: ${heapMb.toFixed(1)} MB`,
    );

    if (chunks.length <= 1) {
      phase = 'growing';
    }
  }
}, 3000);

process.on('SIGINT', () => {
  console.log('[MemoryHog] Interrupted. Freeing buffers...');
  clearInterval(interval);
  chunks.length = 0;
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[MemoryHog] Terminated. Freeing buffers...');
  clearInterval(interval);
  chunks.length = 0;
  process.exit(0);
});

