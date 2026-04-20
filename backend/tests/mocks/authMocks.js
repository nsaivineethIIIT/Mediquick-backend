// Mock data for authentication tests
// Aligned with actual Doctor, Patient, Admin schemas in /backend/models/
const mongoose = require('mongoose');

// Admin schema: name, email, mobile, address, password, securityCode
const mockAdminData = {
  valid: {
    name: 'Test Admin',
    email: 'admin@test.com',
    mobile: '9876543210',
    address: 'Test Address, Hyderabad',
    password: 'testpassword123',
    securityCode: 'ADMIN_SECRET_CODE'
  },
  invalid: {
    name: '', // Missing name
    email: 'invalid-email',
    mobile: '123',
    password: 'weak'
  },
  duplicate: {
    name: 'Test Admin 2',
    email: 'admin@test.com', // Duplicate email
    mobile: '9876543211',
    address: 'Test Address 2',
    password: 'testpassword123',
    securityCode: 'ADMIN_SECRET_CODE'
  }
};

// Patient schema: name, email, mobile, address, password, dateOfBirth, gender
const mockPatientData = {
  valid: {
    name: 'Test Patient',
    email: 'patient@test.com',
    mobile: '9876543220',
    password: 'testpassword123',
    address: 'Patient Address, Mumbai',
    dateOfBirth: '1990-01-15',
    gender: 'male'
  },
  invalid: {
    name: '',
    email: 'invalid@',
    password: 'weak'
  }
};

// Doctor schema: name, email, mobile, address, registrationNumber,
//               specialization, college, yearOfPassing, location,
//               consultationFee, onlineStatus, password
const mockDoctorData = {
  valid: {
    name: 'Dr. Test Doctor',
    email: 'doctor@test.com',
    mobile: '9876543230',
    password: 'testpassword123',
    specialization: 'Cardiology',
    registrationNumber: 'REG123456',   // actual field name in Doctor schema
    college: 'AIIMS Delhi',            // required by Doctor schema
    yearOfPassing: '2015',             // required by Doctor schema
    location: 'Hyderabad',             // required by Doctor schema
    address: 'Doctor Clinic, Banjara Hills',
    consultationFee: 500,
    onlineStatus: 'offline'
  },
  invalid: {
    name: '',
    email: 'invalid@',
    specialization: '',
    consultationFee: -100  // Invalid negative fee
  }
};

const mockLoginData = {
  admin: {
    email: 'admin@test.com',
    password: 'testpassword123',
    securityCode: 'ADMIN_SECRET_CODE'
  },
  patient: {
    email: 'patient@test.com',
    password: 'testpassword123'
  },
  doctor: {
    email: 'doctor@test.com',
    password: 'testpassword123'
  },
  invalidCredentials: {
    email: 'admin@test.com',
    password: 'wrongpassword'
  }
};

module.exports = {
  mockAdminData,
  mockPatientData,
  mockDoctorData,
  mockLoginData
};
