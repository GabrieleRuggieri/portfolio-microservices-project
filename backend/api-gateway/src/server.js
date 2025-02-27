/**
 * API Gateway Server Setup
 * Configures the Express server with middleware and routes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const httpProxy = require('http-proxy');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('./config/gateway.config');
const routes = require('./config/routes');
const { requestId, captureResponseBody, httpLogger, logger } = require('./middleware/logger.middleware');
const { authenticate } = require('./middleware/auth.middleware');
const { standardLimiter, strictLimiter, publicLimiter } = require('./middleware/rate-limiter.middleware');
const { errorHandler } = require('../../shared/middleware/error-handler.middleware');
const { OK } = require('../../shared/utils/http-status');

// Create Express app
const app = express();

// Setup basic middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(express.json({ limit: '1mb' })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Parse URL-encoded request bodies
app.use(cookieParser()); // Parse cookies

// CORS configuration
app.use(cors(config.server.cors));

// Request tracing and logging
app.use(requestId);
app.use(captureResponseBody);
app.use(httpLogger);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'api-gateway'
    });
});

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

// Export the Express app
module.exports = app;

// Create proxy server
const proxy = httpProxy.createProxyServer();

// Handle proxy errors
proxy.on('error', (err, req, res) => {
    logger.error('Proxy error:', err);

    const statusCode = err.code === 'ECONNREFUSED' ? 503 : 500;

    res.status(statusCode).json({
        error: 'Service Unavailable',
        message: 'The service is temporarily unavailable',
        code: statusCode
    });
});

// Metrics endpoint for Prometheus scraping
app.get('/metrics', (req, res) => {
    // Basic metrics for demonstration, in real app connect to Prometheus client
    res.status(OK).json({
        requestCount: 0,
        responseTime: 0,
        errorRate: 0,
        serviceHealth: {
            'auth-service': 'up',
            'profile-service': 'up',
            'projects-service': 'up',
            'blog-service': 'up',
            'contact-service': 'up',
            'analytics-service': 'up'
        }
    });
});

// Setup service routing
Object.keys(routes).forEach(serviceKey => {
    const service = routes[serviceKey];

    // Get service routes
    service.routes.forEach(route => {
        const fullPath = `${service.prefix}${route.path}`;
        const isAuthRequired = route.auth === true;

        // Apply appropriate rate limiter based on route type
        let rateLimiter;
        if (route.method === 'POST' && (fullPath.includes('/login') || fullPath.includes('/register'))) {
            rateLimiter = strictLimiter;
        } else if (!isAuthRequired) {
            rateLimiter = publicLimiter;
        } else {
            rateLimiter = standardLimiter;
        }

        // Setup proxy route with middleware chain
        app[route.method.toLowerCase()](fullPath, [
            rateLimiter,
            isAuthRequired ? authenticate(true) : authenticate(false),
            (req, res, next) => {
                // Add target service info to request for potential logging
                req.targetService = {
                    name: serviceKey,
                    url: service.target
                };
                next();
            },
            createProxyMiddleware({
                target: service.target,
                changeOrigin: config.proxy.changeOrigin,
                pathRewrite: service.pathRewrite || config.proxy.pathRewrite,
                timeout: config.proxy.timeout,
                proxyTimeout: config.proxy.proxyTimeout,
                logLevel: 'silent', // We use our own logging
                onProxyReq: (proxyReq, req, res) => {
                    // Forward user info if authenticated
                    if (req.user) {
                        proxyReq.setHeader('X-User-ID', req.user.id);
                        proxyReq.setHeader('X-User-Roles', JSON.stringify(req.user.roles));
                    }

                    // Forward request ID for distributed tracing
                    proxyReq.setHeader('X-Request-ID', req.id);

                    // Log proxy request
                    logger.debug(`Proxying ${req.method} ${req.url} -> ${service.target}`);
                }
            })
        ]);

        logger.debug(`Route registered: ${route.method} ${fullPath} -> ${service.target}, Auth Required: ${isAuthRequired}`);
    });
});