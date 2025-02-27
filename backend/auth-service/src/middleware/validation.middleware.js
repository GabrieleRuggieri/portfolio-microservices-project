/**
 * Validation Middleware
 * Validates request data for authentication endpoints
 */

const { validateEmail, validatePassword, validateUsername, validateName } = require('../utils/validation.util');
const { formatError } = require('../../../shared/utils/response-formatter');
const { BAD_REQUEST } = require('../../../shared/utils/http-status');

/**
 * Validate registration request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRegistration = (req, res, next) => {
    const { username, email, password, firstName, lastName } = req.body;
    const errors = [];

    // Validate required fields
    if (!username) {
        errors.push('Username is required');
    }

    if (!email) {
        errors.push('Email is required');
    }

    if (!password) {
        errors.push('Password is required');
    }

    // Return early if required fields are missing
    if (errors.length > 0) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', errors.join(', '))
        );
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
        errors.push(usernameValidation.message);
    }

    // Validate email
    if (!validateEmail(email)) {
        errors.push('Invalid email format');
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        errors.push(passwordValidation.message);
    }

    // Validate names if provided
    if (firstName) {
        const firstNameValidation = validateName(firstName);
        if (!firstNameValidation.isValid) {
            errors.push(`First name: ${firstNameValidation.message}`);
        }
    }

    if (lastName) {
        const lastNameValidation = validateName(lastName);
        if (!lastNameValidation.isValid) {
            errors.push(`Last name: ${lastNameValidation.message}`);
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
 * Validate login request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    // Validate required fields
    if (!email) {
        errors.push('Email is required');
    }

    if (!password) {
        errors.push('Password is required');
    }

    // Return validation errors
    if (errors.length > 0) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', errors.join(', '))
        );
    }

    // Validate email format
    if (!validateEmail(email)) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', 'Invalid email format')
        );
    }

    next();
};

/**
 * Validate password reset request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validatePasswordReset = (req, res, next) => {
    const { password, confirmPassword } = req.body;
    const errors = [];

    // Validate required fields
    if (!password) {
        errors.push('Password is required');
    }

    if (!confirmPassword) {
        errors.push('Confirm password is required');
    }

    // Return early if required fields are missing
    if (errors.length > 0) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', errors.join(', '))
        );
    }

    // Validate password match
    if (password !== confirmPassword) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', 'Passwords do not match')
        );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', passwordValidation.message)
        );
    }

    next();
};

/**
 * Validate change password request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateChangePassword = (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    // Validate required fields
    if (!currentPassword) {
        errors.push('Current password is required');
    }

    if (!newPassword) {
        errors.push('New password is required');
    }

    if (!confirmPassword) {
        errors.push('Confirm password is required');
    }

    // Return early if required fields are missing
    if (errors.length > 0) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', errors.join(', '))
        );
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', 'New password and confirm password do not match')
        );
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', passwordValidation.message)
        );
    }

    // Validate that new password is different from current
    if (currentPassword === newPassword) {
        return res.status(BAD_REQUEST).json(
            formatError('Validation Error', 'New password must be different from current password')
        );
    }

    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validatePasswordReset,
    validateChangePassword
};