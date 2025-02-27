/**
 * Category Controller
 * Handles operations related to blog categories
 */

const { Op } = require('sequelize');
const { Category, Article } = require('../models');
const { publishEvent } = require('../events/blog-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Create a new category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createCategory = async (req, res) => {
    try {
        const userId = req.user.id;

        // Only admins can create categories
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'Only administrators can create categories')
            );
        }

        // Extract category data from request body
        const {
            name,
            description,
            color,
            icon,
            order,
            featured,
            parentId
        } = req.body;

        // Check if category name already exists
        const existingCategory = await Category.findOne({
            where: {
                name: {
                    [Op.eq]: name
                }
            }
        });

        if (existingCategory) {
            return res.status(BAD_REQUEST).json(
                formatError('Category Error', 'A category with this name already exists')
            );
        }

        // Validate parent category if provided
        if (parentId) {
            const parentCategory = await Category.findByPk(parentId);

            if (!parentCategory) {
                return res.status(BAD_REQUEST).json(
                    formatError('Category Error', 'Parent category not found')
                );
            }

            // Prevent deep nesting - only allow one level of subcategories
            if (parentCategory.parentId) {
                return res.status(BAD_REQUEST).json(
                    formatError('Category Error', 'Nested subcategories are not allowed')
                );
            }
        }

        // Create new category
        const category = await Category.create({
            name,
            description,
            color,
            icon,
            order: order || 0,
            featured: featured || false,
            parentId
        });

        // Publish category created event
        publishEvent('category.created', {
            categoryId: category.id,
            name: category.name,
            slug: category.slug,
            adminId: userId
        });

        return res.status(CREATED).json(
            formatResponse('Category created successfully', { category })
        );
    } catch (error) {
        console.error('Create category error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Category Error', error.message)
        );
    }
};

