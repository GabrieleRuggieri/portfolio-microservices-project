/**
 * Visitor Controller
 * Handles visitor tracking and visitor data retrieval
 */

const { Op } = require('sequelize');
const UAParser = require('ua-parser-js');
const { Visitor, Metric } = require('../models');
const { extractIPInfo } = require('../utils/ip.util');
const { anonymizeIP } = require('../utils/privacy.util');
const { publishEvent } = require('../events/analytics-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Track a visitor session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const trackVisitor = async (req, res) => {
    try {
        // Extract data from request
        const {
            sessionId,
            referrer,
            language,
            screenResolution,
            timeZone,
            userId
        } = req.body;

        if (!sessionId) {
            return res.status(BAD_REQUEST).json(
                formatError('Tracking Error', 'Session ID is required')
            );
        }

        // Get IP info
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const anonymizedIP = anonymizeIP(ipAddress);

        // Parse user agent
        const userAgent = req.headers['user-agent'];
        const uaParser = new UAParser(userAgent);
        const parsedUA = uaParser.getResult();

        // Get geolocation from IP (if available)
        const geoInfo = await extractIPInfo(ipAddress);

        // Check if visitor already exists by session ID
        let visitor = await Visitor.findOne({
            where: { sessionId }
        });

        // If visitor exists, update; otherwise create
        if (visitor) {
            // Update visitor data
            await visitor.update({
                lastVisit: new Date(),
                visitCount: visitor.visitCount + 1,
                // Update the following only if they were not set before
                ipAddress: visitor.ipAddress || anonymizedIP,
                referrer: visitor.referrer || referrer,
                language: visitor.language || language,
                screenResolution: visitor.screenResolution || screenResolution,
                timezone: visitor.timezone || timeZone,
                country: visitor.country || geoInfo.country,
                region: visitor.region || geoInfo.region,
                city: visitor.city || geoInfo.city,
                browser: visitor.browser || parsedUA.browser.name,
                browserVersion: visitor.browserVersion || parsedUA.browser.version,
                os: visitor.os || parsedUA.os.name,
                osVersion: visitor.osVersion || parsedUA.os.version,
                device: visitor.device || getDeviceType(parsedUA),
                userId: visitor.userId || userId
            });
        } else {
            // Create new visitor
            visitor = await Visitor.create({
                sessionId,
                ipAddress: anonymizedIP,
                userAgent,
                referrer,
                language,
                screenResolution,
                timezone: timeZone,
                country: geoInfo.country,
                region: geoInfo.region,
                city: geoInfo.city,
                browser: parsedUA.browser.name,
                browserVersion: parsedUA.browser.version,
                os: parsedUA.os.name,
                osVersion: parsedUA.os.version,
                device: getDeviceType(parsedUA),
                userId
            });

            // Publish new visitor event
            publishEvent('visitor.created', {
                visitorId: visitor.id,
                sessionId,
                country: geoInfo.country || 'unknown',
                device: getDeviceType(parsedUA) || 'unknown'
            });
        }

        return res.status(OK).json(
            formatResponse('Visitor tracked successfully', {
                visitorId: visitor.id,
                sessionId: visitor.sessionId
            })
        );
    } catch (error) {
        console.error('Track visitor error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Tracking Error', 'Could not track visitor')
        );
    }
};

