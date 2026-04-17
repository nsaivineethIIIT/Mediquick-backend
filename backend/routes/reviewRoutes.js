const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

/**
 * @swagger
 * /review/approved:
 *   get:
 *     tags:
 *       - Reviews
 *     summary: Get all approved reviews
 *     description: |
 *       Retrieves all approved reviews from the system.
 *       Results are sorted by creation date (newest first) and limited to 20 reviews.
 *       This endpoint is public and does not require authentication.
 *     responses:
 *       200:
 *         description: Approved reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   description: Number of approved reviews returned
 *                 reviews:
 *                   type: array
 *                   description: List of approved reviews
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Unique review ID
 *                       userId:
 *                         type: string
 *                         description: ID of the user who submitted the review
 *                       userType:
 *                         type: string
 *                         enum: ['Patient', 'Doctor']
 *                         description: Type of user
 *                       userName:
 *                         type: string
 *                         description: Name of the reviewer
 *                       rating:
 *                         type: number
 *                         minimum: 1
 *                         maximum: 5
 *                         description: Review rating (1-5)
 *                       reviewText:
 *                         type: string
 *                         description: Review content
 *                       isApproved:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Internal server error
 */
// Public routes
router.get('/approved', reviewController.getApprovedReviews);

/**
 * @swagger
 * /review/check/{userType}/{userId}:
 *   get:
 *     tags:
 *       - Reviews
 *     summary: Check if a user has already submitted a review
 *     description: |
 *       Checks whether a specific user (doctor or patient) has already submitted a review.
 *       Returns the review details if one exists, or null if none exists.
 *       This endpoint is public and does not require authentication.
 *     parameters:
 *       - in: path
 *         name: userType
 *         required: true
 *         schema:
 *           type: string
 *           enum: ['Patient', 'Doctor']
 *         description: Type of user
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the user
 *         example: "60d5ec49c1234567890ab124"
 *     responses:
 *       200:
 *         description: Check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 hasReviewed:
 *                   type: boolean
 *                   description: Whether the user has submitted a review
 *                 review:
 *                   type: object
 *                   nullable: true
 *                   description: Review details if user has reviewed, null otherwise
 *                   properties:
 *                     _id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     userType:
 *                       type: string
 *                       enum: ['Patient', 'Doctor']
 *                     rating:
 *                       type: number
 *                     reviewText:
 *                       type: string
 *       500:
 *         description: Internal server error
 */
router.get('/check/:userType/:userId', reviewController.checkUserReview);

/**
 * @swagger
 * /review/create:
 *   post:
 *     tags:
 *       - Reviews
 *     summary: Create a new review (authenticated users)
 *     description: |
 *       Allows authenticated users (doctors or patients) to submit a new review.
 *       The review is created in unapproved state and becomes visible after admin approval.
 *       Each user can only submit one review. Attempting to submit a second review will be rejected.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - userType
 *               - rating
 *               - reviewText
 *             properties:
 *               userId:
 *                 type: string
 *                 description: MongoDB ID of the reviewer
 *                 example: "60d5ec49c1234567890ab124"
 *               userType:
 *                 type: string
 *                 enum: ['Patient', 'Doctor']
 *                 description: Type of user submitting review
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Review rating (1-5 stars)
 *                 example: 4
 *               reviewText:
 *                 type: string
 *                 description: Review content/comments
 *                 minLength: 1
 *                 example: "Great experience with the platform and excellent doctor"
 *     responses:
 *       201:
 *         description: Review submitted successfully (awaiting approval)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Review submitted successfully! It will be visible after approval."
 *                 review:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     userType:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     rating:
 *                       type: number
 *                     reviewText:
 *                       type: string
 *                     isApproved:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Bad request - missing fields or user already reviewed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You have already submitted a review"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 */
// Protected routes (require authentication)
router.post('/create', reviewController.createReview);

/**
 * @swagger
 * /review/all:
 *   get:
 *     tags:
 *       - Reviews
 *     summary: Get all reviews (admin only)
 *     description: |
 *       Retrieves all reviews in the system (both approved and unapproved).
 *       This endpoint is for admin use only to manage review approvals and moderation.
 *       Returns reviews sorted by creation date (newest first).
 *     responses:
 *       200:
 *         description: All reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   description: Total number of reviews
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       userType:
 *                         type: string
 *                         enum: ['Patient', 'Doctor']
 *                       userName:
 *                         type: string
 *                       rating:
 *                         type: number
 *                       reviewText:
 *                         type: string
 *                       isApproved:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Internal server error
 */
// Admin routes
router.get('/all', reviewController.getAllReviews);

/**
 * @swagger
 * /review/approve/{reviewId}:
 *   put:
 *     tags:
 *       - Reviews
 *     summary: Approve a review (admin only)
 *     description: |
 *       Approves a pending review, making it visible to all users on the platform.
 *       Only administrators can approve reviews. Once approved, the review becomes publicly visible.
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the review to approve
 *         example: "60d5ec49c1234567890ab124"
 *     responses:
 *       200:
 *         description: Review approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Review approved successfully"
 *                 review:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     userType:
 *                       type: string
 *                     rating:
 *                       type: number
 *                     reviewText:
 *                       type: string
 *                     isApproved:
 *                       type: boolean
 *                       example: true
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Review not found"
 *       500:
 *         description: Internal server error
 */
router.put('/approve/:reviewId', reviewController.approveReview);

/**
 * @swagger
 * /review/delete/{reviewId}:
 *   delete:
 *     tags:
 *       - Reviews
 *     summary: Delete a review (admin only)
 *     description: |
 *       Permanently removes a review from the system.
 *       Only administrators can delete reviews. Use this to remove inappropriate or spam reviews.
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the review to delete
 *         example: "60d5ec49c1234567890ab124"
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Review deleted successfully"
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Review not found"
 *       500:
 *         description: Internal server error
 */
router.delete('/delete/:reviewId', reviewController.deleteReview);

module.exports = router;
