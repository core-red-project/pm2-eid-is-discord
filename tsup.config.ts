import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  outExtension: () => ({ js: '.mjs' }),
  banner: {
    js: '#!/usr/bin/env node',
  },
});
