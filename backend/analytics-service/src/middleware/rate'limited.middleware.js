/**
 * Rate Limiter Middleware
 * Protects analytics endpoints from abuse
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { formatError } = require('../../../shared/utils/response-formatter');
const { TOO_MANY_REQUESTS } = require('../../../shared/utils/http-status');

// Initialize Redis client if Redis URL is provided
let redisClient;
if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);

    // Log Redis connection events
    redisClient.on('connect', () => {
        console.info('Redis client connected for rate limiting');
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
    // Default options
    const defaultOptions = {
        windowMs: 60 * 1000, // 1 minute
        max: 60, // 60 requests per minute
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next, options) => {
            res.status(TOO_MANY_REQUESTS).json(
                formatError(
                    'Too many requests',
                    `You have exceeded the rate limit. Please try again after ${Math.ceil(options.windowMs / 1000 / 60)} minutes.`
                )
            );
        }
    };

    // Merge options
    const limiterOptions = {
        ...defaultOptions,
        ...options
    };

    // Use Redis store if Redis client is available
    if (redisClient) {
        limiterOptions.store = new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: 'rl:analytics:'
        });
    }

    return rateLimit(limiterOptions);
};

/**
 * Rate limiter for tracking endpoints
 * More generous limits since these are used by client-side code
 */
const trackingRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100 // 100 requests per minute
});

/**
 * Rate limiter for analytics data endpoints
 * Stricter limits for admin endpoints
 */
const analyticsDataRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30 // 30 requests per minute
});

module.exports = {
    trackingRateLimiter,
    analyticsDataRateLimiter,
    createRateLimiter
};