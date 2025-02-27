/**
 * Project Controller
 * Handles project CRUD operations
 */

const { Op } = require('sequelize');
const Project = require('../models/project.model');
const Technology = require('../models/technology.model');
const { publishEvent } = require('../events/project-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Create a new project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createProject = async (req, res) => {
    try {
        const userId = req.user.id;

        // Extract project data from request body
        const {
            title,
            description,
            summary,
            coverImage,
            demoUrl,
            githubUrl,
            startDate,
            endDate,
            isOngoing,
            isPublished,
            isPinned,
            role,
            teamSize,
            challenges,
            solutions,
            featuredImage1,
            featuredImage2,
            featuredImage3,
            technologies
        } = req.body;

        // Create new project
        const project = await Project.create({
            userId,
            title,
            description,
            summary,
            coverImage,
            demoUrl,
            githubUrl,
            startDate,
            endDate: isOngoing ? null : endDate,
            isOngoing: isOngoing || false,
            isPublished: isPublished || false,
            isPinned: isPinned || false,
            role,
            teamSize,
            challenges,
            solutions,
            featuredImage1,
            featuredImage2,
            featuredImage3
        });

        // Add technologies if provided
        if (technologies && Array.isArray(technologies) && technologies.length > 0) {
            const techData = technologies.map((tech, index) => ({
                projectId: project.id,
                name: tech.name,
                category: tech.category,
                logoUrl: tech.logoUrl,
                description: tech.description,
                version: tech.version,
                order: tech.order || index
            }));

            await Technology.bulkCreate(techData);
        }

        // Get project with technologies
        const createdProject = await Project.findByPk(project.id, {
            include: [{ model: Technology, as: 'technologies' }]
        });

        // Publish project created event
        publishEvent('project.created', {
            userId,
            projectId: project.id,
            title: project.title,
            isPublished: project.isPublished
        });

        return res.status(CREATED).json(
            formatResponse('Project created successfully', { project: createdProject })
        );
    } catch (error) {
        console.error('Create project error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Project Error', error.message)
        );
    }
};

