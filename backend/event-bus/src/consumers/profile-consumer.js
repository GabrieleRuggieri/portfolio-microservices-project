/**
 * Profile Event Consumer
 * Handles events related to profile service
 */

const { kafkaClient } = require('../config/kafka.config');
const kafka = require('kafka-node');

/**
 * Create a consumer for profile-related events
 * @returns {Promise<kafka.Consumer>} - Kafka consumer instance
 */
const createProfileConsumer = async () => {
    return new Promise((resolve, reject) => {
        try {
            const Consumer = kafka.Consumer;
            const consumerOptions = {
                groupId: 'profile-consumer-group',
                autoCommit: true,
                fromOffset: 'latest'
            };

            const consumer = new Consumer(
                kafkaClient,
                [{ topic: 'profile-events' }],
                consumerOptions
            );

            // Event handlers
            consumer.on('message', async (message) => {
                try {
                    const profileEvent = JSON.parse(message.value);
                    console.log('Received profile event:', profileEvent);

                    // Process different types of profile events
                    switch (profileEvent.type) {
                        case 'PROFILE_CREATED':
                            await handleProfileCreated(profileEvent);
                            break;
                        case 'PROFILE_UPDATED':
                            await handleProfileUpdated(profileEvent);
                            break;
                        case 'SKILL_ADDED':
                            await handleSkillAdded(profileEvent);
                            break;
                        default:
                            console.warn('Unhandled profile event type:', profileEvent.type);
                    }
                } catch (error) {
                    console.error('Error processing profile event:', error);
                }
            });

            consumer.on('error', (err) => {
                console.error('Profile consumer error:', err);
            });

            consumer.on('ready', () => {
                console.log('Profile consumer is ready');
                resolve(consumer);
            });
        } catch (error) {
            console.error('Error creating profile consumer:', error);
            reject(error);
        }
    });
};

/**
 * Handle profile creation event
 * @param {Object} event - Profile creation event data
 */
const handleProfileCreated = async (event) => {
    try {
        console.log('Profile created:', event.payload);
        // Implement additional logic for profile creation
        // e.g., trigger notifications, update analytics, etc.
    } catch (error) {
        console.error('Error handling profile creation:', error);
    }
};

/**
 * Handle profile update event
 * @param {Object} event - Profile update event data
 */
const handleProfileUpdated = async (event) => {
    try {
        console.log('Profile updated:', event.payload);
        // Implement additional logic for profile updates
    } catch (error) {
        console.error('Error handling profile update:', error);
    }
};

/**
 * Handle skill addition event
 * @param {Object} event - Skill addition event data
 */
const handleSkillAdded = async (event) => {
    try {
        console.log('Skill added:', event.payload);
        // Implement additional logic for skill addition
    } catch (error) {
        console.error('Error handling skill addition:', error);
    }
};

module.exports = {
    createProfileConsumer
};