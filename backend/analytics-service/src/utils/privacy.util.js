/**
 * Privacy Utility
 * Functions for handling user privacy and data protection
 */

/**
 * Anonymize an IP address by removing the last part
 * @param {string} ipAddress - IP address to anonymize
 * @returns {string} - Anonymized IP address
 */
const anonymizeIP = (ipAddress) => {
    if (!ipAddress) return null;

    try {
        // Handle IPv4 addresses
        if (ipAddress.includes('.')) {
            const parts = ipAddress.split('.');
            if (parts.length === 4) {
                // Replace last octet with 0
                return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
            }
        }

        // Handle IPv6 addresses
        if (ipAddress.includes(':')) {
            const parts = ipAddress.split(':');
            if (parts.length > 4) {
                // Replace last 3 parts with 0
                const preserved = parts.slice(0, -3);
                return `${preserved.join(':')}:0:0:0`;
            }
        }

        // If format is unrecognized, return null
        return null;
    } catch (error) {
        console.error('Error anonymizing IP:', error);
        return null;
    }
};

/**
 * Remove personal information from a string
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
const removePersonalInfo = (text) => {
    if (!text) return text;

    try {
        // Regular expressions for different types of personal information
        const patterns = [
            // Email addresses
            { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL REDACTED]' },

            // Phone numbers (various formats)
            { regex: /(\+\d{1,3}[\s\-]?)?\(?(\d{3})\)?[\s\-]?\d{3}[\s\-]?\d{4}/g, replacement: '[PHONE REDACTED]' },

            // Social security numbers (US)
            { regex: /\d{3}-\d{2}-\d{4}/g, replacement: '[SSN REDACTED]' },

            // Credit card numbers
            { regex: /\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}/g, replacement: '[CREDIT CARD REDACTED]' },

            // Addresses (simple pattern)
            { regex: /\d+\s[A-Z][a-z]+\s[A-Z][a-z]+\.?/g, replacement: '[ADDRESS REDACTED]' }
        ];

        // Apply each pattern
        let sanitized = text;
        patterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern.regex, pattern.replacement);
        });

        return sanitized;
    } catch (error) {
        console.error('Error removing personal info:', error);
        return text;
    }
};

/**
 * Clean user agent string of unnecessary details
 * @param {string} userAgent - User agent string
 * @returns {string} - Simplified user agent
 */
const simplifyUserAgent = (userAgent) => {
    if (!userAgent) return null;

    try {
        // Use a library like ua-parser-js instead for more accurate results
        // This is a simple example
        if (userAgent.includes('Firefox')) {
            return 'Firefox';
        } else if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) {
            return 'Chrome';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            return 'Safari';
        } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
            return 'Internet Explorer';
        } else if (userAgent.includes('Edge')) {
            return 'Microsoft Edge';
        } else {
            return 'Other Browser';
        }
    } catch (error) {
        console.error('Error simplifying user agent:', error);
        return null;
    }
};

module.exports = {
    anonymizeIP,
    removePersonalInfo,
    simplifyUserAgent
};