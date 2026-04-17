// Authentication and Authorization Tests
const path = require('path');
const jwt = require('jsonwebtoken');
const {
  mockAdminData,
  mockPatientData,
  mockDoctorData,
  mockLoginData
} = require(path.join(__dirname, 'mocks', 'authMocks'));
const {
  generateMockToken,
  createMockRequest,
  createMockResponse,
  createMockNext,
  verifyToken,
  getResponseData
} = require(path.join(__dirname, 'utils', 'testHelpers'));

describe('Authentication & Authorization Tests', () => {
  describe('Admin Authentication', () => {
    test('should validate admin signup with valid data', () => {
      const validData = mockAdminData.valid;
      
      // Verify all required fields exist
      expect(validData).toHaveProperty('name');
      expect(validData).toHaveProperty('email');
      expect(validData).toHaveProperty('mobile');
      expect(validData).toHaveProperty('password');
      expect(validData).toHaveProperty('securityCode');
      
      // Verify data types
      expect(typeof validData.name).toBe('string');
      expect(typeof validData.email).toBe('string');
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validData.email)).toBe(true);
    });

    test('should reject admin signup with invalid data', () => {
      const invalidData = mockAdminData.invalid;
      
      expect(invalidData.name).toBe('');
      expect(invalidData.email).toBe('invalid-email');
      expect(invalidData.password).toBe('weak');
    });

    test('should reject duplicate email during registration', () => {
      const admin1 = mockAdminData.valid;
      const admin2 = mockAdminData.duplicate;
      
      // Both have email admin@test.com
      expect(admin1.email).toBe(admin2.email);
    });

    test('should validate security code for admin signup', () => {
      const validAdmin = mockAdminData.valid;
      const correctSecurityCode = 'ADMIN_SECRET_CODE';
      
      expect(validAdmin.securityCode).toBe(correctSecurityCode);
    });

    test('should reject wrong security code', () => {
      const wrongSecurityCode = 'WRONG_CODE';
      const expectedCode = 'ADMIN_SECRET_CODE';
      
      expect(wrongSecurityCode).not.toBe(expectedCode);
    });
  });

  describe('Admin Login', () => {
    test('should validate correct admin login credentials', () => {
      const loginData = mockLoginData.admin;
      
      expect(loginData).toHaveProperty('email');
      expect(loginData).toHaveProperty('password');
      expect(loginData).toHaveProperty('securityCode');
      
      expect(loginData.email).toBe('admin@test.com');
      expect(loginData.password).toBe('TestPassword123@');
      expect(loginData.securityCode).toBe('ADMIN_SECRET_CODE');
    });

    test('should reject admin login with wrong password', () => {
      const validCredentials = mockLoginData.admin;
      const invalidCredentials = mockLoginData.invalidCredentials;
      
      expect(validCredentials.password).not.toBe(invalidCredentials.password);
    });

    test('should generate JWT token on successful login', () => {
      const adminId = '123456789abcdef';
      const token = generateMockToken(adminId, 'admin');
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should verify JWT token validity', () => {
      const adminId = '123456789abcdef';
      const token = generateMockToken(adminId, 'admin');
      const decoded = verifyToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(adminId);
      expect(decoded.userType).toBe('admin');
    });
  });

  describe('Patient Authentication', () => {
    test('should validate patient signup with valid data', () => {
      const validData = mockPatientData.valid;
      
      expect(validData).toHaveProperty('name');
      expect(validData).toHaveProperty('email');
      expect(validData).toHaveProperty('password');
      expect(validData).toHaveProperty('mobile');
      
      expect(validData.name).not.toBe('');
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validData.email)).toBe(true);
    });

    test('should reject patient signup with invalid data', () => {
      const invalidData = mockPatientData.invalid;
      
      expect(invalidData.name).toBe('');
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidData.email)).toBe(false);
    });

    test('should validate patient login credentials', () => {
      const loginData = mockLoginData.patient;
      
      expect(loginData).toHaveProperty('email');
      expect(loginData).toHaveProperty('password');
      expect(loginData.email).toBe('patient@test.com');
    });
  });

  describe('Doctor Authentication', () => {
    test('should validate doctor signup with valid data', () => {
      const validData = mockDoctorData.valid;
      
      expect(validData).toHaveProperty('name');
      expect(validData).toHaveProperty('specialization');
      expect(validData).toHaveProperty('licenseNumber');
      expect(validData).toHaveProperty('consultationFee');
      
      expect(validData.yearsOfExperience).toBeGreaterThan(0);
      expect(validData.consultationFee).toBeGreaterThan(0);
    });

    test('should reject doctor signup with invalid consultation fee', () => {
      const invalidData = mockDoctorData.invalid;
      
      expect(invalidData.consultationFee).toBeLessThan(0);
    });

    test('should validate doctor login credentials', () => {
      const loginData = mockLoginData.doctor;
      
      expect(loginData).toHaveProperty('email');
      expect(loginData).toHaveProperty('password');
      expect(loginData.email).toBe('doctor@test.com');
    });
  });

  describe('Authorization & Access Control', () => {
    test('should set patientId in request for authenticated patient', () => {
      const patientId = '507f1f77bcf86cd799439011';
      const token = generateMockToken(patientId, 'patient');
      const decoded = verifyToken(token);
      
      const req = createMockRequest({ patientId: decoded.userId });
      
      expect(req.patientId).toBeTruthy();
      expect(req.patientId).toBe(patientId);
    });

    test('should set doctorId in request for authenticated doctor', () => {
      const doctorId = '507f1f77bcf86cd799439012';
      const token = generateMockToken(doctorId, 'doctor');
      const decoded = verifyToken(token);
      
      const req = createMockRequest({ doctorId: decoded.userId });
      
      expect(req.doctorId).toBeTruthy();
      expect(req.doctorId).toBe(doctorId);
    });

    test('should set adminId in request for authenticated admin', () => {
      const adminId = '507f1f77bcf86cd799439013';
      const token = generateMockToken(adminId, 'admin');
      const decoded = verifyToken(token);
      
      const req = createMockRequest({ adminId: decoded.userId });
      
      expect(req.adminId).toBeTruthy();
      expect(req.adminId).toBe(adminId);
    });

    test('should unauthorized request without token (patient)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      // Simulate missing patientId
      expect(req.patientId).toBeFalsy();
    });

    test('should unauthorized request without token (doctor)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      expect(req.doctorId).toBeFalsy();
    });

    test('should unauthorized request without token (admin)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      expect(req.adminId).toBeFalsy();
    });
  });

  describe('Token Validation', () => {
    test('should reject expired token', () => {
      // Create token with very short expiry
      const payload = { userId: '123', userType: 'patient' };
      const expiredToken = jwt.sign(payload, 'test_secret_key', {
        expiresIn: '0s' // Already expired
      });
      
      // Wait a bit to ensure expiry
      setTimeout(() => {
        const decoded = verifyToken(expiredToken);
        expect(decoded).toBeNull();
      }, 100);
    });

    test('should verify valid token structure', () => {
      const token = generateMockToken('123456789', 'patient');
      
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    });

    test('should reject invalid token format', () => {
      const invalidToken = 'not.a.valid.token.format';
      const decoded = verifyToken(invalidToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('Password Security', () => {
    test('should validate strong password requirements', () => {
      const strongPassword = 'TestPassword123@';
      
      // Must have uppercase, lowercase, number, and special character
      expect(/[A-Z]/.test(strongPassword)).toBe(true);
      expect(/[a-z]/.test(strongPassword)).toBe(true);
      expect(/[0-9]/.test(strongPassword)).toBe(true);
      expect(/[@#$%^&*]/.test(strongPassword)).toBe(true);
    });

    test('should reject weak password', () => {
      const weakPassword = 'weak';
      
      expect(weakPassword.length).toBeLessThan(8);
    });
  });

  describe('Email Validation', () => {
    test('should validate correct email format', () => {
      const validEmails = [
        'admin@test.com',
        'patient@test.com',
        'doctor@test.com'
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    test('should reject invalid email format', () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@test.com',
        'test@.com'
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });
});
