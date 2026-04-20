// Authentication and Authorization Tests
// Real Mongoose integration tests ensuring validations happen.
const path = require('path');
const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const dbHandler = require('./utils/dbHandler');

const {
  mockAdminData,
  mockPatientData,
  mockDoctorData,
  mockLoginData
} = require(path.join(__dirname, 'mocks', 'authMocks'));

const { generateMockToken, verifyToken } = require(path.join(__dirname, 'utils', 'testHelpers'));

// Setup memory database connections
beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Authentication & Authorization Tests (Model Integration)', () => {
  describe('Admin Model', () => {
    test('should validate admin signup with valid data', async () => {
      const validAdmin = new Admin(mockAdminData.valid);
      const savedAdmin = await validAdmin.save();
      
      expect(savedAdmin._id).toBeDefined();
      expect(savedAdmin.email).toBe(mockAdminData.valid.email);
    });

    test('should reject admin signup with missing required fields', async () => {
      // Create admin without name
      const adminWithoutName = new Admin({
        email: 'test@admin.com',
        password: 'pass',
        mobile: '123'
      });
      
      let error;
      try {
        await adminWithoutName.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.name).toBe('ValidationError');
      expect(error.errors.name).toBeDefined(); // Since 'name' is required
    });

    test('should reject duplicate email during registration', async () => {
      const admin1 = new Admin(mockAdminData.valid);
      await admin1.save();
      
      const admin2 = new Admin({ ...mockAdminData.valid, mobile: '1111111111' }); // Duplicate email
      
      let error;
      try {
        await admin2.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // 11000 is MongoDB's duplicate key error
    });
  });

  describe('Patient Model', () => {
    test('should validate patient signup with valid data', async () => {
      const validPatient = new Patient(mockPatientData.valid);
      const savedPatient = await validPatient.save();
      
      expect(savedPatient._id).toBeDefined();
      expect(savedPatient.email).toBe(mockPatientData.valid.email);
      expect(savedPatient.gender).toBe(mockPatientData.valid.gender);
    });

    test('should reject patient with missing email', async () => {
      const invalidData = { ...mockPatientData.valid };
      delete invalidData.email; // Delete required field
      
      const invalidPatient = new Patient(invalidData);
      
      let error;
      try {
        await invalidPatient.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    test('should enforce enum constraint on gender', async () => {
      const invalidData = { ...mockPatientData.valid, gender: 'invalid_gender' };
      const invalidPatient = new Patient(invalidData);
      
      let error;
      try {
        await invalidPatient.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.gender).toBeDefined();
    });
  });

  describe('Doctor Model', () => {
    test('should validate doctor signup with valid data', async () => {
      const validDoctor = new Doctor(mockDoctorData.valid);
      const savedDoctor = await validDoctor.save();
      
      expect(savedDoctor._id).toBeDefined();
      expect(savedDoctor.registrationNumber).toBe(mockDoctorData.valid.registrationNumber);
    });

    test('should apply default consultation fee if missing', async () => {
      const invalidData = { ...mockDoctorData.valid };
      delete invalidData.consultationFee;
      
      const defaultedDoctor = new Doctor(invalidData);
      const savedDoctor = await defaultedDoctor.save();
      
      expect(savedDoctor.consultationFee).toBe(100); // 100 is the default in Doctor schema
    });

    test('should reject negative consultation fee', async () => {
      const invalidData = { ...mockDoctorData.valid, consultationFee: -50 };
      const invalidDoctor = new Doctor(invalidData);
      
      let error;
      try {
        await invalidDoctor.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.consultationFee).toBeDefined();
      expect(error.errors.consultationFee.message).toContain('cannot be negative');
    });

    test('should enforce onlineStatus enum values', async () => {
      const invalidData = { ...mockDoctorData.valid, onlineStatus: 'unavailable' };
      const invalidDoctor = new Doctor(invalidData);
      
      let error;
      try {
        await invalidDoctor.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.onlineStatus).toBeDefined();
    });
  });

  describe('Authorization Flow (Controller Validation logic)', () => {
    test('should verify valid token structure', () => {
      const token = generateMockToken('123456789', 'patient');
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    test('should reject expired or invalid token', () => {
      const invalidToken = 'not.a.valid.token.format';
      const decoded = verifyToken(invalidToken);
      expect(decoded).toBeNull();
    });
  });
});
