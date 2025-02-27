/**
 * Logger Service Server Setup
 * Configures the Express server with middleware and routes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logRoutes = require('./routes/logger.routes');
const { errorHandler } = require('../../shared/middleware/error-handler.middleware');
const { OK } = require('../../shared/utils/http-status');

// Create Express app
const app = express();

// Basic middleware
app.use(helmet()); // Security headers
app.use(express.json({ limit: '1mb' })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Parse URL-encoded request bodies

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(OK).json({
        status: 'ok',
        service: 'logger-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Main logger routes
app.use('/api/logs', logRoutes);

// Fallback route handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        code: 404
    });
});

// Global error handler
app.use(errorHandler);

// Export Express app
module.exports = app;