/**
 * Models Index
 * Configures relationships between models and exports them
 */

const Profile = require('./profile.model');
const Skill = require('./skill.model');
const Experience = require('./experience.model');

// Define relationships between models
Profile.hasMany(Skill, {
    foreignKey: 'profileId',
    as: 'skills',
    onDelete: 'CASCADE'
});
Skill.belongsTo(Profile, {
    foreignKey: 'profileId',
    as: 'profile'
});

Profile.hasMany(Experience, {
    foreignKey: 'profileId',
    as: 'experiences',
    onDelete: 'CASCADE'
});
Experience.belongsTo(Profile, {
    foreignKey: 'profileId',
    as: 'profile'
});

module.exports = {
    Profile,
    Skill,
    Experience
};