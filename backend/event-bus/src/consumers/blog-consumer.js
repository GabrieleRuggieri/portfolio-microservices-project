/**
 * Blog Event Consumer
 * Handles events related to blog service
 */

const { kafkaClient } = require('../config/kafka.config');
const kafka = require('kafka-node');

/**
 * Create a consumer for blog-related events
 * @returns {Promise<kafka.Consumer>} - Kafka consumer instance
 */
const createBlogConsumer = async () => {
    return new Promise((resolve, reject) => {
        try {
            const Consumer = kafka.Consumer;
            const consumerOptions = {
                groupId: 'blog-consumer-group',
                autoCommit: true,
                fromOffset: 'latest'
            };

            const consumer = new Consumer(
                kafkaClient,
                [{ topic: 'blog-events' }],
                consumerOptions
            );

            // Event handlers
            consumer.on('message', async (message) => {
                try {
                    const blogEvent = JSON.parse(message.value);
                    console.log('Received blog event:', blogEvent);

                    // Process different types of blog events
                    switch (blogEvent.type) {
                        case 'ARTICLE_CREATED':
                            await handleArticleCreated(blogEvent);
                            break;
                        case 'ARTICLE_UPDATED':
                            await handleArticleUpdated(blogEvent);
                            break;
                        case 'COMMENT_ADDED':
                            await handleCommentAdded(blogEvent);
                            break;
                        default:
                            console.warn('Unhandled blog event type:', blogEvent.type);
                    }
                } catch (error) {
                    console.error('Error processing blog event:', error);
                }
            });

            consumer.on('error', (err) => {
                console.error('Blog consumer error:', err);
            });

            consumer.on('ready', () => {
                console.log('Blog consumer is ready');
                resolve(consumer);
            });
        } catch (error) {
            console.error('Error creating blog consumer:', error);
            reject(error);
        }
    });
};

/**
 * Handle article creation event
 * @param {Object} event - Article creation event data
 */
const handleArticleCreated = async (event) => {
    try {
        console.log('Article created:', event.payload);
        // Implement additional logic for article creation
    } catch (error) {
        console.error('Error handling article creation:', error);
    }
};

/**
 * Handle article update event
 * @param {Object} event - Article update event data
 */
const handleArticleUpdated = async (event) => {
    try {
        console.log('Article updated:', event.payload);
        // Implement additional logic for article updates
    } catch (error) {
        console.error('Error handling article update:', error);
    }
};

/**
 * Handle comment addition event
 * @param {Object} event - Comment addition event data
 */
const handleCommentAdded = async (event) => {
    try {
        console.log('Comment added:', event.payload);
        // Implement additional logic for comment addition
    } catch (error) {
        console.error('Error handling comment addition:', error);
    }
};

module.exports = {
    createBlogConsumer
};