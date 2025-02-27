/**
 * Event Producer
 * Manages publishing events to Kafka topics
 */

const { kafkaClient } = require('../config/kafka.config');
const kafka = require('kafka-node');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a Kafka producer
 * @returns {Promise<kafka.Producer>} - Kafka producer instance
 */
const createProducer = async () => {
    return new Promise((resolve, reject) => {
        try {
            const Producer = kafka.Producer;
            const producer = new Producer(kafkaClient);

            producer.on('ready', () => {
                console.log('Kafka producer is ready');
                resolve(producer);
            });

            producer.on('error', (err) => {
                console.error('Kafka producer error:', err);
                reject(err);
            });
        } catch (error) {
            console.error('Error creating Kafka producer:', error);
            reject(error);
        }
    });
};

/**
 * Publish an event to a specific Kafka topic
 * @param {string} topic - Kafka topic name
 * @param {Object} event - Event data to publish
 * @returns {Promise<void>}
 */
const publishEvent = async (topic, event) => {
    const producer = await createProducer();

    return new Promise((resolve, reject) => {
        // Enrich event with metadata
        const enrichedEvent = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            ...event
        };

        const payloads = [{
            topic,
            messages: JSON.stringify(enrichedEvent),
            attributes: 1 // Compression type: GZIP
        }];

        producer.send(payloads, (err, data) => {
            if (err) {
                console.error(`Error publishing event to ${topic}:`, err);
                reject(err);
            } else {
                console.log(`Event published to ${topic}:`, data);
                resolve(data);
            }

            // Close producer after sending
            producer.close(() => {
                console.log('Producer closed');
            });
        });
    });
};

/**
 * Publish events to multiple topics
 * @param {string[]} topics - Array of topic names
 * @param {Object} event - Event data to publish
 * @returns {Promise<void[]>}
 */
const publishToMultipleTopics = async (topics, event) => {
    return Promise.all(
        topics.map(topic => publishEvent(topic, event))
    );
};

module.exports = {
    createProducer,
    publishEvent,
    publishToMultipleTopics
};