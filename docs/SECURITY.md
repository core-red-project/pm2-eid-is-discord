# PM2 EID Dashboard - Security Documentation

Security model, threat analysis, and mitigation strategies.

**Organization:** Sxnnyside Project / Core Red  
**Contact:** houjou.sxnnyside@sxnnysideproject.com

For security-related inquiries, use the contact email above.

---

## Security Model

PM2 EID Dashboard uses a **network-based security model** rather than application-level authentication. Security is achieved through network isolation and access control at the transport layer.

### Core Principles

1. **Localhost binding**: Application only accepts connections from 127.0.0.1
2. **SSH tunnel authentication**: Access control delegated to SSH
3. **No public exposure**: Application is not accessible from external networks
4. **Encryption via SSH**: Traffic is encrypted by the SSH tunnel, not HTTPS
5. **Minimal attack surface**: No persistent storage, no user accounts, no sessions

---

## Threat Model

### Assumed Threat Environment

**In Scope:**
- Unauthorized network access attempts
- SSH credential compromise
- Malicious localhost process interaction
- PM2 API abuse
- Cross-site scripting (XSS) in log output
- Process manipulation by unauthorized users

**Out of Scope:**
- Physical server access (assumed secured)
- Root/sudo compromise (game over scenario)
- Supply chain attacks on npm dependencies (general Node.js risk)
- Denial of service against the server itself

### Trust Boundaries

```
┌─────────────────────────────────────────────────┐
│  Trusted: Sxnnyside Project / Core Red Staff   │
│  - Have SSH access to production servers        │
│  - Authorized to manage PM2 processes           │
│  - Known and authenticated                      │
└─────────────────────────────────────────────────┘
                      │
                      │ SSH Authentication
                      ▼
┌─────────────────────────────────────────────────┐
│       Production Server (Trust Boundary)        │
│  ┌───────────────────────────────────────────┐  │
│  │   PM2 EID Dashboard (127.0.0.1:3847)     │  │
│  │   - Trusts all localhost connections     │  │
│  │   - No application-level auth            │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│          Untrusted: Public Internet             │
│  - Cannot reach localhost-bound services        │
│  - Blocked by network configuration             │
└─────────────────────────────────────────────────┘
```

---

## Security Controls

### 1. Network Isolation

**Implementation:**
```javascript
// src/server.js
const HOST = '127.0.0.1'; // Localhost only
server.listen(PORT, HOST, () => { ... });
```

**What It Prevents:**
- Direct external access to the dashboard
- Port scanning from internet
- Lateral movement from compromised external services

**What It Doesn't Prevent:**
- Access from other processes on the same server
- Access via SSH tunnel (intended behavior)

**Verification:**
```bash
# From server
curl http://127.0.0.1:3847  # Works

# From external machine (without SSH tunnel)
curl http://server-ip:3847  # Connection refused
```

---

### 2. SSH Tunnel Authentication

**Implementation:**
```bash
# User establishes tunnel
ssh -L 3847:localhost:3847 user@server
```

**What It Prevents:**
- Unauthorized access (requires valid SSH credentials)
- Man-in-the-middle attacks (SSH encryption)
- Credential interception (no plain-text authentication)

**What It Doesn't Prevent:**
- Access by anyone with valid SSH credentials
- Compromised SSH keys

**Best Practices:**
- Use SSH key authentication only (disable password auth)
- Implement fail2ban for brute force protection
- Rotate SSH keys periodically
- Audit SSH access logs regularly

---

### 3. Input Sanitization

**Implementation:**
```javascript
// src/routes/processes.js
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
```

**What It Prevents:**
- Cross-site scripting (XSS) via process names
- XSS via log file content
- HTML injection in error messages

**What It Doesn't Prevent:**
- XSS in unescaped contexts (all contexts are escaped)

**Coverage:**
- Process names
- Log output (stdout, stderr)
- Error messages
- All user-visible text from PM2 API

---

### 4. HTMX Request Validation

**Implementation:**
```javascript
// HTMX adds HX-Request header
if (req.headers['hx-request']) {
    // Return HTML partial
} else {
    // Return JSON
}
```

**What It Prevents:**
- Unintended API usage
- Direct browser navigation causing broken UI

**What It Doesn't Prevent:**
- API access (JSON endpoints remain available)
- Header spoofing (not a security control, just routing)

---

### 5. PM2 API Isolation

