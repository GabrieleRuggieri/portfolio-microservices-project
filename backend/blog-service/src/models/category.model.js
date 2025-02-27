/**
 * Category Model
 * Defines the blog category schema
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Category name'
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'URL-friendly version of the name'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Category description'
    },
    color: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#3498db',
        comment: 'Color code for the category (hex)'
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Icon identifier or URL'
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Display order (lower shows first)'
    },
    featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the category is featured'
    },
    parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Parent category ID for hierarchical categories'
    }
}, {
    timestamps: true,
    paranoid: true, // Enable soft deletes
    tableName: 'categories',
    indexes: [
        {
            unique: true,
            fields: ['name']
        },
        {
            unique: true,
            fields: ['slug']
        },
        {
            fields: ['parentId']
        },
        {
            fields: ['featured', 'order']
        }
    ],
    hooks: {
        // Generate slug from name before validation
        beforeValidate: (category) => {
            if (category.name && (!category.slug || category.changed('name'))) {
                category.slug = category.name
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '') // Remove non-word chars
                    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
                    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
            }
        }
    }
});

module.exports = Category;