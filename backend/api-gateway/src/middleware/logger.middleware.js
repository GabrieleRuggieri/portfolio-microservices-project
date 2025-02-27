/**
 * Logger Middleware
 * Provides request/response logging and integration with ELK stack
 */

const { v4: uuidv4 } = require('uuid');
const morgan = require('morgan');
const { createLogger, format, transports } = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');
const config = require('../config/gateway.config');

// Create Winston logger
const logger = createLogger({
    level: config.logging.level,
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    defaultMeta: { service: 'api-gateway' },
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(({ timestamp, level, message, service, ...meta }) => {
                    return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                })
            )
        })
    ]
});

// Add Elasticsearch transport if ELK stack is enabled
if (config.logging.elkEnabled) {
    const esTransport = new ElasticsearchTransport({
        level: 'info',
        index: config.logging.elkIndex,
        clientOpts: {
            node: config.logging.elkHost,
            maxRetries: 5,
            requestTimeout: 10000
        }
    });

    logger.add(esTransport);

    // Log Elasticsearch connection events
    esTransport.on('error', (error) => {
        console.error('Elasticsearch transport error:', error);
    });
}

/**
 * Custom token for morgan to log request body
 * Sanitizes sensitive information from the request body
 */
morgan.token('body', (req) => {
    if (!req.body) return '-';

    const sanitizedBody = { ...req.body };

    // Sanitize sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'credit_card', 'creditCard'];

    sensitiveFields.forEach(field => {
        if (sanitizedBody[field]) {
            sanitizedBody[field] = '[REDACTED]';
        }
    });

    return JSON.stringify(sanitizedBody);
});

/**
 * Custom token for morgan to log response body
 */
morgan.token('response-body', (req, res) => {
    if (!res.body) return '-';
    return JSON.stringify(res.body);
});

/**
 * Custom morgan format for detailed request/response logging
 */
const morganFormat = (tokens, req, res) => {
    // Skip logging requests to excluded paths
    if (config.logging.excludePaths.includes(req.path)) {
        return null;
    }

    return JSON.stringify({
        'request-id': req.id,
        'remote-address': tokens['remote-addr'](req, res),
        'time': tokens['date'](req, res, 'iso'),
        'method': tokens['method'](req, res),
        'url': tokens['url'](req, res),
        'http-version': tokens['http-version'](req, res),
        'status-code': tokens['status'](req, res),
        'content-length': tokens['res'](req, res, 'content-length'),
        'referrer': tokens['referrer'](req, res),
        'user-agent': tokens['user-agent'](req, res),
        'response-time': tokens['response-time'](req, res, 2) + ' ms',
        'request-body': config.logging.logRequests ? tokens['body'](req, res) : undefined,
        'response-body': config.logging.logResponses ? tokens['response-body'](req, res) : undefined
    });
};

/**
 * Request ID middleware
 * Assigns a unique ID to each request for tracing
 */
const requestId = (req, res, next) => {
    req.id = req.headers['x-request-id'] || uuidv4();
    res.setHeader('x-request-id', req.id);
    next();
};

/**
 * Capture response body middleware
 * This middleware captures the response body for logging purposes
 */
const captureResponseBody = (req, res, next) => {
    if (!config.logging.logResponses) {
        return next();
    }

    // Store original send method
    const originalSend = res.send;

    // Override send method to capture response body
    res.send = function (body) {
        res.body = body;
        return originalSend.call(this, body);
    };

    next();
};

/**
 * HTTP logger middleware
 * Uses morgan for HTTP request logging
 */
const httpLogger = morgan(morganFormat, {
    stream: {
        write: (message) => {
            // Morgan stream might receive null if request is skipped
            if (message) {
                try {
                    const logObject = JSON.parse(message);
                    logger.info('HTTP Request', logObject);
                } catch (e) {
                    logger.error('Error parsing log message', { error: e.message, message });
                }
            }
        }
    }
});

// Export the Winston logger for use throughout the application
module.exports = {
    logger,
    requestId,
    captureResponseBody,
    httpLogger
};