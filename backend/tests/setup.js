// Test setup and configuration
require('dotenv').config({ path: '.env.test' });

// Suppress console logs during tests (optional)
// global.console.log = jest.fn();
// global.console.error = jest.fn();

// Setup timeout for all tests
jest.setTimeout(30000);

// Global test utilities
global.testConfig = {
  mongoUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/mediquick_test',
  jwtSecret: process.env.JWT_SECRET || 'test_secret_key'
};
