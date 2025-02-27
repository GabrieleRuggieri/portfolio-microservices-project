/**
 * Metrics Controller
 * Handles tracking events and retrieving analytics metrics
 */

const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../utils/database.util');
const { Metric, Visitor } = require('../models');
const { anonymizeIP } = require('../utils/privacy.util');
const { publishEvent } = require('../events/analytics-events');
const { formatResponse, formatError } = require('../../../shared/utils/response-formatter');
const { CREATED, OK, NOT_FOUND, BAD_REQUEST, FORBIDDEN } = require('../../../shared/utils/http-status');

/**
 * Track a metric/event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const trackEvent = async (req, res) => {
    try {
        // Extract data from request
        const {
            sessionId,
            eventType,
            eventCategory,
            eventAction,
            eventLabel,
            eventValue,
            pagePath,
            pageTitle,
            pageReferrer,
            timeOnPage,
            customData,
            userId
        } = req.body;

        if (!sessionId || !eventType) {
            return res.status(BAD_REQUEST).json(
                formatError('Tracking Error', 'Session ID and event type are required')
            );
        }

        // Get IP and anonymize it
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const anonymizedIP = anonymizeIP(ipAddress);

        // Find visitor by session ID
        const visitor = await Visitor.findOne({
            where: { sessionId }
        });

        // Create metric
        const metric = await Metric.create({
            sessionId,
            visitorId: visitor ? visitor.id : null,
            userId: userId || (visitor ? visitor.userId : null),
            eventType,
            eventCategory,
            eventAction,
            eventLabel,
            eventValue,
            pagePath,
            pageTitle,
            pageReferrer,
            timeOnPage,
            customData,
            ipAddress: anonymizedIP,
            userAgent: req.headers['user-agent']
        });

        // If it's a pageview, publish an event
        if (eventType === 'pageview') {
            publishEvent('pageview.tracked', {
                metricId: metric.id,
                sessionId,
                visitorId: visitor ? visitor.id : null,
                pagePath,
                pageTitle
            });
        }

        return res.status(CREATED).json(
            formatResponse('Event tracked successfully', {
                metricId: metric.id
            })
        );
    } catch (error) {
        console.error('Track event error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Tracking Error', 'Could not track event')
        );
    }
};

/**
 * Get page view metrics (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPageViewMetrics = async (req, res) => {
    try {
        // Admin authorization check
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access analytics data')
            );
        }

        // Time period filter
        const { startDate, endDate } = req.query;
        const where = {
            eventType: 'pageview'
        };

        if (startDate) {
            where.timestamp = { ...where.timestamp, [Op.gte]: new Date(startDate) };
        }

        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            where.timestamp = { ...where.timestamp, [Op.lte]: endDateTime };
        }

        // Get total page views
        const totalPageViews = await Metric.count({
            where
        });

        // Get unique page views (based on session ID)
        const uniquePageViews = await Metric.count({
            where,
            distinct: true,
            col: 'sessionId'
        });

        // Get top pages
        const topPages = await Metric.findAll({
            attributes: [
                'pagePath',
                'pageTitle',
                [sequelize.fn('COUNT', sequelize.col('id')), 'viewCount']
            ],
            where,
            group: ['pagePath'],
            order: [[sequelize.literal('viewCount'), 'DESC']],
            limit: 10
        });

        // Get average time on page
        const avgTimeOnPage = await Metric.findAll({
            attributes: [
                [sequelize.fn('AVG', sequelize.col('timeOnPage')), 'avgTime']
            ],
            where: {
                ...where,
                timeOnPage: {
                    [Op.ne]: null,
                    [Op.gt]: 0,
                    [Op.lt]: 3600 // Filter out unrealistically high values (>1 hour)
                }
            }
        });

        // Get page views over time (daily)
        const pageViewsOverTime = await sequelize.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM metrics
      WHERE eventType = 'pageview'
      ${startDate ? `AND timestamp >= '${startDate}'` : ''}
      ${endDate ? `AND timestamp <= '${endDate}'` : ''}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `, {
            type: QueryTypes.SELECT
        });

        // Get referrers
        const topReferrers = await Metric.findAll({
            attributes: [
                'pageReferrer',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                ...where,
                pageReferrer: {
                    [Op.ne]: null,
                    [Op.ne]: ''
                }
            },
            group: ['pageReferrer'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 10
        });

        // Format data for response
        const metrics = {
            totalPageViews,
            uniquePageViews,
            avgTimeOnPage: avgTimeOnPage[0]?.dataValues?.avgTime ? Math.round(avgTimeOnPage[0].dataValues.avgTime) : 0,
            topPages: topPages.map(p => ({
                pagePath: p.pagePath,
                pageTitle: p.pageTitle,
                viewCount: parseInt(p.dataValues.viewCount)
            })),
            pageViewsOverTime,
            topReferrers: topReferrers.map(r => ({
                referrer: r.pageReferrer,
                count: parseInt(r.dataValues.count)
            }))
        };

        return res.status(OK).json(
            formatResponse('Page view metrics retrieved successfully', { metrics })
        );
    } catch (error) {
        console.error('Get page view metrics error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Metrics Error', error.message)
        );
    }
};

/**
 * Get event metrics (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getEventMetrics = async (req, res) => {
    try {
        // Admin authorization check
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access analytics data')
            );
        }

        // Time period filter
        const { startDate, endDate, eventType, eventCategory } = req.query;
        const where = {
            eventType: { [Op.ne]: 'pageview' } // Exclude page views
        };

        if (startDate) {
            where.timestamp = { ...where.timestamp, [Op.gte]: new Date(startDate) };
        }

        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            where.timestamp = { ...where.timestamp, [Op.lte]: endDateTime };
        }

        if (eventType && eventType !== 'all') {
            where.eventType = eventType;
        }

        if (eventCategory) {
            where.eventCategory = eventCategory;
        }

        // Get total events
        const totalEvents = await Metric.count({
            where
        });

        // Get event types breakdown
        const eventTypes = await Metric.findAll({
            attributes: [
                'eventType',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                ...where,
                eventType: { [Op.ne]: null }
            },
            group: ['eventType'],
            order: [[sequelize.literal('count'), 'DESC']]
        });

        // Get event categories breakdown
        const eventCategories = await Metric.findAll({
            attributes: [
                'eventCategory',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                ...where,
                eventCategory: { [Op.ne]: null }
            },
            group: ['eventCategory'],
            order: [[sequelize.literal('count'), 'DESC']]
        });

        // Get top events (action + label combinations)
        const topEvents = await Metric.findAll({
            attributes: [
                'eventAction',
                'eventLabel',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                ...where,
                eventAction: { [Op.ne]: null }
            },
            group: ['eventAction', 'eventLabel'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 20
        });

        // Get events over time (daily)
        const eventsOverTime = await sequelize.query(`
      SELECT 
        DATE(timestamp) as date,
        eventType,
        COUNT(*) as count
      FROM metrics
      WHERE eventType != 'pageview'
      ${startDate ? `AND timestamp >= '${startDate}'` : ''}
      ${endDate ? `AND timestamp <= '${endDate}'` : ''}
      ${eventType && eventType !== 'all' ? `AND eventType = '${eventType}'` : ''}
      ${eventCategory ? `AND eventCategory = '${eventCategory}'` : ''}
      GROUP BY DATE(timestamp), eventType
      ORDER BY date ASC, eventType
    `, {
            type: QueryTypes.SELECT
        });

        // Format data for response
        const metrics = {
            totalEvents,
            eventTypes: eventTypes.map(et => ({
                type: et.eventType,
                count: parseInt(et.dataValues.count)
            })),
            eventCategories: eventCategories.map(ec => ({
                category: ec.eventCategory,
                count: parseInt(ec.dataValues.count)
            })),
            topEvents: topEvents.map(e => ({
                action: e.eventAction,
                label: e.eventLabel,
                count: parseInt(e.dataValues.count)
            })),
            eventsOverTime
        };

        return res.status(OK).json(
            formatResponse('Event metrics retrieved successfully', { metrics })
        );
    } catch (error) {
        console.error('Get event metrics error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Metrics Error', error.message)
        );
    }
};

/**
 * Get dashboard metrics (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardMetrics = async (req, res) => {
    try {
        // Admin authorization check
        if (!req.user.roles.includes('admin')) {
            return res.status(FORBIDDEN).json(
                formatError('Permission Error', 'You do not have permission to access analytics data')
            );
        }

        // Time periods
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);

        const last30Days = new Date(today);
        last30Days.setMonth(last30Days.getMonth() - 1);

        // Get page view counts for different time periods
        const pageViewsToday = await Metric.count({
            where: {
                eventType: 'pageview',
                timestamp: { [Op.gte]: today }
            }
        });

        const pageViewsYesterday = await Metric.count({
            where: {
                eventType: 'pageview',
                timestamp: { [Op.gte]: yesterday, [Op.lt]: today }
            }
        });

        const pageViewsLast7Days = await Metric.count({
            where: {
                eventType: 'pageview',
                timestamp: { [Op.gte]: last7Days }
            }
        });

        const pageViewsLast30Days = await Metric.count({
            where: {
                eventType: 'pageview',
                timestamp: { [Op.gte]: last30Days }
            }
        });

        // Get unique visitor counts
        const visitorsToday = await Visitor.count({
            where: {
                lastVisit: { [Op.gte]: today }
            }
        });

        const visitorsYesterday = await Visitor.count({
            where: {
                lastVisit: { [Op.gte]: yesterday, [Op.lt]: today }
            }
        });

        const visitorsLast7Days = await Visitor.count({
            where: {
                lastVisit: { [Op.gte]: last7Days }
            }
        });

        const visitorsLast30Days = await Visitor.count({
            where: {
                lastVisit: { [Op.gte]: last30Days }
            }
        });

        // Get new visitor counts
        const newVisitorsToday = await Visitor.count({
            where: {
                firstVisit: { [Op.gte]: today }
            }
        });

        const newVisitorsYesterday = await Visitor.count({
            where: {
                firstVisit: { [Op.gte]: yesterday, [Op.lt]: today }
            }
        });

        const newVisitorsLast7Days = await Visitor.count({
            where: {
                firstVisit: { [Op.gte]: last7Days }
            }
        });

        const newVisitorsLast30Days = await Visitor.count({
            where: {
                firstVisit: { [Op.gte]: last30Days }
            }
        });

        // Get top pages (last 30 days)
        const topPages = await Metric.findAll({
            attributes: [
                'pagePath',
                'pageTitle',
                [sequelize.fn('COUNT', sequelize.col('id')), 'viewCount']
            ],
            where: {
                eventType: 'pageview',
                timestamp: { [Op.gte]: last30Days }
            },
            group: ['pagePath'],
            order: [[sequelize.literal('viewCount'), 'DESC']],
            limit: 5
        });

        // Get traffic over time (last 14 days)
        const last14Days = new Date(today);
        last14Days.setDate(last14Days.getDate() - 14);

        const trafficByDay = await sequelize.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(DISTINCT sessionId) as visitors,
        COUNT(*) as pageviews
      FROM metrics
      WHERE eventType = 'pageview'
      AND timestamp >= '${last14Days.toISOString()}'
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `, {
            type: QueryTypes.SELECT
        });

        // Format data for response
        const metrics = {
            pageViews: {
                today: pageViewsToday,
                yesterday: pageViewsYesterday,
                last7Days: pageViewsLast7Days,
                last30Days: pageViewsLast30Days
            },
            visitors: {
                today: visitorsToday,
                yesterday: visitorsYesterday,
                last7Days: visitorsLast7Days,
                last30Days: visitorsLast30Days
            },
            newVisitors: {
                today: newVisitorsToday,
                yesterday: newVisitorsYesterday,
                last7Days: newVisitorsLast7Days,
                last30Days: newVisitorsLast30Days
            },
            topPages: topPages.map(p => ({
                pagePath: p.pagePath,
                pageTitle: p.pageTitle,
                viewCount: parseInt(p.dataValues.viewCount)
            })),
            trafficByDay
        };

        return res.status(OK).json(
            formatResponse('Dashboard metrics retrieved successfully', { metrics })
        );
    } catch (error) {
        console.error('Get dashboard metrics error:', error);
        return res.status(BAD_REQUEST).json(
            formatError('Metrics Error', error.message)
        );
    }
};

module.exports = {
    trackEvent,
    getPageViewMetrics,
    getEventMetrics,
    getDashboardMetrics
};