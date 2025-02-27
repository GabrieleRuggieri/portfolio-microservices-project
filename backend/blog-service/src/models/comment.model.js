/**
 * Comment Model
 * Defines the blog comment schema
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Comment = sequelize.define('Comment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    articleId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID of the article this comment belongs to'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Comment content'
    },
    authorId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID of the comment author (user)'
    },
    authorName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Name of the comment author'
    },
    authorAvatar: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to author avatar'
    },
    parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Parent comment ID for nested comments'
    },
    approved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the comment is approved'
    },
    approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID of the user who approved the comment'
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date when comment was approved'
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'IP address of the commenter'
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User agent of the commenter'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'comments',
    indexes: [
        {
            fields: ['articleId']
        },
        {
            fields: ['authorId']
        },
        {
            fields: ['parentId']
        },
        {
            fields: ['approved']
        }
    ],
    hooks: {
        // Before creating a comment, approve it automatically if author is an admin
        beforeCreate: async (comment, options) => {
            // Check if user has admin role (handled in controller)
            if (options.isAdmin) {
                comment.approved = true;
                comment.approvedAt = new Date();
                comment.approvedBy = comment.authorId;
            }
        }
    }
});

module.exports = Comment;