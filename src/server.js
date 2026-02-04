'use strict';

const express = require('express');
const path = require('path');
const processRoutes = require('./routes/processes');

/**
 * PM2 EID Dashboard Server
 * Internal Core-Red tooling for PM2 process management
 */

const app = express();

// Configuration
const PORT = process.env.PM2_EID_PORT || 3847;
const HOST = '127.0.0.1'; // Localhost only - access via SSH tunnel

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

// Request logging (minimal)
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Main dashboard route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API routes
app.use('/api/processes', processRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Graceful shutdown
function shutdown(signal) {
    console.log(`\n[${signal}] Shutting down PM2 EID Dashboard...`);
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const server = app.listen(PORT, HOST, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log('  PM2 EID Dashboard');
    console.log('  Internal Core-Red Tooling');
    console.log('='.repeat(50));
    console.log(`  Status:    Running`);
    console.log(`  Host:      ${HOST}`);
    console.log(`  Port:      ${PORT}`);
    console.log(`  URL:       http://${HOST}:${PORT}`);
    console.log('='.repeat(50));
    console.log('  Access via SSH tunnel:');
    console.log(`  ssh -L ${PORT}:localhost:${PORT} user@server`);
    console.log('='.repeat(50));
    console.log('');
});

module.exports = app;
