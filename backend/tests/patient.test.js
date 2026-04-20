// Exhaustive Patient Model Constraints Testing
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Exhaustive Patient Model Constraints', () => {
    let mockPatient;

    beforeEach(() => {
        mockPatient = {
            name: 'Robert',
            email: 'robert.patient@test.com',
            mobile: '1234567890',
            address: '123 Main St',
            password: 'securepassword',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male'
        };
    });

    test('should validate a perfect patient document', async () => {
        const patient = new Patient(mockPatient);
        const saved = await patient.save();
        expect(saved._id).toBeDefined();
        expect(saved.email).toBe('robert.patient@test.com');
    });

    test('should require missing name field', async () => {
        delete mockPatient.name;
        const patient = new Patient(mockPatient);
        let error;
        try { await patient.save(); } catch (err) { error = err; }
        expect(error.errors.name).toBeDefined();
    });

    test('should require missing email field', async () => {
        delete mockPatient.email;
        const patient = new Patient(mockPatient);
        let error;
        try { await patient.save(); } catch (err) { error = err; }
        expect(error.errors.email).toBeDefined();
    });

    test('should require missing mobile field', async () => {
        delete mockPatient.mobile;
        const patient = new Patient(mockPatient);
        let error;
        try { await patient.save(); } catch (err) { error = err; }
        expect(error.errors.mobile).toBeDefined();
    });

    test('should require missing address field', async () => {
        delete mockPatient.address;
        const patient = new Patient(mockPatient);
        let error;
        try { await patient.save(); } catch (err) { error = err; }
        expect(error.errors.address).toBeDefined();
    });

    test('should require missing password field', async () => {
        delete mockPatient.password;
        const patient = new Patient(mockPatient);
        let error;
        try { await patient.save(); } catch (err) { error = err; }
        expect(error.errors.password).toBeDefined();
    });

    test('should strictly default authProvider to local', async () => {
        const patient = new Patient(mockPatient);
        const saved = await patient.save();
        expect(saved.authProvider).toBe('local');
    });

    test('should reject invalid authProvider enum value', async () => {
        mockPatient.authProvider = 'facebook'; // invalid enum
        const patient = new Patient(mockPatient);
        let error;
        try { await patient.save(); } catch (err) { error = err; }
        expect(error.errors.authProvider).toBeDefined();
    });

    test('should allow google authProvider enum value', async () => {
        mockPatient.authProvider = 'google';
        const patient = new Patient(mockPatient);
        const saved = await patient.save();
        expect(saved.authProvider).toBe('google');
    });

    test('should correctly cast valid dateOfBirth to Date object', async () => {
        mockPatient.dateOfBirth = '1985-05-15';
        const patient = new Patient(mockPatient);
        const saved = await patient.save();
        expect(saved.dateOfBirth instanceof Date).toBe(true);
    });

    test('should reject invalid gender enum value', async () => {
        mockPatient.gender = 'alien';
        const patient = new Patient(mockPatient);
        let error;
        try { await patient.save(); } catch (err) { error = err; }
        expect(error.errors.gender).toBeDefined();
    });

    test('should auto-lowercase gender values', async () => {
        mockPatient.gender = 'MALE'; // The schema has lowercase: true
        const patient = new Patient(mockPatient);
        const saved = await patient.save();
        expect(saved.gender).toBe('male');
    });

    test('should auto-assign default profilePhoto path', async () => {
        const patient = new Patient(mockPatient);
        const saved = await patient.save();
        expect(saved.profilePhoto).toContain('default-patient.svg');
    });

    test('should allow tracking dynamic providerId for Google accounts', async () => {
        mockPatient.authProvider = 'google';
        mockPatient.providerId = '1092830192831023';
        const patient = new Patient(mockPatient);
        const saved = await patient.save();
        expect(saved.providerId).toBe('1092830192831023');
    });

    describe('Addresses Nested Schema Tests', () => {
        beforeEach(() => {
            mockPatient.addresses = [{
                street: '1 Test Ln',
                city: 'Testville',
                state: 'TS',
                zip: '12345',
                country: 'Testland'
            }];
        });

        test('should allow saving valid nested addresses array', async () => {
            const patient = new Patient(mockPatient);
            const saved = await patient.save();
            expect(saved.addresses.length).toBe(1);
            expect(saved.addresses[0].street).toBe('1 Test Ln');
        });

        test('should require basic subfields inside addresses schema', async () => {
            delete mockPatient.addresses[0].city; // Missing city
            const patient = new Patient(mockPatient);
            let error;
            try { await patient.save(); } catch (err) { error = err; }
            expect(error.errors['addresses.0.city']).toBeDefined();
        });

        test('should set nested isDefault correctly to false boolean', async () => {
            const patient = new Patient(mockPatient);
            const saved = await patient.save();
            expect(saved.addresses[0].isDefault).toBe(false);
        });

        test('should allow overriding nested isDefault attribute', async () => {
            mockPatient.addresses[0].isDefault = true;
            const patient = new Patient(mockPatient);
            const saved = await patient.save();
            expect(saved.addresses[0].isDefault).toBe(true);
        });
    });
});
