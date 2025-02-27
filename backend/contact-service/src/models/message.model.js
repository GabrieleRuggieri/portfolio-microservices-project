/**
 * Message Model
 * Defines the contact message schema
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Sender name'
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        },
        comment: 'Sender email address'
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Message subject'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Message content'
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Sender phone number (optional)'
    },
    company: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Sender company (optional)'
    },
    status: {
        type: DataTypes.ENUM('new', 'read', 'replied', 'spam', 'archived'),
        defaultValue: 'new',
        comment: 'Current status of the message'
    },
    priority: {
        type: DataTypes.ENUM('low', 'normal', 'high'),
        defaultValue: 'normal',
        comment: 'Message priority'
    },
    assignedTo: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User ID of the person assigned to handle this message'
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the message was read'
    },
    repliedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the message was replied to'
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'IP address of the sender'
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User agent of the sender'
    },
    referrer: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Referrer URL'
    },
    isSpam: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this message is marked as spam'
    },
    source: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Source of the contact form (e.g., "contact page", "project inquiry")'
    },
    tags: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Comma-separated list of tags'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Internal notes about this message'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'messages',
    indexes: [
        {
            fields: ['email']
        },
        {
            fields: ['status']
        },
        {
            fields: ['priority']
        },
        {
            fields: ['assignedTo']
        },
        {
            fields: ['createdAt']
        }
    ]
});

module.exports = Message;