/**
 * Get all projects (with optional filtering)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllProjects = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Filter parameters
        const { search, userId, published, tech } = req.query;

        // Build query conditions
        const where = {};

        // If user is not authenticated or if published flag is explicitly true,
        // only return published projects
        if (!req.user || (published !== 'false' && published !== '0')) {
            where.isPublished = true;
        }

        // Add search filter if provided
        if (search) {
            where[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
                { summary: { [Op.like]: `%${search}%` } }
            ];
        }

        // Add userId filter if provided
        if (userId) {
            where.userId = userId;
        } else if (req.user && req.query.own === 'true') {
            // If 'own' flag is provided, filter by the authenticated user's ID
            where.userId = req.user.id;
        }

        // Build include array for associations
        const include = [{
            model: Technology,
            as: 'technologies',
            attributes: ['id', 'name', 'category', 'logoUrl', 'version', 'order']
        }];

        // If filtering by technology, add condition
        if (tech) {
            include[0].where = { name: { [Op.like]: `%${tech}%` } };
        }

        // Get projects with count
        const { count, rows: projects } = await Project.findAndCountAll({
            where,
            include,
            distinct: true, // Required for accurate count with associations
            limit,
            offset,
            order: [
                ['isPinned', 'DESC'],
                ['order', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });

        // Calculate pagination info
        const totalPages = Math.ceil(count / limit);

        return res.status(OK).json(
            formatResponse('Projects retrieved successfully', {
                projects,
                pagination: {
                    page,
                    limit,
                    totalItems: count,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            })
        );
    } catch (error) {
        console.error('Get all projects error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Project Error', error.message)
        );
    }
};

/**
 * Get project by ID or slug
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

        // Build query condition
        const where = isUUID ? { id } : { slug: id };

        // If user is not authenticated, only return published projects
        if (!req.user) {
            where.isPublished = true;
        }

        // Find project with technologies
        const project = await Project.findOne({
            where,
            include: [{
                model: Technology,
                as: 'technologies',
                order: [['order', 'ASC']]
            }]
        });

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // If project is not published and the requester is not the owner or an admin
        if (!project.isPublished &&
            (!req.user ||
                (req.user.id !== project.userId &&
                    !req.user.roles.includes('admin')))) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found or not published')
            );
        }

        // Increment view count
        if (req.query.track !== 'false') {
            project.viewCount += 1;
            await project.save();
        }

        return res.status(OK).json(
            formatResponse('Project retrieved successfully', { project })
        );
    } catch (error) {
        console.error('Get project error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Project Error', error.message)
        );
    }
};

/**
 * Update project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find project
        const project = await Project.findByPk(id);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Project Error', 'You do not have permission to update this project')
            );
        }

        // Extract project data
        const {
            title,
            description,
            summary,
            coverImage,
            demoUrl,
            githubUrl,
            startDate,
            endDate,
            isOngoing,
            isPublished,
            isPinned,
            order,
            role,
            teamSize,
            challenges,
            solutions,
            featuredImage1,
            featuredImage2,
            featuredImage3
        } = req.body;

        // Handle ongoing logic - if changing to ongoing, set endDate to null
        let updatedEndDate = endDate;
        if (isOngoing !== undefined) {
            if (isOngoing) {
                updatedEndDate = null;
            } else if (project.isOngoing && !endDate) {
                // If changing from ongoing to completed, end date is required
                return res.status(BAD_REQUEST).json(
                    formatError('Project Error', 'End date is required for completed projects')
                );
            }
        }

        // Update project
        await project.update({
            title: title !== undefined ? title : project.title,
            description: description !== undefined ? description : project.description,
            summary: summary !== undefined ? summary : project.summary,
            coverImage: coverImage !== undefined ? coverImage : project.coverImage,
            demoUrl: demoUrl !== undefined ? demoUrl : project.demoUrl,
            githubUrl: githubUrl !== undefined ? githubUrl : project.githubUrl,
            startDate: startDate !== undefined ? startDate : project.startDate,
            endDate: isOngoing ? null : (updatedEndDate !== undefined ? updatedEndDate : project.endDate),
            isOngoing: isOngoing !== undefined ? isOngoing : project.isOngoing,
            isPublished: isPublished !== undefined ? isPublished : project.isPublished,
            isPinned: isPinned !== undefined ? isPinned : project.isPinned,
            order: order !== undefined ? order : project.order,
            role: role !== undefined ? role : project.role,
            teamSize: teamSize !== undefined ? teamSize : project.teamSize,
            challenges: challenges !== undefined ? challenges : project.challenges,
            solutions: solutions !== undefined ? solutions : project.solutions,
            featuredImage1: featuredImage1 !== undefined ? featuredImage1 : project.featuredImage1,
            featuredImage2: featuredImage2 !== undefined ? featuredImage2 : project.featuredImage2,
            featuredImage3: featuredImage3 !== undefined ? featuredImage3 : project.featuredImage3
        });

        // Get updated project with technologies
        const updatedProject = await Project.findByPk(project.id, {
            include: [{ model: Technology, as: 'technologies' }]
        });

        // Publish project updated event
        publishEvent('project.updated', {
            userId,
            projectId: project.id,
            title: updatedProject.title,
            isPublished: updatedProject.isPublished
        });

        return res.status(OK).json(
            formatResponse('Project updated successfully', { project: updatedProject })
        );
    } catch (error) {
        console.error('Update project error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Project Error', error.message)
        );
    }
};

/**
 * Delete project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find project
        const project = await Project.findByPk(id);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Project Error', 'You do not have permission to delete this project')
            );
        }

        // Save project info for event
        const projectId = project.id;
        const projectTitle = project.title;

        // Delete project (soft delete)
        await project.destroy();

        // Publish project deleted event
        publishEvent('project.deleted', {
            userId,
            projectId,
            title: projectTitle
        });

        return res.status(OK).json(
            formatResponse('Project deleted successfully')
        );
    } catch (error) {
        console.error('Delete project error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Project Error', error.message)
        );
    }
};

/**
 * Toggle project publish status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const togglePublishStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find project
        const project = await Project.findByPk(id);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Project Error', 'You do not have permission to update this project')
            );
        }

        // Toggle publish status
        const newStatus = !project.isPublished;
        await project.update({ isPublished: newStatus });

        // Publish event
        const eventType = newStatus ? 'project.published' : 'project.unpublished';
        publishEvent(eventType, {
            userId,
            projectId: project.id,
            title: project.title
        });

        const message = newStatus ? 'Project published successfully' : 'Project unpublished successfully';

        return res.status(OK).json(
            formatResponse(message, { project })
        );
    } catch (error) {
        console.error('Toggle publish status error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Project Error', error.message)
        );
    }
};

/**
 * Toggle project pin status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const togglePinStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find project
        const project = await Project.findByPk(id);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Project Error', 'You do not have permission to update this project')
            );
        }

        // Toggle pin status
        const newStatus = !project.isPinned;
        await project.update({ isPinned: newStatus });

        // Publish event
        const eventType = newStatus ? 'project.pinned' : 'project.unpinned';
        publishEvent(eventType, {
            userId,
            projectId: project.id,
            title: project.title
        });

        const message = newStatus ? 'Project pinned successfully' : 'Project unpinned successfully';

        return res.status(OK).json(
            formatResponse(message, { project })
        );
    } catch (error) {
        console.error('Toggle pin status error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Project Error', error.message)
        );
    }
};

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    togglePublishStatus,
    togglePinStatus
};