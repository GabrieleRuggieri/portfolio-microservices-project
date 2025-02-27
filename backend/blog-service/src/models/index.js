/**
 * Models Index
 * Configures relationships between models and exports them
 */

const Article = require('./article.model');
const Category = require('./category.model');
const Comment = require('./comment.model');
const ArticleCategory = require('./article-category.model');

// Define relationships between models

// Article <-> Category (Many-to-Many)
Article.belongsToMany(Category, {
    through: ArticleCategory,
    foreignKey: 'articleId',
    otherKey: 'categoryId',
    as: 'categories'
});

Category.belongsToMany(Article, {
    through: ArticleCategory,
    foreignKey: 'categoryId',
    otherKey: 'articleId',
    as: 'articles'
});

// Article <-> Comment (One-to-Many)
Article.hasMany(Comment, {
    foreignKey: 'articleId',
    as: 'comments',
    onDelete: 'CASCADE'
});

Comment.belongsTo(Article, {
    foreignKey: 'articleId',
    as: 'article'
});

// Comment <-> Comment (Self-referential for nested comments)
Comment.hasMany(Comment, {
    foreignKey: 'parentId',
    as: 'replies'
});

Comment.belongsTo(Comment, {
    foreignKey: 'parentId',
    as: 'parent'
});

// Category <-> Category (Self-referential for hierarchical categories)
Category.hasMany(Category, {
    foreignKey: 'parentId',
    as: 'subcategories'
});

Category.belongsTo(Category, {
    foreignKey: 'parentId',
    as: 'parentCategory'
});

module.exports = {
    Article,
    Category,
    Comment,
    ArticleCategory
};