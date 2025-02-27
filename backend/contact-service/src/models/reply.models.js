/**
 * Reply Model
 * Defines the schema for replies to contact messages
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Reply = sequelize.define('Reply', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    messageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'messages',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'ID of the original message'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID of the user who sent the reply'
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Name of the user who sent the reply'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Reply content'
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the reply was sent via email'
    },
    emailStatus: {
        type: DataTypes.ENUM('pending', 'sent', 'failed'),
        defaultValue: 'pending',
        comment: 'Status of email delivery'
    },
    emailError: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if email sending failed'
    },
    internal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this is an internal note (not sent to contact)'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'replies',
    indexes: [
        {
            fields: ['messageId']
        },
        {
            fields: ['userId']
        },
        {
            fields: ['createdAt']
        }
    ]
});

module.exports = Reply;