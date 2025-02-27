/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

const { verifyToken } = require('../utils/jwt.util');
const User = require('../models/user.model');
const { formatError } = require('../../../shared/utils/response-formatter');
const { UNAUTHORIZED, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Extract token from request headers, cookies, or query
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null if not found
 */
const extractToken = (req) => {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check for token in cookies
    if (req.cookies && req.cookies.accessToken) {
        return req.cookies.accessToken;
    }

    // Check for token in query parameter (less secure, consider removing in production)
    if (req.query && req.query.token) {
        return req.query.token;
    }

    return null;
};

/**
 * Authentication middleware
 * @param {boolean} required - Whether authentication is required
 * @returns {Function} Express middleware function
 */
const authenticate = (required = true) => {
    return async (req, res, next) => {
        try {
            const token = extractToken(req);

            // If no token and auth is required
            if (!token && required) {
                return res.status(UNAUTHORIZED).json(
                    formatError('Authentication required', 'No token provided')
                );
            }

            // If no token and auth is optional, continue
            if (!token && !required) {
                req.user = null;
                return next();
            }

            // Verify token
            const decoded = await verifyToken(token, 'access');

            // Find user
            const user = await User.findByPk(decoded.sub);

            // If user not found or inactive
            if (!user || !user.active) {
                return res.status(UNAUTHORIZED).json(
                    formatError('Authentication failed', 'User not found or inactive')
                );
            }

            // Check if account is locked
            if (user.isAccountLocked()) {
                return res.status(FORBIDDEN).json(
                    formatError('Account locked', 'Your account is temporarily locked')
                );
            }

            // If password was changed after token was issued
            if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
                return res.status(UNAUTHORIZED).json(
                    formatError('Authentication failed', 'Password was changed, please log in again')
                );
            }

            // Add user to request
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                roles: user.roles,
                permissions: user.getPermissions()
            };

            next();
        } catch (error) {
            if (required) {
                // Different response based on error type
                if (error.message === 'Token has expired') {
                    return res.status(UNAUTHORIZED).json(
                        formatError('Authentication failed', 'Token has expired')
                    );
                }

                return res.status(UNAUTHORIZED).json(
                    formatError('Authentication failed', error.message || 'Invalid token')
                );
            }

            // If auth is optional, continue without user data
            req.user = null;
            next();
        }
    };
};

/**
 * Role-based access control middleware
 * @param {string|string[]} roles - Required role(s) for access
 * @returns {Function} Express middleware function
 */
const hasRole = (roles) => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    return (req, res, next) => {
        // Must be authenticated first
        if (!req.user) {
            return res.status(UNAUTHORIZED).json(
                formatError('Authentication required', 'User not authenticated')
            );
        }

        // Check if user has at least one of the required roles
        const hasRequiredRole = requiredRoles.some(role => req.user.roles.includes(role));

        if (!hasRequiredRole) {
            return res.status(FORBIDDEN).json(
                formatError('Access denied', 'Insufficient permissions')
            );
        }

        next();
    };
};

/**
 * Permission-based access control middleware
 * @param {string|string[]} permissions - Required permission(s) for access
 * @returns {Function} Express middleware function
 */
const hasPermission = (permissions) => {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    return (req, res, next) => {
        // Must be authenticated first
        if (!req.user) {
            return res.status(UNAUTHORIZED).json(
                formatError('Authentication required', 'User not authenticated')
            );
        }

        // Check if user has all required permissions
        const hasRequiredPermissions = requiredPermissions.every(permission =>
            req.user.permissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
            return res.status(FORBIDDEN).json(
                formatError('Access denied', 'Insufficient permissions')
            );
        }

        next();
    };
};

module.exports = {
    authenticate,
    hasRole,
    hasPermission
};