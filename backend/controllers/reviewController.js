const Review = require('../models/Review');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../middlewares/asyncHandler');

// Create a new review
exports.createReview = asyncHandler(async (req, res) => {
    try {
        console.log('Review creation request:', req.body);
        const { userId, userType, rating, reviewText } = req.body;

        // Validate input with specific error messages
        const missingFields = [];
        if (!userId) missingFields.push('userId');
        if (!userType) missingFields.push('userType');
        if (!rating) missingFields.push('rating');
        if (!reviewText) missingFields.push('reviewText');
        
        if (missingFields.length > 0) {
            console.log('Validation failed - missing fields:', missingFields);
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Verify user exists
        let user;
        if (userType === 'Patient') {
            user = await Patient.findById(userId);
        } else if (userType === 'Doctor') {
            user = await Doctor.findById(userId);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid user type. Must be Patient or Doctor'
            });
        }

        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user has already submitted a review
        const existingReview = await Review.findOne({ userId, userType });
        if (existingReview) {
            console.log('User already has a review');
            return res.status(400).json({
                success: false,
                message: 'You have already submitted a review'
            });
        }

        // Create review
        const review = new Review({
            userId,
            userType,
            userName: user.name,
            rating,
            reviewText
        });

        await review.save();
        console.log('Review created successfully:', review._id);

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully! It will be visible after approval.',
            review
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating review',
            error: error.message
        });
    }
});

// Get all approved reviews
exports.getApprovedReviews = asyncHandler(async (req, res) => {
    try {
        const reviews = await Review.find({ isApproved: true })
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            count: reviews.length,
            reviews
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
});

// Get all reviews (for admin)
exports.getAllReviews = asyncHandler(async (req, res) => {
    try {
        const reviews = await Review.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            reviews
        });
    } catch (error) {
        console.error('Get all reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
});

// Approve a review (admin only)
exports.approveReview = asyncHandler(async (req, res) => {
    try {
        const { reviewId } = req.params;

        const review = await Review.findByIdAndUpdate(
            reviewId,
            { isApproved: true },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Review approved successfully',
            review
        });
    } catch (error) {
        console.error('Approve review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving review',
            error: error.message
        });
    }
});

// Delete a review
exports.deleteReview = asyncHandler(async (req, res) => {
    try {
        const { reviewId } = req.params;

        const review = await Review.findByIdAndDelete(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting review',
            error: error.message
        });
    }
});

// Check if user has already reviewed
exports.checkUserReview = asyncHandler(async (req, res) => {
    try {
        const { userId, userType } = req.params;

        const review = await Review.findOne({ userId, userType });

        res.status(200).json({
            success: true,
            hasReviewed: !!review,
            review: review || null
        });
    } catch (error) {
        console.error('Check user review error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking review status',
            error: error.message
        });
    }
});
