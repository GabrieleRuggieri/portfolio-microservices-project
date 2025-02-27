/**
 * Authentication Middleware
 * Validates JWT tokens and enforces authentication rules
 */

const jwt = require('jsonwebtoken');
const JwksClient = require('jwks-rsa');
const config = require('../config/gateway.config');
const { formatError } = require('../../../shared/utils/response-formatter');
const { UNAUTHORIZED, FORBIDDEN } = require('../../../shared/utils/http-status');

// JWKS client for verifying JWT signatures
const jwksClient = new JwksClient({
    jwksUri: config.auth.jwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000 // 10 minutes
});

/**
 * Get signing key for JWT verification
 * @param {string} kid - Key ID from token header
 * @returns {Promise<Object>} - Signing key
 */
const getSigningKey = async (kid) => {
    try {
        const key = await jwksClient.getSigningKey(kid);
        return key.getPublicKey();
    } catch (error) {
        console.error('Error retrieving signing key:', error);
        throw new Error('Unable to retrieve signing key');
    }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} - Decoded token payload
 */
const verifyToken = async (token) => {
    try {
        // Extract token header to get key ID (kid)
        const decodedToken = jwt.decode(token, { complete: true });

        if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
            throw new Error('Invalid token format');
        }

        // Get signing key using key ID
        const signingKey = await getSigningKey(decodedToken.header.kid);

        // Verify token with retrieved key
        return jwt.verify(token, signingKey, {
            algorithms: config.auth.algorithms,
            issuer: config.auth.issuer,
            audience: config.auth.audience
        });
    } catch (error) {
        console.error('Token verification error:', error.message);
        throw new Error(error.message || 'Invalid token');
    }
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {string|null} - JWT token or null if not found
 */
const extractToken = (req) => {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check for token in cookies
    if (req.cookies && req.cookies[config.auth.tokenCookieName]) {
        return req.cookies[config.auth.tokenCookieName];
    }

    // Check for token in query parameter (less secure, consider removing in production)
    if (req.query && req.query.token) {
        return req.query.token;
    }

    return null;
};

/**
 * Authentication middleware
 * @param {boolean} required - Whether authentication is required for the route
 * @returns {Function} - Express middleware function
 */
const authenticate = (required = true) => {
    return async (req, res, next) => {
        try {
            const token = extractToken(req);

            // If no token found and auth is required
            if (!token && required) {
                return res.status(UNAUTHORIZED).json(formatError('Authentication required', 'No token provided'));
            }

            // If no token and auth is optional, continue
            if (!token && !required) {
                req.user = null;
                return next();
            }

            // Verify token and set user in request
            const decoded = await verifyToken(token);
            req.user = {
                id: decoded.sub,
                email: decoded.email,
                roles: decoded.roles || [],
                permissions: decoded.permissions || []
            };

            next();
        } catch (error) {
            if (required) {
                return res.status(UNAUTHORIZED).json(formatError('Authentication failed', error.message));
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
 * @returns {Function} - Express middleware function
 */
const hasRole = (roles) => {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    return (req, res, next) => {
        // Must be authenticated first
        if (!req.user) {
            return res.status(UNAUTHORIZED).json(formatError('Authentication required', 'User not authenticated'));
        }

        // Check if user has at least one of the required roles
        const hasRequiredRole = requiredRoles.some(role => req.user.roles.includes(role));

        if (!hasRequiredRole) {
            return res.status(FORBIDDEN).json(formatError('Access denied', 'Insufficient permissions'));
        }

        next();
    };
};

/**
 * Permission-based access control middleware
 * @param {string|string[]} permissions - Required permission(s) for access
 * @returns {Function} - Express middleware function
 */
const hasPermission = (permissions) => {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    return (req, res, next) => {
        // Must be authenticated first
        if (!req.user) {
            return res.status(UNAUTHORIZED).json(formatError('Authentication required', 'User not authenticated'));
        }

        // Check if user has all required permissions
        const hasRequiredPermissions = requiredPermissions.every(permission =>
            req.user.permissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
            return res.status(FORBIDDEN).json(formatError('Access denied', 'Insufficient permissions'));
        }

        next();
    };
};

module.exports = {
    authenticate,
    hasRole,
    hasPermission
};