**Implementation:**
```javascript
// src/pm2/client.js
async function withConnection(operation) {
    try {
        await connect();
        const result = await operation();
        return result;
    } finally {
        disconnect();
    }
}
```

**What It Prevents:**
- Stale PM2 connections
- Connection leaks
- Hanging operations (timeout protection)

**What It Doesn't Prevent:**
- PM2 API command injection (PM2 API is parameterized)

---

## Threat Analysis

### Threat: Unauthorized Network Access

**Attack Vector:**  
Attacker attempts to access dashboard from internet.

**Likelihood:** Low  
Dashboard is not exposed on external interfaces.

**Impact:** High  
If successful, attacker could control all PM2 processes.

**Mitigation:**
- Localhost binding (PRIMARY CONTROL)
- Firewall rules blocking port 3847
- No port forwarding configured

**Residual Risk:** Minimal  
Would require misconfiguration to expose service.

---

### Threat: SSH Credential Compromise

**Attack Vector:**  
Attacker obtains valid SSH credentials via phishing, key theft, or brute force.

**Likelihood:** Medium  
SSH is a common attack target.

**Impact:** Critical  
Attacker gains full access to dashboard and server.

**Mitigation:**
- SSH key authentication only (disable passwords)
- fail2ban for brute force protection
- Key rotation policy
- Audit logging

**Residual Risk:** Medium  
If SSH is compromised, dashboard is compromised. This is by design.

**Note:** This is not a dashboard vulnerability. SSH security is foundational.

---

### Threat: Malicious Localhost Process

**Attack Vector:**  
Attacker compromises another process on the server and uses it to access dashboard.

**Likelihood:** Low  
Requires prior server compromise.

**Impact:** High  
Attacker could manipulate PM2 processes.

**Mitigation:**
- Server hardening (outside dashboard scope)
- Process isolation (containers, if applicable)
- Audit logging (future feature)

**Residual Risk:** Medium  
Dashboard trusts all localhost connections.

**Future Enhancement:**  
Implement application-level authentication to prevent lateral movement.

---

### Threat: Cross-Site Scripting (XSS)

**Attack Vector:**  
Attacker injects malicious JavaScript via process names or log output.

**Likelihood:** Low  
Requires ability to name processes or write to logs.

**Impact:** Medium  
Could execute JavaScript in administrator's browser.

**Mitigation:**
- HTML escaping on all output (PRIMARY CONTROL)
- Content-Security-Policy headers (future)

**Residual Risk:** Low  
All text is escaped before rendering.

---

### Threat: Process Manipulation

**Attack Vector:**  
Unauthorized user with dashboard access deletes critical processes.

**Likelihood:** Medium  
Human error or malicious insider.

**Impact:** High  
Production service disruption.

**Mitigation:**
- Confirmation dialogs for destructive actions
- Audit logging (future feature)
- Role-based access control (future feature)

**Residual Risk:** Medium  
Anyone with dashboard access can perform any action.

**Future Enhancement:**  
Implement read-only mode or action-specific permissions.

---

### Threat: Denial of Service (DoS)

**Attack Vector:**  
Attacker floods dashboard with requests, causing resource exhaustion.

**Likelihood:** Low  
Requires localhost access or SSH tunnel.

**Impact:** Low  
Dashboard becomes unresponsive, PM2 processes unaffected.

**Mitigation:**
- Rate limiting (not implemented)
- Request timeout configuration
- PM2 process limits (system-level)

**Residual Risk:** Medium  
No rate limiting currently implemented.

**Future Enhancement:**  
Add rate limiting middleware for API endpoints.

---

## Adding Authentication

While not currently implemented, here is guidance for adding authentication if required.

### Option 1: HTTP Basic Authentication

**Pros:**
- Simple to implement
- No session management required
- Supported by all browsers

**Cons:**
- Sends credentials with every request
- No logout mechanism
- Limited user management

**Implementation:**

```javascript
// src/middleware/auth.js
'use strict';

const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'changeme';

function basicAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="PM2 EID Dashboard"');
        return res.status(401).send('Authentication required');
    }
    
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [user, pass] = credentials.split(':');
    
    if (user === DASHBOARD_USER && pass === DASHBOARD_PASS) {
        return next();
    }
    
    res.setHeader('WWW-Authenticate', 'Basic realm="PM2 EID Dashboard"');
    return res.status(401).send('Invalid credentials');
}

module.exports = basicAuth;
```

