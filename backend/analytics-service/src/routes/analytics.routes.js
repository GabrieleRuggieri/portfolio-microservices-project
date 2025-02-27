/**
 * Analytics Routes
 * Defines API endpoints for analytics-related operations
 */

const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitor.controller');
const metricsController = require('../controllers/metrics.controller');
const { authenticate, hasRole } = require('../middleware/auth.middleware');
const { validateTrackEvent, validateTrackVisitor } = require('../middleware/validation.middleware');
const { trackingRateLimiter } = require('../middleware/rate-limiter.middleware');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'analytics-service',
        timestamp: new Date().toISOString()
    });
});

// Tracking endpoints (public with rate limiting)
router.post('/track/visitor', validateTrackVisitor, trackingRateLimiter, visitorController.trackVisitor);
router.post('/track/event', validateTrackEvent, trackingRateLimiter, metricsController.trackEvent);

// Admin-only analytics endpoints
router.get('/visitors', authenticate(), hasRole('admin'), visitorController.getAllVisitors);
router.get('/visitors/:id', authenticate(), hasRole('admin'), visitorController.getVisitorById);
router.get('/visitors/stats', authenticate(), hasRole('admin'), visitorController.getVisitorStats);

router.get('/metrics/pageviews', authenticate(), hasRole('admin'), metricsController.getPageViewMetrics);
router.get('/metrics/events', authenticate(), hasRole('admin'), metricsController.getEventMetrics);
router.get('/metrics/dashboard', authenticate(), hasRole('admin'), metricsController.getDashboardMetrics);

module.exports = router;