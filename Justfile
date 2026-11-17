# Default recipe
default:
    @just --list

# Bootstrap dependencies
install:
    bun install

# Start local development server with hot-reloading
dev:
    bun --watch src/index.tsx

# Produce build artifacts
build:
    bun x tsup

# Verify production distribution bundle under Node.js
verify-dist: build
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Verifying Node.js distribution bundle..."
    PM2_HOME=/tmp/.pm2 PORT=3899 HOST=127.0.0.1 node dist/index.mjs &
    SERVER_PID=$!
    trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
    for path in /health /static/css/main.css /static/js/htmx.min.js /static/js/dashboard.js; do
      curl --retry 10 --retry-connrefused --retry-delay 1 -fsS "http://127.0.0.1:3899$path" > /dev/null
      echo "OK $path"
    done
    echo "Node.js distribution bundle verified successfully."

# Run automated test suite
test:
    bun test

# Run static type correctness checks
typecheck:
    bun x tsc --noEmit

# Run static analysis linter
lint:
    bun x biome lint src test

# Apply deterministic code formatting
format:
    bun x biome format --write src test

# Verify code formatting without mutating files
format-check:
    bun x biome format src test

# Full automated quality gate (non-mutating)
check: format-check lint typecheck test
    @echo "All quality checks passed successfully."

# Remove build artifacts and caches
clean:
    rm -rf dist node_modules/.cache
