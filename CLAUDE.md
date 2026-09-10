# PM2 EID Dashboard

Lightweight, self-hosted PM2 process management console for Discord bots and production Node.js infrastructure.

**Organization:** Sxnnyside Project  
**Division:** Core Red Project  
**Repository Topology:** Monolithic (single deployable unit)

---

## Command Surface

All common development tasks are orchestrated through `just`:

```bash
just install     # Bootstrap dependencies with Bun
just dev         # Start local development server with hot-reloading
just build       # Produce production bundle via tsup
just test        # Run automated test suite with bun:test
just typecheck   # Validate TypeScript types (tsc --noEmit)
just lint        # Run Biome static analysis
just format      # Format code with Biome
just check       # Run complete quality gate (format, lint, typecheck, test)
just clean       # Clean build artifacts and temporary caches
```

---

## Technology Stack

- **Runtime & Package Manager:** Bun 1.4+
- **Web Framework:** Hono 4.x
- **Frontend Interactivity:** HTMX
- **Styling:** Vanilla CSS (Dark theme with Core Red crimson accent)
- **Static Analysis & Formatting:** Biome
- **Type Checking:** TypeScript (strict mode enabled)
- **Testing:** `bun:test`
- **Build Tool:** tsup

---

## Architecture & Code Organization

The codebase is organized under `src/` following Clean Architecture principles:

```
pm2-eid-discord/
├── src/
│   ├── domain/                               # Pure business entities & contracts
│   │   ├── process.entity.ts                 # Process entities, status & metrics types
│   │   ├── events.ts                         # Domain event payloads (online, restart, exit, errored)
│   │   └── repositories/
│   │       ├── pm2.repository.interface.ts   # IPM2Repository contract
│   │       └── notifier.repository.interface.ts # INotifier contract
│   ├── application/                          # Application use cases
│   │   └── use-cases/
│   │       ├── list-processes.use-case.ts    # Process listing
│   │       ├── manage-process.use-case.ts    # Lifecycle controls (start, stop, restart, reload, delete, flush)
│   │       ├── get-logs.use-case.ts          # Safe tail-log reading
│   │       └── notify-event.use-case.ts      # Multi-channel notification dispatcher
│   ├── infrastructure/                       # External adapters & implementations
│   │   ├── config/env.ts                     # Validated environment configuration
│   │   ├── pm2/
│   │   │   ├── pm2-client.ts                 # PM2 SDK programmatic client
│   │   │   └── pm2-bus-listener.ts           # Real-time PM2 event bus listener (pm2.launchBus)
│   │   └── notifications/
│   │       └── webhook-dispatcher.ts         # Agnostic webhook dispatcher (Generic JSON, Discord, Slack)
│   ├── presentation/                         # Web delivery layer (Hono + HTMX)
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts            # Cookie-based session authentication with Bearer fallback
│   │   │   └── logger.middleware.ts          # Lightweight request timing logger
│   │   ├── routes/
│   │   │   ├── health.routes.ts              # /health probe endpoint
│   │   │   └── process.routes.ts             # /api/processes endpoints (JSON and HTMX partials)
│   │   └── views/
│   │       ├── components/process-table.ts   # HTML table with strict XSS escaping
│   │       ├── components/log-viewer.ts      # Log drawer with HTMX tabs
│   │       └── pages/
│   │           ├── dashboard.page.ts         # Main dashboard layout
│   │           └── login.page.ts             # Dedicated authentication view
│   └── index.ts                              # Application entrypoint & Bun.serve bootstrap
├── public/                                   # Static assets (CSS, official icons)
├── test/                                     # Automated test suites
├── Dockerfile                                # Alpine-based production image (<50MB)
├── docker-compose.yml                        # Production orchestration with host PM2 socket mount
├── Justfile                                  # Canonical task runner definitions
├── biome.json                                # Biome formatting and linting rules
└── tsconfig.json                             # TypeScript compiler configuration
```

---

## Coding Conventions

1. **TypeScript Strictness**: Always maintain `strict: true`. Avoid `any` where concrete interfaces can be defined.
2. **HTML & HTMX Safety**: Always escape dynamic user inputs and process data before rendering into HTML templates. Use quoted attributes for all variables.
3. **No Native Browser Alerts**: Confirmations use the non-native HTML5 `<dialog id="confirm-modal">` intercepted through `htmx:confirm`.
4. **Task Runner First**: Always execute routine operations via `just <recipe>`.
5. **Quality Gate**: Before submitting changes, ensure `just check` passes cleanly with zero errors.
