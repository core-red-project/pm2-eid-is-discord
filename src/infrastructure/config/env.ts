/**
 * Environment Configuration
 * Type-safe configuration with defaults
 */

export interface AppConfig {
  port: number;
  host: string;
  env: string;
  pm2Home: string | undefined;
  auth: {
    enabled: boolean;
    user?: string;
    pass?: string;
  };
  webhook: {
    enabled: boolean;
    url?: string;
    format: 'generic' | 'discord' | 'slack';
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

export const config: AppConfig = {
  port: Number.isNaN(envPort) ? 3847 : envPort,
  host: process.env.HOST || '0.0.0.0',
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
