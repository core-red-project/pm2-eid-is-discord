/**
 * @fileoverview Validated environment configuration with fallback defaults.
 * @module infrastructure/config/env
 */

/**
 * Application configuration contract.
 */
export interface AppConfig {
  /** HTTP server listening port */
  port: number;
  /** Hostname or IP to bind the HTTP server */
  host: string;
  /** Environment mode ('development', 'production', 'test') */
  env: string;
  /** Optional custom PM2 home directory path */
  pm2Home: string | undefined;
  /** Authentication configuration */
  auth: {
    /** Whether credentials authentication is active */
    enabled: boolean;
    /** Administrative username */
    user?: string | undefined;
    /** Administrative password */
    pass?: string | undefined;
  };
  /** Outbound event webhook configuration */
  webhook: {
    /** Whether event webhook dispatching is enabled */
    enabled: boolean;
    /** Target HTTP webhook URL */
    url?: string | undefined;
    /** Payload serialization schema */
    format: 'generic' | 'discord' | 'slack';
    /** Filtered lifecycle events to dispatch */
    events: string[];
  };
}

const envPort = Number(process.env.PM2_EID_PORT || process.env.PORT || 3847);
const authUser = process.env.AUTH_USER || process.env.PM2_DASHBOARD_USER;
const authPass = process.env.AUTH_PASS || process.env.PM2_DASHBOARD_PASS;

const webhookUrl = process.env.WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
let webhookFormat: 'generic' | 'discord' | 'slack' = 'generic';

if (process.env.WEBHOOK_FORMAT) {
  const f = process.env.WEBHOOK_FORMAT.toLowerCase();
  if (f === 'discord' || f === 'slack' || f === 'generic') {
    webhookFormat = f;
  }
} else if (webhookUrl) {
  if (
    webhookUrl.includes('discord.com/api/webhooks') ||
    webhookUrl.includes('discordapp.com/api/webhooks')
  ) {
    webhookFormat = 'discord';
  } else if (webhookUrl.includes('hooks.slack.com')) {
    webhookFormat = 'slack';
  }
}

const configuredEvents = process.env.WEBHOOK_EVENTS
  ? process.env.WEBHOOK_EVENTS.split(',').map((s) => s.trim().toLowerCase())
  : ['restart', 'stop', 'exit', 'errored', 'error'];

const host = process.env.HOST || '127.0.0.1';
const isLocalOnly = host === '127.0.0.1' || host === 'localhost' || host === '::1';
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.BUN_ENV === 'test';

if (!isLocalOnly && !(authUser && authPass) && !isTestEnv) {
  throw new Error(
    `[Security Error] Application bound to external interface '${host}' without authentication credentials. ` +
      'You must set AUTH_USER and AUTH_PASS, or bind exclusively to 127.0.0.1 (HOST=127.0.0.1).',
  );
}

/**
 * Validated application configuration object.
 */
export const config: AppConfig = {
  port: Number.isNaN(envPort) ? 3847 : envPort,
  host,
  env: process.env.NODE_ENV || 'development',
  pm2Home: process.env.PM2_HOME,
  auth: {
    enabled: Boolean(authUser && authPass),
    user: authUser,
    pass: authPass,
  },
  webhook: {
    enabled: Boolean(webhookUrl),
    url: webhookUrl,
    format: webhookFormat,
    events: configuredEvents,
  },
};
