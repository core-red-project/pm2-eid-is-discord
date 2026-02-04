# PM2 EID Dashboard

Lightweight, self-hosted dashboard for managing PM2 processes associated with Discord bots and other Node.js applications.

**Organization:** Sxnnyside Project  
**Division:** Core Red  

Internal infrastructure tooling for production use.

---

## Project Name

**PM2 EID Dashboard**

EID is a recursive acronym: **EID Is Discord**

This naming convention is used throughout the Sxnnyside Project to identify Discord-related infrastructure components. The recursive structure is intentional and reflects the self-referential nature of internal technical naming standards.

---

## Overview

PM2 EID Dashboard provides a minimal web interface for monitoring and controlling PM2-managed processes. It is designed exclusively for internal Sxnnyside Project / Core Red use on production servers, accessed via SSH tunneling.

This is operational infrastructure, not a public-facing product.

---

## Philosophy

- **Internal tooling first**: This is not a product, demo, or tutorial. It is operational infrastructure for Sxnnyside Project / Core Red.
- **Minimal dependencies**: Only what is necessary. No frameworks, no build tools, no database.
- **Localhost only**: Security through network isolation. Access via SSH tunnel.
- **Clarity over abstraction**: Code should be readable and maintainable without deep architectural knowledge.
- **Production-ready**: Designed for daily use on Ubuntu servers running Discord bots.

---

## Documentation

- [QUICKSTART.md](docs/QUICKSTART.md) - Fast installation and operational guide
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design and component overview
- [SECURITY.md](docs/SECURITY.md) - Security model and threat mitigations
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes

---

## Features

### Process Management
- View all PM2 processes with real-time status
- Start, stop, restart, and delete processes
- View process metrics: CPU, memory, restarts, uptime

### Log Viewing
- View stdout logs per process
- View stderr (error) logs per process
- Tail-style log reading (last N lines)

### Interface
- Dark theme with red/black color scheme
- HTMX-powered partial page updates
- Auto-refresh every 10 seconds (configurable)
- Keyboard shortcuts (R to refresh, ESC to close logs)

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js (>=18 LTS) |
| Server | Express 4.x |
| Process Management | PM2 Programmatic API |
| Frontend | HTMX 1.9.x |
| Styling | Vanilla CSS |
| Module System | CommonJS |

No React. No Vue. No build tools. No Docker. No database.

---

## Installation

### Prerequisites

- Node.js >= 18.0.0 (LTS recommended)
- PM2 installed globally (`npm install -g pm2`)
- PM2 daemon running

### Setup

```bash
# Clone or copy the project
cd pm2-eid-dashboard

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
# Edit .env if needed (default port 3847)

# Start the server
npm start
```

The server starts on `http://127.0.0.1:3847` by default.

For detailed setup instructions, see [QUICKSTART.md](docs/QUICKSTART.md).

---

## Usage

### Running the Dashboard

```bash
# Development (with auto-reload on file changes)
npm run dev

# Production
npm start

# Run under PM2
npm run pm2:start

# View PM2 logs for the dashboard
npm run pm2:logs

# Stop the dashboard
npm run pm2:stop

# Restart the dashboard
npm run pm2:restart
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PM2_EID_PORT` | `3847` | Port to listen on |

Example:
```bash
PM2_EID_PORT=4000 npm start
```

---

## SSH Tunnel Access

The dashboard listens only on localhost (127.0.0.1). To access it from your local machine, create an SSH tunnel:

```bash
# From your local machine
ssh -L 3847:localhost:3847 user@your-server.com

# Then open in browser
http://localhost:3847
```

For persistent access, add to your SSH config (`~/.ssh/config`):

```
Host myserver
    HostName your-server.com
    User your-username
    LocalForward 3847 localhost:3847
```

Then connect with:
```bash
ssh myserver
```

---

## Project Structure

```
pm2-eid-dashboard/
├── src/
│   ├── server.js           # Express application entry point
│   ├── pm2/
│   │   └── client.js       # PM2 programmatic API wrapper
│   ├── routes/
│   │   └── processes.js    # HTTP routes and HTMX partials
│   └── views/
│       └── index.html      # Main dashboard HTML
├── public/
│   └── css/
│       └── main.css        # Stylesheet
├── package.json
├── README.md
└── LICENSE
```

### Architectural Decisions

**PM2 Client (`src/pm2/client.js`)**
- Isolates all PM2 programmatic API calls
- Handles connection lifecycle (connect/disconnect)
- Formats process data into clean structures
- Provides log file reading functionality

