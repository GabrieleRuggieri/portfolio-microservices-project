/**
 * Log Controller
 * Handles log-related operations
 */

const { LogEntry } = require('../models');
const { formatSuccess, formatError } = require('../../../shared/utils/response-formatter');
const { OK, CREATED, NOT_FOUND, BAD_REQUEST } = require('../../../shared/utils/http-status');
const { Op } = require('sequelize');

/**
 * Create a new log entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createLog = async (req, res) => {
    try {
        const {
            level,
            service,
            message,
            metadata
        } = req.body;

        // Create log entry
        const logEntry = await LogEntry.create({
            level,
            service,
            message,
            metadata: metadata || {}
        });

        res.status(CREATED).json(
            formatSuccess('Log created successfully', logEntry)
        );
    } catch (error) {
        console.error('Error creating log:', error);
        res.status(BAD_REQUEST).json(
            formatError('Log creation failed', error.message)
        );
    }
};

/**
 * Search logs with advanced filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchLogs = async (req, res) => {
    try {
        const {
            service,
            level,
            startTime,
            endTime,
            page = 1,
            pageSize = 50
        } = req.query;

        // Prepare filter conditions
        const whereConditions = {};

        // Add service filter
        if (service) {
            whereConditions.service = service;
        }

        // Add level filter
        if (level) {
            whereConditions.level = level;
        }

        // Add time range filter
        if (startTime || endTime) {
            whereConditions.createdAt = {};
            if (startTime) whereConditions.createdAt[Op.gte] = new Date(startTime);
            if (endTime) whereConditions.createdAt[Op.lte] = new Date(endTime);
        }

        // Perform search with pagination
        const { count, rows: logs } = await LogEntry.findAndCountAll({
            where: whereConditions,
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: (page - 1) * pageSize
        });

        res.status(OK).json(
            formatSuccess('Logs retrieved successfully', {
                total: count,
                page: Number(page),
                pageSize: Number(pageSize),
                logs
            })
        );
    } catch (error) {
        console.error('Error searching logs:', error);
        res.status(BAD_REQUEST).json(
            formatError('Log search failed', error.message)
        );
    }
};

/**
 * Get log entry by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLogById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find log entry
        const logEntry = await LogEntry.findByPk(id);

        if (!logEntry) {
            return res.status(NOT_FOUND).json(
                formatError('Log not found', 'No log entry found with the given ID')
            );
        }

        res.status(OK).json(
            formatSuccess('Log retrieved successfully', logEntry)
        );
    } catch (error) {
        console.error('Error retrieving log:', error);
        res.status(BAD_REQUEST).json(
            formatError('Log retrieval failed', error.message)
        );
    }
};

/**
 * Delete log entry by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteLog = async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete log entry
        const deletedCount = await LogEntry.destroy({
            where: { id }
        });

        if (deletedCount === 0) {
            return res.status(NOT_FOUND).json(
                formatError('Log not found', 'No log entry found with the given ID')
            );
        }

        res.status(OK).json(
            formatSuccess('Log deleted successfully', { deletedCount })
        );
    } catch (error) {
        console.error('Error deleting log:', error);
        res.status(BAD_REQUEST).json(
            formatError('Log deletion failed', error.message)
        );
    }
};

module.exports = {
    createLog,
    searchLogs,
    getLogById,
    deleteLog
};