/**
 * Blog Routes
 * Defines API endpoints for blog-related operations
 */

const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article.controller');
const categoryController = require('../controllers/category.controller');
const commentController = require('../controllers/comment.controller');
const { authenticate, hasRole } = require('../middleware/auth.middleware');
const { validateArticle, validateCategory, validateComment } = require('../middleware/validation.middleware');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'blog-service',
        timestamp: new Date().toISOString()
    });
});

// Public routes - Articles
router.get('/articles', authenticate(false), articleController.getAllArticles);
router.get('/articles/:slug', authenticate(false), articleController.getArticleBySlug);

// Authenticated routes - Articles
router.post('/articles', authenticate(), validateArticle, articleController.createArticle);
router.put('/articles/:slug', authenticate(), validateArticle, articleController.updateArticle);
router.delete('/articles/:slug', authenticate(), articleController.deleteArticle);
router.patch('/articles/:slug/publish', authenticate(), articleController.togglePublishStatus);
router.patch('/articles/:slug/feature', authenticate(), hasRole('admin'), articleController.toggleFeaturedStatus);

// Public routes - Categories
router.get('/categories', authenticate(false), categoryController.getAllCategories);
router.get('/categories/:slug', authenticate(false), categoryController.getCategoryBySlug);

// Admin routes - Categories
router.post('/categories', authenticate(), hasRole('admin'), validateCategory, categoryController.createCategory);
router.put('/categories/:slug', authenticate(), hasRole('admin'), validateCategory, categoryController.updateCategory);
router.delete('/categories/:slug', authenticate(), hasRole('admin'), categoryController.deleteCategory);

// Comment routes
router.get('/articles/:articleId/comments', authenticate(false), commentController.getCommentsByArticle);
router.post('/articles/:articleId/comments', authenticate(), validateComment, commentController.createComment);
router.put('/comments/:id', authenticate(), validateComment, commentController.updateComment);
router.delete('/comments/:id', authenticate(), commentController.deleteComment);

// Admin comment routes
router.get('/comments/pending', authenticate(), hasRole('admin'), commentController.getPendingComments);
router.patch('/comments/:id/approve', authenticate(), hasRole('admin'), commentController.approveComment);
router.patch('/comments/:id/reject', authenticate(), hasRole('admin'), commentController.rejectComment);

module.exports = router;