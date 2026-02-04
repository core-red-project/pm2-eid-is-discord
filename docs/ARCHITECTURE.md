# PM2 EID Dashboard - Architecture

System design and component architecture documentation.

**Organization:** Sxnnyside Project / Core Red  
**Contact:** houjou.sxnnyside@sxnnysideproject.com

---

## Overview

PM2 EID Dashboard is a lightweight operational tool designed with a clear separation of concerns. It follows a traditional MVC-inspired pattern without unnecessary abstraction layers.

The architecture prioritizes:
- Operational stability
- Code clarity
- Minimal dependencies
- Simple deployment
- Easy troubleshooting

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Local)                    │
│              http://localhost:3847                   │
│                  (via SSH Tunnel)                    │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS (SSH Tunnel)
                        │
┌───────────────────────▼─────────────────────────────┐
│                  Production Server                   │
│  ┌───────────────────────────────────────────────┐  │
│  │         PM2 EID Dashboard (Express)           │  │
│  │           127.0.0.1:3847                      │  │
│  │  ┌──────────────┐      ┌──────────────────┐  │  │
│  │  │   Routes     │◄────►│   PM2 Client     │  │  │
│  │  │  (HTTP/API)  │      │  (Programmatic)  │  │  │
│  │  └──────────────┘      └────────┬─────────┘  │  │
│  │         │                        │            │  │
│  │         ▼                        │            │  │
│  │  ┌──────────────┐               │            │  │
│  │  │    Views     │               │            │  │
│  │  │   (HTML +    │               │            │  │
│  │  │    HTMX)     │               │            │  │
│  │  └──────────────┘               │            │  │
│  └──────────────────────────────────┼────────────┘  │
│                                     │               │
│  ┌──────────────────────────────────▼────────────┐  │
│  │             PM2 Daemon                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
│  │  │ Discord  │  │ Discord  │  │  Other   │   │  │
│  │  │  Bot 1   │  │  Bot 2   │  │ Processes│   │  │
│  │  └──────────┘  └──────────┘  └──────────┘   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Server (`src/server.js`)

**Responsibility:** HTTP server lifecycle and request routing.

**Key Functions:**
- Initialize Express application
- Bind to localhost (127.0.0.1) only
- Register middleware (JSON parsing, static files)
- Mount route handlers
- Handle graceful shutdown (SIGTERM, SIGINT)
- Provide health check endpoint

**Dependencies:**
- Express (HTTP framework)
- Routes module

**Configuration:**
- Port: `PM2_EID_PORT` environment variable (default: 3847)
- Host: Hardcoded to `127.0.0.1`

---

### 2. PM2 Client (`src/pm2/client.js`)

**Responsibility:** Isolated PM2 programmatic API interactions.

**Key Functions:**
- Connect to PM2 daemon
- List all processes
- Get process details
- Start/stop/restart/delete processes
- Flush process logs
- Read log files from disk
- Format process data for presentation
- Handle PM2 connection errors

**Connection Management:**
- Uses connection pooling pattern (`withConnection`)
- Automatically connects and disconnects for each operation
- Timeout protection (5 seconds)

**Data Transformation:**
- Raw PM2 descriptors → Clean JSON structures
- Byte formatting (memory)
- Uptime formatting (milliseconds → human-readable)

**Dependencies:**
- PM2 (programmatic API)
- Node.js fs module (log file reading)

---

### 3. Routes (`src/routes/processes.js`)

**Responsibility:** HTTP endpoints and response formatting.

**Key Functions:**
- RESTful API endpoints for process operations
- Dual response format:
  - JSON for API clients
  - HTML partials for HTMX requests
