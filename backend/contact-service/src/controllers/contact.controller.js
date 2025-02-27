/**
 * Contact Controller
 * Handles operations related to contact messages
 */

const { Op } = require('sequelize');
const { Message, Reply } = require('../models');
const { sendEmailNotification, sendReplyEmail } = require('../utils/email.util');
const { checkSpam } = require('../utils/spam.util');
const { publishEvent } = require('../events/contact-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Create a new contact message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createMessage = async (req, res) => {
    try {
        // Extract message data
        const { name, email, subject, message, phone, company, source } = req.body;

        // Basic spam check
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const referrer = req.headers.referer || req.headers.referrer;

        const spamCheckResult = await checkSpam({
            name,
            email,
            message,
            ipAddress,
            userAgent
        });

        // Create message
        const contactMessage = await Message.create({
            name,
            email,
            subject,
            message,
            phone,
            company,
            ipAddress,
            userAgent,
            referrer,
            source,
            isSpam: spamCheckResult.isSpam,
            status: spamCheckResult.isSpam ? 'spam' : 'new',
            priority: 'normal'
        });

        // Send email notification to admin (only for non-spam)
        if (!spamCheckResult.isSpam) {
            sendEmailNotification(contactMessage);
        }

        // Publish new message event
        publishEvent('message.created', {
            messageId: contactMessage.id,
            name: contactMessage.name,
            email: contactMessage.email,
            subject: contactMessage.subject,
            isSpam: contactMessage.isSpam
        });

        return res.status(CREATED).json(
            formatResponse(
                'Thank you for your message! We will get back to you soon.',
                { success: true, messageId: contactMessage.id }
            )
        );
    } catch (error) {
        console.error('Create message error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Contact Error', 'Could not send your message. Please try again later.')
        );
    }
};

