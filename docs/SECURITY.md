# PM2 EID — Security Architecture & Threat Model

**Version:** 2.0.0  
**Division:** Core Red Project  
**Organization:** Sxnnyside Project  
**Contact:** legal.sxnnyside@sxnnysideproject.com / houjou.sxnnyside@sxnnysideproject.com

Comprehensive documentation of the security model, threat landscape, operational risks, and mitigation strategies for **PM2 EID**.

---

## 1. Security Architecture

PM2 EID employs a defense-in-depth security model tailored for operational infrastructure tools:

```
┌────────────────────────────────────────────────────────┐
│               Public Internet / Untrusted              │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (TLS 1.3 / Port 443)
┌───────────────────────────▼────────────────────────────┐
│      Reverse Proxy Layer (Coolify / Traefik / Nginx)   │
│      - TLS Termination & Automated Certificates        │
│      - Rate Limiting & Firewall / IP Allowlist         │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (Internal Bridge Network)
┌───────────────────────────▼────────────────────────────┐
│                  PM2 EID Container                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Authentication Middleware (Cookie Session)     │  │
│  │   - SHA-256 Stateless Token Verification         │  │
│  │   - HttpOnly + SameSite=Lax Cookie Protection    │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │ Authorized Requests        │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │   Hono API & Ergonomic HTMX Presentation Engine  │  │
│  │   - Strict Output HTML Escaping (Anti-XSS)       │  │
│  │   - Non-native Dialog Confirmation Gate          │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │   Clean Architecture Core (Domain & Use Cases)   │  │
│  │   - Path Normalization on Log Reads              │  │
│  │   - Bounded Tail Readers (1 to 1000 lines)       │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ Unix Domain Socket Mount
┌───────────────────────────▼────────────────────────────┐
│             Host Server PM2 Daemon                     │
│  ~/.pm2/rpc.sock & ~/.pm2/pub.sock                     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Threat Analysis & Operational Risks

### Risk 1: Unauthorized Process Control (Host Level Impact)
- **Nature of Risk**: The PM2 programmatic API communicates with the daemon over local Unix domain sockets (`rpc.sock` and `pub.sock`). In Docker deployments, mounting `~/.pm2` into the container grants the container access to control host processes.
- **Potential Impact**: If an unauthenticated attacker accesses PM2 EID, they could stop, restart, or delete critical processes running on the host system.
- **Mitigation**:
  1. **Enforce Strong Authentication**: Never leave `AUTH_USER` and `AUTH_PASS` unset in network environments. Use passwords with at least 16+ alphanumeric/special characters.
  2. **Restrict Container Privileges**: Run the Docker container without `--privileged`. The container only requires read/write access to the specific PM2 socket directory.
  3. **User Mapping**: Ensure the host PM2 daemon runs under an unprivileged system user (e.g. `node` or `apps`), not `root`.

### Risk 2: Log Exfiltration & Secret Leakage
- **Nature of Risk**: Applications supervised by PM2 (such as Discord bots, microservices, and web APIs) frequently log initialization messages or unhandled exceptions that may inadvertently expose environment variables, API tokens, database connection strings, or customer data.
- **Potential Impact**: Exposure of third-party API credentials, bot tokens, or database access.
- **Mitigation**:
  1. **Strict Authentication Barrier**: Both HTML log drawers and raw JSON log endpoints (`/api/processes/:name/logs` and `/api/processes/:name/errors`) are strictly guarded behind authentication.
  2. **Path Traversal Prevention**: Log paths are strictly retrieved from PM2's internal process descriptors (`pm_out_log_path` / `pm_err_log_path`). User-supplied parameters only specify process names, preventing arbitrary filesystem traversal.
  3. **Application Hygiene**: Operators should configure applications to read secrets from environment variables rather than logging credentials.

### Risk 3: Public Internet Exposure without TLS
- **Nature of Risk**: Binding PM2 EID directly to a public IP (`0.0.0.0`) without TLS exposes authentication cookies and credentials in cleartext over HTTP.
- **Mitigation**:
  1. **Mandatory Reverse Proxy**: In production, deploy behind Coolify (with Traefik) or Nginx/Caddy with TLS certificates managed via Let's Encrypt.
  2. **Private Network Isolation**: If HTTPS is unavailable, bind `HOST=127.0.0.1` and access the dashboard solely through an encrypted SSH tunnel:
     ```bash
     ssh -L 3847:127.0.0.1:3847 user@server.com
     ```
  3. **VPN Access**: Use private overlay networks (such as Tailscale or WireGuard) to restrict dashboard access to authorized devices.

### Risk 4: Webhook Token Compromise & Spam Flooding
- **Nature of Risk**: Discord and Slack webhook URLs contain authorization tokens. If exposed, bad actors can post arbitrary messages to your alert channels.
- **Mitigation**:
  1. Store `WEBHOOK_URL` securely in server environment files (`.env`).
  2. PM2 EID bounds error message payloads to a maximum length (500–1000 characters) before dispatching to webhooks, preventing payload overflow and webhook abuse.
  3. Use the `WEBHOOK_EVENTS` filter to notify only on critical anomalies (`errored,exit,restart`).

---

## 3. Implementation Security Checklist

| Control | Status | Description |
| :--- | :--- | :--- |
| **Authentication** | Built-in | Cookie sessions with `HttpOnly`, `SameSite=Lax`, and SHA-256 tokens |
| **API Auth** | Built-in | Bearer token authorization supported on `/api/*` |
| **Fail-Closed** | Built-in | Unauthenticated requests are denied immediately with 302 or 401 |
| **XSS Prevention** | Built-in | Deterministic entity escaping on all user and process strings |
| **Path Traversal** | Built-in | Normalized paths and strict descriptor boundary checks |
| **Health Probes** | Isolated | `/health` is read-only and does not reveal processes or metrics |
| **Network Security**| Operator | Enforce HTTPS via reverse proxy or SSH tunnel |

---

## 4. Reporting Security Vulnerabilities

If you discover a security vulnerability within PM2 EID, please disclose it responsibly:

- **Email**: `legal.sxnnyside@sxnnysideproject.com`
- **Security Advisory**: [GitHub Security Advisories](https://github.com/core-red-project/pm2-eid-is-discord/security/advisories/new)

Please do not report security vulnerabilities through public GitHub issues.

---

*PM2 EID is a Core Red Project. Part of the [Sxnnyside Project](https://sxnnysideproject.com).*
