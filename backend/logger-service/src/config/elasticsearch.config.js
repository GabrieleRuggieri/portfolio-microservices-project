/**
 * Elasticsearch Configuration
 * Manages connection to Elasticsearch cluster
 */

const { Client } = require('@elastic/elasticsearch');

/**
 * Create Elasticsearch client configuration
 * @returns {Object} Elasticsearch client configuration options
 */
const createElasticsearchConfig = () => {
    return {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        auth: {
            username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
            password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
        },
        tls: {
            rejectUnauthorized: process.env.NODE_ENV !== 'development'
        },
        requestTimeout: 30000 // 30 seconds
    };
};

/**
 * Connect to Elasticsearch
 * @returns {Promise<Client>} Elasticsearch client instance
 */
const connectElasticsearch = async () => {
    try {
        // Create Elasticsearch client
        const client = new Client(createElasticsearchConfig());

        // Verify connection
        const pingResponse = await client.ping();

        if (pingResponse) {
            console.log('Connected to Elasticsearch successfully');
            return client;
        } else {
            throw new Error('Failed to connect to Elasticsearch');
        }
    } catch (error) {
        console.error('Elasticsearch connection error:', error);
        throw error;
    }
};

/**
 * Create log index if not exists
 * @param {Client} client - Elasticsearch client
 * @returns {Promise<void>}
 */
const createLogIndex = async (client) => {
    try {
        const indexName = process.env.LOG_INDEX_NAME || 'portfolio-logs';

        // Check if index exists
        const indexExists = await client.indices.exists({ index: indexName });

        if (!indexExists) {
            // Create index with mapping
            await client.indices.create({
                index: indexName,
                body: {
                    mappings: {
                        properties: {
                            timestamp: { type: 'date' },
                            level: {
                                type: 'keyword',
                                ignore_above: 256
                            },
                            service: {
                                type: 'keyword',
                                ignore_above: 256
                            },
                            message: { type: 'text' },
                            metadata: { type: 'object' },
                            traceId: {
                                type: 'keyword',
                                ignore_above: 256
                            },
                            spanId: {
                                type: 'keyword',
                                ignore_above: 256
                            },
                            environment: {
                                type: 'keyword',
                                ignore_above: 256
                            }
                        }
                    },
                    settings: {
                        number_of_shards: 1,
                        number_of_replicas: process.env.NODE_ENV === 'production' ? 1 : 0,
                        analysis: {
                            analyzer: {
                                default: {
                                    type: 'standard'
                                }
                            }
                        }
                    }
                }
            });

            console.log(`Created Elasticsearch index: ${indexName}`);
        }
    } catch (error) {
        console.error('Error creating log index:', error);
        throw error;
    }
};

/**
 * Perform bulk indexing of logs
 * @param {Client} client - Elasticsearch client
 * @param {Array} logs - Array of log entries to index
 * @returns {Promise<Object>} Indexing response
 */
const bulkIndexLogs = async (client, logs) => {
    try {
        const indexName = process.env.LOG_INDEX_NAME || 'portfolio-logs';

        // Prepare bulk indexing body
        const body = logs.flatMap(log => [
            { index: { _index: indexName } },
            {
                timestamp: log.timestamp || new Date().toISOString(),
                level: log.level,
                service: log.service,
                message: log.message,
                metadata: log.metadata || {},
                traceId: log.traceId,
                spanId: log.spanId,
                environment: log.environment || 'development'
            }
        ]);

        // Perform bulk indexing
        const response = await client.bulk({ body });

        return response;
    } catch (error) {
        console.error('Error in bulk log indexing:', error);
        throw error;
    }
};

module.exports = {
    connectElasticsearch,
    createLogIndex,
    bulkIndexLogs,
    createElasticsearchConfig
};