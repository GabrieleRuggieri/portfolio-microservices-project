/**
 * Authentication Service Configuration
 */

module.exports = {
    // Server configuration
    server: {
        port: process.env.AUTH_SERVICE_PORT || 3001,
        host: process.env.AUTH_SERVICE_HOST || '0.0.0.0'
    },

    // Database configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'portfolio_auth',
        dialect: 'mysql',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },

    // JWT configuration
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
        issuer: process.env.TOKEN_ISSUER || 'portfolio-api',
        audience: process.env.TOKEN_AUDIENCE || 'portfolio-client',
        algorithm: 'RS256', // Using asymmetric algorithm for better security
        privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || './keys/private.key',
        publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || './keys/public.key'
    },

    // Password hashing configuration
    password: {
        saltRounds: 10,
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
    },

    // Email configuration for verification and password reset
    email: {
        from: process.env.EMAIL_FROM || 'noreply@yourportfolio.com',
        verificationSubject: 'Verify Your Email',
        passwordResetSubject: 'Reset Your Password',
        verificationExpiresIn: '24h',
        passwordResetExpiresIn: '1h',
        smtp: {
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'user@example.com',
                pass: process.env.SMTP_PASS || 'password'
            }
        }
    },

    // Rate limiting
    rateLimit: {
        loginAttempts: {
            maxAttempts: 5,
            windowMs: 15 * 60 * 1000 // 15 minutes
        },
        passwordReset: {
            maxAttempts: 3,
            windowMs: 60 * 60 * 1000 // 1 hour
        }
    },

    // Default roles and permissions
    roles: {
        default: 'user',
        available: ['user', 'admin'],
        permissions: {
            user: [
                'profile:read:own',
                'profile:write:own',
                'project:read:any',
                'project:write:own',
                'blog:read:any',
                'blog:comment:any',
                'blog:write:own',
                'contact:create:own'
            ],
            admin: [
                'profile:read:any',
                'profile:write:any',
                'project:read:any',
                'project:write:any',
                'blog:read:any',
                'blog:write:any',
                'blog:comment:any',
                'contact:read:any',
                'contact:write:any',
                'analytics:read:any',
                'user:read:any',
                'user:write:any'
            ]
        }
    },

    // OAuth providers configuration
    oauth: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback'
        }
    },

    // CORS settings (for direct access, though typically through API gateway)
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
};