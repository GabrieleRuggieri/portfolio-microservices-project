/**
 * Authentication Service Entry Point
 * Initializes the auth service
 */

const server = require('./server');
const config = require('./config/auth.config');
const { testConnection, initDatabase } = require('./utils/database.util');
const User = require('./models/user.model');
const bcrypt = require('bcrypt');

// Server port
const PORT = config.server.port;
const HOST = config.server.host;

// Start the server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('Failed to connect to database. Exiting...');
            process.exit(1);
        }

        // Initialize database (sync models)
        await initDatabase(process.env.NODE_ENV === 'development' && process.env.DB_FORCE_SYNC === 'true');

        // Create admin user if it doesn't exist (only in development)
        if (process.env.NODE_ENV === 'development' || process.env.SEED_ADMIN === 'true') {
            await seedAdminUser();
        }

        // Start the server
        server.listen(PORT, HOST, () => {
            console.log(`Auth Service running on http://${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

/**
 * Seed admin user for development and testing
 */
const seedAdminUser = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });

        if (!existingAdmin) {
            // Hash password
            const hashedPassword = await bcrypt.hash(
                process.env.ADMIN_PASSWORD || 'Admin123!',
                config.password.saltRounds
            );

            // Create admin user
            const admin = await User.create({
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
                roles: ['admin', 'user'],
                isVerified: true,
                active: true
            });

            console.log(`Admin user created with email: ${admin.email}`);
        } else {
            console.log('Admin user already exists');
        }
    } catch (error) {
        console.error('Error seeding admin user:', error);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Graceful shutdown
 */
function gracefulShutdown() {
    console.log('Received kill signal, shutting down gracefully...');

    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

// Start the server
startServer();