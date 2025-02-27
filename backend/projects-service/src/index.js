/**
 * Projects Service Entry Point
 * Initializes the projects service
 */

const server = require('./server');
const { testConnection, initDatabase } = require('./utils/database.util');
const { Project, Technology } = require('./models');

// Server port
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || '0.0.0.0';

// Start the server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('Failed to connect to database. Exiting...');
            process.exit(1);
        }

        // Initialize database (sync models)
        const dbSync = await initDatabase(process.env.NODE_ENV === 'development' && process.env.DB_FORCE_SYNC === 'true');
        if (!dbSync) {
            console.error('Failed to sync database. Exiting...');
            process.exit(1);
        }

        // Seed sample data if in development
        if (process.env.NODE_ENV === 'development' && process.env.SEED_DATA === 'true') {
            await seedSampleData();
        }

        // Start the server
        server.listen(PORT, HOST, () => {
            console.log(`Projects Service running on http://${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

/**
 * Seed sample project data for development
 */
const seedSampleData = async () => {
    try {
        // Check if sample data already exists
        const existingProjects = await Project.count();

        if (existingProjects > 0) {
            console.log('Sample data already exists, skipping seed');
            return;
        }

        console.log('Seeding sample project data...');

        // Create sample projects
        const project1 = await Project.create({
            userId: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f', // Admin user ID from auth service
            title: 'Portfolio Website',
            description: 'A personal portfolio website showcasing my projects and skills. Built with modern web technologies and deployed to the cloud.',
            summary: 'Personal portfolio website with responsive design and modern UI',
            coverImage: 'https://example.com/portfolio-cover.jpg',
            demoUrl: 'https://example.com',
            githubUrl: 'https://github.com/username/portfolio',
            startDate: '2023-01-01',
            endDate: '2023-02-15',
            isOngoing: false,
            isPublished: true,
            isPinned: true,
            order: 1,
            role: 'Full Stack Developer',
            teamSize: 1,
            challenges: 'Creating a responsive design that works across all devices was challenging.',
            solutions: 'Used CSS Grid and Flexbox to create a fully responsive layout without media queries.'
        });

        await Technology.bulkCreate([
            {
                projectId: project1.id,
                name: 'React',
                category: 'Frontend',
                logoUrl: 'https://example.com/react-logo.png',
                version: '18.2.0',
                order: 0
            },
            {
                projectId: project1.id,
                name: 'Node.js',
                category: 'Backend',
                logoUrl: 'https://example.com/node-logo.png',
                version: '18.12.1',
                order: 1
            },
            {
                projectId: project1.id,
                name: 'MySQL',
                category: 'Database',
                logoUrl: 'https://example.com/mysql-logo.png',
                version: '8.0',
                order: 2
            }
        ]);

        const project2 = await Project.create({
            userId: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f',
            title: 'E-commerce Platform',
            description: 'A full-featured e-commerce platform with user authentication, product catalog, shopping cart, and payment integration.',
            summary: 'Modern e-commerce solution with real-time inventory management',
            coverImage: 'https://example.com/ecommerce-cover.jpg',
            demoUrl: 'https://ecommerce-demo.example.com',
            githubUrl: 'https://github.com/username/ecommerce',
            startDate: '2022-09-01',
            endDate: null,
            isOngoing: true,
            isPublished: true,
            isPinned: false,
            order: 0,
            role: 'Backend Developer',
            teamSize: 3,
            challenges: 'Implementing secure payment processing and ensuring data privacy compliance.',
            solutions: 'Integrated with Stripe API and implemented proper data encryption for sensitive information.'
        });

        await Technology.bulkCreate([
            {
                projectId: project2.id,
                name: 'Express.js',
                category: 'Backend',
                logoUrl: 'https://example.com/express-logo.png',
                version: '4.18.2',
                order: 0
            },
            {
                projectId: project2.id,
                name: 'MongoDB',
                category: 'Database',
                logoUrl: 'https://example.com/mongodb-logo.png',
                version: '6.0',
                order: 1
            },
            {
                projectId: project2.id,
                name: 'Stripe API',
                category: 'Payment',
                logoUrl: 'https://example.com/stripe-logo.png',
                version: 'v2023-08-16',
                order: 2
            }
        ]);

        console.log('Sample data seeded successfully');
        console.log(`Created 2 projects with their respective technologies`);
    } catch (error) {
        console.error('Error seeding sample data:', error);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Graceful shutdown
 */
function gracefulShutdown() {
    console.log('Received kill signal, shutting down gracefully...');

    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

// Start the server
startServer();