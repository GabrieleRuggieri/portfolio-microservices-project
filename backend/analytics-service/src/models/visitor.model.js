/**
 * Visitor Model
 * Defines the visitor/session schema for analytics
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Visitor = sequelize.define('Visitor', {
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
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Visitor IP address (anonymized for privacy)'
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Visitor browser user agent'
    },
    referrer: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Referrer URL (where visitor came from)'
    },
    firstVisit: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Time of first visit'
    },
    lastVisit: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Time of most recent visit'
    },
    visitCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of visits (sessions)'
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Visitor country (from IP)'
    },
    region: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Visitor region/state (from IP)'
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Visitor city (from IP)'
    },
    timezone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Visitor timezone'
    },
    language: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Visitor browser language'
    },
    browser: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Visitor browser (parsed from user agent)'
    },
    browserVersion: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Browser version'
    },
    os: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Operating system (parsed from user agent)'
    },
    osVersion: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'OS version'
    },
    device: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Device type (desktop, mobile, tablet)'
    },
    screenResolution: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Visitor screen resolution'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User ID (if authenticated)'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'visitors',
    indexes: [
        {
            fields: ['sessionId']
        },
        {
            fields: ['firstVisit']
        },
        {
            fields: ['ipAddress']
        },
        {
            fields: ['userId']
        },
        {
            fields: ['country']
        },
        {
            fields: ['device']
        }
    ]
});

module.exports = Visitor;