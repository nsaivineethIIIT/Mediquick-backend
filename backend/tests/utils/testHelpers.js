// Test utilities and helpers
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

/**
 * Generate mock JWT token for testing
 */
const generateMockToken = (userId, userType = 'patient') => {
  const payload = {
    userId: userId.toString(),
    userType: userType
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test_secret_key', {
    expiresIn: '24h'
  });
};

/**
 * Create mock request object
 */
const createMockRequest = (data = {}) => {
  return {
    body: data.body || {},
    query: data.query || {},
    params: data.params || {},
    headers: data.headers || {},
    patientId: data.patientId || null,
    doctorId: data.doctorId || null,
    adminId: data.adminId || null,
    session: data.session || {},
    file: data.file || null,
    files: data.files || []
  };
};

/**
 * Create mock response object
 */
const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    statusCode: 200
  };

  res.status.mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });

  return res;
};

/**
 * Create mock next function
 */
const createMockNext = () => jest.fn();

/**
 * Generate valid MongoDB ObjectId
 */
const generateValidObjectId = () => new mongoose.Types.ObjectId();

/**
 * Validate JWT token
 */
const verifyToken = (token, secret = process.env.JWT_SECRET || 'test_secret_key') => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

/**
 * Assert response status
 */
const assertResponseStatus = (response, expectedStatus) => {
  expect(response.status).toHaveBeenCalledWith(expectedStatus);
};

/**
 * Assert JSON response structure
 */
const assertJsonResponse = (response, expectedData) => {
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining(expectedData)
  );
};

/**
 * Wait for async operations
 */
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

/**
 * Get response data from mock response
 */
const getResponseData = (mockResponse) => {
  if (mockResponse.json.mock.calls.length > 0) {
    return mockResponse.json.mock.calls[0][0];
  }
  return null;
};

module.exports = {
  generateMockToken,
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateValidObjectId,
  verifyToken,
  assertResponseStatus,
  assertJsonResponse,
  flushPromises,
  getResponseData
};
