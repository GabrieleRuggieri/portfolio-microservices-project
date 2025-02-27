/**
 * Project Routes
 * Defines API endpoints for project-related operations
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const technologyController = require('../controllers/technology.controller');
const { authenticate, hasRole } = require('../middleware/auth.middleware');
const { validateProject, validateTechnology } = require('../middleware/validation.middleware');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'projects-service',
        timestamp: new Date().toISOString()
    });
});

// Public project routes (no authentication required)
router.get('/', authenticate(false), projectController.getAllProjects);
router.get('/:id', authenticate(false), projectController.getProjectById);
router.get('/:projectId/technologies', authenticate(false), technologyController.getTechnologies);

// Protected project routes (authentication required)
router.post('/', authenticate(), validateProject, projectController.createProject);
router.put('/:id', authenticate(), validateProject, projectController.updateProject);
router.delete('/:id', authenticate(), projectController.deleteProject);
router.patch('/:id/publish', authenticate(), projectController.togglePublishStatus);
router.patch('/:id/pin', authenticate(), projectController.togglePinStatus);

// Technology routes
router.post('/:projectId/technologies', authenticate(), validateTechnology, technologyController.addTechnology);
router.post('/:projectId/technologies/bulk', authenticate(), technologyController.bulkAddTechnologies);
router.put('/:projectId/technologies/:techId', authenticate(), validateTechnology, technologyController.updateTechnology);
router.delete('/:projectId/technologies/:techId', authenticate(), technologyController.deleteTechnology);
router.post('/:projectId/technologies/reorder', authenticate(), technologyController.reorderTechnologies);

// Admin routes
router.get('/admin/all', authenticate(), hasRole('admin'), projectController.getAllProjects);

module.exports = router;