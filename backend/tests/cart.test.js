// Cart Model Integration Tests
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Cart Model Integration Tests', () => {
    test('should validate and save with correct data structure', async () => {
        const cartData = new Cart({
            patientId: new mongoose.Types.ObjectId(),
            items: [
                {
                    medicineId: new mongoose.Types.ObjectId(),
                    quantity: 2
                }
            ]
        });
        const savedCart = await cartData.save();
        
        expect(savedCart._id).toBeDefined();
        expect(savedCart.patientId).toBeDefined();
        expect(savedCart.items.length).toBe(1);
        expect(savedCart.items[0].quantity).toBe(2);
    });

    test('should reject missing patientId', async () => {
        const cartData = new Cart({
            items: [{ medicineId: new mongoose.Types.ObjectId(), quantity: 1 }]
        });
        
        let error;
        try { await cartData.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.patientId).toBeDefined();
    });

    test('should enforce duplicate patientId constraints', async () => {
        const patientId = new mongoose.Types.ObjectId();
        const cart1 = new Cart({ patientId, items: [] });
        await cart1.save();
        
        const cart2 = new Cart({ patientId, items: [] });
        
        let error;
        try { await cart2.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.code).toBe(11000); // Unique index violation 
    });

    test('should enforce items.quantity minimum bound of 1', async () => {
        const cartData = new Cart({
            patientId: new mongoose.Types.ObjectId(),
            items: [
                { medicineId: new mongoose.Types.ObjectId(), quantity: 0 } // min is 1
            ]
        });
        
        let error;
        try { await cartData.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors['items.0.quantity']).toBeDefined();
        expect(error.errors['items.0.quantity'].message).toContain('is less than minimum allowed value (1)');
    });

    test('should require items.medicineId inside items array', async () => {
        const cartData = new Cart({
            patientId: new mongoose.Types.ObjectId(),
            items: [{ quantity: 2 }] // medicineId is missing
        });
        
        let error;
        try { await cartData.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors['items.0.medicineId']).toBeDefined();
    });

    test('should allow empty items array', async () => {
        const cartData = new Cart({ patientId: new mongoose.Types.ObjectId() });
        const savedCart = await cartData.save();
        
        expect(savedCart._id).toBeDefined();
        expect(Array.isArray(savedCart.items)).toBe(true);
        expect(savedCart.items.length).toBe(0);
    });
});
