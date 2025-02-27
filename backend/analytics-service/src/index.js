/**
 * Analytics Service Entry Point
 * Initializes the analytics service
 */

const server = require('./server');
const { testConnection, initDatabase } = require('./utils/database.util');
const { Visitor, Metric } = require('./models');

// Server port
const PORT = process.env.PORT || 3006;
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
            console.log(`Analytics Service running on http://${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

/**
 * Seed sample analytics data for development
 */
const seedSampleData = async () => {
    try {
        // Check if sample data already exists
        const existingVisitors = await Visitor.count();
        const existingMetrics = await Metric.count();

        if (existingVisitors > 0 && existingMetrics > 0) {
            console.log('Sample data already exists, skipping seed');
            return;
        }

        console.log('Seeding sample analytics data...');

        // Create sample visitors
        const visitors = [];
        const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
        const oses = ['Windows', 'MacOS', 'Linux', 'iOS', 'Android'];
        const devices = ['desktop', 'mobile', 'tablet'];
        const countries = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Japan', 'Australia'];

        for (let i = 0; i < 50; i++) {
            const sessionId = `session-${i + 1}-${Math.random().toString(36).substring(2, 10)}`;
            const country = countries[Math.floor(Math.random() * countries.length)];
            const browser = browsers[Math.floor(Math.random() * browsers.length)];
            const os = oses[Math.floor(Math.random() * oses.length)];
            const device = devices[Math.floor(Math.random() * devices.length)];

            // Create date between 30 days ago and now
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const firstVisit = new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));

            // Last visit is between first visit and now
            const lastVisit = new Date(firstVisit.getTime() + Math.random() * (now.getTime() - firstVisit.getTime()));

            // Create visitor
            const visitor = await Visitor.create({
                sessionId,
                firstVisit,
                lastVisit,
                visitCount: Math.floor(Math.random() * 10) + 1,
                country,
                region: 'Some Region',
                city: 'Some City',
                browser,
                browserVersion: '100.0.0',
                os,
                osVersion: '10.0',
                device,
                language: 'en-US',
                ipAddress: '192.168.1.0' // Anonymized
            });

            visitors.push(visitor);
        }

        // Create sample metrics
        const metrics = [];
        const eventTypes = ['pageview', 'click', 'form_submission', 'video_play', 'scroll'];
        const pages = [
            { path: '/', title: 'Home Page' },
            { path: '/about', title: 'About Me' },
            { path: '/projects', title: 'My Projects' },
            { path: '/blog', title: 'Blog' },
            { path: '/contact', title: 'Contact Me' }
        ];

        // Generate 500 sample metrics
        for (let i = 0; i < 500; i++) {
            const visitor = visitors[Math.floor(Math.random() * visitors.length)];
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const page = pages[Math.floor(Math.random() * pages.length)];

            // Create timestamp between visitor's first visit and now
            const now = new Date();
            const timestamp = new Date(visitor.firstVisit.getTime() + Math.random() * (now.getTime() - visitor.firstVisit.getTime()));

            let eventCategory, eventAction, eventLabel;

            if (eventType !== 'pageview') {
                eventCategory = ['navigation', 'engagement', 'form', 'media'][Math.floor(Math.random() * 4)];
                eventAction = ['click', 'submit', 'play', 'pause', 'scroll'][Math.floor(Math.random() * 5)];
                eventLabel = ['button', 'link', 'video', 'form', 'page'][Math.floor(Math.random() * 5)];
            }

            // Create metric
            const metric = await Metric.create({
                sessionId: visitor.sessionId,
                visitorId: visitor.id,
                eventType,
                eventCategory,
                eventAction,
                eventLabel,
                pagePath: page.path,
                pageTitle: page.title,
                timestamp,
                timeOnPage: eventType === 'pageview' ? Math.floor(Math.random() * 300) + 10 : null, // 10-310 seconds
                ipAddress: visitor.ipAddress
            });

            metrics.push(metric);
        }

        console.log('Sample data seeded successfully');
        console.log(`Created ${visitors.length} visitors and ${metrics.length} metrics`);
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