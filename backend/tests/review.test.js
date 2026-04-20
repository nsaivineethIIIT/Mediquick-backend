// Review Model Integration Tests
const mongoose = require('mongoose');
const Review = require('../models/Review');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Review Model Integration Tests', () => {
    let mockData;

    beforeEach(() => {
        mockData = {
            userId: new mongoose.Types.ObjectId(),
            userType: 'Patient',
            userName: 'John Reviewer',
            rating: 4,
            reviewText: 'This is a great doctor and very helpful.' // >= 10 chars
        };
    });

    test('should validate and save correct review', async () => {
        const review = new Review(mockData);
        const savedReview = await review.save();
        
        expect(savedReview._id).toBeDefined();
        expect(savedReview.rating).toBe(4);
        expect(savedReview.isApproved).toBe(false); // default
    });

    test('should reject rating below 1', async () => {
        mockData.rating = 0;
        const review = new Review(mockData);
        
        let error;
        try { await review.save(); } catch (err) { error = err; }
        
        expect(error.errors.rating).toBeDefined();
        expect(error.errors.rating.message).toContain('is less than minimum allowed value');
    });

    test('should reject rating above 5', async () => {
        mockData.rating = 6;
        const review = new Review(mockData);
        
        let error;
        try { await review.save(); } catch (err) { error = err; }
        
        expect(error.errors.rating).toBeDefined();
        expect(error.errors.rating.message).toContain('is more than maximum allowed value');
    });

    test('should enforce minLength 10 on reviewText', async () => {
        mockData.reviewText = 'Too short'; // 9 chars
        const review = new Review(mockData);
        
        let error;
        try { await review.save(); } catch (err) { error = err; }
        
        expect(error.errors.reviewText).toBeDefined();
        expect(error.errors.reviewText.message).toContain('shorter than the minimum allowed length (10)');
    });

    test('should enforce userType enum', async () => {
        mockData.userType = 'Admin'; // not 'Patient' or 'Doctor'
        const review = new Review(mockData);
        
        let error;
        try { await review.save(); } catch (err) { error = err; }
        
        expect(error.errors.userType).toBeDefined();
        expect(error.errors.userType.message).toContain('is not a valid enum value');
    });

    test('should require userName', async () => {
        delete mockData.userName;
        const review = new Review(mockData);
        
        let error;
        try { await review.save(); } catch (err) { error = err; }
        
        expect(error.errors.userName).toBeDefined();
    });

    test('should set default createdAt', async () => {
        const review = new Review(mockData);
        const saved = await review.save();
        expect(saved.createdAt instanceof Date).toBe(true);
    });
});