/**
 * Get all categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllCategories = async (req, res) => {
    try {
        // Filter parameters
        const { featured, parent, withCounts } = req.query;

        // Build query conditions
        const where = {};

        // Filter by featured status if provided
        if (featured === 'true') {
            where.featured = true;
        }

        // Filter by parent/top-level status
        if (parent === 'null' || parent === 'false') {
            where.parentId = null;
        } else if (parent && parent !== 'true') {
            where.parentId = parent;
        }

        // Include options
        const include = [];

        // Include parent category if needed
        if (!where.parentId) {
            include.push({
                model: Category,
                as: 'parentCategory',
                required: false
            });
        }

        // Include subcategories
        include.push({
            model: Category,
            as: 'subcategories',
            required: false
        });

        // Include article counts if requested
        if (withCounts === 'true') {
            include.push({
                model: Article,
                as: 'articles',
                attributes: ['id'],
                through: { attributes: [] }
            });
        }

        // Get categories
        const categories = await Category.findAll({
            where,
            include,
            order: [
                ['featured', 'DESC'],
                ['order', 'ASC'],
                ['name', 'ASC']
            ]
        });

        // Add article counts if requested
        if (withCounts === 'true') {
            categories.forEach(category => {
                category.dataValues.articleCount = category.articles ? category.articles.length : 0;
                delete category.dataValues.articles;
            });
        }

        return res.status(OK).json(
            formatResponse('Categories retrieved successfully', { categories })
        );
    } catch (error) {
        console.error('Get all categories error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Category Error', error.message)
        );
    }
};

/**
 * Get category by slug
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

        // Find category with subcategories and parent
        const category = await Category.findOne({
            where: isUUID ? { id: slug } : { slug },
            include: [
                {
                    model: Category,
                    as: 'subcategories',
                    required: false
                },
                {
                    model: Category,
                    as: 'parentCategory',
                    required: false
                }
            ]
        });

        if (!category) {
            return res.status(NOT_FOUND).json(
                formatError('Category Error', 'Category not found')
            );
        }

        // Get article count
        const articleCount = await category.countArticles();
        category.dataValues.articleCount = articleCount;

        return res.status(OK).json(
            formatResponse('Category retrieved successfully', { category })
        );
    } catch (error) {
        console.error('Get category error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Category Error', error.message)
        );
    }
};

/**
 * Update category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateCategory = async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.user.id;

        // Only admins can update categories
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'Only administrators can update categories')
            );
        }

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

        // Find category
        const category = await Category.findOne({
            where: isUUID ? { id: slug } : { slug }
        });

        if (!category) {
            return res.status(NOT_FOUND).json(
                formatError('Category Error', 'Category not found')
            );
        }

        // Extract category data
        const {
            name,
            description,
            color,
            icon,
            order,
            featured,
            parentId
        } = req.body;

        // Check if category name already exists (excluding this category)
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({
                where: {
                    name: {
                        [Op.eq]: name
                    },
                    id: {
                        [Op.ne]: category.id
                    }
                }
            });

            if (existingCategory) {
                return res.status(BAD_REQUEST).json(
                    formatError('Category Error', 'A category with this name already exists')
                );
            }
        }

        // Validate parent category if provided
        if (parentId && parentId !== category.parentId) {
            // Prevent self-reference
            if (parentId === category.id) {
                return res.status(BAD_REQUEST).json(
                    formatError('Category Error', 'A category cannot be its own parent')
                );
            }

            const parentCategory = await Category.findByPk(parentId);

            if (!parentCategory) {
                return res.status(BAD_REQUEST).json(
                    formatError('Category Error', 'Parent category not found')
                );
            }

            // Prevent deep nesting - only allow one level of subcategories
            if (parentCategory.parentId) {
                return res.status(BAD_REQUEST).json(
                    formatError('Category Error', 'Nested subcategories are not allowed')
                );
            }

            // Check for subcategory loop
            const subcategories = await Category.findAll({
                where: { parentId: category.id }
            });

            if (subcategories.some(sub => sub.id === parentId)) {
                return res.status(BAD_REQUEST).json(
                    formatError('Category Error', 'Cannot create a subcategory loop')
                );
            }
        }

        // Update category
        await category.update({
            name: name !== undefined ? name : category.name,
            description: description !== undefined ? description : category.description,
            color: color !== undefined ? color : category.color,
            icon: icon !== undefined ? icon : category.icon,
            order: order !== undefined ? order : category.order,
            featured: featured !== undefined ? featured : category.featured,
            parentId: parentId !== undefined ? parentId : category.parentId
        });

        // Get updated category with relationships
        const updatedCategory = await Category.findByPk(category.id, {
            include: [
                {
                    model: Category,
                    as: 'subcategories',
                    required: false
                },
                {
                    model: Category,
                    as: 'parentCategory',
                    required: false
                }
            ]
        });

        // Publish category updated event
        publishEvent('category.updated', {
            categoryId: category.id,
            name: updatedCategory.name,
            slug: updatedCategory.slug,
            adminId: userId
        });

        return res.status(OK).json(
            formatResponse('Category updated successfully', { category: updatedCategory })
        );
    } catch (error) {
        console.error('Update category error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Category Error', error.message)
        );
    }
};

/**
 * Delete category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteCategory = async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.user.id;

        // Only admins can delete categories
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'Only administrators can delete categories')
            );
        }

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

        // Find category
        const category = await Category.findOne({
            where: isUUID ? { id: slug } : { slug }
        });

        if (!category) {
            return res.status(NOT_FOUND).json(
                formatError('Category Error', 'Category not found')
            );
        }

        // Check if category has subcategories
        const subcategories = await Category.count({
            where: { parentId: category.id }
        });

        if (subcategories > 0) {
            return res.status(BAD_REQUEST).json(
                formatError('Category Error', 'Cannot delete a category with subcategories')
            );
        }

        // Store category info for event
        const categoryId = category.id;
        const categoryName = category.name;
        const categorySlug = category.slug;

        // Delete category
        await category.destroy();

        // Publish category deleted event
        publishEvent('category.deleted', {
            categoryId,
            name: categoryName,
            slug: categorySlug,
            adminId: userId
        });

        return res.status(OK).json(
            formatResponse('Category deleted successfully')
        );
    } catch (error) {
        console.error('Delete category error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Category Error', error.message)
        );
    }
};

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryBySlug,
    updateCategory,
    deleteCategory
};