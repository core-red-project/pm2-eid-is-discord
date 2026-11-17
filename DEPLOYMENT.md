# Deployment

## Environments
| Environment | URL | Branch/tag |
|---|---|---|
| Local Development | `http://127.0.0.1:3847` | `main` |
| Self-Hosted Server (Docker) | `http://127.0.0.1:3847` (or reverse proxy URL) | `main` / release tag |
| Coolify / VPS Container | `https://pm2.<domain>` | release tag |

## Configuration
| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP server port (default: `3847`) |
| `HOST` | No | Binding network interface (default: `127.0.0.1`). If `0.0.0.0`, `AUTH_USER` and `AUTH_PASS` are mandatory. |
| `NODE_ENV` | No | Runtime mode (`development` \| `production`, default: `development`) |
| `TRUST_PROXY` | No | Set to `true` when running behind a trusted reverse proxy (NGINX, Caddy, Cloudflare) to safely evaluate `X-Forwarded-For`. |
| `AUTH_USER` | Conditional | Administrative username required for dashboard and management API. |
| `AUTH_PASS` | Conditional | Administrative password. Mandatory if `HOST` is exposed beyond localhost/loopback. |
| `WEBHOOK_URL` | No | Endpoint URL for crash/restart alerts (Discord webhook, Slack, or generic HTTP receiver). |
| `WEBHOOK_FORMAT` | No | Alert payload format: `discord` \| `slack` \| `generic` (auto-detected by default). |
| `WEBHOOK_EVENTS` | No | Comma-separated list of subscribed PM2 events (`restart,stop,exit,errored` or `*`). |
| `PM2_HOME` | No | Location of PM2 state and daemon socket (default: `~/.pm2` on host, `/root/.pm2` in container). |
| `PM2_DISABLE_VERSION_CHECK` | No | Blocks PM2 daemon's automated version check pings to `version.pm2.io` (enforced as `1` by default). |

(Generated from `.env.example`; keep both in sync.)

## Build
- **Base Image**: `oven/bun:1.2-alpine`
- **Build Mode**: Multi-stage, frozen lockfile (`bun install --production --frozen-lockfile --ignore-scripts`)
- **Execution**: Bun runtime with host PM2 socket access (`/root/.pm2`)
- **Healthcheck**: HTTP GET probe on `http://localhost:${PORT}/health` (interval: 30s, timeout: 5s, start-period: 5s, retries: 3)

## Platform
- **Service**: `pm2-eid-dashboard`
- **Domain**: Configured via host reverse proxy (e.g. Caddy, Traefik, NGINX)
- **Ports**: `127.0.0.1:3847:3847` (loopback only)
- **Volumes**: `~/.pm2:/root/.pm2` (mounts host PM2 daemon IPC socket `rpc.sock` and log files)
- **Health check path**: `/health` (public, unauthenticated JSON probe)

## Secrets
- **Variables**: `AUTH_PASS`, `WEBHOOK_URL`
- **Storage**: Managed via server `.env` file (mode `0600`) or container orchestration secret store (Coolify / Docker Secrets).
- **Rotation**: Change `AUTH_PASS` in `.env` and restart the container (`docker compose restart`). Active sessions are maintained in volatile memory and revoked immediately on container restart.

## Rollback
1. Pull the previous verified container image tag or git commit:
   ```bash
   git checkout v2.0.0
   ```
2. Rebuild and restart the container stack:
   ```bash
   docker compose up -d --build
   ```
3. Verify service health:
   ```bash
   curl -f http://127.0.0.1:3847/health
   ```

## Runbook
| Symptom | Cause | Action |
|---|---|---|
| Startup crash: `Fatal: AUTH_USER and AUTH_PASS are required when binding to...` | `HOST` is set to `0.0.0.0` without credentials | Define `AUTH_USER` and `AUTH_PASS` in `.env` or set `HOST=127.0.0.1`. |
| Dashboard shows 0 processes or "Daemon Failed" | Container cannot access host PM2 socket | Verify `~/.pm2:/root/.pm2` volume mount in `docker-compose.yml` and check that PM2 is running on the host. |
| `429 Too Many Requests` on `/login` | Brute-force rate limiter triggered after 5 failed attempts | Wait 5 minutes for the window to expire or restart the container to reset rate limit memory. |
| Webhook alerts not sending | Invalid or blocked `WEBHOOK_URL` | Check outbound network access from container and verify webhook URL in `.env`. |

