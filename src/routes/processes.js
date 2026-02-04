'use strict';

const express = require('express');
const router = express.Router();
const pm2Client = require('../pm2/client');

/**
 * Process Routes
 * Handles all PM2 process-related API endpoints
 */

/**
 * GET /api/processes
 * Returns list of all PM2 processes
 */
router.get('/', async (req, res) => {
    try {
        const processes = await pm2Client.listProcesses();
        
        // Check if request wants HTML partial (HTMX)
        if (req.headers['hx-request']) {
            res.send(renderProcessTable(processes));
        } else {
            res.json(processes);
        }
    } catch (err) {
        console.error('[PM2] Error listing processes:', err.message);
        if (req.headers['hx-request']) {
            res.send(renderError('Failed to connect to PM2. Is PM2 daemon running?'));
        } else {
            res.status(500).json({ error: 'Failed to list processes', message: err.message });
        }
    }
});

/**
 * GET /api/processes/:name
 * Returns details for a specific process
 */
router.get('/:name', async (req, res) => {
    try {
        const proc = await pm2Client.getProcess(req.params.name);
        if (!proc) {
            res.status(404).json({ error: 'Process not found' });
            return;
        }
        res.json(proc);
    } catch (err) {
        console.error('[PM2] Error getting process:', err.message);
        res.status(500).json({ error: 'Failed to get process', message: err.message });
    }
});

/**
 * POST /api/processes/:name/start
 * Starts a stopped process
 */
router.post('/:name/start', async (req, res) => {
    try {
        await pm2Client.startProcess(req.params.name);
        if (req.headers['hx-request']) {
            // Small delay to allow PM2 to update
            await sleep(500);
            const processes = await pm2Client.listProcesses();
            res.send(renderProcessTable(processes));
        } else {
            res.json({ success: true, action: 'start', process: req.params.name });
        }
    } catch (err) {
        console.error('[PM2] Error starting process:', err.message);
        if (req.headers['hx-request']) {
            res.send(renderError(`Failed to start process: ${err.message}`));
        } else {
            res.status(500).json({ error: 'Failed to start process', message: err.message });
        }
    }
});

/**
 * POST /api/processes/:name/stop
 * Stops a running process
 */
router.post('/:name/stop', async (req, res) => {
    try {
        await pm2Client.stopProcess(req.params.name);
        if (req.headers['hx-request']) {
            await sleep(500);
            const processes = await pm2Client.listProcesses();
            res.send(renderProcessTable(processes));
        } else {
            res.json({ success: true, action: 'stop', process: req.params.name });
        }
    } catch (err) {
        console.error('[PM2] Error stopping process:', err.message);
        if (req.headers['hx-request']) {
            res.send(renderError(`Failed to stop process: ${err.message}`));
        } else {
            res.status(500).json({ error: 'Failed to stop process', message: err.message });
        }
    }
});

/**
 * POST /api/processes/:name/restart
 * Restarts a process
 */
router.post('/:name/restart', async (req, res) => {
    try {
        await pm2Client.restartProcess(req.params.name);
        if (req.headers['hx-request']) {
            await sleep(500);
            const processes = await pm2Client.listProcesses();
            res.send(renderProcessTable(processes));
        } else {
            res.json({ success: true, action: 'restart', process: req.params.name });
        }
    } catch (err) {
        console.error('[PM2] Error restarting process:', err.message);
        if (req.headers['hx-request']) {
            res.send(renderError(`Failed to restart process: ${err.message}`));
        } else {
            res.status(500).json({ error: 'Failed to restart process', message: err.message });
        }
    }
});

/**
 * POST /api/processes/:name/delete
 * Deletes a process from PM2
 */
router.post('/:name/delete', async (req, res) => {
    try {
        await pm2Client.deleteProcess(req.params.name);
        if (req.headers['hx-request']) {
            await sleep(500);
            const processes = await pm2Client.listProcesses();
            res.send(renderProcessTable(processes));
        } else {
            res.json({ success: true, action: 'delete', process: req.params.name });
        }
    } catch (err) {
        console.error('[PM2] Error deleting process:', err.message);
        if (req.headers['hx-request']) {
            res.send(renderError(`Failed to delete process: ${err.message}`));
        } else {
            res.status(500).json({ error: 'Failed to delete process', message: err.message });
        }
    }
});

/**
 * POST /api/processes/:name/flush
 * Flushes logs for a process
 */
router.post('/:name/flush', async (req, res) => {
    try {
        await pm2Client.flushLogs(req.params.name);
        if (req.headers['hx-request']) {
            res.send('<div class="alert alert-success">Logs flushed successfully</div>');
        } else {
            res.json({ success: true, action: 'flush', process: req.params.name });
        }
    } catch (err) {
        console.error('[PM2] Error flushing logs:', err.message);
        if (req.headers['hx-request']) {
            res.send(renderError(`Failed to flush logs: ${err.message}`));
        } else {
            res.status(500).json({ error: 'Failed to flush logs', message: err.message });
        }
    }
});

/**
 * GET /api/processes/:name/logs
 * Returns stdout logs for a process
 */
