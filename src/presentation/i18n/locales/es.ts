/**
 * @fileoverview Catálogo de traducciones en español para el panel PM2 EID.
 * @module presentation/i18n/locales/es
 */

import type { Translations } from '../types.ts';

/** Diccionario de traducciones en español */
export const es: Translations = {
  locale: 'es',
  header: {
    subtitle: 'Panel de Control y Supervisor PM2',
    refresh: 'Actualizar',
    logout: 'Cerrar sesión',
    syncing: 'Sincronizando...',
    btnSave: 'Guardar Estado',
    saveSuccess: 'Lista de procesos de PM2 guardada con éxito en disco.',
  },
  system: {
    title: 'Resumen del Servidor',
    hostCpu: 'CPU Host',
    hostRam: 'Memoria',
    loadAvg: 'Carga Prom.',
    uptime: 'Tiempo Activo',
    cores: 'núcleos',
  },
  toolbar: {
    processes: 'Procesos',
    autoRefresh: 'Auto-refrescar (10s)',
    searchPlaceholder: 'Filtrar por nombre o ID...',
    filterAll: 'Todos',
    filterOnline: 'En línea',
    filterStopped: 'Detenidos',
    filterErrored: 'Con error',
    langEn: 'Inglés',
    langEs: 'Español',
  },
  table: {
    colId: 'ID',
    colName: 'Proceso',
    colStatus: 'Estado',
    colCpu: 'CPU',
    colMemory: 'Memoria',
    colRestarts: 'Reinicios',
    colUptime: 'Tiempo activo',
    colActions: 'Acciones',
    btnStart: 'Iniciar',
    btnStop: 'Detener',
    btnRestart: 'Reiniciar',
    btnDelete: 'Eliminar',
    btnLogs: 'Logs',
    btnInspect: 'Detalles',
    emptyTitle: 'No se encontraron procesos PM2',
    emptyHint: 'Inicia un proceso en el servidor con: pm2 start app.js',
  },
  detail: {
    title: (name: string) => `Inspección del Proceso: ${name}`,
    pid: 'PID',
    execMode: 'Modo de Ejecución',
    instances: 'Instancias',
    scaleUp: 'Escalar +1',
    scaleDown: 'Reducir -1',
    nodeVersion: 'Versión Runtime',
    script: 'Ruta del Script',
    cwd: 'Directorio de Trabajo',
    gitBranch: 'Rama Git',
    gitCommit: 'Commit Git',
    unstableRestarts: 'Reinicios Inestables',
    envVars: 'Variables de Entorno',
    customMetrics: 'Métricas Personalizadas (axm_monitor)',
    noCustomMetrics: 'Este proceso no reporta métricas personalizadas.',
    noEnvVars: 'No se encontraron variables de entorno personalizadas.',
    btnClose: 'Cerrar',
  },
  confirm: {
    stop: (name: string) => `¿Detener el proceso "${name}"?`,
    restart: (name: string) => `¿Reiniciar el proceso "${name}"?`,
    delete: (name: string) => `¿Eliminar el proceso "${name}"? Esta acción no se puede deshacer.`,
    flush: (name: string) =>
      `¿Limpiar los archivos de logs de "${name}"? El contenido existente será borrado.`,
    scale: (name: string, instances: number) =>
      `¿Escalar el proceso "${name}" a ${instances} instancia(s)?`,
    save: '¿Guardar los procesos activos de PM2 en disco (pm2 save)?',
    btnCancel: 'Cancelar',
    btnConfirm: 'Confirmar',
  },
  logs: {
    title: (name: string) => `Logs del proceso: ${name}`,
    tabStdout: 'stdout',
    tabStderr: 'stderr',
    linesLabel: 'Líneas:',
    lines50: '50 líneas',
    lines100: '100 líneas',
    lines250: '250 líneas',
    lines500: '500 líneas',
    btnFlush: 'Limpiar logs',
    flushSuccess: 'Logs limpiados exitosamente',
    btnClose: 'Cerrar',
    noLogs: 'No hay registros de salida para este flujo.',
    loading: 'Transmitiendo logs...',
  },
  login: {
    title: 'Iniciar Sesión',
    subtitle: 'Ingresa tus credenciales para administrar los procesos PM2',
    badge: 'PM2 EID Is Discord Dashboard',
    usernameLabel: 'Usuario',
    passwordLabel: 'Contraseña',
    btnSubmit: 'Entrar',
    invalidError: 'Usuario o contraseña incorrectos',
  },
  alerts: {
    daemonFailed:
      'Error al conectar con el demonio PM2. Verifica que PM2 esté corriendo en el host.',
    actionError: (action: string, error: string) =>
      `Error al ejecutar ${action} en el proceso: ${error}`,
  },
};
