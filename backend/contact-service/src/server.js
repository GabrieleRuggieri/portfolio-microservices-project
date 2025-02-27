/**
 * Contact Service Server Setup
 * Configures the Express server with middleware and routes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const contactRoutes = require('./routes/contact.routes');
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
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

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
        service: 'contact-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Main contact routes
app.use('/api/contact', contactRoutes);

// Backward compatibility with API gateway routing
app.use('/', contactRoutes);

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