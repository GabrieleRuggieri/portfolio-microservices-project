/**
 * Metric Model
 * Defines the metrics/events schema for analytics
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Metric = sequelize.define('Metric', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Client-side generated session ID'
    },
    visitorId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'visitors',
            key: 'id'
        },
        comment: 'Reference to visitor'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User ID (if authenticated)'
    },
    eventType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Type of event (pageview, click, etc.)'
    },
    eventCategory: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Event category (navigation, engagement, etc.)'
    },
    eventAction: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Action performed (click, submit, etc.)'
    },
    eventLabel: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Additional context for the event'
    },
    eventValue: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Numeric value associated with the event'
    },
    pagePath: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL path of the page where event occurred'
    },
    pageTitle: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Title of the page where event occurred'
    },
    pageReferrer: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Referrer URL for this pageview'
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the event occurred'
    },
    timeOnPage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time spent on page in seconds'
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'IP address (anonymized)'
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User agent string'
    },
    customData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional event-specific data'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'metrics',
    indexes: [
        {
            fields: ['sessionId']
        },
        {
            fields: ['visitorId']
        },
        {
            fields: ['eventType']
        },
        {
            fields: ['timestamp']
        },
        {
            fields: ['pagePath']
        },
        {
            fields: ['userId']
        }
    ]
});

module.exports = Metric;