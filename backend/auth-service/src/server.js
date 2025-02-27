/**
 * Authentication Service Server Setup
 * Configures the Express server with middleware and routes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const config = require('./config/auth.config');
const { errorHandler } = require('../../shared/middleware/error-handler.middleware');
const { OK } = require('../../shared/utils/http-status');

// Create Express app
const app = express();

// Basic middleware
app.use(helmet()); // Security headers
app.use(express.json({ limit: '1mb' })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Parse URL-encoded request bodies
app.use(cookieParser()); // Parse cookies

// CORS configuration
app.use(cors(config.cors));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Add request ID to each request
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || require('uuid').v4();
    res.setHeader('x-request-id', req.id);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(OK).json({
        status: 'ok',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Main authentication routes
app.use('/api/auth', authRoutes);

// Backward compatibility with API gateway routing
app.use('/', authRoutes);

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