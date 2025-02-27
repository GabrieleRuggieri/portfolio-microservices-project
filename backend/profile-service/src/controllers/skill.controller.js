/**
 * Skill Controller
 * Handles operations related to user skills
 */

const Profile = require('../models/profile.model');
const Skill = require('../models/skill.model');
const { publishEvent } = require('../events/profile-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, UNAUTHORIZED } = require('../../../shared/utils/http-status');

/**
 * Add a skill to user's profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addSkill = async (req, res) => {
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

        // Extract skill data
        const { name, level, category, yearsOfExperience } = req.body;

        // Check if skill already exists for this profile
        const existingSkill = await Skill.findOne({
            where: {
                profileId: profile.id,
                name
            }
        });

        if (existingSkill) {
            return res.status(BAD_REQUEST).json(
                formatError('Skill Error', 'Skill already exists for this profile')
            );
        }

        // Create skill
        const skill = await Skill.create({
            profileId: profile.id,
            name,
            level: level || 'Intermediate',
            category: category || 'Other',
            yearsOfExperience: yearsOfExperience || 0
        });

        // Publish skill added event
        publishEvent('skill.added', {
            userId,
            profileId: profile.id,
            skillId: skill.id,
            skillName: skill.name
        });

        return res.status(CREATED).json(
            formatResponse('Skill added successfully', { skill })
        );
    } catch (error) {
        console.error('Add skill error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Skill Error', error.message)
        );
    }
};

/**
 * Get all skills for user's profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSkills = async (req, res) => {
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

        // Get skills
        const skills = await Skill.findAll({
            where: { profileId: profile.id },
            order: [['level', 'DESC'], ['name', 'ASC']]
        });

        return res.status(OK).json(
            formatResponse('Skills retrieved successfully', { skills })
        );
    } catch (error) {
        console.error('Get skills error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Skill Error', error.message)
        );
    }
};

/**
 * Get skill by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSkillById = async (req, res) => {
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

        // Get skill
        const skill = await Skill.findOne({
            where: {
                id,
                profileId: profile.id
            }
        });

        if (!skill) {
            return res.status(NOT_FOUND).json(
                formatError('Skill Error', 'Skill not found')
            );
        }

        return res.status(OK).json(
            formatResponse('Skill retrieved successfully', { skill })
        );
    } catch (error) {
        console.error('Get skill error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Skill Error', error.message)
        );
    }
};

/**
 * Update skill
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSkill = async (req, res) => {
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

        // Find skill
        const skill = await Skill.findOne({
            where: {
                id,
                profileId: profile.id
            }
        });

        if (!skill) {
            return res.status(NOT_FOUND).json(
                formatError('Skill Error', 'Skill not found')
            );
        }

        // Extract skill data
        const { name, level, category, yearsOfExperience } = req.body;

        // Update skill
        const updatedSkill = await skill.update({
            name: name !== undefined ? name : skill.name,
            level: level !== undefined ? level : skill.level,
            category: category !== undefined ? category : skill.category,
            yearsOfExperience: yearsOfExperience !== undefined ? yearsOfExperience : skill.yearsOfExperience
        });

        // Publish skill updated event
        publishEvent('skill.updated', {
            userId,
            profileId: profile.id,
            skillId: skill.id,
            skillName: updatedSkill.name
        });

        return res.status(OK).json(
            formatResponse('Skill updated successfully', { skill: updatedSkill })
        );
    } catch (error) {
        console.error('Update skill error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Skill Error', error.message)
        );
    }
};

/**
 * Delete skill
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSkill = async (req, res) => {
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

        // Find skill
        const skill = await Skill.findOne({
            where: {
                id,
                profileId: profile.id
            }
        });

        if (!skill) {
            return res.status(NOT_FOUND).json(
                formatError('Skill Error', 'Skill not found')
            );
        }

        const skillName = skill.name;
        const skillId = skill.id;

        // Delete skill
        await skill.destroy();

        // Publish skill deleted event
        publishEvent('skill.deleted', {
            userId,
            profileId: profile.id,
            skillId,
            skillName
        });

        return res.status(OK).json(
            formatResponse('Skill deleted successfully')
        );
    } catch (error) {
        console.error('Delete skill error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Skill Error', error.message)
        );
    }
};

/**
 * Bulk add skills to profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkAddSkills = async (req, res) => {
    try {
        const userId = req.user.id;
        const { skills } = req.body;

        if (!Array.isArray(skills) || skills.length === 0) {
            return res.status(BAD_REQUEST).json(
                formatError('Skill Error', 'Skills must be a non-empty array')
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

        // Get existing skill names
        const existingSkills = await Skill.findAll({
            where: { profileId: profile.id },
            attributes: ['name']
        });

        const existingSkillNames = existingSkills.map(s => s.name.toLowerCase());

        // Filter out existing skills
        const newSkills = skills.filter(s => !existingSkillNames.includes(s.name.toLowerCase()));

        if (newSkills.length === 0) {
            return res.status(BAD_REQUEST).json(
                formatError('Skill Error', 'All skills already exist for this profile')
            );
        }

        // Prepare skills for bulk insertion
        const skillsToCreate = newSkills.map(s => ({
            profileId: profile.id,
            name: s.name,
            level: s.level || 'Intermediate',
            category: s.category || 'Other',
            yearsOfExperience: s.yearsOfExperience || 0
        }));

        // Bulk create skills
        const createdSkills = await Skill.bulkCreate(skillsToCreate);

        // Publish skills added event
        publishEvent('skills.bulk.added', {
            userId,
            profileId: profile.id,
            count: createdSkills.length
        });

        return res.status(CREATED).json(
            formatResponse('Skills added successfully', {
                skills: createdSkills,
                added: createdSkills.length,
                total: skills.length
            })
        );
    } catch (error) {
        console.error('Bulk add skills error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Skill Error', error.message)
        );
    }
};

module.exports = {
    addSkill,
    getSkills,
    getSkillById,
    updateSkill,
    deleteSkill,
    bulkAddSkills
};