# API

Base URL: `http://localhost:3847/api` · Current version: `v2`

## Authentication
When `AUTH_USER` and `AUTH_PASS` are configured, all `/api/*` endpoints require authentication. Supported schemes:
- **Session Cookie**: `pm2_eid_session` (HttpOnly, Lax, Secure on HTTPS; 7-day sliding expiration, revocable on `/logout`).
- **Bearer Token**: `Authorization: Bearer <session-token>` (active server-side session token).
- **HTTP Basic**: `Authorization: Basic <base64(user:pass)>` (evaluated with timing-safe comparison; subject to rate limiting).

Rate limiting: Maximum 5 failed attempts per client IP within a 5-minute rolling window. On breach, returns `429 Too Many Requests`.

## Response envelope
JSON endpoints return either a direct payload, an action receipt, or an error envelope:

### Success (Action Receipt)
```json
{
  "success": true,
  "action": "restart",
  "process": "discord-bot"
}
```

### Error Envelope
```json
{
  "error": "Failed to restart process"
}
```

## Error codes
| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid credentials/session cookie |
| `INVALID_INPUT` | 400 | Malformed query parameter (e.g. non-integer or out-of-range `lines` / `instances`) |
| `NOT_FOUND` | 404 | Process name not found in PM2 daemon |
| `RATE_LIMITED` | 429 | Failed authentication rate limit exceeded (5 attempts per 5 minutes) |
| `DAEMON_ERROR` | 500 | PM2 IPC socket error or background execution failure |

## Endpoints

### Process Management

#### List Processes
- **Method**: `GET`
- **Path**: `/api/processes`
- **Headers**:
  - `Accept: application/json` returns process list JSON.
  - `HX-Request: true` returns HTML table component.
- **Response** (`200 OK`):
```json
[
  {
    "id": 0,
    "name": "discord-bot",
    "status": "online",
    "cpu": 0.4,
    "memory": 45200000,
    "uptime": 172800000,
    "restarts": 2,
    "mode": "fork_mode",
    "instances": 1
  }
]
```

#### Lifecycle Action
- **Method**: `POST`
- **Path**: `/api/processes/:name/:action`
- **Params**:
  - `:name` (string) — target process name or ID
  - `:action` (string) — `start` | `stop` | `restart` | `reload` | `delete`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "action": "restart",
  "process": "discord-bot"
}
```

#### Flush Logs
- **Method**: `POST`
- **Path**: `/api/processes/:name/flush`
- **Params**:
  - `:name` (string) — target process name
- **Response** (`200 OK`):
```json
{
  "success": true,
  "action": "flush",
  "process": "discord-bot"
}
```

#### Read Logs (stdout)
- **Method**: `GET`
- **Path**: `/api/processes/:name/logs`
- **Query Params**:
  - `lines` (optional, integer 1-1000, default 100) — number of tail lines to retrieve
- **Response** (`200 OK`):
```json
{
  "process": "discord-bot",
  "type": "stdout",
  "lines": 100,
  "content": "[2026-11-17 14:00:00] Bot logged in as CoreRed#1337\n..."
}
```

#### Read Errors (stderr)
- **Method**: `GET`
- **Path**: `/api/processes/:name/errors`
- **Query Params**:
  - `lines` (optional, integer 1-1000, default 100)
- **Response** (`200 OK`):
```json
{
  "process": "discord-bot",
  "type": "stderr",
  "lines": 100,
  "content": ""
}
```

#### Process Detail
- **Method**: `GET`
- **Path**: `/api/processes/:name/detail`
- **Params**:
  - `:name` (string) — target process name
- **Response** (`200 OK`):
```json
{
  "id": 0,
  "name": "discord-bot",
  "status": "online",
  "script": "/app/dist/bot.js",
  "interpreter": "node",
  "cwd": "/app",
  "instances": 1,
  "mode": "cluster_mode",
  "execMode": "cluster_mode",
  "pid": 4821,
  "memory": 52428800,
  "cpu": 0.2,
  "uptime": 86400000,
  "restarts": 0,
  "unstableRestarts": 0,
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### Scale Process Instances
- **Method**: `POST`
- **Path**: `/api/processes/:name/scale`
- **Params**:
  - `:name` (string) — target process name
- **Body / Query**:
  - `instances` (required, integer 1-32)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "process": "discord-bot",
  "instances": 4
}
```

### System & Persistence

#### Save PM2 State (`pm2 save`)
- **Method**: `POST`
- **Path**: `/api/pm2/save`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "PM2 state successfully saved"
}
```

#### System Metrics
- **Method**: `GET`
- **Path**: `/api/system/metrics`
- **Response** (`200 OK`):
```json
{
  "cpu": 12.4,
  "memory": {
    "used": 4294967296,
    "total": 17179869184,
    "percentage": 25.0
  },
  "uptime": 1209600,
  "hostname": "production-node-01"
}
```

#### System Metrics History (Rolling 1-Hour RAM Buffer)
- **Method**: `GET`
- **Path**: `/api/system/metrics/history`
- **Response** (`200 OK`):
```json
[
  {
    "timestamp": 1763400000000,
    "cpu": 14.2,
    "memoryPercent": 28.5,
    "memoryUsedBytes": 4892400000
  }
]
```

#### Health Probe
- **Method**: `GET`
- **Path**: `/health`
- **Auth**: None (public unauthenticated probe)
- **Response** (`200 OK`):
```json
{
  "status": "healthy",
  "timestamp": "2026-11-17T14:18:00.000Z",
  "uptime": 3600
}
```

