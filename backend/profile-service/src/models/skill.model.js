/**
 * Skill Model
 * Defines the user skills schema
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Skill = sequelize.define('Skill', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Name of the skill, e.g. "JavaScript"'
    },
    level: {
        type: DataTypes.ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert'),
        defaultValue: 'Intermediate',
        allowNull: false,
        comment: 'Proficiency level'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Skill category, e.g. "Programming Language", "Framework", "Tool"'
    },
    yearsOfExperience: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
        comment: 'Years of experience with this skill'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'skills',
    indexes: [
        {
            unique: true,
            fields: ['profileId', 'name']
        }
    ]
});

module.exports = Skill;