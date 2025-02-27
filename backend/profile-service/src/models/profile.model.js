/**
 * Profile Model
 * Defines the user profile schema
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Profile = sequelize.define('Profile', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Professional title, e.g. "Full Stack Developer"'
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Short biography or summary'
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'City, State, Country'
    },
    website: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true
        },
        comment: 'Personal website URL'
    },
    github: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'GitHub username or URL'
    },
    linkedin: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'LinkedIn username or URL'
    },
    twitter: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Twitter username or URL'
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to profile picture'
    },
    resumeUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to resume/CV file'
    },
    isAvailableForHire: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Indicates if user is actively seeking opportunities'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Profile visibility status'
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of profile views'
    },
    lastViewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last time profile was viewed'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'profiles',
    indexes: [
        {
            unique: true,
            fields: ['userId']
        }
    ],
    hooks: {
        // Hook to update skills and experiences when profile is restored
        afterRestore: async (profile) => {
            const { Skill, Experience } = require('./index');

            // Restore related skills
            await Skill.restore({ where: { profileId: profile.id } });

            // Restore related experiences
            await Experience.restore({ where: { profileId: profile.id } });
        }
    }
});

module.exports = Profile;