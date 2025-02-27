/**
 * Comment Controller
 * Handles operations related to blog comments
 */

const { Article, Comment } = require('../models');
const { publishEvent } = require('../events/blog-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Create a new comment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createComment = async (req, res) => {
    try {
        const { id: authorId, username: authorName } = req.user;
        const { articleId } = req.params;

        // Extract comment data
        const { content, parentId } = req.body;

        // Find article
        const article = await Article.findByPk(articleId);

        if (!article) {
            return res.status(NOT_FOUND).json(
                formatError('Comment Error', 'Article not found')
            );
        }

        // If article is not published
        if (!article.published) {
            return res.status(BAD_REQUEST).json(
                formatError('Comment Error', 'Cannot comment on unpublished articles')
            );
        }

        // If this is a reply, validate parent comment
        if (parentId) {
            const parentComment = await Comment.findByPk(parentId);

            if (!parentComment) {
                return res.status(NOT_FOUND).json(
                    formatError('Comment Error', 'Parent comment not found')
                );
            }

            // Make sure parent comment belongs to same article
            if (parentComment.articleId !== articleId) {
                return res.status(BAD_REQUEST).json(
                    formatError('Comment Error', 'Parent comment does not belong to this article')
                );
            }

            // Make sure parent comment is approved
            if (!parentComment.approved) {
                return res.status(BAD_REQUEST).json(
                    formatError('Comment Error', 'Cannot reply to unapproved comments')
                );
            }

            // Prevent nested replies (only one level of nesting)
            if (parentComment.parentId) {
                return res.status(BAD_REQUEST).json(
                    formatError('Comment Error', 'Nested replies are not allowed')
                );
            }
        }

        // Auto-approve comment if user is admin or article author
        const isAdmin = req.user.roles.includes('admin');
        const isAuthor = authorId === article.authorId;
        const autoApprove = isAdmin || isAuthor;

        // Create comment
        const comment = await Comment.create({
            articleId,
            content,
            authorId,
            authorName,
            authorAvatar: req.user.avatar,
            parentId,
            approved: autoApprove,
            approvedBy: autoApprove ? authorId : null,
            approvedAt: autoApprove ? new Date() : null,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        }, {
            isAdmin // Pass to hooks
        });

        // Publish event
        const eventType = autoApprove ? 'comment.created' : 'comment.pending';
        publishEvent(eventType, {
            commentId: comment.id,
            articleId,
            authorId,
            content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
            isReply: !!parentId
        });

        // If auto-approved, also send notification to article author
        if (autoApprove && !isAuthor) {
            publishEvent('comment.notification', {
                commentId: comment.id,
                articleId,
                articleAuthorId: article.authorId,
                commenterName: authorName,
                content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
            });
        }

        return res.status(CREATED).json(
            formatResponse(
                autoApprove ? 'Comment posted successfully' : 'Comment submitted for approval',
                { comment }
            )
        );
    } catch (error) {
        console.error('Create comment error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Comment Error', error.message)
        );
    }
};

