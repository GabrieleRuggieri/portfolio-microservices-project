/**
 * Spam Utility
 * Provides basic spam detection functionality for contact messages
 */

// Common spam keywords and patterns
const SPAM_KEYWORDS = [
    'viagra', 'cialis', 'casino', 'lottery', 'winner', 'free money',
    'debt consolidation', 'cash advance', 'online pharmacy', 'cheap prescription',
    'replica watches', 'luxury watches', 'enlargement', 'weight loss',
    'earn money', 'make money', 'earn extra', 'work from home', 'investment opportunity',
    'cryptocurrency investment', 'bitcoin investment', 'seo services',
    'bulk email', 'targeted email', 'marketing services', 'link building'
];

// Suspicious patterns (regex)
const SUSPICIOUS_PATTERNS = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Multiple emails
    /https?:\/\//gi, // Multiple URLs
    /\+\d{10,}/g, // Phone number format
    /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g, // Credit card pattern
    /\[url=/i, // BBCode
    /<a\s+href/i // HTML links
];

/**
 * Check if content matches spam keywords
 * @param {string} content - Text to check
 * @returns {boolean} True if content contains spam keywords
 */
const containsSpamKeywords = (content) => {
    const lowerContent = content.toLowerCase();
    return SPAM_KEYWORDS.some(keyword => lowerContent.includes(keyword.toLowerCase()));
};

/**
 * Check if content matches suspicious patterns
 * @param {string} content - Text to check
 * @returns {boolean} True if content contains suspicious patterns
 */
const containsSuspiciousPatterns = (content) => {
    // Count URL occurrences
    const urlMatches = (content.match(/https?:\/\//gi) || []).length;
    if (urlMatches > 2) {
        return true;
    }

    // Check for other suspicious patterns
    return SUSPICIOUS_PATTERNS.some(pattern => {
        const matches = content.match(pattern) || [];
        return matches.length > 0;
    });
};

/**
 * Calculate spam score
 * @param {Object} data - Message data
 * @returns {number} Spam score (0-100)
 */
const calculateSpamScore = (data) => {
    let score = 0;

    // Check name
    if (!data.name || data.name.length < 2) {
        score += 10;
    }

    // Check message length
    if (!data.message || data.message.length < 10) {
        score += 20;
    } else if (data.message.length > 5000) {
        score += 15;
    }

    // Check for spam keywords
    if (containsSpamKeywords(data.message)) {
        score += 30;
    }

    // Check for suspicious patterns
    if (containsSuspiciousPatterns(data.message)) {
        score += 25;
    }

    // Check name and message similarity (copy-paste spam)
    if (data.name && data.message && data.message.includes(data.name)) {
        score += 5;
    }

    // Check for excessive capitalization
    const upperCaseRatio = (data.message.match(/[A-Z]/g) || []).length / data.message.length;
    if (upperCaseRatio > 0.3) {
        score += 10;
    }

    return Math.min(score, 100);
};

/**
 * Check if a message is spam
 * @param {Object} data - Message data
 * @returns {Promise<Object>} Result with isSpam flag and score
 */
const checkSpam = async (data) => {
    // Calculate basic spam score
    const score = calculateSpamScore(data);

    // Determine if message is spam based on score
    const isSpam = score >= 60;

    // Return result
    return {
        isSpam,
        score,
        reasons: score >= 60 ? ['High spam score'] : []
    };
};

module.exports = {
    checkSpam
};