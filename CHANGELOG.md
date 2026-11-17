# Changelog

All notable changes to **PM2 EID** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [2.1.0] — 2026-11-17

### Added

- **Smart Crash Loop Detection:** Sliding window restart tracker and `unstable_restarts` evaluator in `PM2BusListener`, throttling restart alert spam and dispatching unified `crash_loop` and `crash_loop_cleared` events.
- **Stylized Discord & Slack Webhooks:** Aesthetic rich embeds with status emojis (`🟢`, `🟡`, `🔴`, `🚨`, `✅`), execution badges, and syntax-highlighted diff blocks for stderr logs.
- **1-Hour In-Memory Metrics History:** Rolling RAM ring buffer (`MetricsHistoryService`) maintaining 60 data points of CPU and Memory without databases, rendering inline SVG sparklines in the dashboard and exposing `GET /api/system/metrics/history`.
- **Privacy & Zero-Telemetry Audit:** Comprehensive test suite (`test/privacy-audit.test.ts`) guaranteeing zero tracking SDKs, zero external CDNs, and strictly verifying that the only outbound network request is the user's webhook.
- **Development Test Fixtures:** Ecosystem suite in `fixtures/` (`bot-service.js`, `flaky-service.js`, `memory-hog.js`, `ecosystem.config.cjs`) with `just fixtures-start` and `just fixtures-stop` task runner recipes.
- **Dual-Runtime Compatibility:** Universal execution supporting Bun and Node.js 20+ via `@hono/node-server`.
- **Executable CLI Packaging:** Published as `@sxnnyside/pm2-eid-dashboard` with `pm2-eid` and `pm2-eid-dashboard` binary aliases, runnable via `npx` and `bunx`.
- **Dedicated Node.js Container:** Lightweight production container (`Dockerfile.node`) for Node.js-first deployments.
- **Type-Safe i18n Subsystem:** Multi-language support (English `en` and Spanish `es`) with automatic negotiation via `Accept-Language`, cookie, or `?lang=` override.
- **Host Hardware Telemetry:** Real-time System Metrics widget tracking CPU%, RAM usage, load averages, and uptime with 10s auto-refresh.
- **PM2 State Persistence:** Toolbar action to save process configurations to disk (`pm2.dump()` / `pm2 save`).
- **Process Inspection Modal:** Diagnostics modal (`pm2.describe()`) exposing PIDs, CWD, Git versioning, masked environment variables, and `axm_monitor` metrics.
- **Cluster Scaling Controls:** Dynamic scaling (`pm2.scale()`) with increment/decrement buttons and confirmation prompts.
- **Anti-OOM Log Tailing:** Memory-safe log streaming reading up to the last 256 KB of files via `fs.open` file descriptors.
- **Persistent PM2 IPC Connection:** Singleton daemon connection pool with 10s operation deadlines and automatic single-retry reconnection.
- **Vendored Client Assets:** Vendored `htmx.min.js` (1.9.10) in `public/js/` and standalone controller `public/js/dashboard.js`.
- **CI Node.js Verification Gate:** Bash-based `just verify-dist` script with `trap` process cleanup and connection-refused retries testing bundle health and static assets.
- **Comprehensive Test Suite:** 24 unit tests covering auth middleware, session revocation, constant-time checks, rate limiting, and boundary enforcement.

### Changed

- **License Migration:** Transitioned license from MIT to AGPL-3.0 (GNU Affero General Public License v3.0).
- **Hono JSX Component Architecture:** Migrated all views from template string interpolation to typed `hono/jsx` components using `UpperPascalCase` naming (`DashboardPage.tsx`, `LoginPage.tsx`, `ProcessTable.tsx`, `LogViewer.tsx`, `ProcessDetailModal.tsx`, `SystemMetricsWidget.tsx`).
- **Default Host Binding:** Changed default `HOST` to `127.0.0.1` for immediate, safe localhost execution with `npx` / `bunx`.
- **Refactored Process Routes:** Unified lifecycle action endpoints (`start`, `stop`, `restart`, `reload`, `delete`) into a consolidated dispatcher.
- **Protected Logout Flow:** Changed logout to `POST /logout` via form button to eliminate CSRF logout attacks via image tags.

### Security

- **Mandatory Authentication on External Interfaces:** Halts startup if bound to external addresses (`HOST !== '127.0.0.1'`) without configured `AUTH_USER` and `AUTH_PASS`.
- **Revocable Cryptographic Sessions:** Replaced static hashes with random UUID session tokens (7-day TTL) and immediate server-side revocation on logout.
- **Timing-Attack Resistance:** Enforced constant-time comparison (`crypto.timingSafeEqual`) for passwords and session tokens.
- **Brute-Force Rate Limiting:** Socket-level rate limiting on `/login` and `Authorization: Basic` headers (5 failed attempts per 60s trigger HTTP 429 lockout).
- **Anti-Spoofing IP Resolution:** Evaluates `X-Forwarded-For` only when `TRUST_PROXY=true` (selecting the nearest trusted proxy IP) and caps memory store at 5,000 entries.
- **Strict Content-Security-Policy (CSP):** Removed `'unsafe-inline'` from `script-src` by extracting all client JS to external files.
- **Credential Masking:** Automatically masks sensitive environment variables, API keys, and connection URIs (`DATABASE_URL`, `REDIS_URL`, etc.) in the inspection modal.
- **Mandatory Compose Credentials:** `docker-compose.yml` requires `${AUTH_PASS:?}` before startup, preventing default password exposure.
- **Localhost Default in Docker Compose:** Bound container port to `127.0.0.1:3847:3847` by default.

### Fixed

- **PM2 Daemon Disconnect Race Condition:** Fixed bug where per-request `pm2.disconnect()` severed IPC connections and silenced the real-time event bus listener (`PM2BusListener`).
- **Colon-Safe Basic Auth:** Resolved issue where passwords containing colons (`:`) were truncated during Base64 decoding.
- **Password Whitespace Preservation:** Removed `.trim()` from submitted passwords to preserve intentional leading/trailing spaces.
- **Docker Log Path Translation:** Resolved host-to-container log path mismatch by translating `/.pm2/logs/` paths to container paths.
- **Parameter Validation & NaN Defense:** Fixed `lines` and `instances` query parsing to reject `NaN` and enforce bounded integer ranges.
- **Stderr Burst Throttling:** Batched stderr error lines in 5-second windows per process to prevent Discord and Slack webhook rate-limit bans.

---

## [2.0.0] — 2026-09-10

### Added

- Lightweight self-hosted PM2 management console and real-time process supervisor.
- Clean Architecture implementation powered by Bun 1.4, Hono, HTMX, and Vanilla CSS.
- Dedicated authentication flow with secure HTTP-only cookie sessions.
- Non-native confirmation modal system integrated with HTMX lifecycle.
- Agnostic webhook dispatcher supporting Discord embeds, Slack notifications, and generic JSON webhooks.
- Real-time PM2 event bus listener for crashes, restarts, and runtime errors.
- Full Docker containerization with `docker-compose.yml` and host PM2 socket mounting.
- Canonical task runner configuration with standard command surface.
- Automated unit test suite with `bun:test` and Biome static analysis.

---

[Unreleased]: https://github.com/core-red-project/pm2-eid-is-discord/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/core-red-project/pm2-eid-is-discord/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/core-red-project/pm2-eid-is-discord/releases/tag/v2.0.0
