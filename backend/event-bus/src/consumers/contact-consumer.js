/**
 * Contact Event Consumer
 * Handles events related to contact service
 */

const { kafkaClient } = require('../config/kafka.config');
const kafka = require('kafka-node');

/**
 * Create a consumer for contact-related events
 * @returns {Promise<kafka.Consumer>} - Kafka consumer instance
 */
const createContactConsumer = async () => {
    return new Promise((resolve, reject) => {
        try {
            const Consumer = kafka.Consumer;
            const consumerOptions = {
                groupId: 'contact-consumer-group',
                autoCommit: true,
                fromOffset: 'latest'
            };

            const consumer = new Consumer(
                kafkaClient,
                [{ topic: 'contact-events' }],
                consumerOptions
            );

            // Event handlers
            consumer.on('message', async (message) => {
                try {
                    const contactEvent = JSON.parse(message.value);
                    console.log('Received contact event:', contactEvent);

                    // Process different types of contact events
                    switch (contactEvent.type) {
                        case 'MESSAGE_RECEIVED':
                            await handleMessageReceived(contactEvent);
                            break;
                        case 'MESSAGE_REPLIED':
                            await handleMessageReplied(contactEvent);
                            break;
                        case 'MESSAGE_STATUS_UPDATED':
                            await handleMessageStatusUpdated(contactEvent);
                            break;
                        default:
                            console.warn('Unhandled contact event type:', contactEvent.type);
                    }
                } catch (error) {
                    console.error('Error processing contact event:', error);
                }
            });

            consumer.on('error', (err) => {
                console.error('Contact consumer error:', err);
            });

            consumer.on('ready', () => {
                console.log('Contact consumer is ready');
                resolve(consumer);
            });
        } catch (error) {
            console.error('Error creating contact consumer:', error);
            reject(error);
        }
    });
};

/**
 * Handle message received event
 * @param {Object} event - Message received event data
 */
const handleMessageReceived = async (event) => {
    try {
        console.log('Message received:', event.payload);
        // Implement additional logic for new message
    } catch (error) {
        console.error('Error handling message received:', error);
    }
};

/**
 * Handle message replied event
 * @param {Object} event - Message replied event data
 */
const handleMessageReplied = async (event) => {
    try {
        console.log('Message replied:', event.payload);
        // Implement additional logic for message reply
    } catch (error) {
        console.error('Error handling message replied:', error);
    }
};

/**
 * Handle message status update event
 * @param {Object} event - Message status update event data
 */
const handleMessageStatusUpdated = async (event) => {
    try {
        console.log('Message status updated:', event.payload);
        // Implement additional logic for message status update
    } catch (error) {
        console.error('Error handling message status update:', error);
    }
};

module.exports = {
    createContactConsumer
};