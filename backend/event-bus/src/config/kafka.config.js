/**
 * Kafka Configuration
 * Manages Kafka connection and client setup
 */

const kafka = require('kafka-node');

// Kafka connection details
const KAFKA_HOST = process.env.KAFKA_HOST || 'localhost';
const KAFKA_PORT = process.env.KAFKA_PORT || 9092;

// Kafka client
let kafkaClient = null;
let kafkaAdmin = null;

/**
 * Connect to Kafka
 * @returns {Promise<void>}
 */
const connectKafka = async () => {
  return new Promise((resolve, reject) => {
    try {
      const kafkaUrl = `${KAFKA_HOST}:${KAFKA_PORT}`;

      // Create Kafka client
      kafkaClient = new kafka.KafkaClient({
        kafkaHost: kafkaUrl,
        connectTimeout: 10000,
        requestTimeout: 30000
      });

      // Create admin client
      kafkaAdmin = new kafka.Admin(kafkaClient);

      // Listen for connection events
      kafkaClient.on('ready', () => {
        console.log('Connected to Kafka successfully');
        resolve();
      });

      // Handle connection errors
      kafkaClient.on('error', (err) => {
        console.error('Kafka connection error:', err);
        reject(err);
      });
    } catch (error) {
      console.error('Error connecting to Kafka:', error);
      reject(error);
    }
  });
};

/**
 * Create a Kafka topic if it doesn't exist
 * @param {string} topicName - Name of the topic
 * @param {number} [partitions=1] - Number of partitions
 * @param {number} [replicationFactor=1] - Replication factor
 * @returns {Promise<void>}
 */
const createTopic = async (topicName, partitions = 1, replicationFactor = 1) => {
  return new Promise((resolve, reject) => {
    const topicConfig = [{
      topic: topicName,
      partitions,
      replicationFactor
    }];

    kafkaAdmin.createTopics(topicConfig, (err, result) => {
      if (err) {
        console.error(`Error creating topic ${topicName}:`, err);
        reject(err);
      } else {
        console.log(`Topic ${topicName} created successfully`);
        resolve(result);
      }
    });
  });
};

/**
 * Produce a message to a Kafka topic
 * @param {string} topicName - Name of the topic
 * @param {Object} message - Message to send
 * @returns {Promise<void>}
 */
const produceMessage = async (topicName, message) => {
  return new Promise((resolve, reject) => {
    try {
      const Producer = kafka.Producer;
      const producer = new Producer(kafkaClient);

      const payloads = [{
        topic: topicName,
        messages: JSON.stringify(message)
      }];

      producer.send(payloads, (err, data) => {
        if (err) {
          console.error(`Error producing message to ${topicName}:`, err);
          reject(err);
        } else {
          console.log(`Message sent to ${topicName}:`, data);
          resolve(data);
        }
      });
    } catch (error) {
      console.error('Error in producing message:', error);
      reject(error);
    }
  });
};

module.exports = {
  connectKafka,
  createTopic,
  produceMessage,
  kafkaClient
};