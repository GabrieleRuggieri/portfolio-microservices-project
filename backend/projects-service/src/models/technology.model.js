/**
 * Technology Model
 * Defines the technologies used in projects
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Technology = sequelize.define('Technology', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'projects',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'ID of the project this technology is used in'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Name of the technology (e.g., "React", "Node.js")'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Category of the technology (e.g., "Frontend", "Backend", "Database")'
    },
    logoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to the technology logo'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description of how the technology was used in the project'
    },
    version: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Version of the technology used'
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Display order for the technology (lower numbers shown first)'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'technologies',
    indexes: [
        {
            fields: ['projectId']
        },
        {
            fields: ['name']
        },
        {
            fields: ['category']
        }
    ]
});

module.exports = Technology;