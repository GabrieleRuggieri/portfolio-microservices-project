/**
 * Authentication Routes
 * Defines all authentication-related endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateRegistration, validateLogin, validatePasswordReset } = require('../middleware/validation.middleware');
const { rateLimiter, strictRateLimiter } = require('../middleware/rate-limiter.middleware');

// Public routes
router.post('/register', validateRegistration, rateLimiter, authController.register);
router.post('/login', validateLogin, rateLimiter, authController.login);
router.post('/refresh-token', rateLimiter, authController.refreshToken);
router.get('/verify-email/:token', rateLimiter, authController.verifyEmail);
router.post('/forgot-password', rateLimiter, authController.forgotPassword);
router.post('/reset-password/:token', validatePasswordReset, rateLimiter, authController.resetPassword);

// JWKS endpoint for token verification
router.get('/.well-known/jwks.json', authController.getJwks);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, strictRateLimiter, authController.changePassword);

// OAuth routes for third-party authentication
router.get('/google', (req, res) => {
    res.status(501).json({ message: 'Google OAuth not implemented yet' });
});
router.get('/google/callback', (req, res) => {
    res.status(501).json({ message: 'Google OAuth not implemented yet' });
});

router.get('/github', (req, res) => {
    res.status(501).json({ message: 'GitHub OAuth not implemented yet' });
});
router.get('/github/callback', (req, res) => {
    res.status(501).json({ message: 'GitHub OAuth not implemented yet' });
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'auth-service',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;