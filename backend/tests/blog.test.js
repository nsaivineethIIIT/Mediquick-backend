// Blog Model Integration Tests
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Blog Model Integration Tests', () => {
    const validBlogData = {
        title: 'Healthy Eating',
        theme: 'Nutrition',
        content: 'Eating well is important...',
        authorName: 'John Doe',
        authorEmail: 'john@example.com'
    };

    test('should validate and save blog with valid data', async () => {
        const blog = new Blog(validBlogData);
        const savedBlog = await blog.save();
        
        expect(savedBlog._id).toBeDefined();
        expect(savedBlog.title).toBe(validBlogData.title);
        expect(savedBlog.authorType).toBe('user'); // Default
        expect(savedBlog.createdAt).toBeDefined();
    });

    test('should reject blog missing title', async () => {
        const invalidData = { ...validBlogData };
        delete invalidData.title;
        
        const blog = new Blog(invalidData);
        let error;
        try { await blog.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.title).toBeDefined();
    });

    test('should reject blog missing content', async () => {
        const invalidData = { ...validBlogData };
        delete invalidData.content;
        
        const blog = new Blog(invalidData);
        let error;
        try { await blog.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.content).toBeDefined();
    });

    test('should enforce authorType enum bounds', async () => {
        const invalidData = { ...validBlogData, authorType: 'admin' };
        
        const blog = new Blog(invalidData);
        let error;
        try { await blog.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.authorType).toBeDefined();
        expect(error.errors.authorType.message).toContain('is not a valid enum value');
    });

    test('should allow saving valid authorType values', async () => {
        const validTypes = ['user', 'doctor', 'employee'];
        
        for (const type of validTypes) {
            const blog = new Blog({ ...validBlogData, authorType: type });
            const savedBlog = await blog.save();
            expect(savedBlog.authorType).toBe(type);
        }
    });

    test('should correctly handle images array', async () => {
        const blogData = { ...validBlogData, images: ['image1.jpg', 'image2.png'] };
        const blog = new Blog(blogData);
        const savedBlog = await blog.save();
        
        expect(Array.isArray(savedBlog.images)).toBe(true);
        expect(savedBlog.images.length).toBe(2);
    });

    test('should reject missing authorEmail', async () => {
        const invalidData = { ...validBlogData };
        delete invalidData.authorEmail;
        
        const blog = new Blog(invalidData);
        let error;
        try { await blog.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.authorEmail).toBeDefined();
    });

    test('should set default createdAt timestamp', async () => {
        const blog = new Blog(validBlogData);
        const savedBlog = await blog.save();
        
        expect(savedBlog.createdAt).toBeInstanceOf(Date);
        expect(savedBlog.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
});
