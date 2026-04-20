// Supplier Model Integration Tests
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Supplier Model Integration Tests', () => {
    let mockData;

    beforeEach(() => {
        mockData = {
            name: 'Medicorp',
            email: 'supply@medicorp.com',
            mobile: '5551234567',
            address: 'Industrial District',
            supplierID: 'SUP-4455',
            password: 'hashedpassword999'
        };
    });

    test('should validate and save with valid data', async () => {
        const supplier = new Supplier(mockData);
        const savedSupplier = await supplier.save();
        
        expect(savedSupplier._id).toBeDefined();
        expect(savedSupplier.email).toBe('supply@medicorp.com');
        expect(savedSupplier.isApproved).toBe(false);
        expect(savedSupplier.approvalStatus).toBe('pending');
        expect(savedSupplier.isRejected).toBe(false);
    });

    test('should reject missing mandatory fields', async () => {
        const supplier = new Supplier({});
        let error;
        try { await supplier.save(); } catch (err) { error = err; }
        
        expect(error.errors.name).toBeDefined();
        expect(error.errors.email).toBeDefined();
        expect(error.errors.supplierID).toBeDefined();
    });

    test('should enforce unique email constraint', async () => {
        const s1 = new Supplier(mockData);
        await s1.save();
        
        const s2 = new Supplier({
            ...mockData, 
            supplierID: 'SUP-0000' // unique ID, but duplicate email
        });
        
        let error;
        try { await s2.save(); } catch (err) { error = err; }
        
        expect(error.code).toBe(11000);
    });

    test('should enforce unique supplierID constraint', async () => {
        const s1 = new Supplier(mockData);
        await s1.save();
        
        const s2 = new Supplier({
            ...mockData, 
            email: 'newemail@test.com' // unique email, but duplicate short ID
        });
        
        let error;
        try { await s2.save(); } catch (err) { error = err; }
        
        expect(error.code).toBe(11000);
    });

    test('should enforce approvalStatus enum', async () => {
        mockData.approvalStatus = 'verified'; // Invalid enum value
        const supplier = new Supplier(mockData);
        
        let error;
        try { await supplier.save(); } catch (err) { error = err; }
        
        expect(error.errors.approvalStatus).toBeDefined();
    });

    test('should save documentPath and rejectionReason strings', async () => {
        mockData.documentPath = '/uploads/docs/license.pdf';
        mockData.rejectionReason = 'Incomplete paperwork';
        
        const supplier = new Supplier(mockData);
        const saved = await supplier.save();
        
        expect(saved.documentPath).toContain('license.pdf');
        expect(saved.rejectionReason).toBe('Incomplete paperwork');
    });

    test('should assign default profile photo', async () => {
        const supplier = new Supplier(mockData);
        const saved = await supplier.save();
        
        expect(saved.profilePhoto).toContain('default-supplier.svg');
    });
});
