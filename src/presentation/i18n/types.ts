/**
 * @fileoverview Type definitions and contract for internationalization (i18n) catalogs.
 * @module presentation/i18n/types
 */

/** Supported language codes */
export type SupportedLocale = 'en' | 'es';

/**
 * Complete translation schema contract enforced across all localized dictionaries.
 */
export interface Translations {
  locale: SupportedLocale;
  header: {
    subtitle: string;
    refresh: string;
    logout: string;
    syncing: string;
    btnSave: string;
    saveSuccess: string;
  };
  system: {
    title: string;
    hostCpu: string;
    hostRam: string;
    loadAvg: string;
    uptime: string;
    cores: string;
  };
  toolbar: {
    processes: string;
    autoRefresh: string;
    searchPlaceholder: string;
    filterAll: string;
    filterOnline: string;
    filterStopped: string;
    filterErrored: string;
    langEn: string;
    langEs: string;
  };
  table: {
    colId: string;
    colName: string;
    colStatus: string;
    colCpu: string;
    colMemory: string;
    colRestarts: string;
    colUptime: string;
    colActions: string;
    btnStart: string;
    btnStop: string;
    btnRestart: string;
    btnDelete: string;
    btnLogs: string;
    btnInspect: string;
    emptyTitle: string;
    emptyHint: string;
  };
  detail: {
    title: (name: string) => string;
    pid: string;
    execMode: string;
    instances: string;
    scaleUp: string;
    scaleDown: string;
    nodeVersion: string;
    script: string;
    cwd: string;
    gitBranch: string;
    gitCommit: string;
    unstableRestarts: string;
    envVars: string;
    customMetrics: string;
    noCustomMetrics: string;
    noEnvVars: string;
    btnClose: string;
  };
  confirm: {
    stop: (name: string) => string;
    restart: (name: string) => string;
    delete: (name: string) => string;
    flush: (name: string) => string;
    scale: (name: string, instances: number) => string;
    save: string;
    btnCancel: string;
    btnConfirm: string;
  };
  logs: {
    title: (name: string) => string;
    tabStdout: string;
    tabStderr: string;
    linesLabel: string;
    lines50: string;
    lines100: string;
    lines250: string;
    lines500: string;
    btnFlush: string;
    flushSuccess: string;
    btnClose: string;
    noLogs: string;
    loading: string;
  };
  login: {
    title: string;
    subtitle: string;
    badge: string;
    usernameLabel: string;
    passwordLabel: string;
    btnSubmit: string;
    invalidError: string;
  };
  alerts: {
    daemonFailed: string;
    actionError: (action: string, error: string) => string;
  };
}
