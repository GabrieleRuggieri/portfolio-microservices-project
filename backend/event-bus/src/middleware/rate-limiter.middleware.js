/**
 * Rate Limiter Middleware
 * Protects against abuse of event publishing endpoints using MySQL
 */

const { Sequelize, DataTypes } = require('sequelize');
const { formatError } = require('../../../shared/utils/response-formatter');
const { TOO_MANY_REQUESTS } = require('../../../shared/utils/http-status');

// Initialize Sequelize connection
const sequelize = new Sequelize(
    process.env.DB_NAME || 'portfolio_event_bus',
    process.env.DB_USERNAME || 'root',
    process.env.DB_PASSWORD || 'password',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Define Rate Limit Model
const RateLimitEntry = sequelize.define('RateLimitEntry', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    ip: {
        type: DataTypes.STRING(45), // IPv6 support
        allowNull: false
    },
    service: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'general'
    },
    request_count: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    first_request_time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'rate_limit_entries',
    timestamps: true,
    indexes: [
        { fields: ['ip', 'service'] },
        { fields: ['first_request_time'] }
    ]
});

// Sync model
const initRateLimitModel = async () => {
    try {
        await RateLimitEntry.sync({
            alter: process.env.NODE_ENV === 'development'
        });
        console.log('Rate limit model synchronized');
    } catch (error) {
        console.error('Error synchronizing rate limit model:', error);
    }
};

// Initialize on startup
initRateLimitModel();

/**
 * Create a rate limiter middleware
 * @param {Object} options - Custom rate limiter options
 * @returns {Function} - Express middleware function
 */
const createRateLimiter = (options = {}) => {
    // Default options
    const defaultOptions = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        service: 'general'
    };

    // Merge options
    const limiterOptions = { ...defaultOptions, ...options };

    return async (req, res, next) => {
        try {
            const ip = req.ip;
            const service = limiterOptions.service;
            const now = new Date();
            const windowStart = new Date(now.getTime() - limiterOptions.windowMs);

            // Clean up old entries
            await RateLimitEntry.destroy({
                where: {
                    first_request_time: { [Sequelize.Op.lt]: windowStart }
                }
            });

            // Count recent requests
            const existingEntries = await RateLimitEntry.findAll({
                where: {
                    ip,
                    service,
                    first_request_time: { [Sequelize.Op.gte]: windowStart }
                }
            });

            // Check if request limit is exceeded
            if (existingEntries.length >= limiterOptions.max) {
                return res.status(TOO_MANY_REQUESTS).json(
                    formatError(
                        'Too many requests',
                        `You have exceeded the rate limit for ${service} service. Please try again after ${Math.ceil(limiterOptions.windowMs / 1000 / 60)} minutes.`
                    )
                );
            }

            // Create new rate limit entry
            await RateLimitEntry.create({
                ip,
                service
            });

            next();
        } catch (error) {
            console.error('Rate limit error:', error);
            next();
        }
    };
};

/**
 * Rate limiter for event publishing
 * Prevents excessive event generation
 */
const eventPublishRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 events per window
    service: 'event-publish'
});

/**
 * Service-specific rate limiter
 * More granular control for different services
 */
const serviceSpecificRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 events per service per window
    service: 'service-specific'
});

/**
 * Combined rate limiter middleware
 * Applies both general and service-specific rate limits
 */
const combinedEventRateLimiter = async (req, res, next) => {
    try {
        // Apply general rate limit first
        await eventPublishRateLimiter(req, res, async () => {
            // If general rate limit passes, apply service-specific rate limit
            await serviceSpecificRateLimiter(req, res, next);
        });
    } catch (error) {
        console.error('Combined rate limiter error:', error);
        next();
    }
};

module.exports = {
    eventPublishRateLimiter: combinedEventRateLimiter,
    createRateLimiter,
    RateLimitEntry
};