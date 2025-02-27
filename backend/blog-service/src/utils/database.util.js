/**
 * Database Utility
 * Initializes the database connection using Sequelize
 */

const { Sequelize } = require('sequelize');
const config = require('../config/db.config');

// Create Sequelize instance
const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        pool: config.pool,
        timezone: config.timezone,
        logging: config.logging,
        define: config.define
    }
);

// Test connection function
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        return true;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return false;
    }
};

// Initialize database function
const initDatabase = async (force = false) => {
    try {
        console.log(`Initializing database, force sync: ${force}`);

        // Sync models with database
        await sequelize.sync({ force });

        console.log(`Database synchronized${force ? ' (tables recreated)' : ''}`);
        return true;
    } catch (error) {
        console.error('Error synchronizing database:', error);
        return false;
    }
};

module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.initDatabase = initDatabase;