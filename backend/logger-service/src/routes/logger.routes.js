/**
 * Logger Routes
 * Defines API endpoints for logging operations
 */

const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const { authenticate, hasRole } = require('../middleware/auth.middleware');
const { validateLogCreate, validateLogSearch } = require('../middleware/validation.middleware');

// Create log entry (requires authentication)
router.post('/',
    authenticate(),
    hasRole(['admin', 'system']),
    validateLogCreate,
    logController.createLog
);

// Search logs (requires authentication)
router.get('/',
    authenticate(),
    hasRole(['admin', 'system']),
    validateLogSearch,
    logController.searchLogs
);

// Get log details by ID (requires authentication)
router.get('/:id',
    authenticate(),
    hasRole(['admin', 'system']),
    logController.getLogById
);

// Delete log entry (requires authentication)
router.delete('/:id',
    authenticate(),
    hasRole(['admin', 'system']),
    logController.deleteLog
);

module.exports = router;