/**
 * Validation Middleware
 * Validates request data for project-related endpoints
 */

const { formatError } = require('../../../shared/utils/response-formatter');
const { BAD_REQUEST } = require('../../../shared/utils/http-status');

/**
 * Validate project data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateProject = (req, res, next) => {
    const errors = [];
    const {
        title,
        description,
        summary,
        demoUrl,
        githubUrl,
        startDate,
        endDate,
        isOngoing,
        teamSize
    } = req.body;

    // Validate required fields
    if (!title) {
        errors.push('Project title is required');
    }

    // Validate text lengths
    if (title && title.length > 255) {
        errors.push('Title cannot exceed 255 characters');
    }

    if (summary && summary.length > 500) {
        errors.push('Summary cannot exceed 500 characters');
    }

    // Validate URLs if provided
    if (demoUrl && !isValidUrl(demoUrl)) {
        errors.push('Demo URL must be a valid URL');
    }

    if (githubUrl && !isValidUrl(githubUrl)) {
        errors.push('GitHub URL must be a valid URL');
    }

    // Validate dates
    if (startDate && !isValidDate(startDate)) {
        errors.push('Start date must be a valid date in YYYY-MM-DD format');
    }

    if (endDate && !isValidDate(endDate)) {
        errors.push('End date must be a valid date in YYYY-MM-DD format');
    }

    // Validate date logic
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        errors.push('Start date cannot be after end date');
    }

    // Validate ongoing logic
    if (isOngoing === true && endDate) {
        errors.push('Ongoing projects cannot have an end date');
    }

    if (isOngoing === false && !endDate) {
        errors.push('End date is required for completed projects');
    }

    // Validate numeric fields
    if (teamSize !== undefined && (isNaN(teamSize) || teamSize < 1 || teamSize > 1000)) {
        errors.push('Team size must be a number between 1 and 1000');
    }

    // Return validation errors
    if (errors.length > 0) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', errors.join(', '))
        );
    }

    next();
};