router.get('/:name/logs', async (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 100;
        const logs = await pm2Client.getProcessLogs(req.params.name, lines);
        
        if (req.headers['hx-request']) {
            res.send(renderLogContent(logs, 'stdout'));
        } else {
            res.json({ logs, type: 'stdout', lines });
        }
    } catch (err) {
        console.error('[PM2] Error getting logs:', err.message);
        if (req.headers['hx-request']) {
            res.send(renderLogContent(`Error: ${err.message}`, 'error'));
        } else {
            res.status(500).json({ error: 'Failed to get logs', message: err.message });
        }
    }
});

/**
 * GET /api/processes/:name/errors
 * Returns stderr logs for a process
 */
router.get('/:name/errors', async (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 100;
        const logs = await pm2Client.getProcessErrorLogs(req.params.name, lines);
        
        if (req.headers['hx-request']) {
            res.send(renderLogContent(logs, 'stderr'));
        } else {
            res.json({ logs, type: 'stderr', lines });
        }
    } catch (err) {
        console.error('[PM2] Error getting error logs:', err.message);
        if (req.headers['hx-request']) {
            res.send(renderLogContent(`Error: ${err.message}`, 'error'));
        } else {
            res.status(500).json({ error: 'Failed to get error logs', message: err.message });
        }
    }
});

// === HTML Rendering Functions (for HTMX responses) ===

/**
 * Renders the process table HTML
 * @param {Array} processes
 * @returns {string}
 */
function renderProcessTable(processes) {
    if (!processes || processes.length === 0) {
        return `
            <div class="empty-state">
                <p>No PM2 processes found</p>
                <p class="hint">Start a process with: pm2 start your-app.js</p>
            </div>
        `;
    }

    const rows = processes.map(proc => {
        const statusClass = getStatusClass(proc.status);
        const isRunning = proc.status === 'online';
        
        return `
            <tr class="process-row" data-process="${escapeHtml(proc.name)}">
                <td class="col-id">${proc.pm_id}</td>
                <td class="col-name">
                    <span class="process-name">${escapeHtml(proc.name)}</span>
                </td>
                <td class="col-status">
                    <span class="status-badge ${statusClass}">${proc.status}</span>
                </td>
                <td class="col-cpu">${proc.cpu.toFixed(1)}%</td>
                <td class="col-memory">${proc.memoryFormatted}</td>
                <td class="col-restarts">${proc.restarts}</td>
                <td class="col-uptime">${proc.uptimeFormatted}</td>
                <td class="col-actions">
                    <div class="action-buttons">
                        ${isRunning ? `
                            <button class="btn btn-stop" 
                                    hx-post="/api/processes/${encodeURIComponent(proc.name)}/stop"
                                    hx-target="#process-table"
                                    hx-swap="innerHTML"
                                    hx-confirm="Stop process ${escapeHtml(proc.name)}?">
                                Stop
                            </button>
                            <button class="btn btn-restart"
                                    hx-post="/api/processes/${encodeURIComponent(proc.name)}/restart"
                                    hx-target="#process-table"
                                    hx-swap="innerHTML">
                                Restart
                            </button>
                        ` : `
                            <button class="btn btn-start"
                                    hx-post="/api/processes/${encodeURIComponent(proc.name)}/start"
                                    hx-target="#process-table"
                                    hx-swap="innerHTML">
                                Start
                            </button>
                        `}
                        <button class="btn btn-delete"
                                hx-post="/api/processes/${encodeURIComponent(proc.name)}/delete"
                                hx-target="#process-table"
                                hx-swap="innerHTML"
                                hx-confirm="Delete process ${escapeHtml(proc.name)}? This cannot be undone.">
                            Delete
                        </button>
                        <button class="btn btn-logs"
                                onclick="showLogs('${escapeHtml(proc.name)}')">
                            Logs
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <table class="process-table">
            <thead>
                <tr>
                    <th class="col-id">ID</th>
                    <th class="col-name">Name</th>
                    <th class="col-status">Status</th>
                    <th class="col-cpu">CPU</th>
                    <th class="col-memory">Memory</th>
                    <th class="col-restarts">Restarts</th>
                    <th class="col-uptime">Uptime</th>
                    <th class="col-actions">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Renders log content
 * @param {string} logs
 * @param {string} type
 * @returns {string}
 */
function renderLogContent(logs, type) {
    const typeClass = type === 'stderr' ? 'log-error' : 'log-stdout';
    return `<pre class="log-content ${typeClass}">${escapeHtml(logs)}</pre>`;
}

/**
 * Renders an error message
 * @param {string} message
 * @returns {string}
 */
function renderError(message) {
    return `<div class="alert alert-error">${escapeHtml(message)}</div>`;
}

/**
 * Gets CSS class for status badge
 * @param {string} status
 * @returns {string}
 */
function getStatusClass(status) {
    switch (status) {
        case 'online':
            return 'status-online';
        case 'stopped':
            return 'status-stopped';
        case 'errored':
            return 'status-errored';
        case 'launching':
            return 'status-launching';
        default:
            return 'status-unknown';
    }
}

/**
 * Escapes HTML special characters
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sleep utility
 * @param {number} ms
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;