/**
 * Get visitor data by ID (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getVisitorById = async (req, res) => {
    try {
        // Admin authorization check
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access visitor data')
            );
        }

        const { id } = req.params;

        // Find visitor
        const visitor = await Visitor.findByPk(id);

        if (!visitor) {
            return res.status(NOT_FOUND).json(
                formatError('Visitor Error', 'Visitor not found')
            );
        }

        // Get recent metrics for this visitor
        const recentMetrics = await Metric.findAll({
            where: { visitorId: id },
            order: [['timestamp', 'DESC']],
            limit: 20
        });

        return res.status(OK).json(
            formatResponse('Visitor retrieved successfully', {
                visitor,
                recentMetrics
            })
        );
    } catch (error) {
        console.error('Get visitor error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Visitor Error', error.message)
        );
    }
};

/**
 * Get all visitors with pagination and filtering (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllVisitors = async (req, res) => {
    try {
        // Admin authorization check
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access visitor data')
            );
        }

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Filter parameters
        const {
            country,
            device,
            browser,
            os,
            startDate,
            endDate
        } = req.query;

        // Build query conditions
        const where = {};

        if (country) {
            where.country = country;
        }

        if (device) {
            where.device = device;
        }

        if (browser) {
            where.browser = browser;
        }

        if (os) {
            where.os = os;
        }

        // Add date range filter
        if (startDate) {
            where.firstVisit = { ...where.firstVisit, [Op.gte]: new Date(startDate) };
        }

        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            where.firstVisit = { ...where.firstVisit, [Op.lte]: endDateTime };
        }

        // Get visitors with count
        const { count, rows: visitors } = await Visitor.findAndCountAll({
            where,
            order: [['lastVisit', 'DESC']],
            limit,
            offset
        });

        // Calculate pagination info
        const totalPages = Math.ceil(count / limit);

        return res.status(OK).json(
            formatResponse('Visitors retrieved successfully', {
                visitors,
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
        console.error('Get all visitors error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Visitor Error', error.message)
        );
    }
};

/**
 * Get visitor statistics (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getVisitorStats = async (req, res) => {
    try {
        // Admin authorization check
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access visitor statistics')
            );
        }

        // Time periods
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        const lastMonthStart = new Date(today);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

        // Get visitor counts for different time periods
        const totalVisitors = await Visitor.count();

        const newVisitorsToday = await Visitor.count({
            where: {
                firstVisit: {
                    [Op.gte]: today
                }
            }
        });

        const returningVisitorsToday = await Visitor.count({
            where: {
                firstVisit: {
                    [Op.lt]: today
                },
                lastVisit: {
                    [Op.gte]: today
                }
            }
        });

        const newVisitorsLastWeek = await Visitor.count({
            where: {
                firstVisit: {
                    [Op.gte]: lastWeekStart,
                    [Op.lt]: today
                }
            }
        });

        const newVisitorsLastMonth = await Visitor.count({
            where: {
                firstVisit: {
                    [Op.gte]: lastMonthStart,
                    [Op.lt]: today
                }
            }
        });

        // Get top countries
        const topCountries = await Visitor.findAll({
            attributes: [
                'country',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                country: {
                    [Op.ne]: null
                }
            },
            group: ['country'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 10
        });

        // Get device breakdown
        const deviceBreakdown = await Visitor.findAll({
            attributes: [
                'device',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                device: {
                    [Op.ne]: null
                }
            },
            group: ['device'],
            order: [[sequelize.literal('count'), 'DESC']]
        });

        // Get browser breakdown
        const browserBreakdown = await Visitor.findAll({
            attributes: [
                'browser',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                browser: {
                    [Op.ne]: null
                }
            },
            group: ['browser'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 5
        });

        // Get OS breakdown
        const osBreakdown = await Visitor.findAll({
            attributes: [
                'os',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                os: {
                    [Op.ne]: null
                }
            },
            group: ['os'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 5
        });

        // Format data for response
        const stats = {
            totalVisitors,
            newVisitorsToday,
            returningVisitorsToday,
            newVisitorsLastWeek,
            newVisitorsLastMonth,
            topCountries: topCountries.map(c => ({
                country: c.country,
                count: parseInt(c.dataValues.count)
            })),
            deviceBreakdown: deviceBreakdown.map(d => ({
                device: d.device,
                count: parseInt(d.dataValues.count)
            })),
            browserBreakdown: browserBreakdown.map(b => ({
                browser: b.browser,
                count: parseInt(b.dataValues.count)
            })),
            osBreakdown: osBreakdown.map(o => ({
                os: o.os,
                count: parseInt(o.dataValues.count)
            }))
        };

        return res.status(OK).json(
            formatResponse('Visitor statistics retrieved successfully', { stats })
        );
    } catch (error) {
        console.error('Get visitor stats error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Statistics Error', error.message)
        );
    }
};

/**
 * Determine device type from user agent
 * @param {Object} parsedUA - Parsed user agent
 * @returns {string} Device type
 */
function getDeviceType(parsedUA) {
    const device = parsedUA.device.type || '';

    if (device === 'mobile') return 'mobile';
    if (device === 'tablet') return 'tablet';
    if (device === 'smarttv') return 'smart tv';
    if (device === 'console') return 'game console';
    if (device === 'wearable') return 'wearable';

    return 'desktop'; // Default to desktop
}

module.exports = {
    trackVisitor,
    getVisitorById,
    getAllVisitors,
    getVisitorStats
};