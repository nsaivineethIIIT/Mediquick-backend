// Exhaustive Doctor Model Constraints Testing
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Exhaustive Doctor Model Constraints', () => {
    let mockDoc;

    beforeEach(() => {
        mockDoc = {
            name: 'Dr. Gregory House',
            email: 'greg.house@test.com',
            mobile: '9876543210',
            address: 'Princeton Plainsboro',
            registrationNumber: 'MED-12345',
            college: 'Johns Hopkins',
            yearOfPassing: '1995',
            location: 'New Jersey',
            password: 'vicodinpassword'
        };
    });

    test('should validate a master valid doctor document', async () => {
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved._id).toBeDefined();
        expect(saved.email).toBe('greg.house@test.com');
    });

    // 1. Required string checks
    const requiredStrings = ['name', 'email', 'mobile', 'address', 'registrationNumber', 'college', 'yearOfPassing', 'location', 'password'];
    requiredStrings.forEach(field => {
        test(`should explicitly require missing field: ${field}`, async () => {
            delete mockDoc[field];
            const doc = new Doctor(mockDoc);
            let error;
            try { await doc.save(); } catch (err) { error = err; }
            expect(error.errors[field]).toBeDefined();
        });
    });

    test('should set isApproved default to false boolean', async () => {
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.isApproved).toBe(false);
    });

    test('should set isRejected default to false boolean', async () => {
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.isRejected).toBe(false);
    });

    test('should allow custom assignment for isApproved true override', async () => {
        mockDoc.isApproved = true;
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.isApproved).toBe(true);
    });

    test('should allow null logic for optional parameters like ssn', async () => {
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.ssn).toBeNull();
    });

    test('should enforce unique email constraint on Doctor schema', async () => {
        const d1 = new Doctor(mockDoc);
        await d1.save();
        
        const d2 = new Doctor({ ...mockDoc, registrationNumber: 'MED-5555' }); // duplicate email
        let error;
        try { await d2.save(); } catch (err) { error = err; }
        expect(error.code).toBe(11000);
    });

    test('should enforce unique registrationNumber constraint on Doctor schema', async () => {
        const d1 = new Doctor(mockDoc);
        await d1.save();
        
        const d2 = new Doctor({ ...mockDoc, email: 'newdoc@test.com' }); // duplicate reg num
        let error;
        try { await d2.save(); } catch (err) { error = err; }
        expect(error.code).toBe(11000);
    });

    test('should securely default onlineStatus to offline', async () => {
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.onlineStatus).toBe('offline');
    });

    test('should reject incorrect onlineStatus payload strings', async () => {
        mockDoc.onlineStatus = 'vacation';
        const doctor = new Doctor(mockDoc);
        let error;
        try { await doctor.save(); } catch (err) { error = err; }
        expect(error.errors.onlineStatus).toBeDefined();
    });

    test('should force auto-lowercase on onlineStatus logic payload', async () => {
        mockDoc.onlineStatus = 'ONLINE'; // Schema configures lowercase: true
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.onlineStatus).toBe('online');
    });

    test('should correctly apply structural default for consultationFee to 100', async () => {
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.consultationFee).toBe(100);
    });

    test('should prevent saving absolutely negative consultation limits', async () => {
        mockDoc.consultationFee = -5;
        const doctor = new Doctor(mockDoc);
        let error;
        try { await doctor.save(); } catch (err) { error = err; }
        expect(error.errors.consultationFee).toBeDefined();
        expect(error.errors.consultationFee.message).toContain('Consultation fee cannot be negative');
    });

    test('should handle completely missing gender attribute gracefully', async () => {
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.gender).toBeUndefined();
    });

    test('should prevent non canonical gender options', async () => {
        mockDoc.gender = 'helicopter'; // Enum is male/female/other
        const doctor = new Doctor(mockDoc);
        let error;
        try { await doctor.save(); } catch (err) { error = err; }
        expect(error.errors.gender).toBeDefined();
    });

    test('should automatically configure default generic avatar path', async () => {
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.profilePhoto).toContain('default-doctor.svg');
    });

    test('should allow custom assignment for string attributes like ssn and documentPath', async () => {
        mockDoc.ssn = '123-456-7890';
        mockDoc.documentPath = './docs/certificate.pdf';
        const doctor = new Doctor(mockDoc);
        const saved = await doctor.save();
        expect(saved.ssn).toBe('123-456-7890');
        expect(saved.documentPath).toContain('certificate.pdf');
    });
});
