/**
 * Models Index
 * Configures relationships between models and exports them
 */

const Project = require('./project.model');
const Technology = require('./technology.model');

// Define relationships between models
Project.hasMany(Technology, {
    foreignKey: 'projectId',
    as: 'technologies',
    onDelete: 'CASCADE'
});

Technology.belongsTo(Project, {
    foreignKey: 'projectId',
    as: 'project'
});

module.exports = {
    Project,
    Technology
};