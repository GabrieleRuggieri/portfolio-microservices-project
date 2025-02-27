/**
 * Database Utility
 * Initializes the database connection using Sequelize
 */

const { Sequelize } = require('sequelize');
const config = require('../config/auth.config');

// Create Sequelize instance
const sequelize = new Sequelize(
    config.database.database,
    config.database.username,
    config.database.password,
    {
        host: config.database.host,
        port: config.database.port,
        dialect: config.database.dialect,
        pool: {
            max: config.database.pool.max,
            min: config.database.pool.min,
            acquire: config.database.pool.acquire,
            idle: config.database.pool.idle
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        timezone: '+00:00', // UTC timezone
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            timestamps: true,
            underscored: true,
            freezeTableName: false
        }
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