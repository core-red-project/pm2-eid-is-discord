# Changelog

All notable changes to **PM2 EID** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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

[Unreleased]: https://github.com/core-red-project/pm2-eid-is-discord/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/core-red-project/pm2-eid-is-discord/releases/tag/v2.0.0
