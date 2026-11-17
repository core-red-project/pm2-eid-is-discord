# Production lightweight Dockerfile for Bun
# Pinned to Bun 1.4.4 on Alpine Linux for deterministic and reproducible builds
FROM oven/bun:1.4.4-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3847
# Note: PM2_HOME must map to the host's PM2 daemon socket and logs folder
ENV PM2_HOME=/root/.pm2
# Disable PM2 version check telemetry to version.pm2.io
ENV PM2_DISABLE_VERSION_CHECK=1

# Install production dependencies with strict frozen lockfile verification
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile --ignore-scripts

# Copy application source and assets
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

# Expose HTTP port (Must be bound to 127.0.0.1 on the host or guarded with AUTH_USER/AUTH_PASS)
EXPOSE 3847

# Healthcheck probe using Bun
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3847) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Note: The container runs with daemon access to manage host PM2 processes via the mounted socket.
CMD ["bun", "run", "src/index.tsx"]
