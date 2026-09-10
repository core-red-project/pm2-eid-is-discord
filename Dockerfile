# Multi-stage lightweight Dockerfile for Bun
FROM oven/bun:alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3847
ENV PM2_HOME=/root/.pm2

# Install dependencies first for efficient layer caching
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile --ignore-scripts || bun install --production --ignore-scripts

# Copy application source and assets
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

# Expose HTTP port
EXPOSE 3847

# Healthcheck probe using Bun
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3847) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run PM2 EID Dashboard
CMD ["bun", "run", "src/index.ts"]
