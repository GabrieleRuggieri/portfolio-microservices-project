/**
 * Rate Limiter Middleware
 * Protects against spam and abuse of the contact form
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
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5, // 5 requests per hour
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
            prefix: 'rl:contact:'
        });
    }

    return rateLimit(limiterOptions);
};

/**
 * Rate limiter for contact form submissions
 * Stricter limits to prevent spam
 */
const rateLimiter = createRateLimiter();

/**
 * IP-based rate limiter with additional keying by email
 * More strict limits for repeated submissions
 */
const emailSpecificRateLimiter = createRateLimiter({
    keyGenerator: (req) => {
        // Use both IP and email as the key
        const email = req.body.email ? req.body.email.toLowerCase() : '';
        return `${req.ip}:${email}`;
    },
    max: 3, // 3 messages per hour from the same email + IP combo
    message: 'You have sent too many messages in a short period. Please try again later.'
});

/**
 * Combined rate limiter middleware
 * Applies both general and email-specific rate limits
 */
const combinedRateLimiter = (req, res, next) => {
    // Apply general rate limit first
    rateLimiter(req, res, (err) => {
        if (err) {
            return next(err);
        }

        // If general rate limit passes, apply email-specific rate limit
        if (req.body.email) {
            return emailSpecificRateLimiter(req, res, next);
        }

        next();
    });
};

module.exports = {
    rateLimiter: combinedRateLimiter,
    createRateLimiter
};