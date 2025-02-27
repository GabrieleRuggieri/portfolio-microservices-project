/**
 * Blog Service Entry Point
 * Initializes the blog service
 */

const server = require('./server');
const { testConnection, initDatabase } = require('./utils/database.util');
const { Article, Category, Comment } = require('./models');

// Server port
const PORT = process.env.PORT || 3004;
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
            console.log(`Blog Service running on http://${HOST}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

/**
 * Seed sample blog data for development
 */
const seedSampleData = async () => {
    try {
        // Check if sample data already exists
        const existingArticles = await Article.count();
        const existingCategories = await Category.count();

        if (existingArticles > 0 && existingCategories > 0) {
            console.log('Sample data already exists, skipping seed');
            return;
        }

        console.log('Seeding sample blog data...');

        // Create sample categories
        const categories = await Category.bulkCreate([
            {
                name: 'Web Development',
                description: 'Articles about web development technologies and practices',
                color: '#3498db',
                icon: 'code',
                order: 0,
                featured: true
            },
            {
                name: 'Design',
                description: 'Articles about UI/UX and graphic design',
                color: '#9b59b6',
                icon: 'brush',
                order: 1,
                featured: true
            },
            {
                name: 'DevOps',
                description: 'Articles about DevOps practices and tools',
                color: '#e74c3c',
                icon: 'server',
                order: 2,
                featured: false
            }
        ]);

        // Create sample articles
        const article1 = await Article.create({
            title: 'Getting Started with Microservices Architecture',
            content: `
# Getting Started with Microservices Architecture

Microservices architecture has gained immense popularity in recent years as a way to build scalable, resilient applications. In this article, we'll explore the basics of microservices and how to get started.

## What are Microservices?

Microservices are an architectural style that structures an application as a collection of small, loosely coupled services. Each service is:

- Focused on a single capability or business domain
- Independently deployable
- Communicates through well-defined APIs
- Owned by a small team

## Benefits of Microservices

- **Scalability**: Services can be scaled independently based on demand
- **Resilience**: Failure in one service doesn't bring down the entire application
- **Technology Diversity**: Teams can choose the best technology for each service
- **Faster Deployment**: Smaller codebases lead to faster build and deployment times
- **Team Autonomy**: Teams can work independently on different services

## Challenges of Microservices

- **Distributed System Complexity**: Handling network latency, message formats, etc.
- **Data Consistency**: Maintaining consistency across services
- **Operational Overhead**: Managing multiple services, deployments, and environments
- **Service Discovery**: Services need to find and communicate with each other
- **Monitoring**: Need for comprehensive monitoring across services

## Getting Started

To start with microservices, consider the following steps:

1. **Start Small**: Begin with a monolith and extract services gradually
2. **Define Service Boundaries**: Use Domain-Driven Design to identify boundaries
3. **Establish Communication Patterns**: Choose between sync (REST, gRPC) and async (message queues)
4. **Implement Service Discovery**: Use tools like Consul or Kubernetes
5. **Set Up Centralized Logging**: Aggregate logs for easier debugging
6. **Implement Monitoring**: Track service health and performance
7. **Build CI/CD Pipelines**: Automate testing and deployment

Remember, microservices are not a silver bullet. They add complexity that might not be necessary for smaller applications. Always evaluate if this architecture style is right for your specific needs.
      `,
            excerpt: 'An introduction to microservices architecture, its benefits, challenges, and how to get started.',
            authorId: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f',
            authorName: 'Admin User',
            published: true,
            publishedAt: new Date(),
            featured: true,
            tags: 'microservices,architecture,backend,devops'
        });

        const article2 = await Article.create({
            title: 'Modern CSS Techniques Every Developer Should Know',
            content: `
# Modern CSS Techniques Every Developer Should Know

CSS has evolved significantly over the years, with many powerful features that make responsive and dynamic designs easier to implement. Here are some modern CSS techniques every developer should be familiar with.

## CSS Grid

CSS Grid is a two-dimensional layout system that has revolutionized how we create layouts.

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}
\`\`\`

This creates a responsive grid where elements automatically adjust based on container size.

## CSS Custom Properties (Variables)

CSS now supports variables, making it easier to maintain consistent styles.

\`\`\`css
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
}

.button {
  background-color: var(--primary-color);
}
\`\`\`

## Flexbox

Flexbox offers a more efficient way to distribute space and align items.

\`\`\`css
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
\`\`\`

## Responsive Typography with clamp()

Create responsive text without media queries:

\`\`\`css
h1 {
  font-size: clamp(1.5rem, 5vw, 3rem);
}
\`\`\`

## Container Queries

The newest addition to responsive design allows you to style based on the container's size rather than the viewport.

\`\`\`css
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 2fr 1fr;
  }
}
\`\`\`

## Logical Properties

Use logical properties for better internationalization support:

\`\`\`css
.container {
  margin-inline: auto; /* Instead of margin-left and margin-right */
  padding-block: 1rem; /* Instead of padding-top and padding-bottom */
}
\`\`\`

By mastering these techniques, you'll be better equipped to create modern, responsive, and maintainable web interfaces.
      `,
            excerpt: 'Discover modern CSS techniques like Grid, Custom Properties, Flexbox, and more that will elevate your web development skills.',
            authorId: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f',
            authorName: 'Admin User',
            published: true,
            publishedAt: new Date(Date.now() - 86400000), // 1 day ago
            featured: false,
            tags: 'css,frontend,web design,responsive'
        });

        // Associate articles with categories
        await article1.addCategories([categories[0], categories[2]]);
        await article2.addCategories([categories[0], categories[1]]);

        // Create sample comments
        await Comment.bulkCreate([
            {
                articleId: article1.id,
                content: 'Great article! I\'ve been looking to learn more about microservices.',
                authorId: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f',
                authorName: 'Admin User',
                approved: true,
                approvedAt: new Date(),
                approvedBy: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f'
            },
            {
                articleId: article2.id,
                content: 'CSS Grid is a game-changer! I\'ve been using it in all my projects.',
                authorId: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f',
                authorName: 'Admin User',
                approved: true,
                approvedAt: new Date(),
                approvedBy: '5f8d0f55-36d8-4f9a-8e12-8374a57c7a0f'
            }
        ]);

        console.log('Sample data seeded successfully');
        console.log(`Created ${categories.length} categories, ${2} articles, and ${2} comments`);
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