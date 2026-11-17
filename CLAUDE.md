# PM2 EID Dashboard

## Purpose
Lightweight, self-hosted web dashboard and CLI to monitor, manage, scale, and tail logs for PM2 processes with real-time webhooks.

## Topology
monolithic — Bun / Node.js 20+ backend and Hono JSX frontend in `src/`

## Commands
- `just install` — dependencies
- `just dev` — local development
- `just check` — the gate: format, lint, typecheck, tests. Must pass before any commit/push.
- `just build` · `just test` · `just clean` · `just verify-dist`

## Where things go
| What | Where |
|---|---|
| Domain entities, value objects, and repository interfaces | `src/domain/` |
| Application use cases | `src/application/use-cases/` |
| Infrastructure config & env validation | `src/infrastructure/config/` |
| PM2 client SDK & event bus listener | `src/infrastructure/pm2/` |
| Webhook notifier dispatchers | `src/infrastructure/notifications/` |
| HTTP middlewares (auth, rate limiting, logging) | `src/presentation/middlewares/` |
| HTTP route handlers | `src/presentation/routes/` |
| UI pages and JSX components | `src/presentation/views/` |
| Internationalization dictionaries | `src/presentation/i18n/` |
| Static web assets (CSS, icons) | `public/` |
| Unit and integration tests | `test/` |
| Binaries and build outputs | `dist/` |

## Conventions
- Hono JSX with UpperPascalCase component file names (`ProcessTable.tsx`, `LogViewer.tsx`).
- Strict TypeScript (`strict: true`, no `any`, strict null checks).
- Clean Architecture boundaries: Presentation -> Application -> Domain <- Infrastructure.
- Timing-safe comparisons (`timingSafeEqual`) for all secret and token validations.
- Standardized API response envelopes `{ success: boolean, data?: T, error?: string }`.
- Multi-language UI: all user-facing strings must use the `t(lang, key, params)` translation helper.

## Do not
- Never commit secrets, tokens, or plaintext passwords.
- Never bypass `just check` or commit code that fails the quality gate.
- Never leak raw error messages or internal stack traces to HTTP clients.
- Never use synchronous file reading on unbounded files (always use bounded tail reading).
- Never disconnect the global PM2 client connection per request; use the persistent shared connection.
