/**
 * API Gateway Entry Point
 * Initializes the API Gateway service
 */

const server = require('./server');
const config = require('./config/gateway.config');
const { logger } = require('./middleware/logger.middleware');

// Start the server
const PORT = config.server.port;
const HOST = config.server.host;

server.listen(PORT, HOST, () => {
    logger.info(`API Gateway started on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Log which services are being routed
    const routes = require('./config/routes');
    const services = Object.keys(routes).map(key => {
        return {
            name: key,
            prefix: routes[key].prefix,
            target: routes[key].target
        };
    });

    logger.info(`Registered services: ${services.length}`);

    services.forEach(service => {
        logger.info(`Service "${service.name}" at ${service.prefix} -> ${service.target}`);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Graceful shutdown after logging
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise });
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Graceful shutdown function
 * @param {string} signal - Signal that triggered the shutdown
 */
function gracefulShutdown(signal) {
    logger.info(`${signal} received. Shutting down gracefully...`);

    // Close the server
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}