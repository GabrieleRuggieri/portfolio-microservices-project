/**
 * Logger Service Entry Point
 * Initializes the Elasticsearch-based logging service
 */

const server = require('./server');
const { testConnection, initDatabase } = require('./utils/database.util');
const { LogEntry } = require('./models');

// Server port
const PORT = process.env.PORT || 3015;
const HOST = process.env.HOST || '0.0.0.0';

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
        const dbSync = await initDatabase(process.env.NODE_ENV === 'development' && process.env.DB_FORCE_SYNC === 'true');
        if (!dbSync) {
            console.error('Failed to sync database. Exiting...');
            process.exit(1);
        }

        // Seed sample data if in development
        if (process.env.NODE_ENV === 'development' && process.env.SEED_DATA === 'true') {
            await seedSampleData();
        }

        // Start the server
        server.listen(PORT, HOST, () => {
            console.log(`Logger Service running on http://${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

/**
 * Seed sample log data for development
 */
const seedSampleData = async () => {
    try {
        // Check if sample data already exists
        const existingLogs = await LogEntry.count();

        if (existingLogs > 0) {
            console.log('Sample log data already exists, skipping seed');
            return;
        }

        console.log('Seeding sample log data...');

        // Create sample log entries
        const sampleLogs = await LogEntry.bulkCreate([
            {
                level: 'info',
                service: 'auth-service',
                message: 'User login successful',
                metadata: {
                    userId: '123',
                    ipAddress: '192.168.1.1'
                }
            },
            {
                level: 'warn',
                service: 'profile-service',
                message: 'Profile update attempted with invalid data',
                metadata: {
                    userId: '456',
                    errorCode: 'VALIDATION_ERROR'
                }
            },
            {
                level: 'error',
                service: 'contact-service',
                message: 'Failed to send email notification',
                metadata: {
                    recipientEmail: 'test@example.com',
                    errorDetails: 'SMTP connection timeout'
                }
            }
        ]);

        console.log(`Created ${sampleLogs.length} sample log entries`);
    } catch (error) {
        console.error('Error seeding sample log data:', error);
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