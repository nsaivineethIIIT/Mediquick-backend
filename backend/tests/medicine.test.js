// Medicine Ordering Tests
// Real Mongoose integration tests ensuring Medicine and Order schema validations happen.
const path = require('path');
const mongoose = require('mongoose');

const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const Supplier = require('../models/Supplier');
const Patient = require('../models/Patient');
const dbHandler = require('./utils/dbHandler');

const {
  mockMedicineData,
  mockOrderData
} = require(path.join(__dirname, 'mocks', 'medicineMocks'));

// Setup memory database connections
beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Medicine & Order Model Integration Tests', () => {
  describe('Medicine Model Validation', () => {
    let supplierId;

    beforeEach(async () => {
      // Need a valid supplier to associate medicines with
      const supplier = new Supplier({
        name: 'Test Supplier',
        email: 'supplier@test.com',
        mobile: '1234567890',
        password: 'pass',
        supplierID: 'SUP999',
        address: 'Test Addr'
      });
      const saved = await supplier.save();
      supplierId = saved._id;
    });

    test('should validate and save medicine with all required fields', async () => {
      const validMedicine = new Medicine({
        ...mockMedicineData.valid,
        supplierId // Inject dynamic real objectId
      });
      const savedMedicine = await validMedicine.save();
      
      expect(savedMedicine._id).toBeDefined();
      expect(savedMedicine.manufacturer).toBe(mockMedicineData.valid.manufacturer);
    });

    test('should reject medicine missing required cost field', async () => {
      const invalidData = { ...mockMedicineData.valid, supplierId };
      delete invalidData.cost;
      
      const invalidMedicine = new Medicine(invalidData);
      
      let error;
      try {
        await invalidMedicine.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.cost).toBeDefined();
    });

    test('should reject medicine with negative quantity', async () => {
      const invalidData = { ...mockMedicineData.valid, supplierId, quantity: -5 };
      const invalidMedicine = new Medicine(invalidData);
      
      let error;
      try {
        await invalidMedicine.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.quantity).toBeDefined();
      expect(error.errors.quantity.message).toContain('Path `quantity` (-5) is less than minimum allowed value (0).');
    });

    test('should reject duplicate medicineID', async () => {
      const medicine1 = new Medicine({ ...mockMedicineData.valid, supplierId });
      await medicine1.save();
      
      const medicine2 = new Medicine({ ...mockMedicineData.valid, supplierId }); // Same medicineID
      
      let error;
      try {
        await medicine2.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // 11000 is Duplicate Key Error
    });
  });

  describe('Order Model Validation', () => {
    let patientId, medicineId, supplierId;

    beforeEach(async () => {
      patientId = new mongoose.Types.ObjectId();
      medicineId = new mongoose.Types.ObjectId();
      supplierId = new mongoose.Types.ObjectId();
    });

    test('should validate and save order with valid data', async () => {
      const validOrder = new Order({
        ...mockOrderData.validOrder,
        patientId,
        medicineId,
        supplierId
      });
      const savedOrder = await validOrder.save();
      
      expect(savedOrder._id).toBeDefined();
      expect(savedOrder.status).toBe('pending'); // Default status
      expect(savedOrder.paymentMethod).toBe('card');
    });

    test('should reject order with negative or zero quantity', async () => {
      const invalidOrder = new Order({
        ...mockOrderData.validOrder,
        patientId, medicineId, supplierId,
        quantity: 0 // Min is 1
      });
      
      let error;
      try {
        await invalidOrder.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.quantity).toBeDefined();
      expect(error.errors.quantity.message).toContain('Path `quantity` (0) is less than minimum allowed value (1).');
    });

    test('should enforce order status enum', async () => {
      const invalidOrder = new Order({
        ...mockOrderData.validOrder,
        patientId, medicineId, supplierId,
        status: 'invalid_status' // Not in ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
      });
      
      let error;
      try {
        await invalidOrder.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });

    test('should enforce paymentMethod enum', async () => {
      const invalidOrder = new Order({
        ...mockOrderData.validOrder,
        patientId, medicineId, supplierId,
        paymentMethod: 'net_banking' // Not in ['cod', 'card', 'upi']
      });
      
      let error;
      try {
        await invalidOrder.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.paymentMethod).toBeDefined();
    });

    test('should enforce deliveryAddress requirements', async () => {
      const invalidData = {
        ...mockOrderData.validOrder,
        patientId, medicineId, supplierId
      };
      
      // Remove country which is required inside the nested addressSchema
      delete invalidData.deliveryAddress.country; 
      
      const invalidOrder = new Order(invalidData);
      
      let error;
      try {
        await invalidOrder.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors['deliveryAddress.country']).toBeDefined();
    });
  });
});
