# PM2 EID — System Architecture

**Version:** 2.0.0  
**Division:** Core Red Project  
**Organization:** Sxnnyside Project  
**Contact:** houjou.sxnnyside@sxnnysideproject.com

Technical design, component architecture, and operational flow documentation for **PM2 EID**.

---

## 1. Architectural Overview

PM2 EID is built upon **Clean Architecture** principles to separate core domain business rules from external frameworks, runtimes, and delivery mechanisms.

### Core Architectural Goals

- **Extreme Performance & Low Footprint**: Built with **Bun 1.4** and **Hono**, consuming <30 MB of RAM at idle.
- **Zero Build-Step Frontend**: Uses **HTMX** with server-rendered HTML components and **Vanilla CSS**, eliminating client-side bundle compilation, hydration lag, and complex SPA frameworks.
- **Platform Agnostic Delivery**: Runs natively via Bun or inside an Alpine-based Docker container mounting the host's PM2 daemon socket.
- **Strict Decoupling**: Business use cases (process lifecycle, tail log reading, alert dispatching) depend only on domain interfaces, not on PM2 or Discord directly.

---

## 2. Layered Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│  - Hono Web Framework & Routing                        │
│  - Cookie Session Auth Middleware                      │
│  - HTMX Component Templates (Table, Logs, Login)       │
└───────────────────────────┬────────────────────────────┘
                            │ Calls Use Cases
┌───────────────────────────▼────────────────────────────┐
│                   Application Layer                    │
│  - ListProcessesUseCase                                │
│  - ManageProcessUseCase (start, stop, restart, delete) │
│  - GetLogsUseCase (stdout/stderr tailing)              │
│  - NotifyEventUseCase (orchestrates alerts)            │
└───────────────────────────┬────────────────────────────┘
                            │ Invokes Domain Contracts
┌───────────────────────────▼────────────────────────────┐
│                      Domain Layer                      │
│  - ProcessEntity & ProcessMetrics Value Objects        │
│  - ProcessEvent & ProcessEventType                     │
│  - IPM2Repository (Interface)                          │
│  - INotifier (Interface)                               │
└───────────────────────────▲────────────────────────────┘
                            │ Implemented By
┌───────────────────────────┴────────────────────────────┐
│                  Infrastructure Layer                  │
│  - PM2ClientRepository (PM2 SDK + Socket IPC)          │
│  - PM2BusListener (Real-time daemon event bus)         │
│  - WebhookDispatcher (Discord, Slack, Generic JSON)    │
│  - Config & Environment Validation                     │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Breakdown

### 3.1 Domain Layer (`src/domain/`)
The inner core contains zero external framework dependencies:
- **`process.entity.ts`**: Defines `ProcessEntity`, `ProcessStatus` (`online`, `stopped`, `errored`, `launching`), and `ProcessMetrics`.
- **`events.ts`**: Defines domain event payloads (`ProcessEventPayload`) representing process transitions.
- **`repositories/pm2.repository.interface.ts`**: Defines the contract `IPM2Repository` for process operations and log reading.
- **`repositories/notifier.repository.interface.ts`**: Defines the contract `INotifier` for dispatching external alert notifications.

### 3.2 Application Layer (`src/application/`)
Implements specific business workflows:
- **`ListProcessesUseCase`**: Fetches all managed processes and maps them into standardized domain entities.
- **`ManageProcessUseCase`**: Validates and triggers lifecycle transitions (`start`, `stop`, `restart`, `reload`, `delete`, `flush`).
- **`GetLogsUseCase`**: Enforces safe log line limits (1 to 1000) and tails stdout/stderr logs.
- **`NotifyEventUseCase`**: Filters and coordinates asynchronous notification delivery across all registered notifiers.

### 3.3 Infrastructure Layer (`src/infrastructure/`)
Contains concrete adapters to operating system resources:
- **`PM2ClientRepository`**: Connects to the local PM2 daemon over Unix domain sockets (`~/.pm2/rpc.sock`), manages connection timeouts, and safely reads log files.
- **`PM2BusListener`**: Subscribes to `pm2.launchBus` to stream real-time events (`process:event`, `log:err`) directly from the PM2 background daemon.
- **`WebhookDispatcher`**: Formats and dispatches HTTP POST payloads to Discord (embeds), Slack (blocks), or generic JSON receivers using native `fetch`.
- **`env.ts`**: Centralized, type-safe configuration validating environment variables.

### 3.4 Presentation Layer (`src/presentation/`)
Handles HTTP transport and HTML/JSON delivery:
- **`Hono Framework`**: Ultrafast router handling `/api/processes`, `/health`, and `/login`.
- **`Auth Middleware`**: Implements session authentication via secure cookies and validates Bearer tokens.
- **`HTMX View Components`**:
  - `dashboard.page.ts`: Main administrative console shell.
  - `login.page.ts`: Dedicated dark authentication portal.
  - `process-table.ts`: Dynamic HTML table returned directly to HTMX triggers.
  - `log-viewer.ts`: Real-time stdout/stderr log inspection drawer with tab controls.

---

## 4. Container & Docker Architecture

When deployed in Docker, PM2 EID communicates with the host operating system's PM2 daemon:

```
[Host Server]
  │
  ├── PM2 Daemon (Managing Node.js, bots, APIs)
  │    └── Socket: ~/.pm2/rpc.sock
  │
  └── Docker Engine
       └── PM2 EID Container (oven/bun:alpine)
            ├── /root/.pm2 (Mounted from Host ~/.pm2)
            └── Port 3847 (Mapped to Host)
```

This ensures that the container does not run an isolated sub-daemon; rather, it provides a web-based supervision window directly over the server's existing processes.

---

## 5. Technology Choices & Rationale

| Layer | Selection | Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Bun 1.4** | Native TypeScript execution without transpile step, 8ms startup time, built-in package manager, and full Node socket compatibility. |
| **Server** | **Hono 4.x** | Ultra-lightweight web framework (<15 KB), zero dependencies, high performance, and built-in cookie and auth helpers. |
| **Frontend** | **HTMX** | Replaces heavy SPA frameworks (React/Vue) with declarative HTML over the wire. Server renders components directly. |
| **Styling** | **Vanilla CSS** | Maximum control with zero runtime or build overhead, styled with the Core Red Project dark aesthetic. |
| **Tooling** | **Biome** | Sub-millisecond formatting and static analysis replacing ESLint and Prettier. |

---

*PM2 EID is a Core Red Project. Part of the [Sxnnyside Project](https://sxnnysideproject.com).*
