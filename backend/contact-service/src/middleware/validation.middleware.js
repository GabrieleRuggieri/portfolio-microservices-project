/**
 * Validation Middleware
 * Validates request data for contact-related endpoints
 */

const { formatError } = require('../../../shared/utils/response-formatter');
const { BAD_REQUEST } = require('../../../shared/utils/http-status');

/**
 * Validate contact message data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateMessage = (req, res, next) => {
    const errors = [];
    const {
        name,
        email,
        subject,
        message
    } = req.body;

    // Validate required fields
    if (!name) {
        errors.push('Name is required');
    }

    if (!email) {
        errors.push('Email is required');
    }

    if (!subject) {
        errors.push('Subject is required');
    }

    if (!message) {
        errors.push('Message is required');
    }

    // Validate text lengths
    if (name && (name.length < 2 || name.length > 100)) {
        errors.push('Name must be between 2 and 100 characters');
    }

    if (subject && subject.length > 200) {
        errors.push('Subject cannot exceed 200 characters');
    }

    if (message && message.length < 10) {
        errors.push('Message must be at least 10 characters long');
    }

    if (message && message.length > 5000) {
        errors.push('Message cannot exceed 5000 characters');
    }

    // Validate email format
    if (email && !isValidEmail(email)) {
        errors.push('Please enter a valid email address');
    }

    // Validate optional fields
    if (req.body.phone && !isValidPhone(req.body.phone)) {
        errors.push('Please enter a valid phone number');
    }

    if (req.body.company && req.body.company.length > 100) {
        errors.push('Company name cannot exceed 100 characters');
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
 * Validate reply data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateReply = (req, res, next) => {
    const errors = [];
    const { content, internal } = req.body;

    // Validate required fields
    if (!content) {
        errors.push('Reply content is required');
    }

    // Validate text lengths
    if (content && content.length < 5) {
        errors.push('Reply must be at least 5 characters long');
    }

    if (content && content.length > 5000) {
        errors.push('Reply cannot exceed 5000 characters');
    }

    // Validate internal flag if provided
    if (internal !== undefined && typeof internal !== 'boolean') {
        errors.push('Internal flag must be a boolean value');
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
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid
 */
const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if phone number is valid
 */
const isValidPhone = (phone) => {
    // Basic phone validation (allows various formats)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
};

module.exports = {
    validateMessage,
    validateReply
};