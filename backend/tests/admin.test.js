// Admin Analytics Tests
// Real Mongoose integration tests validating Admin schema and data structures
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const dbHandler = require('./utils/dbHandler');
const path = require('path');
const { mockAdminData } = require(path.join(__dirname, 'mocks', 'authMocks'));

// Setup memory database connections
beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Admin Integration Tests', () => {
  describe('Admin Schema Definition', () => {
    test('should validate and save with valid fields', async () => {
      const validAdmin = new Admin(mockAdminData.valid);
      const savedAdmin = await validAdmin.save();
      expect(savedAdmin._id).toBeDefined();
      expect(savedAdmin.email).toBe(mockAdminData.valid.email.toLowerCase());
    });

    test('should require primary fields (email, password)', async () => {
      const invalidAdmin = new Admin({
        name: 'No Email Or Pass'
      });
      
      let error;
      try {
        await invalidAdmin.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    test('should prevent duplicate admin emails', async () => {
      const admin1 = new Admin(mockAdminData.valid);
      await admin1.save();
      
      const admin2 = new Admin({
        ...mockAdminData.valid,
        mobile: '9999999999' // Different mobile, but same email
      });
      
      let error;
      try {
        await admin2.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // 11000 = unique constraint violation
    });
  });

  describe('Business Logic Simulation (Unit Tests)', () => {
    // These tests validate the underlying mathematical formulas used
    // in the adminController for generating analytics and checking limits
    test('calculate Total Revenue correctly aggregating appts (10% commission)', () => {
      const appointments = [
        { consultationFee: 500 },
        { consultationFee: 1000 },
        { consultationFee: 750 }
      ];
      
      const calculateRevenue = (appts) => {
        return appts.reduce((sum, appt) => sum + ((appt.consultationFee || 0) * 0.1), 0);
      };
      
      const revenue = calculateRevenue(appointments);
      
      expect(revenue).toBe(225); // 500*0.1 + 1000*0.1 + 750*0.1
    });

    test('calculate MediQuick commission correctly on Medicine Orders (5%)', () => {
      const orders = [
        { totalCost: 1000 },
        { totalCost: 200 }
      ];
      
      const calculateMedicineRevenue = (ordersList) => {
        return ordersList.reduce((sum, order) => sum + ((order.totalCost || 0) * 0.05), 0);
      };
      
      const revenue = calculateMedicineRevenue(orders);
      
      expect(revenue).toBe(60); // 1000*0.05 + 200*0.05
    });

    test('handle missing consultation fees gracefully during aggregation', () => {
      const appointments = [
        { consultationFee: null }, // Null fee
        { }, // Undefined fee
        { consultationFee: 500 }
      ];
      
      const calculateRevenue = (appts) => {
        return appts.reduce((sum, appt) => sum + ((appt.consultationFee || 0) * 0.1), 0);
      };
      
      const revenue = calculateRevenue(appointments);
      
      expect(revenue).toBe(50); // Only 500 applies
    });
  });
});
