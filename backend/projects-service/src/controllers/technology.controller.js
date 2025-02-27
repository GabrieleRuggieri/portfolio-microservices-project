/**
 * Technology Controller
 * Handles operations related to project technologies
 */

const Project = require('../models/project.model');
const Technology = require('../models/technology.model');
const { publishEvent } = require('../events/project-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Add a technology to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addTechnology = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        // Find project
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Technology Error', 'You do not have permission to add technologies to this project')
            );
        }

        // Extract technology data
        const { name, category, logoUrl, description, version, order } = req.body;

        // Check if technology already exists for this project
        const existingTech = await Technology.findOne({
            where: {
                projectId,
                name
            }
        });

        if (existingTech) {
            return res.status(BAD_REQUEST).json(
                formatError('Technology Error', 'This technology already exists for the project')
            );
        }

        // Create technology
        const technology = await Technology.create({
            projectId,
            name,
            category,
            logoUrl,
            description,
            version,
            order: order || 0
        });

        // Publish technology added event
        publishEvent('technology.added', {
            userId,
            projectId,
            technologyId: technology.id,
            technologyName: technology.name
        });

        return res.status(CREATED).json(
            formatResponse('Technology added successfully', { technology })
        );
    } catch (error) {
        console.error('Add technology error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Technology Error', error.message)
        );
    }
};

