/**
 * Validation Middleware
 * Validates request data for profile-related endpoints
 */

const { formatError } = require('../../../shared/utils/response-formatter');
const { BAD_REQUEST } = require('../../../shared/utils/http-status');

/**
 * Validate profile data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateProfile = (req, res, next) => {
    const errors = [];
    const {
        title,
        bio,
        website,
        github,
        linkedin,
        twitter
    } = req.body;

    // Validate website URL if provided
    if (website && !isValidUrl(website)) {
        errors.push('Website must be a valid URL');
    }

    // Validate social media handles if provided
    if (github && github.length > 39) {
        errors.push('GitHub username cannot exceed 39 characters');
    }

    if (linkedin && linkedin.length > 100) {
        errors.push('LinkedIn username/URL is too long');
    }

    if (twitter && twitter.length > 15) {
        errors.push('Twitter username cannot exceed 15 characters');
    }

    // Validate text lengths
    if (title && title.length > 100) {
        errors.push('Title cannot exceed 100 characters');
    }

    if (bio && bio.length > 1000) {
        errors.push('Bio cannot exceed 1000 characters');
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
 * Validate skill data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateSkill = (req, res, next) => {
    const errors = [];
    const { name, level, category, yearsOfExperience } = req.body;

    // Validate required fields
    if (!name) {
        errors.push('Skill name is required');
    }

    // Validate skill name length
    if (name && name.length > 20) {
        errors.push('Skill name cannot exceed 20 characters');
    }

    // Validate skill level if provided
    if (level && !['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(level)) {
        errors.push('Skill level must be Beginner, Intermediate, Advanced, or Expert');
    }

    // Validate category length if provided
    if (category && category.length > 50) {
        errors.push('Category cannot exceed 50 characters');
    }

    // Validate years of experience if provided
    if (yearsOfExperience !== undefined) {
        if (isNaN(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 99) {
            errors.push('Years of experience must be a number between 0 and 99');
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
 * Validate experience data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateExperience = (req, res, next) => {
    const errors = [];
    const {
        title,
        company,
        location,
        startDate,
        endDate,
        isCurrentPosition,
        description,
        employmentType
    } = req.body;

    // Validate required fields
    if (!title) {
        errors.push('Job title is required');
    }

    if (!company) {
        errors.push('Company name is required');
    }

    if (!startDate) {
        errors.push('Start date is required');
    }

    // Validate text lengths
    if (title && title.length > 100) {
        errors.push('Job title cannot exceed 100 characters');
    }

    if (company && company.length > 100) {
        errors.push('Company name cannot exceed 100 characters');
    }

    if (location && location.length > 100) {
        errors.push('Location cannot exceed 100 characters');
    }

    if (description && description.length > 2000) {
        errors.push('Description cannot exceed 2000 characters');
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

    // Validate current position logic
    if (isCurrentPosition === true && endDate) {
        errors.push('Current positions cannot have an end date');
    }

    if (isCurrentPosition === false && !endDate) {
        errors.push('End date is required for past positions');
    }

    // Validate employment type if provided
    const validEmploymentTypes = [
        'Full-time',
        'Part-time',
        'Contract',
        'Freelance',
        'Internship',
        'Apprenticeship',
        'Volunteer'
    ];

    if (employmentType && !validEmploymentTypes.includes(employmentType)) {
        errors.push(`Employment type must be one of: ${validEmploymentTypes.join(', ')}`);
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
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date to validate
 * @returns {boolean} - True if date is valid
 */
const isValidDate = (date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const d = new Date(date);

    // Check if date is valid and not NaN
    if (isNaN(d.getTime())) {
        return false;
    }

    // Convert back to string to check format match
    const year = d.getFullYear().toString();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}` === date;
};

module.exports = {
    validateProfile,
    validateSkill,
    validateExperience
};