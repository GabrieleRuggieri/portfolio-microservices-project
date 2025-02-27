// index.js
const profileConsumer = require('./consumers/profile-consumer');
const projectConsumer = require('./consumers/project-consumer');
const blogConsumer = require('./consumers/blog-consumer');
const contactConsumer = require('./consumers/contact-consumer');
const analyticsConsumer = require('./consumers/analytics-consumer');
const eventProducer = require('./producers/event-producer');
const logger = require('./utils/logger.util');
const { setupGracefulShutdown } = require('./utils/shutdown.util');

// Start the event bus service
async function startEventBus() {
    try {
        logger.info('Starting Event Bus service');

        // Connect producer
        await eventProducer.connect();

        // Connect all consumers
        await Promise.all([
            profileConsumer.connect(),
            projectConsumer.connect(),
            blogConsumer.connect(),
            contactConsumer.connect(),
            analyticsConsumer.connect()
        ]);

        logger.info('Event Bus service started successfully');
    } catch (error) {
        logger.error('Failed to start Event Bus service', { error: error.message });
        process.exit(1);
    }
}

// Setup graceful shutdown
setupGracefulShutdown([
    { name: 'Event Producer', shutdown: () => eventProducer.disconnect() },
    { name: 'Profile Consumer', shutdown: () => profileConsumer.disconnect() },
    { name: 'Project Consumer', shutdown: () => projectConsumer.disconnect() },
    { name: 'Blog Consumer', shutdown: () => blogConsumer.disconnect() },
    { name: 'Contact Consumer', shutdown: () => contactConsumer.disconnect() },
    { name: 'Analytics Consumer', shutdown: () => analyticsConsumer.disconnect() }
]);

// Export for testing purposes
module.exports = {
    startEventBus,
    profileConsumer,
    projectConsumer,
    blogConsumer,
    contactConsumer,
    analyticsConsumer,
    eventProducer
};

// Start the service if this file is run directly
if (require.main === module) {
    startEventBus();
}