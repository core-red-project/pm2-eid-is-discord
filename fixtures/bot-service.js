/**
 * @file bot-service.js
 * @description Development fixture simulating a healthy, stable Discord bot or worker process.
 */

console.log('[BotService] Initializing bot client...');
console.log('[BotService] Connecting to gateway...');

setTimeout(() => {
  console.log('[BotService] Successfully logged in as CoreRedBot#1337');
  console.log('[BotService] Serving 14 guilds with 24,500 active users.');
}, 1000);

let heartbeatCount = 0;
const interval = setInterval(() => {
  heartbeatCount++;
  const memoryMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  console.log(
    `[BotService] Heartbeat #${heartbeatCount} | Heap: ${memoryMb} MB | Latency: ${Math.floor(20 + Math.random() * 15)}ms`,
  );
}, 5000);

process.on('SIGINT', () => {
  console.log('[BotService] SIGINT received. Shutting down gracefully...');
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[BotService] SIGTERM received. Shutting down gracefully...');
  clearInterval(interval);
  process.exit(0);
});