/**
 * Get all messages with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllMessages = async (req, res) => {
    try {
        // Validate admin access
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access messages')
            );
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Filter parameters
        const {
            status,
            priority,
            search,
            from,
            to,
            isSpam,
            assignedTo,
            sort = 'newest'
        } = req.query;

        // Build query conditions
        const where = {};

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        // Filter by spam status
        if (isSpam === 'true') {
            where.isSpam = true;
        } else if (isSpam === 'false') {
            where.isSpam = false;
        }

        // Filter by assignee
        if (assignedTo === 'me') {
            where.assignedTo = req.user.id;
        } else if (assignedTo === 'unassigned') {
            where.assignedTo = null;
        } else if (assignedTo && assignedTo !== 'all') {
            where.assignedTo = assignedTo;
        }

        // Add date range filters
        if (from) {
            const fromDate = new Date(from);
            if (!isNaN(fromDate.getTime())) {
                where.createdAt = { ...where.createdAt, [Op.gte]: fromDate };
            }
        }

        if (to) {
            const toDate = new Date(to);
            if (!isNaN(toDate.getTime())) {
                toDate.setHours(23, 59, 59, 999); // End of day
                where.createdAt = { ...where.createdAt, [Op.lte]: toDate };
            }
        }

        // Add search filter
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { subject: { [Op.like]: `%${search}%` } },
                { message: { [Op.like]: `%${search}%` } }
            ];
        }

        // Determine sort order
        let order = [];

        switch (sort) {
            case 'oldest':
                order.push(['createdAt', 'ASC']);
                break;
            case 'priority':
                order.push(
                    [sequelize.literal("CASE WHEN priority = 'high' THEN 0 WHEN priority = 'normal' THEN 1 ELSE 2 END"), 'ASC'],
                    ['createdAt', 'DESC']
                );
                break;
            case 'status':
                order.push(
                    [sequelize.literal("CASE WHEN status = 'new' THEN 0 WHEN status = 'read' THEN 1 ELSE 2 END"), 'ASC'],
                    ['createdAt', 'DESC']
                );
                break;
            case 'newest':
            default:
                order.push(['createdAt', 'DESC']);
                break;
        }

        // Get messages with count
        const { count, rows: messages } = await Message.findAndCountAll({
            where,
            limit,
            offset,
            order,
            include: [
                {
                    model: Reply,
                    as: 'replies',
                    required: false,
                    where: { internal: false },
                    attributes: ['id', 'createdAt']
                }
            ]
        });

        // Add reply count to each message
        messages.forEach(message => {
            message.dataValues.replyCount = message.replies ? message.replies.length : 0;
        });

        // Calculate pagination info
        const totalPages = Math.ceil(count / limit);

        return res.status(OK).json(
            formatResponse('Messages retrieved successfully', {
                messages,
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
        console.error('Get all messages error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Contact Error', error.message)
        );
    }
};

/**
 * Get message by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMessageById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate admin access
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access messages')
            );
        }

        // Find message with replies
        const message = await Message.findByPk(id, {
            include: [
                {
                    model: Reply,
                    as: 'replies',
                    order: [['createdAt', 'ASC']]
                }
            ]
        });

        if (!message) {
            return res.status(NOT_FOUND).json(
                formatError('Contact Error', 'Message not found')
            );
        }

        // If message is new, mark it as read
        if (message.status === 'new') {
            await message.update({
                status: 'read',
                readAt: new Date()
            });

            // Publish message read event
            publishEvent('message.read', {
                messageId: message.id,
                userId: req.user.id
            });
        }

        return res.status(OK).json(
            formatResponse('Message retrieved successfully', { message })
        );
    } catch (error) {
        console.error('Get message error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Contact Error', error.message)
        );
    }
};

/**
 * Update message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Validate admin access
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to update messages')
            );
        }

        // Find message
        const message = await Message.findByPk(id);

        if (!message) {
            return res.status(NOT_FOUND).json(
                formatError('Contact Error', 'Message not found')
            );
        }

        // Extract update data
        const { status, priority, assignedTo, isSpam, tags, notes } = req.body;

        // Update message
        const updates = {};

        if (status && ['new', 'read', 'replied', 'spam', 'archived'].includes(status)) {
            updates.status = status;

            // Set read timestamp if changing to read and not previously read
            if (status === 'read' && message.status === 'new') {
                updates.readAt = new Date();
            }
        }

        if (priority && ['low', 'normal', 'high'].includes(priority)) {
            updates.priority = priority;
        }

        if (assignedTo === null || assignedTo) {
            updates.assignedTo = assignedTo;
        }

        if (isSpam !== undefined) {
            updates.isSpam = Boolean(isSpam);

            // If marking as spam, also update status
            if (isSpam === true) {
                updates.status = 'spam';
            }
        }

        if (tags !== undefined) {
            updates.tags = tags;
        }

        if (notes !== undefined) {
            updates.notes = notes;
        }

        // Perform update if there are changes
        if (Object.keys(updates).length > 0) {
            await message.update(updates);

            // Publish message updated event
            publishEvent('message.updated', {
                messageId: message.id,
                userId,
                updates: Object.keys(updates)
            });
        }

        return res.status(OK).json(
            formatResponse('Message updated successfully', { message })
        );
    } catch (error) {
        console.error('Update message error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Contact Error', error.message)
        );
    }
};

/**
 * Delete message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Validate admin access
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to delete messages')
            );
        }

        // Find message
        const message = await Message.findByPk(id);

        if (!message) {
            return res.status(NOT_FOUND).json(
                formatError('Contact Error', 'Message not found')
            );
        }

        // Delete message (soft delete)
        await message.destroy();

        // Publish message deleted event
        publishEvent('message.deleted', {
            messageId: id,
            userId
        });

        return res.status(OK).json(
            formatResponse('Message deleted successfully')
        );
    } catch (error) {
        console.error('Delete message error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Contact Error', error.message)
        );
    }
};

/**
 * Reply to a message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const replyToMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { content, internal = false } = req.body;

        // Validate admin access
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to reply to messages')
            );
        }

        // Find message with email details
        const message = await Message.findByPk(id);

        if (!message) {
            return res.status(NOT_FOUND).json(
                formatError('Contact Error', 'Message not found')
            );
        }

        // Create reply
        const reply = await Reply.create({
            messageId: id,
            userId,
            userName: req.user.name || req.user.email || 'Admin',
            content,
            internal
        });

        // If not an internal note, send email and update message status
        if (!internal) {
            try {
                // Send reply email
                await sendReplyEmail(message, content, reply.id);

                // Update reply status
                await reply.update({
                    sentAt: new Date(),
                    emailStatus: 'sent'
                });

                // Update message status
                await message.update({
                    status: 'replied',
                    repliedAt: new Date()
                });
            } catch (error) {
                console.error('Error sending reply email:', error);

                // Update reply status to failed
                await reply.update({
                    emailStatus: 'failed',
                    emailError: error.message
                });
            }
        }

        // Publish reply created event
        publishEvent('reply.created', {
            replyId: reply.id,
            messageId: id,
            userId,
            internal
        });

        return res.status(CREATED).json(
            formatResponse('Reply sent successfully', { reply })
        );
    } catch (error) {
        console.error('Reply error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Contact Error', error.message)
        );
    }
};

/**
 * Get dashboard stats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardStats = async (req, res) => {
    try {
        // Validate admin access
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access dashboard stats')
            );
        }

        // Get counts by status
        const statusCounts = await Message.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                isSpam: false
            },
            group: ['status']
        });

        // Format status counts
        const statusCountsFormatted = {};
        statusCounts.forEach(item => {
            statusCountsFormatted[item.status] = parseInt(item.dataValues.count);
        });

        // Calculate totals
        const totalMessages = await Message.count();
        const totalUnread = await Message.count({ where: { status: 'new' } });
        const totalSpam = await Message.count({ where: { isSpam: true } });

        // Get counts by priority
        const priorityCounts = await Message.findAll({
            attributes: [
                'priority',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                isSpam: false
            },
            group: ['priority']
        });

        // Format priority counts
        const priorityCountsFormatted = {};
        priorityCounts.forEach(item => {
            priorityCountsFormatted[item.priority] = parseInt(item.dataValues.count);
        });

        // Get recent message count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentMessages = await Message.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        // Return stats
        return res.status(OK).json(
            formatResponse('Dashboard stats retrieved successfully', {
                stats: {
                    totalMessages,
                    totalUnread,
                    totalSpam,
                    recentMessages,
                    statusCounts: statusCountsFormatted,
                    priorityCounts: priorityCountsFormatted
                }
            })
        );
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Stats Error', error.message)
        );
    }
};

module.exports = {
    createMessage,
    getAllMessages,
    getMessageById,
    updateMessage,
    deleteMessage,
    replyToMessage,
    getDashboardStats
};