- Input validation
- Error handling and user-friendly error messages

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/processes` | List all processes |
| GET | `/api/processes/:name` | Get process details |
| POST | `/api/processes/:name/start` | Start process |
| POST | `/api/processes/:name/stop` | Stop process |
| POST | `/api/processes/:name/restart` | Restart process |
| POST | `/api/processes/:name/delete` | Delete process |
| POST | `/api/processes/:name/flush` | Flush logs |
| GET | `/api/processes/:name/logs` | Get stdout |
| GET | `/api/processes/:name/errors` | Get stderr |

**HTMX Detection:**
- Checks `HX-Request` header
- Returns HTML fragments instead of JSON
- Enables partial page updates

**HTML Rendering:**
- Server-side rendering functions
- Escape HTML to prevent injection
- Generate process tables, log views, error messages

**Dependencies:**
- PM2 Client module
- Express Router

---

### 4. Views (`src/views/index.html`)

**Responsibility:** User interface and client-side interaction.

**Structure:**
- Single HTML file (no build step)
- Dark theme CSS
- HTMX attributes for dynamic updates
- Vanilla JavaScript for UI logic

**Key Features:**
- Auto-refresh toggle (10-second interval)
- Log viewer (stdout/stderr switching)
- Keyboard shortcuts (R to refresh, ESC to close)
- HTMX event handling
- Real-time clock display

**HTMX Usage:**
- `hx-get`: Fetch process list and logs
- `hx-post`: Trigger process actions
- `hx-trigger`: Auto-refresh and load events
- `hx-target`: Specify update targets
- `hx-swap`: Control update behavior
- `hx-confirm`: Action confirmation dialogs

**Dependencies:**
- HTMX library (CDN)

---

### 5. Static Assets (`public/css/main.css`)

**Responsibility:** Visual presentation and styling.

**Design System:**
- Color palette:
  - Background: `#0d0d0d` (near-black)
  - Surface: `#1a1a1a` (dark gray)
  - Borders: `#3d3d3d` (medium gray)
  - Text: `#e0e0e0` (light gray)
  - Accent: `#dc3545` (red)
- Monospace fonts (technical aesthetic)
- Responsive breakpoints (desktop-first)
- Custom scrollbar styling
- Status badge colors (online, stopped, errored)

---

## Data Flow

### Process List Retrieval

```
User loads page
    │
    ▼
Browser (HTMX) → GET /api/processes
    │
    ▼
Routes: Check HX-Request header
    │
    ▼
PM2 Client: pm2Client.listProcesses()
    │
    ▼
PM2 Daemon: Returns process descriptors
    │
    ▼
PM2 Client: Format data (CPU, memory, uptime)
    │
    ▼
Routes: Render HTML table
    │
    ▼
Browser: Update #process-table
```

### Process Action (e.g., Restart)

```
User clicks "Restart" button
    │
    ▼
HTMX: POST /api/processes/{name}/restart
    │
    ▼
Routes: Validate process name
    │
    ▼
PM2 Client: pm2Client.restartProcess(name)
    │
    ▼
PM2 Daemon: Execute restart command
    │
    ▼
PM2 Client: Return success/failure
    │
    ▼
Routes: Sleep 500ms (allow PM2 to update)
    │
    ▼
Routes: Fetch updated process list
    │
    ▼
Routes: Render HTML table
    │
    ▼
Browser: Replace entire table (reflect changes)
```

### Log Viewing

```
User clicks "Logs" button
    │
    ▼
JavaScript: showLogs(processName)
    │
    ▼
HTMX: GET /api/processes/{name}/logs
    │
    ▼
PM2 Client: Get log file path from PM2
    │
    ▼
PM2 Client: Read file from disk (tail 100 lines)
    │
    ▼
Routes: Render <pre> with log content
    │
    ▼
Browser: Update #logs-content
```

---

## Error Handling Strategy

### PM2 Connection Failures

**Location:** PM2 Client (`connect()` function)

**Strategy:**
- 5-second timeout on connection attempts
- Reject promise with clear error message
- Caller (Routes) catches and returns user-friendly error

**User Experience:**
- "Failed to connect to PM2. Is PM2 daemon running?"

### Invalid Process Operations

**Location:** Routes (all POST endpoints)

**Strategy:**
- PM2 API returns error if process doesn't exist
- Catch error and return HTTP 500 with message
- HTMX displays error in UI

**User Experience:**
- Error message displayed in process table area
- Original table remains visible (no complete UI loss)

### Log File Access Issues

**Location:** PM2 Client (`readLogFile()` function)

