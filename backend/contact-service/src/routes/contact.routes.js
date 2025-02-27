/**
 * Contact Routes
 * Defines API endpoints for contact-related operations
 */

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { authenticate, hasRole } = require('../middleware/auth.middleware');
const { validateMessage, validateReply } = require('../middleware/validation.middleware');
const { rateLimiter } = require('../middleware/rate-limiter.middleware');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'contact-service',
        timestamp: new Date().toISOString()
    });
});

// Public contact form endpoint (with rate limiting)
router.post('/messages', validateMessage, rateLimiter, contactController.createMessage);

// Admin routes (require authentication)
router.get('/messages', authenticate(), hasRole('admin'), contactController.getAllMessages);
router.get('/messages/stats', authenticate(), hasRole('admin'), contactController.getDashboardStats);
router.get('/messages/:id', authenticate(), hasRole('admin'), contactController.getMessageById);
router.put('/messages/:id', authenticate(), hasRole('admin'), contactController.updateMessage);
router.delete('/messages/:id', authenticate(), hasRole('admin'), contactController.deleteMessage);
router.post('/messages/:id/reply', authenticate(), hasRole('admin'), validateReply, contactController.replyToMessage);

module.exports = router;