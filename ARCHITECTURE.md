# Architecture

## Overview
PM2 EID Dashboard is a lightweight, dual-runtime (Bun & Node.js 20+) process management console and notification engine for PM2 infrastructure. It provides real-time process monitoring, lifecycle control, cluster scaling, safe log tailing, and incident alerting via webhooks. Built on Clean Architecture, it cleanly decouples the core business logic from runtimes, web frameworks, and delivery mechanisms.

## Components
| Component | Responsibility | Depends on |
|---|---|---|
| Domain Layer (`src/domain/`) | Core business entities (`ProcessEntity`, `ProcessMetrics`), domain event definitions, and repository interfaces (`IPM2Repository`, `INotifier`). Zero external dependencies. | None |
| Application Layer (`src/application/`) | Coordinates use cases: process listing, lifecycle management, safe tail log reading, clustering scale, and alert notification dispatching. | Domain Layer |
| Infrastructure Layer (`src/infrastructure/`) | Adapters for PM2 SDK over IPC Unix sockets (`rpc.sock`), PM2 event bus listener (`launchBus`), agnostic webhook dispatcher (Discord, Slack, generic JSON), and environment configuration. | Domain Layer, PM2 SDK |
| Presentation Layer (`src/presentation/`) | Hono web router, cookie-based session auth middleware with constant-time verification, rate limiting, i18n service, and server-rendered Hono JSX components with HTMX interactivity. | Application Layer, Domain Layer |
| Static Assets (`public/`) | Vanilla CSS with Core Red dark design tokens and SVG/WebP favicons. Served directly by Hono static middleware. | None |

## Data flow
1. **Client Request**: Operator triggers an action via browser UI (HTMX) or REST API (`/api/processes/:name/:action`).
2. **Security & Rate Limiting**: Hono middleware enforces timing-safe session authentication and IP-based failed login rate limiting.
3. **Use Case Execution**: Request reaches the corresponding application use case (e.g. `ManageProcessUseCase`).
4. **Daemon Communication**: The use case invokes `IPM2Repository`, which reuses a persistent PM2 IPC connection over `~/.pm2/rpc.sock` to execute the operation on the host daemon.
5. **State Update & View Rendering**: The updated process list is re-queried, and Hono renders a localized JSX component fragment (`ProcessTable.tsx`) returned directly to HTMX for partial DOM replacement.
6. **Asynchronous Daemon Events**: The background `PM2BusListener` detects daemon state transitions (`process:event`, `log:err`), evaluates the event mask, and triggers `NotifyEventUseCase` to dispatch webhook alerts via `WebhookDispatcher`.

## Decisions
| Decision | Why | Alternatives rejected |
|---|---|---|
| Server-rendered JSX + HTMX | Zero client-side JavaScript build step, instant page loads (<30ms), minimal bundle size (<30MB RAM footprint). | React/Vue SPA (excessive complexity, heavy bundle, client hydration lag). |
| Persistent PM2 Connection | Reusing a single connected PM2 client avoids race conditions, disconnect collisions, and event bus drops under concurrent HTMX polling. | Per-request `pm2.connect()` / `pm2.disconnect()` (caused connection dropping, webhook silence). |
| Bounded Tail Log Reading | Reading the last 256 KB of log files with `fs.read` and backwards newline slicing prevents OOM crashes when inspecting multi-gigabyte log files. | Unbounded `fs.readFile()` (caused out-of-memory crashes on large production logs). |
| In-Memory Session Table + TimingSafeEqual | Ephemeral cryptographically random UUID tokens with sliding expiration and constant-time string comparison eliminate credential leakage and replay attacks. | Stateless password hash cookies (could not be revoked, leaked in proxies). |
| Dual-Runtime Support (Bun + Node.js) | Allows users without Bun installed to run the dashboard as a CLI (`npx @sxnnyside/pm2-eid-dashboard`) while retaining fast native Bun execution in Docker/dev. | Bun-only deployment (blocked Node.js-only production servers). |

## Constraints
- **Host Socket Access**: Managing PM2 processes requires direct access to the PM2 daemon socket (`~/.pm2/rpc.sock`). In Docker, `~/.pm2` must be mounted into the container.
- **Port Binding Policy**: Unauthenticated mode is strictly restricted to loopback (`127.0.0.1` or `::1`). Binding to `0.0.0.0` without configuring `AUTH_USER` and `AUTH_PASS` aborts process startup immediately.
- **Node.js Compatibility**: The bundled distribution (`dist/index.mjs`) must run on Node.js >= 20.0.0 without native Bun globals.

