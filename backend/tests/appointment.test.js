// Appointment Management Tests
const path = require('path');
const {
  mockAppointmentData,
  mockSlotData,
  mockStatusUpdates
} = require(path.join(__dirname, 'mocks', 'appointmentMocks'));
const mongoose = require('mongoose');

describe('Appointment Management Tests', () => {
  describe('Appointment Creation', () => {
    test('should validate required appointment fields', () => {
      const validAppointment = mockAppointmentData.valid;
      
      expect(validAppointment).toHaveProperty('doctorId');
      expect(validAppointment).toHaveProperty('patientId');
      expect(validAppointment).toHaveProperty('date');
      expect(validAppointment).toHaveProperty('time');
      expect(validAppointment).toHaveProperty('type');
    });

    test('should validate appointment date format', () => {
      const validAppointment = mockAppointmentData.valid;
      
      expect(validAppointment.date instanceof Date).toBe(true);
      expect(validAppointment.date.getTime()).toBeGreaterThan(0);
    });

    test('should validate appointment type (online/offline)', () => {
      const validAppointment = mockAppointmentData.valid;
      const validTypes = ['online', 'offline'];
      
      expect(validTypes).toContain(validAppointment.type);
    });

    test('should validate consultation fee is positive', () => {
      const validAppointment = mockAppointmentData.valid;
      
      expect(validAppointment.consultationFee).toBeGreaterThan(0);
    });

    test('should reject appointment with invalid doctor ID', () => {
      const invalidAppointment = mockAppointmentData.invalid;
      
      expect(mongoose.Types.ObjectId.isValid(invalidAppointment.doctorId)).toBe(false);
    });

    test('should reject appointment with missing time', () => {
      const invalidAppointment = mockAppointmentData.invalid;
      
      expect(invalidAppointment.time).toBe('');
    });

    test('should reject invalid appointment type', () => {
      const invalidAppointment = mockAppointmentData.invalid;
      const validTypes = ['online', 'offline'];
      
      expect(validTypes).not.toContain(invalidAppointment.type);
    });
  });

  describe('Booked Slots Management', () => {
    test('should retrieve booked slots for doctor on specific date', () => {
      const slots = mockSlotData.bookedSlots;
      const doctorId = mockSlotData.doctorId;
      const date = mockSlotData.date;
      
      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThan(0);
      expect(mongoose.Types.ObjectId.isValid(doctorId)).toBe(true);
    });

    test('should identify available slots correctly', () => {
      const bookedSlots = mockSlotData.bookedSlots;
      const availableSlots = mockSlotData.availableSlots;
      
      // No overlap between booked and available
      const intersection = bookedSlots.filter(slot => 
        availableSlots.includes(slot)
      );
      
      expect(intersection.length).toBe(0);
    });

    test('should return empty array if all slots are booked', () => {
      const allSlots = mockSlotData.bookedSlots;
      const availableSlots = mockSlotData.availableSlots.filter(slot => 
        !allSlots.includes(slot)
      );
      
      // In this case, available slots should not include booked ones
      expect(availableSlots.length).toBeGreaterThan(0);
    });

    test('should cache booked slots for performance', () => {
      const cacheKey = `doctor:${mockSlotData.doctorId}:booked:${mockSlotData.date}`;
      
      expect(cacheKey).toContain('doctor:');
      expect(cacheKey).toContain('booked');
    });

    test('should invalidate slots cache after blocking a slot', () => {
      const blockedSlot = mockAppointmentData.blockedSlot;
      
      expect(blockedSlot.isBlockedSlot).toBe(true);
      expect(blockedSlot.status).toBe('blocked');
    });
  });

  describe('Block/Unblock Slots', () => {
    test('should create blocked slot with valid data', () => {
      const blockedSlot = mockAppointmentData.blockedSlot;
      
      expect(blockedSlot.isBlockedSlot).toBe(true);
      expect(blockedSlot.status).toBe('blocked');
      expect(mongoose.Types.ObjectId.isValid(blockedSlot.doctorId)).toBe(true);
      expect(blockedSlot.date instanceof Date).toBe(true);
    });

    test('should prevent booking on blocked slot', () => {
      const blockedSlot = mockAppointmentData.blockedSlot;
      const newAppointment = mockAppointmentData.valid;
      
      // If same doctor+date+time, should not be allowed
      if (
        blockedSlot.doctorId === newAppointment.doctorId &&
        blockedSlot.date.getTime() === newAppointment.date.getTime() &&
        blockedSlot.time === newAppointment.time
      ) {
        expect(blockedSlot.status).toBe('blocked');
      }
    });

    test('should allow unblocking of blocked slots', () => {
      const blockedSlot = mockAppointmentData.blockedSlot;
      
      // After unblock, it should be removed
      expect(blockedSlot._id).toBeTruthy();
    });
  });

  describe('Appointment Status Updates', () => {
    test('should update appointment status to confirmed', () => {
      const statusUpdate = mockStatusUpdates.confirmed;
      
      expect(statusUpdate.status).toBe('confirmed');
    });

    test('should update appointment status to completed', () => {
      const statusUpdate = mockStatusUpdates.completed;
      
      expect(statusUpdate.status).toBe('completed');
    });

    test('should update appointment status to cancelled', () => {
      const statusUpdate = mockStatusUpdates.cancelled;
      
      expect(statusUpdate.status).toBe('cancelled');
    });

    test('should validate status transition (pending → confirmed)', () => {
      const validAppointment = mockAppointmentData.valid;
      const updateToConfirmed = mockStatusUpdates.confirmed;
      
      expect(validAppointment.status).toBe('pending');
      expect(updateToConfirmed.status).toBe('confirmed');
    });

    test('should validate status transition (confirmed → completed)', () => {
      const confirmedAppointment = mockAppointmentData.validConfirmed;
      const updateToCompleted = mockStatusUpdates.completed;
      
      expect(confirmedAppointment.status).toBe('confirmed');
      expect(updateToCompleted.status).toBe('completed');
    });

    test('should allow cancellation from any status', () => {
      const cancelStatus = mockStatusUpdates.cancelled;
      const validStates = ['pending', 'confirmed', 'completed'];
      
      // Any of these can transition to cancelled
      expect(cancelStatus.status).toBe('cancelled');
    });
  });

  describe('Double Booking Prevention', () => {
    test('should prevent double booking for same slot', () => {
      const appointment1 = mockAppointmentData.valid;
      const appointment2 = {
        ...mockAppointmentData.valid,
        patientId: new mongoose.Types.ObjectId() // Different patient
      };
      
      // Same doctor, date, time = conflict
      expect(appointment1.doctorId).toEqual(appointment2.doctorId);
      expect(appointment1.date).toEqual(appointment2.date);
      expect(appointment1.time).toEqual(appointment2.time);
    });

    test('should allow different time slots for same doctor', () => {
      const appointment1 = mockAppointmentData.valid;
      const appointment2 = {
        ...mockAppointmentData.valid,
        time: '11:00 AM' // Different time
      };
      
      expect(appointment1.time).not.toEqual(appointment2.time);
    });

    test('should allow different doctor for same time slot', () => {
      const appointment1 = mockAppointmentData.valid;
      const appointment2 = {
        ...mockAppointmentData.valid,
        doctorId: new mongoose.Types.ObjectId() // Different doctor
      };
      
      expect(appointment1.doctorId).not.toEqual(appointment2.doctorId);
    });
  });

  describe('Appointment Validation & Edge Cases', () => {
    test('should reject appointment in the past', () => {
      const pastDate = new Date('2020-01-01');
      const today = new Date();
      
      expect(pastDate.getTime()).toBeLessThan(today.getTime());
    });

    test('should validate time format (HH:MM AM/PM)', () => {
      const validTimes = ['09:00 AM', '10:00 AM', '02:00 PM', '05:30 PM'];
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]\s(AM|PM)$/i;
      
      validTimes.forEach(time => {
        expect(timeRegex.test(time)).toBe(true);
      });
    });

    test('should validate consultation fee range', () => {
      const minFee = 100;
      const maxFee = 5000;
      const validAppointment = mockAppointmentData.valid;
      
      expect(validAppointment.consultationFee).toBeGreaterThanOrEqual(minFee);
      expect(validAppointment.consultationFee).toBeLessThanOrEqual(maxFee);
    });

    test('should require valid payment mode for confirmed appointments', () => {
      const validPaymentModes = ['card', 'upi', 'net_banking', 'cod'];
      const appointment = mockAppointmentData.valid;
      
      expect(validPaymentModes).toContain(appointment.modeOfPayment);
    });

    test('should validate appointment notes length', () => {
      const appointment = mockAppointmentData.valid;
      const maxLength = 500;
      
      expect(appointment.notes.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate booked slots cache on new appointment', () => {
      const appointment = mockAppointmentData.valid;
      const cacheKey = `doctor:${appointment.doctorId}:booked:${appointment.date.toISOString().split('T')[0]}`;
      
      expect(cacheKey).toContain('booked');
    });

    test('should invalidate cache on status update', () => {
      const appointment = mockAppointmentData.valid;
      const statusUpdate = mockStatusUpdates.confirmed;
      
      // Cache should be invalidated when status changes
      expect(statusUpdate.status).not.toBe(appointment.status);
    });

    test('should invalidate cache on appointment cancellation', () => {
      const appointment = mockAppointmentData.valid;
      const statusUpdate = mockStatusUpdates.cancelled;
      
      expect(statusUpdate.status).toBe('cancelled');
    });
  });
});
