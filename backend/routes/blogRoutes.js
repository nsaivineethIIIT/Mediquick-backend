const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController.js');
const { uploadBlog } = require('../middlewares/upload.js');
const { verifyAuthenticatedUser } = require('../middlewares/auth');

/**
 * @swagger
 * /blog:
 *   get:
 *     summary: Get All Blog Posts
 *     description: Retrieves a list of all published blog posts with pagination and filtering
 *     tags:
 *       - Blog
 *       - Posts
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number for pagination
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of posts per page
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search posts by title or content
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter posts by category
 *       - name: author
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter posts by author
 *     responses:
 *       200:
 *         description: Blog posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       author:
 *                         type: string
 *                       category:
 *                         type: string
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       views:
 *                         type: number
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /blog/post:
 *   get:
 *     summary: Get Blog Post Submit Form
 *     description: Retrieves the form page for submitting a new blog post (HTML)
 *     tags:
 *       - Blog
 *       - Forms
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Post form page retrieved
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /blog/submit:
 *   post:
 *     summary: Submit New Blog Post
 *     description: Creates a new blog post with title, content, category, and up to 5 images
 *     tags:
 *       - Blog
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Blog post title (max 200 characters)
 *               content:
 *                 type: string
 *                 description: Blog post content/body text
 *               category:
 *                 type: string
 *                 description: Post category (Health, Wellness, Medical, etc.)
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags for post
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Blog post images (max 5 files, supports JPEG/PNG/GIF)
 *     responses:
 *       201:
 *         description: Blog post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 postId:
 *                   type: string
 *                 post:
 *                   type: object
 *       400:
 *         description: Validation error (missing fields or invalid data)
 *       401:
 *         description: Unauthorized - authentication required
 *       413:
 *         description: File size too large
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /blog/{id}:
 *   get:
 *     summary: Get Single Blog Post
 *     description: Retrieves a specific blog post by ID with full details and comments
 *     tags:
 *       - Blog
 *       - Posts
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog post ID
 *     responses:
 *       200:
 *         description: Blog post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 content:
 *                   type: string
 *                 author:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                 category:
 *                   type: string
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *                 images:
 *                   type: array
 *                   items:
 *                     type: string
 *                 views:
 *                   type: number
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Blog post not found
 *       500:
 *         description: Internal server error
 */

router.get('/', blogController.getBlogs);
router.get('/search', blogController.searchBlogs);
router.get('/post', blogController.getPostForm);
router.post('/submit', verifyAuthenticatedUser, uploadBlog.array('images', 5), blogController.postSubmit);
router.get('/:id', blogController.getSingle);

module.exports = router;