/**
 * Get comments for article
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCommentsByArticle = async (req, res) => {
    try {
        const { articleId } = req.params;
        const isAuthenticated = !!req.user;
        const isAdmin = isAuthenticated && req.user.roles.includes('admin');

        // Find article
        const article = await Article.findByPk(articleId);

        if (!article) {
            return res.status(NOT_FOUND).json(
                formatError('Comment Error', 'Article not found')
            );
        }

        // Build query conditions
        const where = { articleId };

        // If not admin, show only approved comments
        if (!isAdmin) {
            where.approved = true;
        }

        // Get only top-level comments
        where.parentId = null;

        // Find comments
        const comments = await Comment.findAll({
            where,
            include: [
                {
                    model: Comment,
                    as: 'replies',
                    required: false,
                    where: isAdmin ? {} : { approved: true }
                }
            ],
            order: [
                ['createdAt', 'DESC'],
                [{ model: Comment, as: 'replies' }, 'createdAt', 'ASC']
            ]
        });

        return res.status(OK).json(
            formatResponse('Comments retrieved successfully', { comments })
        );
    } catch (error) {
        console.error('Get comments error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Comment Error', error.message)
        );
    }
};

/**
 * Get all pending comments (admin)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPendingComments = async (req, res) => {
    try {
        // Only admins can view pending comments
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'Only administrators can view pending comments')
            );
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Find pending comments
        const { count, rows: comments } = await Comment.findAndCountAll({
            where: { approved: false },
            include: [
                {
                    model: Article,
                    as: 'article',
                    attributes: ['id', 'title', 'slug']
                }
            ],
            limit,
            offset,
            order: [['createdAt', 'ASC']]
        });

        // Calculate pagination info
        const totalPages = Math.ceil(count / limit);

        return res.status(OK).json(
            formatResponse('Pending comments retrieved successfully', {
                comments,
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
        console.error('Get pending comments error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Comment Error', error.message)
        );
    }
};

/**
 * Approve comment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const approveComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Only admins can approve comments
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'Only administrators can approve comments')
            );
        }

        // Find comment
        const comment = await Comment.findByPk(id, {
            include: [
                {
                    model: Article,
                    as: 'article',
                    attributes: ['id', 'title', 'slug', 'authorId']
                }
            ]
        });

        if (!comment) {
            return res.status(NOT_FOUND).json(
                formatError('Comment Error', 'Comment not found')
            );
        }

        // Check if already approved
        if (comment.approved) {
            return res.status(BAD_REQUEST).json(
                formatError('Comment Error', 'Comment is already approved')
            );
        }

        // Approve comment
        await comment.update({
            approved: true,
            approvedBy: userId,
            approvedAt: new Date()
        });

        // Publish comment approved event
        publishEvent('comment.approved', {
            commentId: comment.id,
            articleId: comment.articleId,
            approvedBy: userId
        });

        // Send notification to article author
        publishEvent('comment.notification', {
            commentId: comment.id,
            articleId: comment.articleId,
            articleAuthorId: comment.article.authorId,
            commenterName: comment.authorName,
            content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
        });

        return res.status(OK).json(
            formatResponse('Comment approved successfully', { comment })
        );
    } catch (error) {
        console.error('Approve comment error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Comment Error', error.message)
        );
    }
};

/**
 * Reject comment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const rejectComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Only admins can reject comments
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'Only administrators can reject comments')
            );
        }

        // Find comment
        const comment = await Comment.findByPk(id);

        if (!comment) {
            return res.status(NOT_FOUND).json(
                formatError('Comment Error', 'Comment not found')
            );
        }

        // Check if already approved
        if (comment.approved) {
            return res.status(BAD_REQUEST).json(
                formatError('Comment Error', 'Cannot reject an approved comment')
            );
        }

        // Store comment info for event
        const commentId = comment.id;
        const articleId = comment.articleId;

        // Delete comment (soft delete)
        await comment.destroy();

        // Publish comment rejected event
        publishEvent('comment.rejected', {
            commentId,
            articleId,
            rejectedBy: userId
        });

        return res.status(OK).json(
            formatResponse('Comment rejected successfully')
        );
    } catch (error) {
        console.error('Reject comment error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Comment Error', error.message)
        );
    }
};

/**
 * Update comment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { content } = req.body;

        // Find comment
        const comment = await Comment.findByPk(id);

        if (!comment) {
            return res.status(NOT_FOUND).json(
                formatError('Comment Error', 'Comment not found')
            );
        }

        // Check if user is the author or admin
        const isAdmin = req.user.roles.includes('admin');
        if (comment.authorId !== userId && !isAdmin) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to update this comment')
            );
        }

        // Update comment
        await comment.update({ content });

        // Publish comment updated event
        publishEvent('comment.updated', {
            commentId: comment.id,
            articleId: comment.articleId,
            authorId: userId
        });

        return res.status(OK).json(
            formatResponse('Comment updated successfully', { comment })
        );
    } catch (error) {
        console.error('Update comment error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Comment Error', error.message)
        );
    }
};

/**
 * Delete comment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find comment
        const comment = await Comment.findByPk(id, {
            include: [
                {
                    model: Article,
                    as: 'article',
                    attributes: ['authorId']
                }
            ]
        });

        if (!comment) {
            return res.status(NOT_FOUND).json(
                formatError('Comment Error', 'Comment not found')
            );
        }

        // Check if user is the author, article author, or admin
        const isAdmin = req.user.roles.includes('admin');
        const isCommentAuthor = comment.authorId === userId;
        const isArticleAuthor = comment.article && comment.article.authorId === userId;

        if (!isAdmin && !isCommentAuthor && !isArticleAuthor) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to delete this comment')
            );
        }

        // Store comment info for event
        const commentId = comment.id;
        const articleId = comment.articleId;

        // Delete comment (soft delete)
        await comment.destroy();

        // Publish comment deleted event
        publishEvent('comment.deleted', {
            commentId,
            articleId,
            deletedBy: userId,
            isAdmin,
            isCommentAuthor,
            isArticleAuthor
        });

        return res.status(OK).json(
            formatResponse('Comment deleted successfully')
        );
    } catch (error) {
        console.error('Delete comment error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Comment Error', error.message)
        );
    }
};

module.exports = {
    createComment,
    getCommentsByArticle,
    getPendingComments,
    approveComment,
    rejectComment,
    updateComment,
    deleteComment
};