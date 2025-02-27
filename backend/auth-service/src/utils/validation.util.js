/**
 * Validation Utility Functions
 * Contains various validation functions for form inputs
 */

const config = require('../config/auth.config');

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
const validateEmail = (email) => {
    if (!email) return false;

    // Regular expression for email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Object with validation result and message
 */
const validatePassword = (password) => {
    // Check password length
    if (!password || password.length < config.password.minLength) {
        return {
            isValid: false,
            message: `Password must be at least ${config.password.minLength} characters long`
        };
    }

    const validations = [];
    let missingCriteria = [];

    // Check for uppercase letters
    if (config.password.requireUppercase) {
        const hasUppercase = /[A-Z]/.test(password);
        validations.push(hasUppercase);
        if (!hasUppercase) missingCriteria.push('uppercase letter');
    }

    // Check for lowercase letters
    if (config.password.requireLowercase) {
        const hasLowercase = /[a-z]/.test(password);
        validations.push(hasLowercase);
        if (!hasLowercase) missingCriteria.push('lowercase letter');
    }

    // Check for numbers
    if (config.password.requireNumbers) {
        const hasNumber = /\d/.test(password);
        validations.push(hasNumber);
        if (!hasNumber) missingCriteria.push('number');
    }

    // Check for special characters
    if (config.password.requireSpecialChars) {
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        validations.push(hasSpecial);
        if (!hasSpecial) missingCriteria.push('special character');
    }

    // Check if all validations passed
    const isValid = validations.every(Boolean);

    if (isValid) {
        return { isValid: true };
    } else {
        return {
            isValid: false,
            message: `Password must include at least one ${missingCriteria.join(', ')}`
        };
    }
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {Object} Object with validation result and message
 */
const validateUsername = (username) => {
    if (!username) {
        return {
            isValid: false,
            message: 'Username is required'
        };
    }

    // Username length check
    if (username.length < 3 || username.length > 30) {
        return {
            isValid: false,
            message: 'Username must be between 3 and 30 characters'
        };
    }

    // Username format check (alphanumeric, underscore, dash, dot)
    const usernameRegex = /^[a-zA-Z0-9_\-\.]+$/;
    if (!usernameRegex.test(username)) {
        return {
            isValid: false,
            message: 'Username may only contain letters, numbers, underscores, dashes, and periods'
        };
    }

    return { isValid: true };
};

/**
 * Validate name fields
 * @param {string} name - Name to validate
 * @returns {Object} Object with validation result and message
 */
const validateName = (name) => {
    if (!name) {
        return { isValid: true }; // Name is optional
    }

    // Name length check
    if (name.length < 2 || name.length > 50) {
        return {
            isValid: false,
            message: 'Name must be between 2 and 50 characters'
        };
    }

    // Allow letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name)) {
        return {
            isValid: false,
            message: 'Name may only contain letters, spaces, hyphens, and apostrophes'
        };
    }

    return { isValid: true };
};

module.exports = {
    validateEmail,
    validatePassword,
    validateUsername,
    validateName
};