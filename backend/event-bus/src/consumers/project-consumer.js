/**
 * Project Event Consumer
 * Handles events related to project service
 */

const { kafkaClient } = require('../config/kafka.config');
const kafka = require('kafka-node');

/**
 * Create a consumer for project-related events
 * @returns {Promise<kafka.Consumer>} - Kafka consumer instance
 */
const createProjectConsumer = async () => {
    return new Promise((resolve, reject) => {
        try {
            const Consumer = kafka.Consumer;
            const consumerOptions = {
                groupId: 'project-consumer-group',
                autoCommit: true,
                fromOffset: 'latest'
            };

            const consumer = new Consumer(
                kafkaClient,
                [{ topic: 'project-events' }],
                consumerOptions
            );

            // Event handlers
            consumer.on('message', async (message) => {
                try {
                    const projectEvent = JSON.parse(message.value);
                    console.log('Received project event:', projectEvent);

                    // Process different types of project events
                    switch (projectEvent.type) {
                        case 'PROJECT_CREATED':
                            await handleProjectCreated(projectEvent);
                            break;
                        case 'PROJECT_UPDATED':
                            await handleProjectUpdated(projectEvent);
                            break;
                        case 'TECHNOLOGY_ADDED':
                            await handleTechnologyAdded(projectEvent);
                            break;
                        default:
                            console.warn('Unhandled project event type:', projectEvent.type);
                    }
                } catch (error) {
                    console.error('Error processing project event:', error);
                }
            });

            consumer.on('error', (err) => {
                console.error('Project consumer error:', err);
            });

            consumer.on('ready', () => {
                console.log('Project consumer is ready');
                resolve(consumer);
            });
        } catch (error) {
            console.error('Error creating project consumer:', error);
            reject(error);
        }
    });
};

/**
 * Handle project creation event
 * @param {Object} event - Project creation event data
 */
const handleProjectCreated = async (event) => {
    try {
        console.log('Project created:', event.payload);
        // Implement additional logic for project creation
        // e.g., trigger notifications, update analytics, etc.
    } catch (error) {
        console.error('Error handling project creation:', error);
    }
};

/**
 * Handle project update event
 * @param {Object} event - Project update event data
 */
const handleProjectUpdated = async (event) => {
    try {
        console.log('Project updated:', event.payload);
        // Implement additional logic for project updates
    } catch (error) {
        console.error('Error handling project update:', error);
    }
};

/**
 * Handle technology addition event
 * @param {Object} event - Technology addition event data
 */
const handleTechnologyAdded = async (event) => {
    try {
        console.log('Technology added:', event.payload);
        // Implement additional logic for technology addition
    } catch (error) {
        console.error('Error handling technology addition:', error);
    }
};

module.exports = {
    createProjectConsumer
};