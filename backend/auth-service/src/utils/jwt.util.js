/**
 * JWT Utility Functions
 * Handles token generation, validation, and management
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const config = require('../config/auth.config');

// Convert callbacks to promises
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Cache for keys
let privateKey = null;
let publicKey = null;

/**
 * Read key files or generate new ones if they don't exist
 * @returns {Promise<Object>} Object containing private and public keys
 */
const getKeyPair = async () => {
    // Use cached keys if available
    if (privateKey && publicKey) {
        return { privateKey, publicKey };
    }

    try {
        // Try to read existing keys
        const privKeyPath = path.resolve(config.jwt.privateKeyPath);
        const pubKeyPath = path.resolve(config.jwt.publicKeyPath);

        // Check if key files exist
        if (fs.existsSync(privKeyPath) && fs.existsSync(pubKeyPath)) {
            privateKey = await readFileAsync(privKeyPath, 'utf8');
            publicKey = await readFileAsync(pubKeyPath, 'utf8');
        } else {
            // Generate new key pair if files don't exist
            console.log('Key files not found, generating new RSA key pair...');
            const { generateKeyPairSync } = require('crypto');

            // Create directory if it doesn't exist
            const keyDir = path.dirname(privKeyPath);
            if (!fs.existsSync(keyDir)) {
                fs.mkdirSync(keyDir, { recursive: true });
            }

            // Generate key pair
            const { privateKey: newPrivateKey, publicKey: newPublicKey } = generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            // Save keys to files
            await writeFileAsync(privKeyPath, newPrivateKey);
            await writeFileAsync(pubKeyPath, newPublicKey);

            privateKey = newPrivateKey;
            publicKey = newPublicKey;
        }

        return { privateKey, publicKey };
    } catch (error) {
        console.error('Error getting key pair:', error);
        throw new Error('Failed to get JWT key pair');
    }
};

/**
 * Generate access and refresh tokens for a user
 * @param {Object} user - User object
 * @returns {Promise<Object>} Object containing access and refresh tokens
 */
const generateTokens = async (user) => {
    try {
        const { privateKey } = await getKeyPair();

        // Prepare user permissions from roles
        const permissions = user.getPermissions();

        // Create access token payload
        const accessPayload = {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            permissions,
            type: 'access'
        };

        // Create refresh token payload
        const refreshPayload = {
            sub: user.id,
            type: 'refresh'
        };

        // Sign tokens
        const accessToken = jwt.sign(accessPayload, privateKey, {
            algorithm: config.jwt.algorithm,
            expiresIn: config.jwt.accessExpiresIn,
            issuer: config.jwt.issuer,
            audience: config.jwt.audience
        });

        const refreshToken = jwt.sign(refreshPayload, privateKey, {
            algorithm: config.jwt.algorithm,
            expiresIn: config.jwt.refreshExpiresIn,
            issuer: config.jwt.issuer,
            audience: config.jwt.audience
        });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error('Error generating tokens:', error);
        throw new Error('Failed to generate authentication tokens');
    }
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @param {string} type - Token type (access or refresh)
 * @returns {Promise<Object>} Decoded token payload
 */
const verifyToken = async (token, type = 'access') => {
    try {
        const { publicKey } = await getKeyPair();

        // Verify token
        const decoded = jwt.verify(token, publicKey, {
            algorithms: [config.jwt.algorithm],
            issuer: config.jwt.issuer,
            audience: config.jwt.audience
        });

        // Verify token type
        if (decoded.type !== type) {
            throw new Error(`Invalid token type: expected ${type}, got ${decoded.type}`);
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else {
            throw error;
        }
    }
};

/**
 * Get public key for token verification
 * @returns {Promise<string>} Public key
 */
const getPublicKey = async () => {
    const { publicKey } = await getKeyPair();
    return publicKey;
};

module.exports = {
    generateTokens,
    verifyToken,
    getPublicKey
};