```javascript
// src/server.js
const basicAuth = require('./middleware/auth');
app.use(basicAuth);
```

**Configuration:**
```bash
# .env
DASHBOARD_USER=corered
DASHBOARD_PASS=use-a-strong-password-here
```

---

### Option 2: Session-Based Authentication

**Pros:**
- Better user experience
- Logout support
- Can integrate with identity providers

**Cons:**
- Requires session store (Redis recommended)
- More complex implementation
- Introduces stateful behavior

**Implementation:**

Requires additional dependencies:
```bash
npm install express-session connect-redis redis
```

Not recommended unless SSO integration is required.

---

### Option 3: SSH Key Validation

**Pros:**
- Reuses existing SSH authentication
- No additional credentials
- Consistent with SSH tunnel model

**Cons:**
- Complex to implement
- Requires access to SSH metadata
- May not work in all environments

**Implementation:**

Not recommended. SSH already provides authentication at transport layer.

---

## Security Best Practices

### Server Hardening

1. **Firewall Configuration**
   ```bash
   # Allow only SSH
   ufw allow 22/tcp
   ufw enable
   
   # Do NOT allow 3847 externally
   # (Dashboard is localhost-only by default)
   ```

2. **SSH Hardening**
   ```bash
   # /etc/ssh/sshd_config
   PasswordAuthentication no
   PermitRootLogin no
   PubkeyAuthentication yes
   ```

3. **fail2ban Configuration**
   ```bash
   apt install fail2ban
   systemctl enable fail2ban
   ```

### Application Hardening

1. **Environment Variables**
   - Never commit `.env` to version control
   - Use strong, unique values in production
   - Rotate credentials periodically

2. **Dependency Management**
   ```bash
   # Audit dependencies regularly
   npm audit
   
   # Update to patch vulnerabilities
   npm audit fix
   ```

3. **Process Permissions**
   ```bash
   # Run dashboard as non-root user
   sudo useradd -r -s /bin/false pm2-dashboard
   
   # Ensure PM2 processes run as same user
   ```

---

## Security Incident Response

### If Dashboard Access is Compromised

1. **Immediate Actions**
   - Stop the dashboard: `pm2 stop pm2-eid-dashboard`
   - Review PM2 process list for unauthorized changes
   - Check SSH access logs: `grep sshd /var/log/auth.log`

2. **Investigation**
   - Identify compromised credentials
   - Review PM2 logs: `~/.pm2/pm2.log`
   - Check for unauthorized process deletions or restarts

3. **Remediation**
   - Rotate SSH keys
   - Update dashboard configuration
   - Restart dashboard: `pm2 restart pm2-eid-dashboard`
   - Review and restore affected processes

### If Server is Compromised

Dashboard security is predicated on server security. If the server is compromised:

1. Assume dashboard is compromised
2. Follow organizational incident response plan
3. Consider server rebuild rather than remediation
4. Audit all processes managed by PM2

---

## Security Roadmap

Potential future security enhancements (not commitments):

- [ ] Application-level authentication (Basic Auth)
- [ ] Audit logging (who did what, when)
- [ ] Rate limiting on API endpoints
- [ ] Content-Security-Policy headers
- [ ] Role-based access control (read-only users)
- [ ] Action confirmation with secondary authentication
- [ ] Integration with identity provider (LDAP, OAuth)
- [ ] Security event notifications (process deletions, etc.)

---

## Responsible Disclosure

If you discover a security vulnerability in PM2 EID Dashboard:

1. **Do not** disclose publicly until patched
2. Email details to: houjou.sxnnyside@sxnnysideproject.com
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and provide a remediation timeline.

---

## Security Audit Checklist

Use this checklist when deploying or auditing the dashboard:

- [ ] Dashboard binds to 127.0.0.1 only
- [ ] SSH is configured for key-only authentication
- [ ] fail2ban is installed and active
- [ ] Firewall blocks port 3847 from external networks
- [ ] `.env` file is not committed to version control
- [ ] Dependencies are up to date (`npm audit`)
- [ ] Dashboard runs as non-root user
- [ ] SSH access logs are monitored
- [ ] Server is behind firewall with no public PM2 exposure
- [ ] SSH keys are rotated according to policy

---

## Contact

For security-related questions or to report vulnerabilities:

**Sxnnyside Project - Core Red**  
houjou.sxnnyside@sxnnysideproject.com

Include "SECURITY" in the email subject for priority handling.
