/**
 * Article Model
 * Defines the blog article schema
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Article = sequelize.define('Article', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Article title'
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'URL-friendly version of the title'
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
        comment: 'Article content in markdown format'
    },
    excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Short description of the article'
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to article cover image'
    },
    authorId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID of the author (user)'
    },
    authorName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Name of the author'
    },
    authorAvatar: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL to author avatar'
    },
    published: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the article is published'
    },
    publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date when article was published'
    },
    featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the article is featured'
    },
    viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of views'
    },
    readTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Estimated read time in minutes'
    },
    metaTitle: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'SEO title'
    },
    metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'SEO description'
    },
    tags: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Comma-separated list of tags'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'articles',
    indexes: [
        {
            unique: true,
            fields: ['slug']
        },
        {
            fields: ['authorId']
        },
        {
            fields: ['published', 'publishedAt']
        },
        {
            fields: ['featured']
        },
        {
            fields: ['tags']
        }
    ],
    hooks: {
        // Generate slug from title before validation
        beforeValidate: (article) => {
            if (article.title && (!article.slug || article.changed('title'))) {
                article.slug = article.title
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '') // Remove non-word chars
                    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
                    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

                // Add random string to guarantee uniqueness
                if (article.isNewRecord) {
                    const randomString = Math.random().toString(36).substring(2, 8);
                    article.slug = `${article.slug}-${randomString}`;
                }
            }
        },

        // Calculate read time before save
        beforeSave: (article) => {
            if (article.content && (!article.readTime || article.changed('content'))) {
                // Average reading speed: 200 words per minute
                const wordCount = article.content.split(/\s+/).length;
                article.readTime = Math.max(1, Math.ceil(wordCount / 200));
            }
        },

        // Set publishedAt when article is published
        beforeUpdate: (article) => {
            if (article.changed('published') && article.published && !article.publishedAt) {
                article.publishedAt = new Date();
            }
        },

        // Update associated comments when article is restored
        afterRestore: async (article) => {
            const { Comment } = require('./index');

            // Restore associated comments
            await Comment.restore({ where: { articleId: article.id } });
        }
    }
});

module.exports = Article;