/**
 * Validation Middleware
 * Validates request data for blog-related endpoints
 */

const { formatError } = require('../../../shared/utils/response-formatter');
const { BAD_REQUEST } = require('../../../shared/utils/http-status');

/**
 * Validate article data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateArticle = (req, res, next) => {
    const errors = [];
    const {
        title,
        content,
        coverImage,
        metaTitle,
        metaDescription,
        tags
    } = req.body;

    // Validate required fields
    if (!title) {
        errors.push('Title is required');
    }

    if (!content) {
        errors.push('Content is required');
    }

    // Validate text lengths
    if (title && title.length > 255) {
        errors.push('Title cannot exceed 255 characters');
    }

    if (metaTitle && metaTitle.length > 255) {
        errors.push('Meta title cannot exceed 255 characters');
    }

    if (metaDescription && metaDescription.length > 500) {
        errors.push('Meta description cannot exceed 500 characters');
    }

    // Validate URLs if provided
    if (coverImage && !isValidUrl(coverImage)) {
        errors.push('Cover image must be a valid URL');
    }

    // Validate tags format if provided
    if (tags && typeof tags === 'string') {
        const tagsArray = tags.split(',').map(tag => tag.trim());

        // Check if any tag is too long
        const longTags = tagsArray.filter(tag => tag.length > 30);
        if (longTags.length > 0) {
            errors.push('Tags cannot exceed 30 characters each');
        }

        // Check if there are too many tags
        if (tagsArray.length > 10) {
            errors.push('Cannot have more than 10 tags');
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
 * Validate category data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateCategory = (req, res, next) => {
    const errors = [];
    const {
        name,
        description,
        color,
        icon
    } = req.body;

    // Validate required fields
    if (!name) {
        errors.push('Name is required');
    }

    // Validate text lengths
    if (name && name.length > 50) {
        errors.push('Name cannot exceed 50 characters');
    }

    if (description && description.length > 500) {
        errors.push('Description cannot exceed 500 characters');
    }

    // Validate color format if provided
    if (color && !isValidColor(color)) {
        errors.push('Color must be a valid hex color code (e.g., #FF5733)');
    }

    // Validate icon if provided
    if (icon && icon.length > 50) {
        errors.push('Icon identifier cannot exceed 50 characters');
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
 * Validate comment data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateComment = (req, res, next) => {
    const errors = [];
    const { content } = req.body;

    // Validate required fields
    if (!content) {
        errors.push('Comment content is required');
    }

    // Validate text lengths
    if (content && content.length < 2) {
        errors.push('Comment must be at least 2 characters long');
    }

    if (content && content.length > 2000) {
        errors.push('Comment cannot exceed 2000 characters');
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
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if URL is valid
 */
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Validate hex color code
 * @param {string} color - Color code to validate
 * @returns {boolean} - True if color code is valid
 */
const isValidColor = (color) => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
};

module.exports = {
    validateArticle,
    validateCategory,
    validateComment
};