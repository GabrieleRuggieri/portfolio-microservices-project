/**
 * Rate Limiter Middleware
 * Protects against brute force attacks and abuse
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const config = require('../config/auth.config');
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
 * Create a rate limiter with options
 * @param {Object} options - Custom rate limiter options
 * @returns {Function} Express middleware function
 */
const createRateLimiter = (options = {}) => {
    const limiterOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes by default
        max: 100, // 100 requests per windowMs by default
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, next, options) => {
            res.status(TOO_MANY_REQUESTS).json(
                formatError(
                    'Too many requests',
                    `Please try again after ${Math.ceil(options.windowMs / 1000 / 60)} minutes`
                )
            );
        },
        ...options
    };

    // Use Redis store if Redis client is available
    if (redisClient) {
        limiterOptions.store = new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: 'rl:auth:'
        });
    }

    return rateLimit(limiterOptions);
};

// Standard rate limiter for most endpoints
const rateLimiter = createRateLimiter();

// Strict rate limiter for sensitive operations
const strictRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per hour
    message: 'Too many attempts for sensitive operations, please try again later'
});

// Rate limiter for login attempts
const loginRateLimiter = createRateLimiter({
    windowMs: config.rateLimit.loginAttempts.windowMs,
    max: config.rateLimit.loginAttempts.maxAttempts,
    message: 'Too many login attempts, please try again later'
});

// Rate limiter for password reset
const passwordResetLimiter = createRateLimiter({
    windowMs: config.rateLimit.passwordReset.windowMs,
    max: config.rateLimit.passwordReset.maxAttempts,
    message: 'Too many password reset attempts, please try again later'
});

module.exports = {
    rateLimiter,
    strictRateLimiter,
    loginRateLimiter,
    passwordResetLimiter
};