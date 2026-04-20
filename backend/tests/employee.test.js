// Employee Model Integration Tests
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const dbHandler = require('./utils/dbHandler');

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Employee Model Integration Tests', () => {
    const validData = {
        name: 'Jane Doe',
        email: 'jane.employee@test.com',
        mobile: '9876543210',
        address: '123 Employee Rd',
        password: 'hashedpassword'
    };

    test('should validate and save with valid data', async () => {
        const employee = new Employee(validData);
        const savedEmployee = await employee.save();
        
        expect(savedEmployee._id).toBeDefined();
        expect(savedEmployee.email).toBe(validData.email);
        expect(savedEmployee.isApproved).toBe(false); // Verify default
        expect(savedEmployee.approvalStatus).toBe('pending'); // Verify default
        expect(savedEmployee.profilePhoto).toContain('default-employee.svg');
    });

    test('should reject missing req fields: name, mobile, address, password', async () => {
        const employee = new Employee({ email: 'test@m.com' });
        
        let error;
        try { await employee.save(); } catch (err) { error = err; }
        
        expect(error.errors.name).toBeDefined();
        expect(error.errors.mobile).toBeDefined();
        expect(error.errors.address).toBeDefined();
        expect(error.errors.password).toBeDefined();
    });

    test('should prevent duplicate email entries', async () => {
        const e1 = new Employee(validData);
        await e1.save();
        
        const e2 = new Employee({ ...validData, mobile: '111111' }); // duplicate email
        
        let error;
        try { await e2.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.code).toBe(11000);
    });

    test('should enforce approvalStatus enum constraints', async () => {
        const employee = new Employee({ ...validData, approvalStatus: 'active' });
        
        let error;
        try { await employee.save(); } catch (err) { error = err; }
        
        expect(error).toBeDefined();
        expect(error.errors.approvalStatus).toBeDefined();
    });
});
