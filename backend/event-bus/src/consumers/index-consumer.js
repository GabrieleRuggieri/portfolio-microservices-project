/**
 * Consumers Initialization
 * Centralizes the creation and management of Kafka consumers
 */

const { createProfileConsumer } = require('./profile-consumer');
const { createProjectConsumer } = require('./project-consumer');
const { createBlogConsumer } = require('./blog-consumer');
const { createContactConsumer } = require('./contact-consumer');
const { createAnalyticsConsumer } = require('./analytics-consumer');

/**
 * Initialize all Kafka consumers
 * @returns {Promise<void>}
 */
const initConsumers = async () => {
    try {
        console.log('Initializing Kafka consumers...');

        // Create consumers for different services
        await Promise.all([
            createProfileConsumer(),
            createProjectConsumer(),
            createBlogConsumer(),
            createContactConsumer(),
            createAnalyticsConsumer()
        ]);

        console.log('All Kafka consumers initialized successfully');
    } catch (error) {
        console.error('Error initializing consumers:', error);
        throw error;
    }
};

module.exports = {
    initConsumers
};