**Routes (`src/routes/processes.js`)**
- RESTful API endpoints for all process operations
- Dual response format: JSON for API clients, HTML for HTMX
- HTML rendering functions for HTMX partial updates

**Server (`src/server.js`)**
- Minimal Express configuration
- Localhost-only binding
- Graceful shutdown handling
- Request logging

**Views (`src/views/index.html`)**
- Single HTML file with embedded JavaScript
- HTMX attributes for dynamic updates
- No build step required

---

## API Reference

All endpoints are prefixed with `/api/processes`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/processes` | List all processes |
| GET | `/api/processes/:name` | Get process details |
| POST | `/api/processes/:name/start` | Start a process |
| POST | `/api/processes/:name/stop` | Stop a process |
| POST | `/api/processes/:name/restart` | Restart a process |
| POST | `/api/processes/:name/delete` | Delete a process |
| POST | `/api/processes/:name/flush` | Flush process logs |
| GET | `/api/processes/:name/logs` | Get stdout logs |
| GET | `/api/processes/:name/errors` | Get stderr logs |

All endpoints return JSON by default. When called with `HX-Request` header (HTMX), they return HTML partials.

---

## Security Considerations

### Current Security Model

1. **Localhost binding**: Server only accepts connections from 127.0.0.1
2. **No authentication**: Access is controlled at the network level via SSH
3. **No HTTPS**: Traffic is local; SSH tunnel provides encryption

For detailed security documentation, threat analysis, and authentication implementation guidance, see [SECURITY.md](docs/SECURITY.md).

### Recommended Deployment

1. Run behind a firewall with no public exposure
2. Access exclusively via SSH tunnel
3. Use SSH key authentication (disable password auth)
4. Consider fail2ban for SSH protection

---

## Operational Notes

### Running Under PM2

The dashboard can manage itself when running under PM2. To avoid recursive issues:

```bash
# Start the dashboard
pm2 start src/server.js --name pm2-eid-dashboard

# The dashboard will appear in its own process list
# Avoid deleting the dashboard process from within the dashboard
```

### Log File Access

The dashboard reads PM2 log files directly from disk. Ensure:
- The user running the dashboard has read access to PM2 log directory
- Log files exist (PM2 creates them when processes produce output)
- Log rotation is configured to prevent unbounded growth

Default PM2 log locations:
- Linux: `~/.pm2/logs/`
- macOS: `~/.pm2/logs/`

### Process States

| Status | Description |
|--------|-------------|
| online | Process is running normally |
| stopped | Process was stopped manually |
| errored | Process crashed and exceeded restart limit |
| launching | Process is starting up |

### Troubleshooting

**Dashboard shows "Failed to connect to PM2"**
- Ensure PM2 daemon is running: `pm2 status`
- Start daemon if needed: `pm2 resurrect` or `pm2 start <any-process>`

**Logs not appearing**
- Check log file permissions
- Verify log path in process details
- Ensure process has produced output

**Process actions not working**
- Check console for errors
- Verify PM2 daemon is responsive: `pm2 list`
- Restart PM2 daemon if needed: `pm2 kill && pm2 resurrect`

---

## Roadmap

Potential future enhancements (not commitments):

- [ ] Process log streaming via WebSocket
- [ ] Process start form (add new processes)
- [ ] CPU/memory graphs (lightweight, no heavy charting libraries)
- [ ] Multiple server support (PM2 remote API)
- [ ] Ecosystem file management
- [ ] Cluster mode visualization
- [ ] Basic alerting (restart thresholds)
- [ ] Export process configuration

---

## Development

### Code Style

- CommonJS modules (no ESM)
- No transpilation required
- Explicit error handling
- Minimal abstraction

### Testing Locally

```bash
# Start some test PM2 processes
pm2 start --name test-bot-1 "node -e 'setInterval(() => console.log(Date.now()), 1000)'"
pm2 start --name test-bot-2 "node -e 'setInterval(() => console.log(Date.now()), 1000)'"

# Start the dashboard in dev mode
npm run dev

# Open http://localhost:3847
```

### Making Changes

1. Modify source files directly
2. Use `npm run dev` for auto-reload during development
3. Test all process actions before deploying
4. Verify HTMX interactions work correctly

---

## License

MIT License. See [LICENSE](LICENSE) file.

---

## Contact

**Sxnnyside Project - Core Red Division**  
Email: security@sxnnysideproject.com

For security-related inquiries, use the contact email above.

---

## Acknowledgments

- PM2 team for the excellent process manager
- HTMX for enabling simple, powerful frontend interactions
- Express.js for the reliable HTTP framework

---

**PM2 EID Dashboard** - Sxnnyside Project / Core Red Internal Tooling
