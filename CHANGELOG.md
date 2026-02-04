# Changelog

All notable changes to PM2 EID Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-04

### Added

**Core Functionality**
- PM2 process listing with real-time status display
- Process management actions: start, stop, restart, delete
- Process metrics display: CPU usage, memory usage, restart count, uptime
- Log viewing: stdout and stderr log retrieval
- HTMX-based partial page updates for responsive UI
- Auto-refresh functionality (10-second interval, configurable)
- Health check endpoint for monitoring

**User Interface**
- Dark theme with red/black color scheme
- Responsive layout (desktop-first with mobile support)
- Process table with sortable columns
- Log viewer with stdout/stderr tab switching
- Confirmation dialogs for destructive actions
- Keyboard shortcuts (R for refresh, ESC to close logs)
- Real-time server clock display

**Architecture**
- Modular component structure (server, routes, PM2 client, views)
- PM2 programmatic API integration with connection pooling
- Graceful shutdown handling (SIGTERM, SIGINT)
- Error handling and user-friendly error messages
- HTML escaping for XSS prevention
- Localhost-only binding for security

**Documentation**
- README.md with project overview and usage instructions
- QUICKSTART.md for fast installation and deployment
- ARCHITECTURE.md with system design and component documentation
- SECURITY.md with threat model and security controls
- .env.example for environment configuration
- Inline code documentation and JSDoc comments

**Operational Features**
- npm scripts for common tasks (start, dev, pm2:start, etc.)
- Environment variable configuration support
- PM2 self-hosting capability
- SSH tunnel access documentation

### Technical Details

**Dependencies**
- Node.js >= 18.0.0 (LTS)
- Express 4.21.0
- PM2 5.4.0
- HTMX 1.9.10 (CDN)

**Project Structure**
```
pm2-eid-dashboard/
├── src/
│   ├── server.js
│   ├── pm2/client.js
│   ├── routes/processes.js
│   └── views/index.html
├── public/css/main.css
├── docs/
│   ├── ARCHITECTURE.md
│   ├── QUICKSTART.md
│   └── SECURITY.md
├── .env.example
├── package.json
├── README.md
└── LICENSE
```

**Security**
- Localhost-only binding (127.0.0.1)
- SSH tunnel-based access model
- No application-level authentication (by design)
- Input sanitization and HTML escaping
- No persistent storage or session management

---

## Versioning Policy

PM2 EID Dashboard follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes or breaking operational changes
- **MINOR** version: New functionality in a backwards-compatible manner
- **PATCH** version: Backwards-compatible bug fixes

### What Constitutes a Breaking Change

- Changes to environment variable names or behavior
- Removal of API endpoints
- Changes to localhost binding behavior
- Required Node.js version upgrades (major versions)
- Changes to npm script names or behavior

### What Does Not Constitute a Breaking Change

- Internal code refactoring
- Performance improvements
- Documentation updates
- Addition of new features that don't affect existing functionality
- Bug fixes
- Dependency updates (unless they introduce breaking changes)

---

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md with release notes
3. Tag release: `git tag v1.0.0`
4. Deploy to production servers
5. Announce to Sxnnyside Project / Core Red team

---

## Unreleased

No unreleased changes at this time.

---

## Future Considerations

Potential features under consideration (not committed):

- Process creation UI (currently CLI-only)
- Real-time log streaming via WebSocket
- CPU/memory graphs with historical data
- Multi-server support for managing remote PM2 instances
- Application-level authentication options
- Audit logging for process actions
- Export/import of PM2 ecosystem configurations

---

## Contact

For questions about releases or changelog entries:

**Sxnnyside Project - Core Red**  
houjou.sxnnyside@sxnnysideproject.com
