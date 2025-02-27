// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { startEventBus } = require('./index');
const logger = require('./utils/logger.util');
const { errorHandlerMiddleware } = require('./middleware/error-handler.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');
const { requestLoggerMiddleware } = require('./middleware/logger.middleware');
const { kafkaHealthCheck } = require('./utils/health-check.util');
const eventProducer = require('./producers/event-producer');
const { TOPICS } = require('./config/kafka.config');

// Load environment variables
require('dotenv').config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3007;

// Apply middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const kafkaStatus = await kafkaHealthCheck();
        return res.status(200).json({
            status: 'ok',
            kafka: kafkaStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        return res.status(500).json({
            status: 'error',
            message: 'Service is not healthy',
            timestamp: new Date().toISOString()
        });
    }
});

// API endpoint to publish events (protected with auth)
app.post('/events', authMiddleware, async (req, res) => {
    const { topic, event, key, headers } = req.body;

    if (!topic || !event) {
        return res.status(400).json({
            status: 'error',
            message: 'Topic and event are required'
        });
    }

    try {
        // Check if topic is valid
        let isValidTopic = false;
        for (const serviceTopics of Object.values(TOPICS)) {
            if (Object.values(serviceTopics).includes(topic)) {
                isValidTopic = true;
                break;
            }
        }

        if (!isValidTopic) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid topic'
            });
        }

        await eventProducer.publishEvent(topic, event, key, headers);

        return res.status(200).json({
            status: 'success',
            message: 'Event published successfully'
        });
    } catch (error) {
        logger.error('Failed to publish event', { error: error.message });
        return res.status(500).json({
            status: 'error',
            message: 'Failed to publish event'
        });
    }
});

// API endpoint to list available topics
app.get('/topics', authMiddleware, (req, res) => {
    const topicsList = {};

    Object.entries(TOPICS).forEach(([service, topics]) => {
        topicsList[service] = Object.entries(topics).map(([key, value]) => ({
            key,
            topic: value
        }));
    });

    return res.status(200).json({
        status: 'success',
        data: topicsList
    });
});

// Error handler middleware
app.use(errorHandlerMiddleware);

// Start the server
async function startServer() {
    try {
        // Start the event bus
        await startEventBus();

        // Start the HTTP server
        app.listen(PORT, () => {
            logger.info(`Event Bus API running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

// Export for testing
module.exports = { app, startServer };

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}