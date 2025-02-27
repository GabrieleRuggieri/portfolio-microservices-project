/**
 * Database Configuration
 * Contains database connection settings for the profile service
 */

module.exports = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'portfolio_profile',
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    timezone: '+00:00', // Set timezone to UTC
    logging: process.env.NODE_ENV === 'development',
    define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        timestamps: true,
        underscored: true, // Use snake_case for fields
        freezeTableName: false, // Pluralize table names
        paranoid: true // Use soft deletes
    }
};