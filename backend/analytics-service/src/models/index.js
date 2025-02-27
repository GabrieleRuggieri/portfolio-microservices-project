/**
 * Models Index
 * Configures relationships between models and exports them
 */

const Visitor = require('./visitor.model');
const Metric = require('./metric.model');

// Define relationships between models
Visitor.hasMany(Metric, {
    foreignKey: 'visitorId',
    as: 'metrics',
    onDelete: 'CASCADE'
});

Metric.belongsTo(Visitor, {
    foreignKey: 'visitorId',
    as: 'visitor'
});

module.exports = {
    Visitor,
    Metric
};