/**
 * Authentication Middleware
 * Validates JWT tokens and manages authorization
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const { formatError } = require('../../../shared/utils/response-formatter');
const { UNAUTHORIZED, FORBIDDEN } = require('../../../shared/utils/http-status');

// Cache for JWKS (JSON Web Key Set)
let jwksCache = null;
let jwksCacheTime = null;
const JWKS_CACHE_TTL = 3600000; // 1 hour

/**
 * Fetch JWKS from auth service
 * @returns {Promise<Object>} - JWKS response
 */
const fetchJwks = async () => {
    try {
        // Use cached JWKS if available and not expired
        const now = Date.now();
        if (jwksCache && jwksCacheTime && (now - jwksCacheTime < JWKS_CACHE_TTL)) {
            return jwksCache;
        }

        // Fetch JWKS from auth service
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
        const response = await axios.get(`${authServiceUrl}/.well-known/jwks.json`);

        // Cache the response
        jwksCache = response.data;
        jwksCacheTime = now;

        return response.data;
    } catch (error) {
        console.error('Error fetching JWKS:', error.message);
        throw new Error('Unable to fetch JWKS');
    }
};

/**
 * Get public key from JWKS
 * @param {string} kid - Key ID from token header
 * @returns {Promise<string>} - Public key
 */
const getPublicKey = async (kid) => {
    try {
        const jwks = await fetchJwks();

        // Find the key with matching kid
        const key = jwks.keys.find(k => k.kid === kid);

        if (!key) {
            throw new Error('No matching key found in JWKS');
        }

        // Convert JWK to PEM format
        // This is a simplified version; in production, use a library like jwk-to-pem
        const publicKey = `-----BEGIN PUBLIC KEY-----\n${key.n}\n-----END PUBLIC KEY-----`;

        return publicKey;
    } catch (error) {
        console.error('Error getting public key:', error.message);
        throw new Error('Unable to retrieve public key for token verification');
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
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} - Decoded token payload
 */
const verifyToken = async (token) => {
    try {
        // Decode token header to get key ID (kid)
        const decoded = jwt.decode(token, { complete: true });

        if (!decoded || !decoded.header || !decoded.header.kid) {
            throw new Error('Invalid token format');
        }

        // Get public key using key ID
        const publicKey = await getPublicKey(decoded.header.kid);

        // Verify token
        return jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: process.env.TOKEN_ISSUER || 'portfolio-api',
            audience: process.env.TOKEN_AUDIENCE || 'portfolio-client'
        });
    } catch (error) {
        console.error('Token verification error:', error.message);
        throw new Error('Invalid token');
    }
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
                return res.status(UNAUTHORIZED).json(
                    formatError('Authentication required', 'No token provided')
                );
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
                name: decoded.name || decoded.email,
                roles: decoded.roles || [],
                permissions: decoded.permissions || []
            };

            next();
        } catch (error) {
            if (required) {
                return res.status(UNAUTHORIZED).json(
                    formatError('Authentication failed', error.message)
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
 * @returns {Function} - Express middleware function
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
 * @returns {Function} - Express middleware function
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