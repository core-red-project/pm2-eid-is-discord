# PM2 EID Dashboard - Quick Start Guide

Fast installation and operational guide for PM2 EID Dashboard.

**Organization:** Sxnnyside Project / Core Red  
**Contact:** houjou.sxnnyside@sxnnysideproject.com

---

## Prerequisites

Ensure the following are installed on your server:

```bash
# Check Node.js version (>= 18 required)
node --version

# Check PM2 installation
pm2 --version

# If PM2 is not installed
npm install -g pm2
```

---

## Installation

### Step 1: Get the Project

```bash
# Navigate to your workspace
cd /opt/sxnnyside

# Copy or clone the project
# (Adjust based on your internal deployment method)
```

### Step 2: Install Dependencies

```bash
cd pm2-eid-dashboard
npm install
```

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit configuration if needed (optional)
nano .env
```

Default configuration:
- Port: 3847
- Host: localhost (127.0.0.1)
- Environment: production

### Step 4: Verify PM2 Daemon

```bash
# Ensure PM2 is running with some processes
pm2 list

# If no processes exist, PM2 daemon may not be active
# Start a test process to initialize
pm2 start "node -e 'setInterval(() => console.log(Date.now()), 5000)'" --name test-process
```

---

## Running the Dashboard

### Option A: Direct Execution

For testing or development:

```bash
npm start
```

Output should show:
```
==================================================
  PM2 EID Dashboard
  Internal Core-Red Tooling
==================================================
  Status:    Running
  Host:      127.0.0.1
  Port:      3847
  URL:       http://127.0.0.1:3847
==================================================
```

### Option B: Run Under PM2 (Recommended)

For production deployment:

```bash
# Start the dashboard as a PM2 process
npm run pm2:start

# Verify it's running
pm2 list

# View logs
npm run pm2:logs

# Stop the dashboard
npm run pm2:stop

# Restart the dashboard
npm run pm2:restart
```

---

## Accessing the Dashboard

The dashboard binds to localhost only and must be accessed via SSH tunnel.

### From Your Local Machine

```bash
# Create SSH tunnel
ssh -L 3847:localhost:3847 user@your-server.com

# Keep the SSH session open
# Open browser to: http://localhost:3847
```

### Persistent SSH Tunnel

Add to your SSH config (`~/.ssh/config`):

```
Host sxnnyside-prod
    HostName your-server.com
    User your-username
    LocalForward 3847 localhost:3847
    ServerAliveInterval 60
```

Then connect:
```bash
ssh sxnnyside-prod
```

Browser: `http://localhost:3847`

---

## Verifying Operation

### Check Dashboard Status

1. Open `http://localhost:3847` in browser (via SSH tunnel)
2. You should see the PM2 process list
3. Verify auto-refresh is working (bottom-right checkbox)

### Test Process Actions

1. Select any stopped process
2. Click "Start" - process should start
3. Click "Restart" - process should restart
4. Click "Logs" - stdout logs should appear

### Check Dashboard Logs

```bash
# If running under PM2
npm run pm2:logs

# If running directly
# Logs appear in the terminal where npm start was run
```

---

## Common Issues

### Dashboard shows "Failed to connect to PM2"

**Cause:** PM2 daemon is not running or not accessible.

**Solution:**
```bash
# Check PM2 status
pm2 status

# If no processes exist, start a dummy process
pm2 start "node -e 'setInterval(() => {}, 60000)'" --name keepalive

# Restart dashboard
npm run pm2:restart
```

### Cannot access dashboard from local browser

**Cause:** SSH tunnel not established or incorrect port.

**Solution:**
```bash
# Verify tunnel is active
netstat -an | grep 3847

# Re-establish tunnel
ssh -L 3847:localhost:3847 user@server

# Ensure firewall allows localhost connections (usually default)
```

### Process actions fail

**Cause:** PM2 daemon unresponsive or process name incorrect.

**Solution:**
```bash
# Restart PM2 daemon
pm2 kill
pm2 resurrect

# Or start fresh
pm2 list  # This will start daemon if not running
```

---

## Stopping the Dashboard

### If running directly:
Press `Ctrl+C` in the terminal.

### If running under PM2:
```bash
npm run pm2:stop

# Or permanently remove
pm2 delete pm2-eid-dashboard
```

---

## Next Steps

- Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Review [SECURITY.md](SECURITY.md) for security considerations
- Configure environment variables in `.env` as needed
- Set up monitoring or alerts for the dashboard process itself

---

## Support

For issues or questions, contact:  
**Sxnnyside Project - Core Red**  
houjou.sxnnyside@sxnnysideproject.com
