/**
 * Rate Limiter Middleware
 * Limits request rates to prevent abuse and DOS attacks
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const config = require('../config/gateway.config');
const { formatError } = require('../../../shared/utils/response-formatter');
const { TOO_MANY_REQUESTS } = require('../../../shared/utils/http-status');

// Initialize Redis client if Redis URL is provided in environment
let redisClient;
if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);

    // Log Redis connection events
    redisClient.on('connect', () => {
        console.info('Redis client connected');
    });

    redisClient.on('error', (err) => {
        console.error('Redis client error:', err);
    });
}

/**
 * Create a rate limiter middleware with optional custom configuration
 * @param {Object} options - Custom rate limiter options to override defaults
 * @returns {Function} - Express middleware function
 */
const createRateLimiter = (options = {}) => {
    // Default options from config
    const defaultOptions = config.server.rateLimiter;

    // Create limiter with Redis store if Redis is configured
    const limiterOptions = {
        ...defaultOptions,
        ...options,
        // Custom error handling
        handler: (req, res, next, options) => {
            res.status(TOO_MANY_REQUESTS).json(
                formatError(
                    'Too many requests',
                    `Please try again after ${Math.ceil(options.windowMs / 1000 / 60)} minutes`
                )
            );
        }
    };

    // Use Redis store if Redis client is available
    if (redisClient) {
        limiterOptions.store = new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: 'rl:',  // Redis key prefix
        });
    }

    return rateLimit(limiterOptions);
};

/**
 * Standard rate limiter for most API routes
 */
const standardLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive operations (login, registration, etc.)
 */
const strictLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests per hour
    message: 'Too many attempts, please try again later'
});

/**
 * Relaxed rate limiter for public endpoints
 */
const publicLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per 15 minutes
});

module.exports = {
    standardLimiter,
    strictLimiter,
    publicLimiter,
    createRateLimiter
};