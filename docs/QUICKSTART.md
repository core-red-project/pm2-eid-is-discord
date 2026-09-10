# PM2 EID — Quick Start Guide

**Version:** 2.0.0  
**Division:** Core Red Project  
**Organization:** Sxnnyside Project  
**Contact:** houjou.sxnnyside@sxnnysideproject.com

Fast installation and production deployment guide for **PM2 EID**, the lightweight, self-hosted web console and real-time supervisor for PM2.

---

## Deployment Options

Choose the deployment method that best fits your infrastructure:

| Method | Best For | Prerequisites |
| :--- | :--- | :--- |
| **Docker Compose** | Standalone VPS / Server | Docker, Docker Compose, PM2 on host |
| **Coolify** | Self-hosted PaaS with automatic SSL | Coolify instance, Git repo / Docker Compose |
| **Native with Bun / PM2** | Bare-metal VPS / constrained RAM | Bun (>=1.4.0), PM2 (>=5.4.0) |

---

## 1. Docker Compose Deployment (Recommended)

This method packages PM2 EID in an ultra-lightweight Alpine container (<50 MB) while mounting the host's PM2 daemon socket to manage host processes.

### Step 1: Clone Repository
```bash
git clone https://github.com/core-red-project/pm2-eid-is-discord.git
cd pm2-eid-is-discord
```

### Step 2: Configure Environment
```bash
cp .env.example .env
nano .env
```

Ensure your credentials and options are set:
```ini
PORT=3847
HOST=0.0.0.0
NODE_ENV=production

# Mandatory for public networks:
AUTH_USER=admin
AUTH_PASS=your-secure-password

# Optional: Notifications
WEBHOOK_URL=https://discord.com/api/webhooks/...
WEBHOOK_FORMAT=discord
WEBHOOK_EVENTS=restart,stop,exit,errored
```

### Step 3: Launch
```bash
docker compose up -d --build
```

The container starts and binds port `3847` on the host, communicating with your host PM2 instance through the volume mount `~/.pm2:/root/.pm2`.

---

## 2. Coolify Deployment

Coolify makes deploying and managing PM2 EID straightforward with automated HTTPS termination via Traefik.

### Step 1: Create a New Resource in Coolify
1. In your Coolify dashboard, navigate to your Project/Environment.
2. Click **+ New Resource** → **Docker Compose** or **Git Repository**.
3. Select the repository: `https://github.com/core-red-project/pm2-eid-is-discord` (branch: `main`).

### Step 2: Configure Volume Mounts
In Coolify's **Storages / Volumes** configuration, map the host PM2 daemon to the container:
```
/root/.pm2:/root/.pm2
```
> [!IMPORTANT]
> If your PM2 processes on the host run under a non-root user (e.g., `ubuntu` or `node`), adjust the host path to `/home/<user>/.pm2:/root/.pm2`.

### Step 3: Set Environment Variables
In the **Environment Variables** tab of the Coolify service, configure:
```ini
PORT=3847
HOST=0.0.0.0
NODE_ENV=production
PM2_HOME=/root/.pm2
AUTH_USER=admin
AUTH_PASS=generate-a-strong-password
WEBHOOK_URL=https://discord.com/api/webhooks/...
WEBHOOK_FORMAT=discord
```

### Step 4: Configure Domain & SSL
1. Set your custom domain or sub-domain (e.g., `https://pm2.yourdomain.com`).
2. Set the container destination port to `3847`.
3. Click **Deploy**. Coolify will build the Dockerfile, issue a Let's Encrypt TLS certificate, and start routing traffic to your PM2 EID console.

---

## 3. Native Deployment on Host (Bun + PM2)

If you prefer running PM2 EID directly alongside your other Node.js applications without Docker:

### Step 1: Prerequisites
```bash
# Verify Bun (>= 1.4.0)
bun --version

# Verify PM2 (>= 5.4.0)
pm2 --version
```

### Step 2: Install & Build
```bash
git clone https://github.com/core-red-project/pm2-eid-is-discord.git
cd pm2-eid-is-discord

just install
just build
```

### Step 3: Manage with PM2
You can register PM2 EID into PM2 itself so it auto-restarts and monitors its peers:

```bash
# Start PM2 EID with PM2
pm2 start "bun run src/index.ts" --name pm2-eid --time

# Save PM2 state for system boot
pm2 save
```

---

## Environment Variables Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3847` | HTTP port the server listens on |
| `HOST` | `0.0.0.0` | Bind address (`127.0.0.1` for local/SSH only, `0.0.0.0` for Docker/network) |
| `NODE_ENV` | `development` | Environment mode (`production` or `development`) |
| `AUTH_USER` | *None* | Username for console access |
| `AUTH_PASS` | *None* | Password for console access |
| `PM2_HOME` | `~/.pm2` | Custom path to PM2 home/socket directory |
| `WEBHOOK_URL` | *None* | Discord, Slack, or generic HTTP POST webhook URL |
| `WEBHOOK_FORMAT`| `generic` | Formatter: `discord`, `slack`, or `generic` (auto-detected if unset) |
| `WEBHOOK_EVENTS`| `restart,stop,exit,errored` | Comma-separated list of events to dispatch or `*` for all |

---

## First Login & Verification

1. Navigate to your dashboard URL: `http://localhost:3847` (or your configured Coolify domain).
2. If `AUTH_USER` and `AUTH_PASS` are set, the dark **Sign In** screen will appear.
3. Enter your credentials. Once verified, a secure HTTP-only cookie (`pm2_eid_session`) will be issued.
4. The dashboard displays all running PM2 processes with live metrics (CPU, RAM, Uptime, Restarts).
5. Click **Logs** on any process to stream live stdout/stderr tails.

---

*PM2 EID is a Core Red Project. Part of the [Sxnnyside Project](https://sxnnysideproject.com).*
