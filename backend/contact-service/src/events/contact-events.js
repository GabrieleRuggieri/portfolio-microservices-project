/**
 * Contact Events
 * Handles publishing of contact-related events to the event bus
 */

const kafka = require('kafka-node');
const { v4: uuidv4 } = require('uuid');

// Kafka configuration
const kafkaClientOptions = {
    kafkaHost: process.env.KAFKA_BROKERS || 'localhost:9092'
};

/**
 * Publish event to Kafka topic
 * @param {string} eventType - Type of event
 * @param {Object} data - Event data
 * @returns {Promise<void>}
 */
const publishEvent = async (eventType, data) => {
    try {
        // Initialize producer if not connected
        if (!isConnected) {
            await initializeProducer();
        }

        // Create event message
        const event = {
            id: uuidv4(),
            type: eventType,
            timestamp: new Date().toISOString(),
            service: 'contact-service',
            data
        };

        // Determine topic based on event type
        let topic = 'contact-events';

        // Use notification topic for certain events
        if (eventType === 'message.created' || eventType === 'reply.created') {
            topic = 'notification-events';
        }

        // Send event to Kafka
        const payload = [
            {
                topic,
                messages: JSON.stringify(event),
                partition: 0
            }
        ];

        // Send event to Kafka with promise
        return new Promise((resolve, reject) => {
            producer.send(payload, (err, data) => {
                if (err) {
                    console.error(`Failed to publish event ${eventType}:`, err);
                    reject(err);
                } else {
                    console.log(`Event ${eventType} published successfully:`, data);
                    resolve(data);
                }
            });
        });
    } catch (error) {
        console.error(`Error publishing event ${eventType}:`, error);

        // Fall back to console logging if Kafka is unavailable
        console.log('Event (fallback):', {
            type: eventType,
            timestamp: new Date().toISOString(),
            service: 'contact-service',
            data
        });
    }
};

module.exports = {
    publishEvent
};

let client;
let producer;
let isConnected = false;

/**
 * Initialize Kafka producer
 * @returns {Promise<void>}
 */
const initializeProducer = async () => {
    if (isConnected) return;

    return new Promise((resolve, reject) => {
        try {
            // Create Kafka client
            client = new kafka.KafkaClient(kafkaClientOptions);

            // Create producer
            producer = new kafka.Producer(client, {
                requireAcks: 1, // Require acknowledgment from leader
                ackTimeoutMs: 500 // Timeout for acknowledgment
            });

            // Handle producer connection
            producer.on('ready', () => {
                console.log('Kafka producer connected');
                isConnected = true;
                resolve();
            });

            // Handle producer errors
            producer.on('error', (err) => {
                console.error('Kafka producer error:', err);
                isConnected = false;
                reject(err);
            });
        } catch (err) {
            console.error('Failed to initialize Kafka producer:', err);
            isConnected = false;
            reject(err);
        }
    });
};