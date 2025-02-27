/**
 * Profile Controller
 * Handles user profile CRUD operations
 */

const Profile = require('../models/profile.model');
const Skill = require('../models/skill.model');
const Experience = require('../models/experience.model');
const { publishEvent } = require('../events/profile-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Create a new profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if profile already exists for user
        const existingProfile = await Profile.findOne({
            where: { userId }
        });

        if (existingProfile) {
            return res.status(BAD_REQUEST).json(
                formatError('Profile Error', 'Profile already exists for this user')
            );
        }

        // Extract profile data from request body
        const {
            title,
            bio,
            location,
            website,
            github,
            linkedin,
            twitter,
            avatar,
            resumeUrl,
            isAvailableForHire
        } = req.body;

        // Create new profile
        const profile = await Profile.create({
            userId,
            title,
            bio,
            location,
            website,
            github,
            linkedin,
            twitter,
            avatar,
            resumeUrl,
            isAvailableForHire: isAvailableForHire || false
        });

        // Publish profile created event
        publishEvent('profile.created', {
            userId,
            profileId: profile.id,
            title: profile.title
        });

        return res.status(CREATED).json(
            formatResponse('Profile created successfully', { profile })
        );
    } catch (error) {
        console.error('Create profile error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Profile Error', error.message)
        );
    }
};

/**
 * Get user's own profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getOwnProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find profile with related data
        const profile = await Profile.findOne({
            where: { userId },
            include: [
                {
                    model: Skill,
                    as: 'skills'
                },
                {
                    model: Experience,
                    as: 'experiences',
                    order: [['startDate', 'DESC']]
                }
            ]
        });

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        return res.status(OK).json(
            formatResponse('Profile retrieved successfully', { profile })
        );
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Profile Error', error.message)
        );
    }
};

/**
 * Get profile by ID (public)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProfileById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find profile with related data
        const profile = await Profile.findByPk(id, {
            include: [
                {
                    model: Skill,
                    as: 'skills'
                },
                {
                    model: Experience,
                    as: 'experiences',
                    order: [['startDate', 'DESC']]
                }
            ]
        });

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        return res.status(OK).json(
            formatResponse('Profile retrieved successfully', { profile })
        );
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Profile Error', error.message)
        );
    }
};

/**
 * Get all profiles (public)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllProfiles = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Find all profiles with pagination
        const { count, rows: profiles } = await Profile.findAndCountAll({
            include: [{
                model: Skill,
                as: 'skills',
                attributes: ['id', 'name', 'level']
            }],
            limit,
            offset,
            order: [['updatedAt', 'DESC']]
        });

        // Calculate pagination info
        const totalPages = Math.ceil(count / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return res.status(OK).json(
            formatResponse('Profiles retrieved successfully', {
                profiles,
                pagination: {
                    page,
                    limit,
                    totalItems: count,
                    totalPages,
                    hasNext,
                    hasPrev
                }
            })
        );
    } catch (error) {
        console.error('Get all profiles error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Profile Error', error.message)
        );
    }
};

/**
 * Update user's own profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfile = async (req, res) => {
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

        // Extract profile data from request body
        const {
            title,
            bio,
            location,
            website,
            github,
            linkedin,
            twitter,
            avatar,
            resumeUrl,
            isAvailableForHire
        } = req.body;

        // Update profile
        const updatedProfile = await profile.update({
            title: title !== undefined ? title : profile.title,
            bio: bio !== undefined ? bio : profile.bio,
            location: location !== undefined ? location : profile.location,
            website: website !== undefined ? website : profile.website,
            github: github !== undefined ? github : profile.github,
            linkedin: linkedin !== undefined ? linkedin : profile.linkedin,
            twitter: twitter !== undefined ? twitter : profile.twitter,
            avatar: avatar !== undefined ? avatar : profile.avatar,
            resumeUrl: resumeUrl !== undefined ? resumeUrl : profile.resumeUrl,
            isAvailableForHire: isAvailableForHire !== undefined ? isAvailableForHire : profile.isAvailableForHire
        });

        // Publish profile updated event
        publishEvent('profile.updated', {
            userId,
            profileId: profile.id,
            title: updatedProfile.title
        });

        return res.status(OK).json(
            formatResponse('Profile updated successfully', { profile: updatedProfile })
        );
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Profile Error', error.message)
        );
    }
};

/**
 * Update profile by ID (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfileById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find profile
        const profile = await Profile.findByPk(id);

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        // Extract profile data from request body
        const {
            title,
            bio,
            location,
            website,
            github,
            linkedin,
            twitter,
            avatar,
            resumeUrl,
            isAvailableForHire,
            isActive
        } = req.body;

        // Update profile
        const updatedProfile = await profile.update({
            title: title !== undefined ? title : profile.title,
            bio: bio !== undefined ? bio : profile.bio,
            location: location !== undefined ? location : profile.location,
            website: website !== undefined ? website : profile.website,
            github: github !== undefined ? github : profile.github,
            linkedin: linkedin !== undefined ? linkedin : profile.linkedin,
            twitter: twitter !== undefined ? twitter : profile.twitter,
            avatar: avatar !== undefined ? avatar : profile.avatar,
            resumeUrl: resumeUrl !== undefined ? resumeUrl : profile.resumeUrl,
            isAvailableForHire: isAvailableForHire !== undefined ? isAvailableForHire : profile.isAvailableForHire,
            isActive: isActive !== undefined ? isActive : profile.isActive
        });

        // Publish profile updated event
        publishEvent('profile.updated.admin', {
            profileId: profile.id,
            userId: profile.userId,
            title: updatedProfile.title,
            adminId: req.user.id
        });

        return res.status(OK).json(
            formatResponse('Profile updated successfully', { profile: updatedProfile })
        );
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Profile Error', error.message)
        );
    }
};

/**
 * Delete profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteProfile = async (req, res) => {
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

        const profileId = profile.id;

        // Delete profile (soft delete)
        await profile.destroy();

        // Publish profile deleted event
        publishEvent('profile.deleted', {
            userId,
            profileId
        });

        return res.status(OK).json(
            formatResponse('Profile deleted successfully')
        );
    } catch (error) {
        console.error('Delete profile error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Profile Error', error.message)
        );
    }
};

/**
 * Delete profile by ID (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteProfileById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find profile
        const profile = await Profile.findByPk(id);

        if (!profile) {
            return res.status(NOT_FOUND).json(
                formatError('Profile Error', 'Profile not found')
            );
        }

        const userId = profile.userId;
        const profileId = profile.id;

        // Delete profile (soft delete)
        await profile.destroy();

        // Publish profile deleted event
        publishEvent('profile.deleted.admin', {
            userId,
            profileId,
            adminId: req.user.id
        });

        return res.status(OK).json(
            formatResponse('Profile deleted successfully')
        );
    } catch (error) {
        console.error('Delete profile error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Profile Error', error.message)
        );
    }
};

module.exports = {
    createProfile,
    getOwnProfile,
    getProfileById,
    getAllProfiles,
    updateProfile,
    updateProfileById,
    deleteProfile,
    deleteProfileById
};