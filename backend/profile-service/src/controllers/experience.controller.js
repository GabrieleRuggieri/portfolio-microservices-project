/**
 * Experience Controller
 * Handles operations related to user work experiences
 */

const Profile = require('../models/profile.model');
const Experience = require('../models/experience.model');
const { publishEvent } = require('../events/profile-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, UNAUTHORIZED } = require('../../../shared/utils/http-status');

/**
 * Add a work experience to user's profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addExperience = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find profile
        const profile = await Profile.findOne({
            where: { userId }
        });

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        // Extract experience data
        const {
            title,
            company,
            location,
            startDate,
            endDate,
            description,
            isCurrentPosition,
            employmentType
        } = req.body;

        // Create experience
        const experience = await Experience.create({
            profileId: profile.id,
            title,
            company,
            location,
            startDate,
            endDate: isCurrentPosition ? null : endDate,
            description,
            isCurrentPosition: isCurrentPosition || false,
            employmentType: employmentType
        });

        // Publish experience added event
        publishEvent('experience.added', {
            userId,
            profileId: profile.id,
            experienceId: experience.id,
            title: experience.title,
            company: experience.company
        });

        return res.status(CREATED).json(
            formatResponse('Experience added successfully', { experience })
        );
    } catch (error) {
        console.error('Add experience error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Experience Error', error.message)
        );
    }
};

module.exports = {
    addExperience,
    getExperiences,
    getExperienceById,
    updateExperience,
    deleteExperience,
    bulkAddExperiences
};

/**
 * Get all experiences for user's profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getExperiences = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find profile
        const profile = await Profile.findOne({
            where: { userId }
        });

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        // Get experiences
        const experiences = await Experience.findAll({
            where: { profileId: profile.id },
            order: [
                ['isCurrentPosition', 'DESC'],
                ['startDate', 'DESC']
            ]
        });

        return res.status(OK).json(
            formatResponse('Experiences retrieved successfully', { experiences })
        );
    } catch (error) {
        console.error('Get experiences error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Experience Error', error.message)
        );
    }
};

/**
 * Get experience by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getExperienceById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Find profile
        const profile = await Profile.findOne({
            where: { userId }
        });

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        // Get experience
        const experience = await Experience.findOne({
            where: {
                id,
                profileId: profile.id
            }
        });

        if (!experience) {
            return res.status(NOT_FOUND).json(
                formatError('Experience Error', 'Experience not found')
            );
        }

        return res.status(OK).json(
            formatResponse('Experience retrieved successfully', { experience })
        );
    } catch (error) {
        console.error('Get experience error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Experience Error', error.message)
        );
    }
};

/**
 * Update experience
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateExperience = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Find profile
        const profile = await Profile.findOne({
            where: { userId }
        });

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        // Find experience
        const experience = await Experience.findOne({
            where: {
                id,
                profileId: profile.id
            }
        });

        if (!experience) {
            return res.status(NOT_FOUND).json(
                formatError('Experience Error', 'Experience not found')
            );
        }

        // Extract experience data
        const {
            title,
            company,
            location,
            startDate,
            endDate,
            description,
            isCurrentPosition,
            employmentType
        } = req.body;

        // Handle current position logic
        let updatedEndDate = endDate;
        if (isCurrentPosition !== undefined) {
            if (isCurrentPosition) {
                updatedEndDate = null;
            } else if (experience.isCurrentPosition && !endDate) {
                // If changing from current position to past position, require an end date
                return res.status(BAD_REQUEST).json(
                    formatError('Experience Error', 'End date is required for past positions')
                );
            }
        }

        // Update experience
        const updatedExperience = await experience.update({
            title: title !== undefined ? title : experience.title,
            company: company !== undefined ? company : experience.company,
            location: location !== undefined ? location : experience.location,
            startDate: startDate !== undefined ? startDate : experience.startDate,
            endDate: isCurrentPosition ? null : (updatedEndDate !== undefined ? updatedEndDate : experience.endDate),
            description: description !== undefined ? description : experience.description,
            isCurrentPosition: isCurrentPosition !== undefined ? isCurrentPosition : experience.isCurrentPosition,
            employmentType: employmentType !== undefined ? employmentType : experience.employmentType
        });

        // Publish experience updated event
        publishEvent('experience.updated', {
            userId,
            profileId: profile.id,
            experienceId: experience.id,
            title: updatedExperience.title,
            company: updatedExperience.company
        });

        return res.status(OK).json(
            formatResponse('Experience updated successfully', { experience: updatedExperience })
        );
    } catch (error) {
        console.error('Update experience error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Experience Error', error.message)
        );
    }
};

/**
 * Delete experience
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteExperience = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Find profile
        const profile = await Profile.findOne({
            where: { userId }
        });

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        // Find experience
        const experience = await Experience.findOne({
            where: {
                id,
                profileId: profile.id
            }
        });

        if (!experience) {
            return res.status(NOT_FOUND).json(
                formatError('Experience Error', 'Experience not found')
            );
        }

        // Save data for event
        const experienceId = experience.id;
        const experienceTitle = experience.title;
        const experienceCompany = experience.company;

        // Delete experience
        await experience.destroy();

        // Publish experience deleted event
        publishEvent('experience.deleted', {
            userId,
            profileId: profile.id,
            experienceId,
            title: experienceTitle,
            company: experienceCompany
        });

        return res.status(OK).json(
            formatResponse('Experience deleted successfully')
        );
    } catch (error) {
        console.error('Delete experience error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Experience Error', error.message)
        );
    }
};

/**
 * Bulk add experiences to profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkAddExperiences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { experiences } = req.body;

        if (!Array.isArray(experiences) || experiences.length === 0) {
            return res.status(BAD_REQUEST).json(
                formatError('Experience Error', 'Experiences must be a non-empty array')
            );
        }

        // Find profile
        const profile = await Profile.findOne({
            where: { userId }
        });

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        // Prepare experiences for bulk insertion
        const experiencesToCreate = experiences.map(exp => ({
            profileId: profile.id,
            title: exp.title,
            company: exp.company,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.isCurrentPosition ? null : exp.endDate,
            description: exp.description,
            isCurrentPosition: exp.isCurrentPosition || false,
            employmentType: exp.employmentType || 'Full-time'
        }));

        // Bulk create experiences
        const createdExperiences = await Experience.bulkCreate(experiencesToCreate);

        // Publish experiences added event
        publishEvent('experiences.bulk.added', {
            userId,
            profileId: profile.id,
            count: createdExperiences.length
        });

        return res.status(CREATED).json(
            formatResponse('Experiences added successfully', {
                experiences: createdExperiences,
                count: createdExperiences.length
            })
        );
    } catch (error) {
        console.error('Bulk add experiences error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Experience Error', error.message)
        );
    }
};