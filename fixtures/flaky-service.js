/**
 * @file flaky-service.js
 * @description Development fixture simulating an unstable service that repeatedly crashes.
 * Useful for testing PM2 restart limits, crash loop detection, and stderr burst batching.
 */

console.log('[FlakyService] Process starting up...');
const uptimeBeforeCrashMs = 2500 + Math.floor(Math.random() * 2000);

setTimeout(() => {
  console.log('[FlakyService] Establishing database connection pool...');
}, 800);

setTimeout(() => {
  console.error('[FlakyService] CRITICAL ERROR: Unhandled rejection in database driver:');
  console.error('[FlakyService]   ConnectionTimeout: Failed to acquire socket after 2000ms');
  console.error('[FlakyService]   at Timeout._onTimeout (/app/driver/pool.js:142:19)');
  console.error('[FlakyService] Exiting process with code 1 to trigger PM2 restart.');
  process.exit(1);
}, uptimeBeforeCrashMs);

