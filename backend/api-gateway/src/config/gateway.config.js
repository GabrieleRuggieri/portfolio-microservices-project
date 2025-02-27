/**
 * API Gateway Configuration
 * Contains global settings for the gateway service
 */

module.exports = {
    // Server configuration
    server: {
        port: process.env.API_GATEWAY_PORT || 3000,
        host: process.env.API_GATEWAY_HOST || '0.0.0.0',
        cors: {
            origin: process.env.CORS_ORIGIN || '*', // In production, set to frontend domain(s)
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['X-Total-Count'],
            credentials: true
        },
        rateLimiter: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        }
    },

    // Proxy configuration
    proxy: {
        timeout: 10000, // 10 seconds
        proxyTimeout: 10000, // 10 seconds
        changeOrigin: true,
        pathRewrite: true, // Set to specific rules if needed
    },

    // Authentication configuration
    auth: {
        jwksUri: process.env.JWKS_URI || 'http://auth-service:3001/.well-known/jwks.json',
        issuer: process.env.TOKEN_ISSUER || 'portfolio-api',
        audience: process.env.TOKEN_AUDIENCE || 'portfolio-client',
        algorithms: ['RS256'],
        tokenCookieName: 'access_token',
        expiresIn: '1h',
        refreshExpiresIn: '7d',
    },

    // Circuit breaker configuration for service resilience
    circuitBreaker: {
        failureThreshold: 50, // Percentage threshold for opening circuit
        resetTimeout: 30000, // Time in ms to reset circuit
        maxFailures: 5, // Maximum number of failures before opening circuit
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        logRequests: true,
        logResponses: true,
        excludePaths: ['/api/health', '/api/metrics'],
        elkEnabled: process.env.ELK_ENABLED === 'true',
        elkHost: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
        elkIndex: 'api-gateway-logs'
    },

    // Service discovery configuration
    serviceDiscovery: {
        enabled: process.env.SERVICE_DISCOVERY_ENABLED === 'true',
        provider: process.env.SERVICE_DISCOVERY_PROVIDER || 'static', // Options: 'static', 'consul', 'etcd'
        refreshInterval: 60000, // 1 minute - how often to refresh service endpoints
    }
};