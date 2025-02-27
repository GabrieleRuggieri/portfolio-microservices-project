/**
 * Experience Model
 * Defines the user work experience schema
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Experience = sequelize.define('Experience', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    profileId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'profiles',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Job title'
    },
    company: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Company name'
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Job location (city, state, country or remote)'
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Start date of job (YYYY-MM-DD)'
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'End date of job (YYYY-MM-DD), null if current position'
    },
    isCurrentPosition: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flag indicating if this is the current position'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Job description and responsibilities'
    },
    employmentType: {
        type: DataTypes.ENUM(
            'Full-time',
            'Part-time',
            'Contract',
            'Freelance',
            'Internship',
            'Apprenticeship',
            'Volunteer'
        ),
        defaultValue: 'Full-time',
        allowNull: false,
        comment: 'Type of employment'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'experiences',
    indexes: [
        {
            fields: ['profileId']
        },
        {
            fields: ['startDate']
        }
    ],
    // Validate that endDate is after startDate
    validate: {
        endDateAfterStartDate() {
            if (this.endDate && this.startDate && this.endDate < this.startDate) {
                throw new Error('End date cannot be before start date');
            }

            // If current position, endDate should be null
            if (this.isCurrentPosition && this.endDate) {
                throw new Error('Current positions cannot have an end date');
            }

            // If not current position, endDate is required
            if (!this.isCurrentPosition && !this.endDate) {
                throw new Error('End date is required for past positions');
            }
        }
    }
});

module.exports = Experience;