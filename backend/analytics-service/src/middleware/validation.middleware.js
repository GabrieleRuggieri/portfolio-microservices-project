/**
 * Validation Middleware
 * Validates request data for analytics-related endpoints
 */

const { formatError } = require('../../../shared/utils/response-formatter');
const { BAD_REQUEST } = require('../../../shared/utils/http-status');

/**
 * Validate track visitor request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateTrackVisitor = (req, res, next) => {
    const errors = [];
    const { sessionId } = req.body;

    // Validate required fields
    if (!sessionId) {
        errors.push('Session ID is required');
    }

    // Validate session ID format
    if (sessionId && (typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 100)) {
        errors.push('Session ID must be a valid string between 8 and 100 characters');
    }

    // Return validation errors
    if (errors.length > 0) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', errors.join(', '))
        );
    }

    next();
};

/**
 * Validate track event request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateTrackEvent = (req, res, next) => {
    const errors = [];
    const {
        sessionId,
        eventType,
        eventCategory,
        eventAction,
        pagePath
    } = req.body;

    // Validate required fields
    if (!sessionId) {
        errors.push('Session ID is required');
    }

    if (!eventType) {
        errors.push('Event type is required');
    }

    // Validate session ID format
    if (sessionId && (typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 100)) {
        errors.push('Session ID must be a valid string between 8 and 100 characters');
    }

    // Validate field lengths
    if (eventType && (typeof eventType !== 'string' || eventType.length > 50)) {
        errors.push('Event type must be a valid string up to 50 characters');
    }

    if (eventCategory && (typeof eventCategory !== 'string' || eventCategory.length > 50)) {
        errors.push('Event category must be a valid string up to 50 characters');
    }

    if (eventAction && (typeof eventAction !== 'string' || eventAction.length > 50)) {
        errors.push('Event action must be a valid string up to 50 characters');
    }

    // For pageview events, validate pagePath
    if (eventType === 'pageview' && !pagePath) {
        errors.push('Page path is required for pageview events');
    }

    if (pagePath && (typeof pagePath !== 'string' || pagePath.length > 500)) {
        errors.push('Page path must be a valid string up to 500 characters');
    }

    // Return validation errors
    if (errors.length > 0) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', errors.join(', '))
        );
    }

    next();
};

module.exports = {
    validateTrackVisitor,
    validateTrackEvent
};