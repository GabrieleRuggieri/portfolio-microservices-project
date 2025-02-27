/**
 * Profile Routes
 * Defines API endpoints for profile-related operations
 */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const skillController = require('../controllers/skill.controller');
const experienceController = require('../controllers/experience.controller');
const { authenticate, hasRole } = require('../middleware/auth.middleware');
const { validateProfile, validateSkill, validateExperience } = require('../middleware/validation.middleware');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'profile-service',
        timestamp: new Date().toISOString()
    });
});

// Profile routes
router.post('/', authenticate, validateProfile, profileController.createProfile);
router.get('/me', authenticate, profileController.getOwnProfile);
router.get('/:id', profileController.getProfileById);
router.get('/', profileController.getAllProfiles);
router.put('/me', authenticate, validateProfile, profileController.updateProfile);
router.delete('/me', authenticate, profileController.deleteProfile);

// Admin profile routes
router.put('/:id', authenticate, hasRole('admin'), validateProfile, profileController.updateProfileById);
router.delete('/:id', authenticate, hasRole('admin'), profileController.deleteProfileById);

// Skill routes
router.post('/me/skills', authenticate, validateSkill, skillController.addSkill);
router.post('/me/skills/bulk', authenticate, skillController.bulkAddSkills);
router.get('/me/skills', authenticate, skillController.getSkills);
router.get('/me/skills/:id', authenticate, skillController.getSkillById);
router.put('/me/skills/:id', authenticate, validateSkill, skillController.updateSkill);
router.delete('/me/skills/:id', authenticate, skillController.deleteSkill);

// Experience routes
router.post('/me/experiences', authenticate, validateExperience, experienceController.addExperience);
router.post('/me/experiences/bulk', authenticate, experienceController.bulkAddExperiences);
router.get('/me/experiences', authenticate, experienceController.getExperiences);
router.get('/me/experiences/:id', authenticate, experienceController.getExperienceById);
router.put('/me/experiences/:id', authenticate, validateExperience, experienceController.updateExperience);
router.delete('/me/experiences/:id', authenticate, experienceController.deleteExperience);

module.exports = router;