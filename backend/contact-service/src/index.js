/**
 * Contact Service Entry Point
 * Initializes the contact service
 */

const server = require('./server');
const { testConnection, initDatabase } = require('./utils/database.util');
const { Message, Reply } = require('./models');

// Server port
const PORT = process.env.PORT || 3005;
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
            console.log(`Contact Service running on http://${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

/**
 * Seed sample contact data for development
 */
const seedSampleData = async () => {
    try {
        // Check if sample data already exists
        const existingMessages = await Message.count();

        if (existingMessages > 0) {
            console.log('Sample data already exists, skipping seed');
            return;
        }

        console.log('Seeding sample contact data...');

        // Create sample messages
        const messages = await Message.bulkCreate([
            {
                name: 'John Smith',
                email: 'john.smith@example.com',
                subject: 'Project Inquiry',
                message: 'Hello,\n\nI came across your portfolio and I\'m impressed with your work. I have a project in mind and I\'d like to discuss it with you.\n\nThe project involves building a web application for my small business. Could we schedule a call to talk about the details?\n\nBest regards,\nJohn',
                phone: '+1 555-123-4567',
                company: 'Smith Enterprises',
                status: 'read',
                priority: 'high',
                readAt: new Date(Date.now() - 172800000), // 2 days ago
                source: 'portfolio',
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            {
                name: 'Emma Johnson',
                email: 'emma.johnson@example.com',
                subject: 'Freelance Opportunity',
                message: 'Hi there,\n\nI\'m a project manager at TechCorp and we\'re looking for a freelance developer to help us with a short-term project. Your skills seem to be a good match for what we need.\n\nPlease let me know if you\'re available for a 3-month contract starting next month.\n\nThanks,\nEmma',
                company: 'TechCorp Inc.',
                status: 'new',
                priority: 'normal',
                source: 'LinkedIn',
                ipAddress: '192.168.1.2',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
            },
            {
                name: 'Michael Brown',
                email: 'michael@example.com',
                subject: 'Question about your blog post',
                message: 'Hello,\n\nI just read your blog post about microservices architecture and I found it very informative. I have a question about the section where you discuss service discovery.\n\nYou mentioned using Consul for service registry. Have you also tried other solutions like etcd or Eureka? I\'d appreciate your insights on the pros and cons.\n\nRegards,\nMichael',
                status: 'replied',
                priority: 'low',
                source: 'blog',
                repliedAt: new Date(Date.now() - 86400000), // 1 day ago
                ipAddress: '192.168.1.3',
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
            }
        ]);

        // Add a reply to the third message
        await Reply.create({
            messageId: messages[2].id,
            userId: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f', // Admin user ID
            userName: 'Admin User',
            content: 'Hi Michael,\n\nThanks for your question about my blog post on microservices architecture. You asked about alternatives to Consul for service discovery.\n\nYes, I have experience with both etcd and Eureka as well. Here\'s a quick comparison:\n\n1. Consul: Great for both service discovery and configuration. Has a nice UI and DNS interface. Works well in multi-datacenter setups.\n\n2. etcd: Lighter weight, focuses on being a reliable key-value store. Often used with Kubernetes. Very good consistency model but fewer features than Consul.\n\n3. Eureka: Designed specifically for AWS environments. Simpler to set up than Consul but less feature-rich. Good Netflix ecosystem integration.\n\nFor smaller projects, I find Consul to be more user-friendly, while etcd shines in Kubernetes environments. Eureka is good if you\'re already using other Netflix OSS components.\n\nHope that helps! Let me know if you have any other questions.\n\nBest regards',
            sentAt: new Date(Date.now() - 86340000), // Just after the message was marked as replied
            emailStatus: 'sent'
        });

        console.log('Sample data seeded successfully');
        console.log(`Created ${messages.length} messages and 1 reply`);
    } catch (error) {
        console.error('Error seeding sample data:', error);
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