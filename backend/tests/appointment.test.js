// Appointment Management Tests
// Real Mongoose integration tests ensuring Appointment schema validations happen.
const path = require('path');
const mongoose = require('mongoose');

const Appointment = require('../models/Appointment');
const dbHandler = require('./utils/dbHandler');

const {
  mockAppointmentData
} = require(path.join(__dirname, 'mocks', 'appointmentMocks'));

// Setup memory database connections
beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('Appointment Model Integration Tests', () => {
  describe('Standard Appointment Validation', () => {
    test('should validate and save with valid required fields', async () => {
      const validAppointment = new Appointment(mockAppointmentData.valid);
      const savedAppointment = await validAppointment.save();
      
      expect(savedAppointment._id).toBeDefined();
      expect(savedAppointment.status).toBe('pending'); // Default
      expect(savedAppointment.modeOfPayment).toBe('credit-card');
    });

    test('should require patientId if NOT a blocked slot', async () => {
      const invalidData = { ...mockAppointmentData.valid };
      delete invalidData.patientId; // Missing patientId
      
      const invalidAppointment = new Appointment(invalidData);
      
      let error;
      try {
        await invalidAppointment.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.patientId).toBeDefined();
    });

    test('should require consultationFee if NOT a blocked slot', async () => {
      const invalidData = { ...mockAppointmentData.valid };
      delete invalidData.consultationFee;
      
      const invalidAppointment = new Appointment(invalidData);
      
      let error;
      try {
        await invalidAppointment.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.consultationFee).toBeDefined();
    });

    test('should enforce type enum constraints', async () => {
      const invalidData = { ...mockAppointmentData.valid, type: 'in-person' }; // Not 'online' or 'offline'
      const invalidAppointment = new Appointment(invalidData);
      
      let error;
      try {
        await invalidAppointment.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.type).toBeDefined();
      expect(error.errors.type.message).toContain('`in-person` is not a valid enum value');
    });

    test('should enforce modeOfPayment enum constraints', async () => {
      const invalidData = { ...mockAppointmentData.valid, modeOfPayment: 'bitcoin' };
      const invalidAppointment = new Appointment(invalidData);
      
      let error;
      try {
        await invalidAppointment.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.modeOfPayment).toBeDefined();
    });

    test('should enforce status enum constraints', async () => {
      const invalidData = { ...mockAppointmentData.valid, status: 'rejected' };
      const invalidAppointment = new Appointment(invalidData);
      
      let error;
      try {
        await invalidAppointment.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });

    test('should enforce rating bounds', async () => {
      const invalidData = { ...mockAppointmentData.valid, rating: 11 }; // Max logic is 10
      const invalidAppointment = new Appointment(invalidData);
      
      let error;
      try {
        await invalidAppointment.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.rating).toBeDefined();
      expect(error.errors.rating.message).toContain('Path `rating` (11) is more than maximum allowed value (10).');
    });
  });

  describe('Blocked Slot Logic Validation', () => {
    test('should allow saving a blocked slot WITHOUT patientId, type, and consultationFee', async () => {
      // The schema specifically has dynamic conditional requirements 
      // required: function() { return !this.isBlockedSlot; }
      const validBlockedSlot = new Appointment({
        doctorId: new mongoose.Types.ObjectId(),
        date: new Date(),
        time: '12:00 PM',
        isBlockedSlot: true,
        status: 'blocked'
      });
      
      // PatientId, type, consultationFee are entirely missing, but shouldn't error 
      // because isBlockedSlot is true
      const savedSlot = await validBlockedSlot.save();
      
      expect(savedSlot._id).toBeDefined();
      expect(savedSlot.isBlockedSlot).toBe(true);
      expect(savedSlot.patientId).toBeUndefined();
    });
  });
});
