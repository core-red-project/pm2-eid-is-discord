'use strict';

const pm2 = require('pm2');

/**
 * PM2 Client Module
 * Provides isolated PM2 programmatic API interactions.
 * All PM2 operations are wrapped with proper connection handling.
 */

const PM2_CONNECT_TIMEOUT = 5000;

/**
 * Connects to PM2 daemon
 * @returns {Promise<void>}
 */
function connect() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('PM2 connection timeout'));
        }, PM2_CONNECT_TIMEOUT);

        pm2.connect((err) => {
            clearTimeout(timeout);
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Disconnects from PM2 daemon
 */
function disconnect() {
    pm2.disconnect();
}

/**
 * Wraps a PM2 operation with connection management
 * @param {Function} operation - Async operation to execute
 * @returns {Promise<any>}
 */
async function withConnection(operation) {
    try {
        await connect();
        const result = await operation();
        return result;
    } finally {
        disconnect();
    }
}

/**
 * Retrieves list of all PM2 processes
 * @returns {Promise<Array>} Array of process descriptors
 */
function listProcesses() {
    return withConnection(() => {
        return new Promise((resolve, reject) => {
            pm2.list((err, processDescriptionList) => {
                if (err) {
                    reject(err);
                } else {
                    const processes = processDescriptionList.map(formatProcessData);
                    resolve(processes);
                }
            });
        });
    });
}

/**
 * Retrieves details for a specific process
 * @param {string} nameOrId - Process name or PM2 ID
 * @returns {Promise<Object|null>}
 */
function getProcess(nameOrId) {
    return withConnection(() => {
        return new Promise((resolve, reject) => {
            pm2.describe(nameOrId, (err, processDescription) => {
                if (err) {
                    reject(err);
                } else if (!processDescription || processDescription.length === 0) {
                    resolve(null);
                } else {
                    resolve(formatProcessData(processDescription[0]));
                }
            });
        });
    });
}

/**
 * Starts a stopped process
 * @param {string} nameOrId - Process name or PM2 ID
 * @returns {Promise<Object>}
 */
function startProcess(nameOrId) {
    return withConnection(() => {
        return new Promise((resolve, reject) => {
            pm2.restart(nameOrId, (err, proc) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, process: nameOrId });
                }
            });
        });
    });
}

/**
 * Stops a running process
 * @param {string} nameOrId - Process name or PM2 ID
 * @returns {Promise<Object>}
 */
function stopProcess(nameOrId) {
    return withConnection(() => {
        return new Promise((resolve, reject) => {
            pm2.stop(nameOrId, (err, proc) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, process: nameOrId });
                }
            });
        });
    });
}

/**
 * Restarts a process
 * @param {string} nameOrId - Process name or PM2 ID
 * @returns {Promise<Object>}
 */
function restartProcess(nameOrId) {
    return withConnection(() => {
        return new Promise((resolve, reject) => {
            pm2.restart(nameOrId, (err, proc) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, process: nameOrId });
                }
            });
        });
    });
}

/**
 * Deletes a process from PM2
 * @param {string} nameOrId - Process name or PM2 ID
 * @returns {Promise<Object>}
 */
function deleteProcess(nameOrId) {
    return withConnection(() => {
        return new Promise((resolve, reject) => {
            pm2.delete(nameOrId, (err, proc) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, process: nameOrId });
                }
            });
        });
    });
}

/**
 * Flushes logs for a process
 * @param {string} nameOrId - Process name or PM2 ID
 * @returns {Promise<Object>}
 */
function flushLogs(nameOrId) {
    return withConnection(() => {
        return new Promise((resolve, reject) => {
            pm2.flush(nameOrId, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, process: nameOrId });
                }
            });
        });
    });
}

/**
 * Reloads a process with zero-downtime (cluster mode)
 * @param {string} nameOrId - Process name or PM2 ID
 * @returns {Promise<Object>}
 */
function reloadProcess(nameOrId) {
    return withConnection(() => {
        return new Promise((resolve, reject) => {
            pm2.reload(nameOrId, (err, proc) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, process: nameOrId });
                }
            });
        });
    });
}

/**
 * Formats raw PM2 process data into a clean structure
 * @param {Object} proc - Raw PM2 process descriptor
 * @returns {Object}
 */
function formatProcessData(proc) {
    const monit = proc.monit || {};
    const pm2Env = proc.pm2_env || {};

    return {
        pm_id: proc.pm_id,
        name: proc.name,
        status: pm2Env.status || 'unknown',
        cpu: monit.cpu || 0,
        memory: monit.memory || 0,
        memoryFormatted: formatBytes(monit.memory || 0),
        restarts: pm2Env.restart_time || 0,
        uptime: pm2Env.pm_uptime ? Date.now() - pm2Env.pm_uptime : 0,
        uptimeFormatted: pm2Env.pm_uptime ? formatUptime(Date.now() - pm2Env.pm_uptime) : '-',
        pid: proc.pid || '-',
        exec_mode: pm2Env.exec_mode || 'fork',
        instances: pm2Env.instances || 1,
        pm_out_log_path: pm2Env.pm_out_log_path || null,
        pm_err_log_path: pm2Env.pm_err_log_path || null,
        created_at: pm2Env.created_at || null,
        script: pm2Env.pm_exec_path || null,
        cwd: pm2Env.pm_cwd || null
    };
}

/**
 * Formats bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Formats uptime milliseconds to human-readable string
 * @param {number} ms
 * @returns {string}
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Reads log file with tail behavior
 * @param {string} filePath - Path to log file
 * @param {number} lines - Number of lines to read
 * @returns {Promise<string>}
 */
function readLogFile(filePath, lines = 100) {
    const fs = require('fs');
    const path = require('path');

    return new Promise((resolve, reject) => {
        if (!filePath) {
            resolve('No log file configured');
            return;
        }

        fs.access(filePath, fs.constants.R_OK, (accessErr) => {
            if (accessErr) {
                resolve('Log file not accessible or does not exist');
                return;
            }

            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    resolve('Error reading log file: ' + err.message);
                    return;
                }

                const allLines = data.split('\n');
                const tailLines = allLines.slice(-lines).join('\n');
                resolve(tailLines || 'Log file is empty');
            });
        });
    });
}

/**
 * Gets stdout logs for a process
 * @param {string} nameOrId - Process name or PM2 ID
 * @param {number} lines - Number of lines to retrieve
 * @returns {Promise<string>}
 */
async function getProcessLogs(nameOrId, lines = 100) {
    const proc = await getProcess(nameOrId);
    if (!proc) {
        return 'Process not found';
    }
    return readLogFile(proc.pm_out_log_path, lines);
}

/**
 * Gets stderr logs for a process
 * @param {string} nameOrId - Process name or PM2 ID
 * @param {number} lines - Number of lines to retrieve
 * @returns {Promise<string>}
 */
async function getProcessErrorLogs(nameOrId, lines = 100) {
    const proc = await getProcess(nameOrId);
    if (!proc) {
        return 'Process not found';
    }
    return readLogFile(proc.pm_err_log_path, lines);
}

module.exports = {
    listProcesses,
    getProcess,
    startProcess,
    stopProcess,
    restartProcess,
    deleteProcess,
    flushLogs,
    reloadProcess,
    getProcessLogs,
    getProcessErrorLogs,
    formatBytes,
    formatUptime
};
