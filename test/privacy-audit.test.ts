import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Privacy & Zero Telemetry Static Audit.
 * Ensures the codebase has zero analytics, zero external CDN dependencies,
 * and that the only outbound network request is the user-configured webhook.
 */
describe('Privacy & Zero-Telemetry Audit', () => {
  const srcDir = join(import.meta.dir, '../src');

  function getAllFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allSourceFiles = getAllFiles(srcDir);

  it('should only permit outbound fetch() in WebhookDispatcher', () => {
    const filesWithFetch: string[] = [];

    for (const filePath of allSourceFiles) {
      const content = readFileSync(filePath, 'utf-8');
      // Look for fetch( calls
      if (/\bfetch\s*\(/.test(content)) {
        filesWithFetch.push(filePath);
      }
    }

    // Only webhook-dispatcher.ts is authorized to make outbound HTTP requests
    expect(filesWithFetch.length).toBe(1);
    expect(filesWithFetch[0]).toContain('webhook-dispatcher.ts');
  });

  it('should not use node http/https/net/tls/websocket clients for external communication', () => {
    const bannedNetworkPatterns = [
      /\bhttps?\.(?:get|request)\s*\(/,
      /\bnew\s+WebSocket\s*\(/,
      /\btls\.connect\s*\(/,
    ];

    for (const filePath of allSourceFiles) {
      const content = readFileSync(filePath, 'utf-8');
      for (const pattern of bannedNetworkPatterns) {
        const match = content.match(pattern);
        expect(match).toBeNull();
      }
    }
  });

  it('should set PM2_DISABLE_VERSION_CHECK at startup to block pm2.io telemetry', () => {
    const indexContent = readFileSync(join(srcDir, 'index.tsx'), 'utf-8');
    expect(indexContent).toContain('PM2_DISABLE_VERSION_CHECK');
  });

  it('should contain zero references to third-party tracking or telemetry services', () => {
    const bannedPatterns = [
      /google-analytics/i,
      /googletagmanager/i,
      /mixpanel/i,
      /segment\.io/i,
      /sentry\.io/i,
      /datadoghq/i,
      /amplitude\.com/i,
      /@opentelemetry/i,
      /cdn\.jsdelivr\.net/i,
      /cdnjs\.cloudflare\.com/i,
      /unpkg\.com/i,
    ];

    for (const filePath of allSourceFiles) {
      const content = readFileSync(filePath, 'utf-8');
      for (const pattern of bannedPatterns) {
        const match = content.match(pattern);
        expect(match).toBeNull();
      }
    }
  });

  it('should bundle all scripts and styles locally with no external CDN links', () => {
    const viewFiles = allSourceFiles.filter((f) => f.includes('/views/'));
    for (const filePath of viewFiles) {
      const content = readFileSync(filePath, 'utf-8');
      // Ensure no http:// or https:// script or stylesheet links
      const scriptSrcMatches = content.match(/<script[^>]+src=["']https?:\/\//gi);
      const linkHrefMatches = content.match(/<link[^>]+href=["']https?:\/\//gi);

      expect(scriptSrcMatches).toBeNull();
      expect(linkHrefMatches).toBeNull();
    }
  });
});