**Strategy:**
- Check file accessibility before reading
- Handle missing files gracefully
- Return informative messages instead of crashing

**User Experience:**
- "Log file not accessible or does not exist"
- "Log file is empty"

---

## Performance Considerations

### Auto-Refresh

- Default interval: 10 seconds
- Only runs when enabled (checkbox)
- Uses HTMX's built-in polling mechanism
- Minimal bandwidth (only HTML table fragment)

### Log File Reading

- Tail behavior: Last N lines only (default 100)
- No streaming (simplifies implementation)
- User can manually refresh logs

### PM2 Connection Management

- Connect/disconnect for each operation
- No persistent connection (avoids stale connections)
- Timeout protection prevents hanging requests

---

## Deployment Model

### Single Server

Dashboard and PM2 processes run on the same machine:
- Localhost binding ensures security
- No network latency
- Direct file system access for logs

### Future: Multi-Server (Not Implemented)

Potential architecture for managing multiple servers:
- Central dashboard server
- PM2 remote API connections
- Separate connection configuration per server
- Not currently supported

---

## Security Architecture

See [SECURITY.md](SECURITY.md) for detailed security analysis.

**Key Points:**
- Network isolation via localhost binding
- SSH tunnel provides encryption and authentication
- No authentication in application layer
- No input stored persistently (no database)

---

## Technology Decisions

### Why Express?

- Industry standard
- Minimal abstraction over HTTP
- Well-documented
- Stable and maintained

### Why PM2 Programmatic API?

- Direct access to process data
- No CLI parsing needed
- Reliable error handling
- Official API

### Why HTMX?

- No build step
- Minimal JavaScript
- Progressive enhancement
- Simple partial updates
- CDN availability

### Why CommonJS?

- Node.js native support
- No transpilation required
- Simpler deployment
- Compatible with all dependencies

### Why No Database?

- No persistent state needed
- PM2 is the source of truth
- Reduces complexity
- Eliminates database management overhead

---

## Maintenance Considerations

### Upgrading Dependencies

```bash
# Check for updates
npm outdated

# Update patch versions (safe)
npm update

# Update major versions (test thoroughly)
npm install express@latest pm2@latest
```

### Adding New Features

1. Determine component responsibility
2. Add logic to appropriate module
3. Update routes if new endpoints needed
4. Update views if UI changes needed
5. Test with real PM2 processes
6. Update documentation

### Debugging

**Server Issues:**
- Check console output from `npm start`
- Review PM2 logs: `npm run pm2:logs`

**PM2 Connection Issues:**
- Verify PM2 daemon: `pm2 list`
- Check PM2 logs: `~/.pm2/pm2.log`

**UI Issues:**
- Open browser console (F12)
- Check HTMX requests in Network tab
- Review HTMX events in console

---

## Limitations

### Current Constraints

1. **No process creation**: Cannot add new processes via dashboard
2. **No configuration editing**: Cannot modify process settings
3. **No real-time streaming**: Logs are polled, not streamed
4. **Single server only**: Cannot manage remote PM2 instances
5. **No alerting**: No notifications for process failures
6. **No metrics history**: No time-series data retention

### Intentional Scope Limits

These are not bugs, but deliberate design choices:
- Keep complexity low
- Avoid database dependency
- Focus on monitoring and basic control
- Defer advanced features to PM2 CLI or PM2 Plus

---

## Future Architecture Considerations

If expanding functionality:

1. **Authentication Layer**
   - Add middleware in server.js
   - Session management (express-session)
   - Consider Redis for session store

2. **WebSocket for Real-Time Updates**
   - Replace polling with push updates
   - Requires socket.io or ws library
   - More complex error handling

3. **Metrics Database**
   - SQLite or time-series DB
   - Store historical CPU/memory data
   - Enable graphing and alerting

4. **Multi-Server Support**
   - Connection configuration UI
   - PM2 remote API integration
   - Server health monitoring

---

## Contact

For architectural questions or design consultation:

**Sxnnyside Project - Core Red**  
houjou.sxnnyside@sxnnysideproject.com
