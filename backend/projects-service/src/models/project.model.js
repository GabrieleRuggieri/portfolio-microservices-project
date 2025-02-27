/**
 * Project Model
 * Defines the project schema
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID of the user who owns the project'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Project title'
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'URL-friendly version of the title'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detailed project description'
    },
    summary: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Short summary of the project'
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to the project cover image'
    },
    demoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to live demo of the project'
    },
    githubUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to the GitHub repository'
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Project start date'
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Project completion date, null if ongoing'
    },
    isOngoing: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flag indicating if the project is still in progress'
    },
    isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flag indicating if the project is published and visible to the public'
    },
    isPinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flag indicating if the project is pinned to the top of the list'
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Custom ordering for display (higher numbers shown first)'
    },
    role: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'User\'s role in the project (e.g., "Frontend Developer", "Team Lead")'
    },
    teamSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Number of people involved in the project'
    },
    challenges: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description of challenges faced during the project'
    },
    solutions: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Description of solutions implemented for challenges'
    },
    featuredImage1: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to additional project image'
    },
    featuredImage2: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to additional project image'
    },
    featuredImage3: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to additional project image'
    },
    viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of times the project has been viewed'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'projects',
    indexes: [
        {
            unique: true,
            fields: ['slug']
        },
        {
            fields: ['userId']
        },
        {
            fields: ['createdAt']
        },
        {
            fields: ['isPublished', 'isPinned', 'order']
        }
    ],
    hooks: {
        // Generate slug from title
        beforeValidate: (project) => {
            if (project.title && (!project.slug || project.changed('title'))) {
                project.slug = project.title
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '') // Remove non-word chars
                    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
                    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

                // Add random string to guarantee uniqueness
                if (project.isNewRecord) {
                    const randomString = Math.random().toString(36).substring(2, 8);
                    project.slug = `${project.slug}-${randomString}`;
                }
            }
        },

        // Hook to update technologies when project is restored
        afterRestore: async (project) => {
            const { Technology } = require('./index');

            // Restore related technologies
            await Technology.restore({ where: { projectId: project.id } });
        }
    }
});

module.exports = Project;