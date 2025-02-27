/**
 * Validation Middleware
 * Validates event publishing requests
 */

const { formatError } = require('../../../shared/utils/response-formatter');
const { BAD_REQUEST } = require('../../../shared/utils/http-status');

// List of valid event topics
const VALID_TOPICS = [
    'profile-events',
    'project-events',
    'blog-events',
    'contact-events',
    'analytics-events'
];

// List of valid event types for each topic
const VALID_EVENT_TYPES = {
    'profile-events': [
        'PROFILE_CREATED',
        'PROFILE_UPDATED',
        'SKILL_ADDED',
        'SKILL_REMOVED'
    ],
    'project-events': [
        'PROJECT_CREATED',
        'PROJECT_UPDATED',
        'TECHNOLOGY_ADDED',
        'PROJECT_DELETED'
    ],
    'blog-events': [
        'ARTICLE_CREATED',
        'ARTICLE_UPDATED',
        'COMMENT_ADDED',
        'ARTICLE_DELETED'
    ],
    'contact-events': [
        'MESSAGE_RECEIVED',
        'MESSAGE_REPLIED',
        'MESSAGE_STATUS_UPDATED'
    ],
    'analytics-events': [
        'PAGE_VIEW',
        'USER_INTERACTION',
        'VISITOR_TRACKED'
    ]
};

/**
 * Validate event publishing request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateEventPublish = (req, res, next) => {
    const errors = [];
    const { topic, message } = req.body;

    // Validate topic
    if (!topic) {
        errors.push('Topic is required');
    } else if (!VALID_TOPICS.includes(topic)) {
        errors.push(`Invalid topic. Allowed topics are: ${VALID_TOPICS.join(', ')}`);
    }

    // Validate message
    if (!message) {
        errors.push('Message is required');
    } else {
        // Validate message structure
        if (!message.type) {
            errors.push('Event type is required');
        } else {
            // Validate event type for specific topic
            const validEventTypesForTopic = VALID_EVENT_TYPES[topic] || [];
            if (!validEventTypesForTopic.includes(message.type)) {
                errors.push(`Invalid event type for topic ${topic}. Allowed types are: ${validEventTypesForTopic.join(', ')}`);
            }
        }

        // Validate payload
        if (!message.payload) {
            errors.push('Event payload is required');
        } else if (typeof message.payload !== 'object') {
            errors.push('Event payload must be an object');
        }
    }

    // Optional: Additional validation for payload size
    if (message && message.payload) {
        const payloadSize = JSON.stringify(message.payload).length;
        if (payloadSize > 10000) { // 10KB limit
            errors.push('Event payload is too large. Maximum size is 10KB');
        }
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
 * Validate event consumption request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateEventConsume = (req, res, next) => {
    const errors = [];
    const { topic, consumerGroup } = req.body;

    // Validate topic
    if (!topic) {
        errors.push('Topic is required for consumption');
    } else if (!VALID_TOPICS.includes(topic)) {
        errors.push(`Invalid topic. Allowed topics are: ${VALID_TOPICS.join(', ')}`);
    }

    // Validate consumer group
    if (!consumerGroup) {
        errors.push('Consumer group is required');
    } else if (typeof consumerGroup !== 'string') {
        errors.push('Consumer group must be a string');
    } else if (consumerGroup.length < 3 || consumerGroup.length > 50) {
        errors.push('Consumer group must be between 3 and 50 characters');
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
    validateEventPublish,
    validateEventConsume,
    VALID_TOPICS,
    VALID_EVENT_TYPES
};