/**
 * API Gateway route configuration
 * Defines service endpoints, routing rules and proxy configurations
 */

const routes = {
    // Auth Service Routes
    auth: {
        prefix: '/api/auth',
        target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
        routes: [
            { path: '/login', method: 'POST', auth: false },
            { path: '/register', method: 'POST', auth: false },
            { path: '/refresh-token', method: 'POST', auth: false },
            { path: '/logout', method: 'POST', auth: true },
            { path: '/verify-email/:token', method: 'GET', auth: false },
            { path: '/forgot-password', method: 'POST', auth: false },
            { path: '/reset-password/:token', method: 'POST', auth: false }
        ]
    },

    // Profile Service Routes
    profile: {
        prefix: '/api/profiles',
        target: process.env.PROFILE_SERVICE_URL || 'http://profile-service:3002',
        routes: [
            { path: '', method: 'GET', auth: false }, // List profiles (public)
            { path: '/:id', method: 'GET', auth: false }, // Get profile by ID (public)
            { path: '/me', method: 'GET', auth: true }, // Get own profile
            { path: '/me', method: 'PUT', auth: true }, // Update own profile
            { path: '/me/skills', method: 'POST', auth: true }, // Add skill
            { path: '/me/skills/:id', method: 'PUT', auth: true }, // Update skill
            { path: '/me/skills/:id', method: 'DELETE', auth: true }, // Delete skill
            { path: '/me/experience', method: 'POST', auth: true }, // Add experience
            { path: '/me/experience/:id', method: 'PUT', auth: true }, // Update experience
            { path: '/me/experience/:id', method: 'DELETE', auth: true } // Delete experience
        ]
    },

    // Projects Service Routes
    projects: {
        prefix: '/api/projects',
        target: process.env.PROJECTS_SERVICE_URL || 'http://projects-service:3003',
        routes: [
            { path: '', method: 'GET', auth: false }, // List projects (public)
            { path: '/:id', method: 'GET', auth: false }, // Get project by ID (public)
            { path: '', method: 'POST', auth: true }, // Create project
            { path: '/:id', method: 'PUT', auth: true }, // Update project
            { path: '/:id', method: 'DELETE', auth: true }, // Delete project
            { path: '/:id/technologies', method: 'POST', auth: true }, // Add technology to project
            { path: '/:id/technologies/:techId', method: 'DELETE', auth: true } // Remove technology from project
        ]
    },

    // Blog Service Routes
    blog: {
        prefix: '/api/blog',
        target: process.env.BLOG_SERVICE_URL || 'http://blog-service:3004',
        routes: [
            { path: '/articles', method: 'GET', auth: false }, // List articles (public)
            { path: '/articles/:id', method: 'GET', auth: false }, // Get article by ID (public)
            { path: '/articles', method: 'POST', auth: true }, // Create article
            { path: '/articles/:id', method: 'PUT', auth: true }, // Update article
            { path: '/articles/:id', method: 'DELETE', auth: true }, // Delete article
            { path: '/categories', method: 'GET', auth: false }, // List categories (public)
            { path: '/categories', method: 'POST', auth: true }, // Create category
            { path: '/categories/:id', method: 'PUT', auth: true }, // Update category
            { path: '/categories/:id', method: 'DELETE', auth: true }, // Delete category
            { path: '/articles/:id/comments', method: 'GET', auth: false }, // Get comments for article
            { path: '/articles/:id/comments', method: 'POST', auth: true }, // Add comment to article
            { path: '/comments/:id', method: 'PUT', auth: true }, // Update own comment
            { path: '/comments/:id', method: 'DELETE', auth: true } // Delete own comment
        ]
    },

    // Contact Service Routes
    contact: {
        prefix: '/api/contact',
        target: process.env.CONTACT_SERVICE_URL || 'http://contact-service:3005',
        routes: [
            { path: '/messages', method: 'POST', auth: false }, // Send contact message (public)
            { path: '/messages', method: 'GET', auth: true }, // List contact messages (admin)
            { path: '/messages/:id', method: 'GET', auth: true }, // Get message by ID (admin)
            { path: '/messages/:id', method: 'PUT', auth: true }, // Update message status (admin)
            { path: '/messages/:id', method: 'DELETE', auth: true } // Delete message (admin)
        ]
    },

    // Analytics Service Routes
    analytics: {
        prefix: '/api/analytics',
        target: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3006',
        routes: [
            { path: '/metrics', method: 'GET', auth: true }, // Get analytics metrics (admin)
            { path: '/visitors', method: 'GET', auth: true }, // Get visitor data (admin)
            { path: '/pageviews', method: 'GET', auth: true }, // Get pageview data (admin)
            { path: '/track', method: 'POST', auth: false } // Track anonymous analytics event
        ]
    }
};

module.exports = routes;