/**
 * Get all technologies for a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTechnologies = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Find project
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // If project is not published and the requester is not the owner or an admin
        if (!project.isPublished &&
            (!req.user ||
                (req.user.id !== project.userId &&
                    !req.user.roles?.includes('admin')))) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found or not published')
            );
        }

        // Get technologies
        const technologies = await Technology.findAll({
            where: { projectId },
            order: [['order', 'ASC'], ['name', 'ASC']]
        });

        return res.status(OK).json(
            formatResponse('Technologies retrieved successfully', { technologies })
        );
    } catch (error) {
        console.error('Get technologies error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Technology Error', error.message)
        );
    }
};

/**
 * Update a technology
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateTechnology = async (req, res) => {
    try {
        const { projectId, techId } = req.params;
        const userId = req.user.id;

        // Find project
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Technology Error', 'You do not have permission to update technologies for this project')
            );
        }

        // Find technology
        const technology = await Technology.findOne({
            where: {
                id: techId,
                projectId
            }
        });

        if (!technology) {
            return res.status(NOT_FOUND).json(
                formatError('Technology Error', 'Technology not found')
            );
        }

        // Extract technology data
        const { name, category, logoUrl, description, version, order } = req.body;

        // Update technology
        await technology.update({
            name: name !== undefined ? name : technology.name,
            category: category !== undefined ? category : technology.category,
            logoUrl: logoUrl !== undefined ? logoUrl : technology.logoUrl,
            description: description !== undefined ? description : technology.description,
            version: version !== undefined ? version : technology.version,
            order: order !== undefined ? order : technology.order
        });

        // Publish technology updated event
        publishEvent('technology.updated', {
            userId,
            projectId,
            technologyId: technology.id,
            technologyName: technology.name
        });

        return res.status(OK).json(
            formatResponse('Technology updated successfully', { technology })
        );
    } catch (error) {
        console.error('Update technology error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Technology Error', error.message)
        );
    }
};

/**
 * Delete a technology
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteTechnology = async (req, res) => {
    try {
        const { projectId, techId } = req.params;
        const userId = req.user.id;

        // Find project
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Technology Error', 'You do not have permission to delete technologies from this project')
            );
        }

        // Find technology
        const technology = await Technology.findOne({
            where: {
                id: techId,
                projectId
            }
        });

        if (!technology) {
            return res.status(NOT_FOUND).json(
                formatError('Technology Error', 'Technology not found')
            );
        }

        // Save technology info for event
        const technologyId = technology.id;
        const technologyName = technology.name;

        // Delete technology
        await technology.destroy();

        // Publish technology deleted event
        publishEvent('technology.deleted', {
            userId,
            projectId,
            technologyId,
            technologyName
        });

        return res.status(OK).json(
            formatResponse('Technology deleted successfully')
        );
    } catch (error) {
        console.error('Delete technology error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Technology Error', error.message)
        );
    }
};

/**
 * Bulk add technologies to a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkAddTechnologies = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { technologies } = req.body;

        if (!Array.isArray(technologies) || technologies.length === 0) {
            return res.status(BAD_REQUEST).json(
                formatError('Technology Error', 'Technologies must be a non-empty array')
            );
        }

        // Find project
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Technology Error', 'You do not have permission to add technologies to this project')
            );
        }

        // Get existing technology names for this project
        const existingTechs = await Technology.findAll({
            where: { projectId },
            attributes: ['name']
        });

        const existingTechNames = existingTechs.map(t => t.name.toLowerCase());

        // Filter out technologies that already exist
        const newTechs = technologies.filter(tech =>
            !existingTechNames.includes(tech.name.toLowerCase())
        );

        if (newTechs.length === 0) {
            return res.status(BAD_REQUEST).json(
                formatError('Technology Error', 'All technologies already exist for this project')
            );
        }

        // Prepare technologies for bulk insertion
        const techsToCreate = newTechs.map((tech, index) => ({
            projectId,
            name: tech.name,
            category: tech.category,
            logoUrl: tech.logoUrl,
            description: tech.description,
            version: tech.version,
            order: tech.order || index
        }));

        // Bulk create technologies
        const createdTechs = await Technology.bulkCreate(techsToCreate);

        // Publish technologies added event
        publishEvent('technologies.bulk.added', {
            userId,
            projectId,
            count: createdTechs.length
        });

        return res.status(CREATED).json(
            formatResponse('Technologies added successfully', {
                technologies: createdTechs,
                added: createdTechs.length,
                total: technologies.length
            })
        );
    } catch (error) {
        console.error('Bulk add technologies error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Technology Error', error.message)
        );
    }
};

/**
 * Reorder technologies for a project
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const reorderTechnologies = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { order } = req.body;

        if (!Array.isArray(order) || order.length === 0) {
            return res.status(BAD_REQUEST).json(
                formatError('Technology Error', 'Order must be a non-empty array of technology IDs')
            );
        }

        // Find project
        const project = await Project.findByPk(projectId);

        if (!project) {
            return res.status(NOT_FOUND).json(
                formatError('Project Error', 'Project not found')
            );
        }

        // Check if user is the owner or admin
        if (project.userId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Technology Error', 'You do not have permission to reorder technologies for this project')
            );
        }

        // Get existing technologies for this project
        const existingTechs = await Technology.findAll({
            where: { projectId }
        });

        // Map of technology ID to technology
        const techMap = existingTechs.reduce((map, tech) => {
            map[tech.id] = tech;
            return map;
        }, {});

        // Validate that all IDs in order exist for this project
        const invalidIds = order.filter(id => !techMap[id]);

        if (invalidIds.length > 0) {
            return res.status(BAD_REQUEST).json(
                formatError('Technology Error', `The following technology IDs do not exist for this project: ${invalidIds.join(', ')}`)
            );
        }

        // Update order for each technology
        const updatePromises = order.map((id, index) => {
            return Technology.update(
                { order: index },
                { where: { id, projectId } }
            );
        });

        await Promise.all(updatePromises);

        // Get updated technologies
        const updatedTechs = await Technology.findAll({
            where: { projectId },
            order: [['order', 'ASC']]
        });

        // Publish technologies reordered event
        publishEvent('technologies.reordered', {
            userId,
            projectId
        });

        return res.status(OK).json(
            formatResponse('Technologies reordered successfully', { technologies: updatedTechs })
        );
    } catch (error) {
        console.error('Reorder technologies error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Technology Error', error.message)
        );
    }
};

module.exports = {
    addTechnology,
    getTechnologies,
    updateTechnology,
    deleteTechnology,
    bulkAddTechnologies,
    reorderTechnologies
};