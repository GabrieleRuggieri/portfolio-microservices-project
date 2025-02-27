/**
 * ArticleCategory Model
 * Junction table for the many-to-many relationship between articles and categories
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database.util');

const ArticleCategory = sequelize.define('ArticleCategory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    articleId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID of the article'
    },
    categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID of the category'
    }
}, {
    timestamps: true,
    paranoid: false, // No need for soft deletes in junction table
    tableName: 'article_categories',
    indexes: [
        {
            unique: true,
            fields: ['articleId', 'categoryId']
        }
    ]
});

module.exports = ArticleCategory;