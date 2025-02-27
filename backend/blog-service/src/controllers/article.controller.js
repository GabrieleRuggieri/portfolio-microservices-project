/**
 * Article Controller
 * Handles operations related to blog articles
 */

const { Op } = require('sequelize');
const sequelize = require('../utils/database.util');
const { Article, Category, Comment, ArticleCategory } = require('../models');
const { publishEvent } = require('../events/blog-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Create a new article
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createArticle = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id: authorId, username: authorName } = req.user;

        // Extract article data from request body
        const {
            title,
            content,
            excerpt,
            coverImage,
            published,
            featured,
            metaTitle,
            metaDescription,
            tags,
            categories
        } = req.body;

        // Create new article
        const article = await Article.create({
            title,
            content,
            excerpt: excerpt || content.substring(0, 200) + (content.length > 200 ? '...' : ''),
            coverImage,
            authorId,
            authorName,
            published: published || false,
            publishedAt: published ? new Date() : null,
            featured: featured || false,
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || excerpt || content.substring(0, 160) + (content.length > 160 ? '...' : ''),
            tags: tags || null
        }, { transaction });

        // Add categories if provided
        if (categories && Array.isArray(categories) && categories.length > 0) {
            // Find all valid category IDs
            const validCategories = await Category.findAll({
                where: {
                    id: {
                        [Op.in]: categories
                    }
                },
                attributes: ['id'],
                transaction
            });

            const validCategoryIds = validCategories.map(cat => cat.id);

            // Create article-category relations
            if (validCategoryIds.length > 0) {
                const articleCategories = validCategoryIds.map(categoryId => ({
                    articleId: article.id,
                    categoryId
                }));

                await ArticleCategory.bulkCreate(articleCategories, { transaction });
            }
        }

        await transaction.commit();

        // Fetch the created article with categories
        const createdArticle = await Article.findByPk(article.id, {
            include: [
                { model: Category, as: 'categories', through: { attributes: [] } }
            ]
        });

        // Publish article created event
        publishEvent('article.created', {
            articleId: article.id,
            authorId,
            title: article.title,
            slug: article.slug,
            published: article.published
        });

        return res.status(CREATED).json(
            formatResponse('Article created successfully', { article: createdArticle })
        );
    } catch (error) {
        await transaction.rollback();
        console.error('Create article error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Article Error', error.message)
        );
    }
};

