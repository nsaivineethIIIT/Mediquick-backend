// Mock data for authentication tests
const mongoose = require('mongoose');

const mockAdminData = {
  valid: {
    name: 'Test Admin',
    email: 'admin@test.com',
    mobile: '9876543210',
    address: 'Test Address',
    password: 'TestPassword123@',
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
    email: 'admin@test.com', // Duplicate
    mobile: '9876543211',
    address: 'Test Address 2',
    password: 'TestPassword123@',
    securityCode: 'ADMIN_SECRET_CODE'
  }
};

const mockPatientData = {
  valid: {
    name: 'Test Patient',
    email: 'patient@test.com',
    mobile: '9876543220',
    password: 'TestPassword123@',
    address: 'Patient Address',
    dateOfBirth: '1990-01-15',
    gender: 'male'
  },
  invalid: {
    name: '',
    email: 'invalid@',
    password: 'weak'
  }
};

const mockDoctorData = {
  valid: {
    name: 'Dr. Test Doctor',
    email: 'doctor@test.com',
    mobile: '9876543230',
    password: 'TestPassword123@',
    specialization: 'Cardiology',
    licenseNumber: 'LIC123456',
    yearsOfExperience: 5,
    consultationFee: 500,
    about: 'Experienced cardiologist'
  },
  invalid: {
    name: '',
    email: 'invalid@',
    specialization: '',
    consultationFee: -100 // Invalid fee
  }
};

const mockLoginData = {
  admin: {
    email: 'admin@test.com',
    password: 'TestPassword123@',
    securityCode: 'ADMIN_SECRET_CODE'
  },
  patient: {
    email: 'patient@test.com',
    password: 'TestPassword123@'
  },
  doctor: {
    email: 'doctor@test.com',
    password: 'TestPassword123@'
  },
  invalidCredentials: {
    email: 'admin@test.com',
    password: 'WrongPassword'
  }
};

module.exports = {
  mockAdminData,
  mockPatientData,
  mockDoctorData,
  mockLoginData
};
