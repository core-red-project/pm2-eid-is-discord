# Default recipe
default:
    @just --list

# Bootstrap dependencies
install:
    bun install

# Start local development server with hot-reloading
dev:
    bun --watch src/index.ts

# Produce build artifacts
build:
    bun x tsup

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

# Full automated quality gate
check: format lint typecheck test
    @echo "All quality checks passed successfully."

# Remove build artifacts and caches
clean:
    rm -rf dist node_modules/.cache