/**
 * Get all articles with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllArticles = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Filter parameters
        const {
            search,
            authorId,
            category,
            tag,
            featured,
            sort = 'newest'
        } = req.query;

        // Build query conditions
        const where = {};

        // If user is not authenticated or if explicitly requesting published articles,
        // only return published articles
        if (!req.user || req.query.published !== 'false') {
            where.published = true;
        }

        // If user is authenticated and requesting own articles
        if (req.user && req.query.own === 'true') {
            where.authorId = req.user.id;
        } else if (authorId) {
            // If filtering by specific author
            where.authorId = authorId;
        }

        // Add search filter if provided
        if (search) {
            where[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { content: { [Op.like]: `%${search}%` } },
                { tags: { [Op.like]: `%${search}%` } }
            ];
        }

        // Add featured filter if provided
        if (featured === 'true') {
            where.featured = true;
        }

        // Add tag filter if provided
        if (tag) {
            where.tags = { [Op.like]: `%${tag}%` };
        }

        // Build include array for associations
        const include = [
            { model: Category, as: 'categories', through: { attributes: [] } }
        ];

        // If filtering by category, add condition
        if (category) {
            include[0].where = { slug: category };
        }

        // Add comment count
        include.push({
            model: Comment,
            as: 'comments',
            attributes: [[sequelize.fn('COUNT', sequelize.col('comments.id')), 'commentCount']],
            where: { approved: true },
            required: false
        });

        // Determine sort order
        let order = [];

        switch (sort) {
            case 'oldest':
                order.push(['createdAt', 'ASC']);
                break;
            case 'title':
                order.push(['title', 'ASC']);
                break;
            case 'popular':
                order.push(['viewCount', 'DESC']);
                break;
            case 'featured':
                order.push(['featured', 'DESC'], ['publishedAt', 'DESC']);
                break;
            case 'newest':
            default:
                order.push(['publishedAt', 'DESC']);
                break;
        }

        // Get articles with count
        const { count, rows: articles } = await Article.findAndCountAll({
            where,
            include,
            distinct: true, // Required for accurate count with associations
            limit,
            offset,
            order,
            group: ['Article.id']
        });

        // Calculate pagination info
        const totalPages = Math.ceil(count.length / limit);

        return res.status(OK).json(
            formatResponse('Articles retrieved successfully', {
                articles,
                pagination: {
                    page,
                    limit,
                    totalItems: count.length,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            })
        );
    } catch (error) {
        console.error('Get all articles error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Article Error', error.message)
        );
    }
};

/**
 * Get article by slug or ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getArticleBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

        // Build query condition
        const where = isUUID ? { id: slug } : { slug };

        // If user is not authenticated, only return published articles
        if (!req.user) {
            where.published = true;
        }

        // Find article with categories and approved comments
        const article = await Article.findOne({
            where,
            include: [
                {
                    model: Category,
                    as: 'categories',
                    through: { attributes: [] }
                },
                {
                    model: Comment,
                    as: 'comments',
                    where: { approved: true, parentId: null },
                    required: false,
                    include: [
                        {
                            model: Comment,
                            as: 'replies',
                            where: { approved: true },
                            required: false
                        }
                    ]
                }
            ]
        });

        if (!article) {
            return res.status(NOT_FOUND).json(
                formatError('Article Error', 'Article not found')
            );
        }

        // If article is not published and user is not the author or an admin
        if (!article.published &&
            (!req.user ||
                (req.user.id !== article.authorId &&
                    !req.user.roles.includes('admin')))) {
            return res.status(NOT_FOUND).json(
                formatError('Article Error', 'Article not found or not published')
            );
        }

        // Increment view count if not preview mode
        if (req.query.preview !== 'true') {
            await article.increment('viewCount');
        }

        return res.status(OK).json(
            formatResponse('Article retrieved successfully', { article })
        );
    } catch (error) {
        console.error('Get article error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Article Error', error.message)
        );
    }
};

/**
 * Update article
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateArticle = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { slug } = req.params;
        const userId = req.user.id;

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

        // Find article
        const article = await Article.findOne({
            where: isUUID ? { id: slug } : { slug },
            transaction
        });

        if (!article) {
            await transaction.rollback();
            return res.status(NOT_FOUND).json(
                formatError('Article Error', 'Article not found')
            );
        }

        // Check if user is the author or admin
        if (article.authorId !== userId && !req.user.roles.includes('admin')) {
            await transaction.rollback();
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to update this article')
            );
        }

        // Extract article data
        const {
            title,
            content,
            excerpt,
            coverImage,
            published,
            featured,
            metaTitle,
            metaDescription,
            tags,
            categories
        } = req.body;

        // Handle publishing logic
        let publishedAt = article.publishedAt;
        if (published !== undefined && published && !article.published) {
            publishedAt = new Date();
        }

        // Update article
        await article.update({
            title: title !== undefined ? title : article.title,
            content: content !== undefined ? content : article.content,
            excerpt: excerpt !== undefined ? excerpt : article.excerpt,
            coverImage: coverImage !== undefined ? coverImage : article.coverImage,
            published: published !== undefined ? published : article.published,
            publishedAt,
            featured: featured !== undefined ? featured : article.featured,
            metaTitle: metaTitle !== undefined ? metaTitle : article.metaTitle,
            metaDescription: metaDescription !== undefined ? metaDescription : article.metaDescription,
            tags: tags !== undefined ? tags : article.tags
        }, { transaction });

        // Update categories if provided
        if (categories && Array.isArray(categories)) {
            // Remove existing category associations
            await ArticleCategory.destroy({
                where: { articleId: article.id },
                transaction
            });

            // Add new category associations
            if (categories.length > 0) {
                // Find all valid category IDs
                const validCategories = await Category.findAll({
                    where: {
                        id: {
                            [Op.in]: categories
                        }
                    },
                    attributes: ['id'],
                    transaction
                });

                const validCategoryIds = validCategories.map(cat => cat.id);

                // Create article-category relations
                if (validCategoryIds.length > 0) {
                    const articleCategories = validCategoryIds.map(categoryId => ({
                        articleId: article.id,
                        categoryId
                    }));

                    await ArticleCategory.bulkCreate(articleCategories, { transaction });
                }
            }
        }

        await transaction.commit();

        // Fetch the updated article with categories
        const updatedArticle = await Article.findByPk(article.id, {
            include: [
                { model: Category, as: 'categories', through: { attributes: [] } }
            ]
        });

        // Publish article updated event
        publishEvent('article.updated', {
            articleId: article.id,
            authorId: userId,
            title: updatedArticle.title,
            slug: updatedArticle.slug,
            published: updatedArticle.published
        });

        return res.status(OK).json(
            formatResponse('Article updated successfully', { article: updatedArticle })
        );
    } catch (error) {
        await transaction.rollback();
        console.error('Update article error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Article Error', error.message)
        );
    }
};

/**
 * Delete article
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteArticle = async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.user.id;

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

        // Find article
        const article = await Article.findOne({
            where: isUUID ? { id: slug } : { slug }
        });

        if (!article) {
            return res.status(NOT_FOUND).json(
                formatError('Article Error', 'Article not found')
            );
        }

        // Check if user is the author or admin
        if (article.authorId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to delete this article')
            );
        }

        // Store article info for event
        const articleId = article.id;
        const articleTitle = article.title;
        const articleSlug = article.slug;

        // Delete article (soft delete)
        await article.destroy();

        // Publish article deleted event
        publishEvent('article.deleted', {
            articleId,
            authorId: userId,
            title: articleTitle,
            slug: articleSlug
        });

        return res.status(OK).json(
            formatResponse('Article deleted successfully')
        );
    } catch (error) {
        console.error('Delete article error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Article Error', error.message)
        );
    }
};

/**
 * Toggle article publish status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const togglePublishStatus = async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.user.id;

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

        // Find article
        const article = await Article.findOne({
            where: isUUID ? { id: slug } : { slug }
        });

        if (!article) {
            return res.status(NOT_FOUND).json(
                formatError('Article Error', 'Article not found')
            );
        }

        // Check if user is the author or admin
        if (article.authorId !== userId && !req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to update this article')
            );
        }

        // Toggle published status
        const newStatus = !article.published;

        // Set publishedAt if publishing for the first time
        const updateData = { published: newStatus };
        if (newStatus && !article.publishedAt) {
            updateData.publishedAt = new Date();
        }

        await article.update(updateData);

        // Publish event
        const eventType = newStatus ? 'article.published' : 'article.unpublished';
        publishEvent(eventType, {
            articleId: article.id,
            authorId: userId,
            title: article.title,
            slug: article.slug
        });

        const message = newStatus ? 'Article published successfully' : 'Article unpublished successfully';

        return res.status(OK).json(
            formatResponse(message, { article })
        );
    } catch (error) {
        console.error('Toggle publish status error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Article Error', error.message)
        );
    }
};

/**
 * Toggle article featured status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const toggleFeaturedStatus = async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.user.id;

        // Only admins can toggle featured status
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'Only administrators can feature articles')
            );
        }

        // Determine if the identifier is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);

        // Find article
        const article = await Article.findOne({
            where: isUUID ? { id: slug } : { slug }
        });

        if (!article) {
            return res.status(NOT_FOUND).json(
                formatError('Article Error', 'Article not found')
            );
        }

        // Toggle featured status
        const newStatus = !article.featured;
        await article.update({ featured: newStatus });

        // Publish event
        const eventType = newStatus ? 'article.featured' : 'article.unfeatured';
        publishEvent(eventType, {
            articleId: article.id,
            authorId: userId,
            title: article.title,
            slug: article.slug
        });

        const message = newStatus ? 'Article featured successfully' : 'Article unfeatured successfully';

        return res.status(OK).json(
            formatResponse(message, { article })
        );
    } catch (error) {
        console.error('Toggle featured status error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Article Error', error.message)
        );
    }
};

module.exports = {
    createArticle,
    getAllArticles,
    getArticleBySlug,
    updateArticle,
    deleteArticle,
    togglePublishStatus,
    toggleFeaturedStatus
};