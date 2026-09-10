# PM2 EID

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
[![CI](https://github.com/core-red-project/pm2-eid-is-discord/workflows/CI/badge.svg)](https://github.com/core-red-project/pm2-eid-is-discord/actions)

<p align="center">
  <strong>Lightweight ✦ Self-Hosted ✦ Dockerizable</strong><br>
  <em>Modern web management console and real-time supervisor for PM2 processes.</em>
</p>

<p align="center">
  <a href="#about">About</a> ✦
  <a href="#features">Features</a> ✦
  <a href="#installation">Installation</a> ✦
  <a href="#usage">Usage</a> ✦
  <a href="#architecture">Architecture</a> ✦
  <a href="#contributing">Contributing</a>
</p>

---

## About

**PM2 EID** (official name: **PM2 EID Is Discord Dashboard**, or simply **PM2 EID**) is a lightweight, dockerizable web console and event supervisor for the PM2 process manager.

Traditional PM2 monitoring options are often tied to cloud subscriptions, heavy runtimes, or abandoned projects. PM2 EID provides a zero-build, self-contained dashboard that interacts directly with the local or host PM2 daemon over its Unix domain socket without external telemetry.

It pairs an ultra-fast Bun and Hono backend with a reactive HTMX interface, streaming process controls and tail logs with minimal server footprint.

### Philosophy

> _"Operational infrastructure should be fast, self-contained, and devoid of cloud dependencies."_

This is a Core Red Project, part of the Sxnnyside Project's experimental branch.

## Features

- **Process Supervision**: Real-time process monitoring (CPU, memory, restarts, uptime) with Start, Stop, Restart, and Delete controls.
- **Log Streaming**: Interactive stdout and stderr log tailing directly in the browser with log flush capabilities.
- **Docker-Ready**: Seamless container deployment mounting the host's `~/.pm2` daemon socket.
- **Agnostic Webhooks**: Automated event dispatching to Discord (rich embeds), Slack, or generic JSON endpoints on crashes and restarts.
- **Secure Authentication**: Built-in credential verification with HTTP-only cookie sessions and non-native login view.
- **Ergonomic HTMX UI**: Pure declarative partial swaps and custom dark confirmation dialogs without client framework bloat.

## Installation

### Prerequisites

- Bun (>= 1.4.0) or Docker
- PM2 (>= 5.4.0) running on host or container environment

### From Source

```bash
git clone https://github.com/core-red-project/pm2-eid-is-discord.git
cd pm2-eid-is-discord

just install
just dev
```

### Docker Deployment

```bash
# Using Docker Compose mounting the host PM2 daemon
docker compose up -d --build
```

## Usage

```bash
# Start development server with hot-reload
just dev

# Production build
just build

# Run quality checks
just check
```

## Architecture

For a detailed breakdown, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
pm2-eid-is-discord/
├── src/          # Clean Architecture application layers (Domain, Application, Infrastructure, Presentation)
├── public/       # Static assets, CSS, and official icons
├── test/         # Automated unit test suite with bun:test
└── docs/         # System design, quickstart, and operational documentation
```

## Contributing

Contributions are accepted. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Before contributing, read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>PM2 EID</strong> — Core Red Project<br>
  <em>&copy; 2026 Sxnnyside Project</em>
</p>
