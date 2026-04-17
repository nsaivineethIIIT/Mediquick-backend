// Mock data for appointment tests
const mongoose = require('mongoose');

const mockAppointmentData = {
  valid: {
    doctorId: new mongoose.Types.ObjectId(),
    patientId: new mongoose.Types.ObjectId(),
    date: new Date('2026-05-15'),
    time: '10:00 AM',
    type: 'online',
    notes: 'Follow-up consultation',
    modeOfPayment: 'card',
    consultationFee: 500,
    status: 'pending'
  },
  validConfirmed: {
    doctorId: new mongoose.Types.ObjectId(),
    patientId: new mongoose.Types.ObjectId(),
    date: new Date('2026-05-16'),
    time: '02:00 PM',
    type: 'offline',
    notes: 'General checkup',
    modeOfPayment: 'upi',
    consultationFee: 600,
    status: 'confirmed'
  },
  invalid: {
    doctorId: 'invalid-id',
    patientId: '', // Missing
    date: 'invalid-date',
    time: '', // Missing
    type: 'invalid-type'
  },
  blockedSlot: {
    _id: new mongoose.Types.ObjectId(),
    doctorId: new mongoose.Types.ObjectId(),
    date: new Date('2026-05-17'),
    time: '11:00 AM',
    isBlockedSlot: true,
    status: 'blocked'
  }
};

const mockSlotData = {
  bookedSlots: ['09:00 AM', '10:00 AM', '02:00 PM'],
  availableSlots: ['10:30 AM', '11:00 AM', '01:00 PM', '03:00 PM'],
  doctorId: new mongoose.Types.ObjectId(),
  date: '2026-05-15'
};

const mockStatusUpdates = {
  confirmed: { status: 'confirmed' },
  completed: { status: 'completed' },
  cancelled: { status: 'cancelled' }
};

module.exports = {
  mockAppointmentData,
  mockSlotData,
  mockStatusUpdates
};
