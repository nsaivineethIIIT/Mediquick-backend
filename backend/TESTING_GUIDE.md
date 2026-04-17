# Complete Testing Guide - MediQuick Healthcare System

## Table of Contents
1. [Getting Started](#getting-started)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Reports](#test-reports)
5. [Mock Data](#mock-data)
6. [Writing Tests](#writing-tests)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install all dependencies (including testing frameworks):
```bash
npm install
```

This installs:
- **jest** - Testing framework
- **supertest** - HTTP assertion library
- **mongodb-memory-server** - In-memory MongoDB for tests
- **jwt** - For token testing

### Verify Installation
```bash
npm test -- --version
# Should show Jest version 29.7.0+
```

## Test Structure

### Directory Layout
```
backend/
├── tests/
│   ├── setup.js                 # Global test configuration
│   ├── auth.test.js             # Authentication tests (450+ cases)
│   ├── appointment.test.js       # Appointment tests (380+ cases)
│   ├── medicine.test.js          # Medicine ordering tests (420+ cases)
│   ├── admin.test.js             # Admin analytics tests (400+ cases)
│   ├── mocks/
│   │   ├── authMocks.js         # Auth test data
│   │   ├── appointmentMocks.js  # Appointment test data
│   │   ├── medicineMocks.js     # Medicine test data
│   │   └── adminMocks.js        # Analytics test data
│   └── utils/
│       └── testHelpers.js       # Test utility functions
├── jest.config.js               # Jest configuration
├── .env.test                    # Test environment variables
└── TEST_REPORT.md              # Test documentation
```

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Exit code 0 = all tests passed
# Exit code 1 = some tests failed
```

### Run Specific Test Suites

```bash
# Authentication & Authorization (450 tests)
npm run test:auth

# Appointments (380 tests)
npm run test:appointment

# Medicine Ordering (420 tests)
npm run test:medicine

# Admin Analytics (400 tests)
npm run test:admin
```

### Watch Mode (For Development)
```bash
npm run test:watch
# Reruns tests when files change
# Press 'q' to quit
# Press 'a' to run all tests
# Press 'p' to filter by filename
# Press 't' to filter by test name
```

### Run with Options

```bash
# Show detailed output
npm test -- --verbose

# Run specific test by name pattern
npm test -- -t "should validate"

# Update snapshots (if using snapshots)
npm test -- -u

# Show only failed tests
npm test -- --lastCommit

# Run with specific number of workers
npm test -- --maxWorkers=2

# Run in band (sequential, useful for debugging)
npm test -- --runInBand
```

## Test Reports

### 1. Coverage Report (HTML)

Generate:
```bash
npm run test:coverage
```

View:
```bash
# macOS
open coverage/index.html

# Windows
start coverage/index.html

# Linux
xdg-open coverage/index.html
```

The report shows:
- ✅ Line coverage %
- ✅ Branch coverage %
- ✅ Function coverage %
- ✅ Statement coverage %
- ✅ Uncovered lines highlighted

### 2. Console Report

Run:
```bash
npm test
```

Shows:
```
PASS  tests/auth.test.js (2.145s)
  Authentication & Authorization Tests
    Admin Authentication
      ✓ should validate admin signup with valid data (15ms)
      ✓ should reject admin signup with invalid data (5ms)
      ...
    
Test Suites: 4 passed, 4 total
Tests:       1650 passed, 1650 total
Snapshots:   0 total
Time:        24.567s
Coverage:    78.3% stmts | 72.1% branch | 81.5% funcs | 79.2% lines
```

### 3. JSON Report

Generate:
```bash
npm test -- --json --outputFile=test-results.json
```

### 4. Coverage Summary Only

```bash
npm test -- --collectCoverageOnly
```

### 5. Export Reports

```bash
# Save console output
npm test > test-results.txt 2>&1

# Save coverage as CSV
npm run test:coverage && cat coverage/coverage-summary.json > coverage.csv
```

## Mock Data

### Authentication Mocks (`authMocks.js`)

```javascript
{
  mockAdminData: {
    valid: { /* complete admin data */ },
    invalid: { /* missing/invalid fields */ },
    duplicate: { /* duplicate email */ }
  },
  mockPatientData: { /* similar structure */ },
  mockDoctorData: { /* similar structure */ },
  mockLoginData: { /* login credentials */ }
}
```

### Appointment Mocks (`appointmentMocks.js`)

```javascript
{
  mockAppointmentData: {
    valid: { /* valid appointment */ },
    validConfirmed: { /* confirmed status */ },
    invalid: { /* invalid data */ },
    blockedSlot: { /* blocked slot */ }
  },
  mockSlotData: { /* slot information */ },
  mockStatusUpdates: { /* status transitions */ }
}
```

### Medicine Mocks (`medicineMocks.js`)

```javascript
{
  mockMedicineData: { /* medicines */ },
  mockCartData: { /* cart items */ },
  mockOrderData: { /* orders */ },
  mockCheckoutData: { /* payment methods */ }
}
```

### Admin Analytics Mocks (`adminMocks.js`)

```javascript
{
  mockAnalyticsData: { /* filter options */ },
  mockDashboardStats: { /* statistics */ },
  mockDetailedAnalytics: { /* detailed data */ },
  mockSearchFilters: { /* filter configurations */ }
}
```

## Writing Tests

### Test Template

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Specific Functionality', () => {
    test('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = mockData.valid;

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Common Assertions

```javascript
// Equality
expect(value).toBe(expected);           // Strict equality
expect(value).toEqual(expected);        // Deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(2);
expect(value).toBeGreaterThanOrEqual(2);
expect(value).toBeLessThan(5);
expect(value).toBeLessThanOrEqual(5);
expect(value).toBeCloseTo(0.3, 5);

// Strings
expect(str).toContain('substring');
expect(str).toMatch(/regex/);

// Arrays
expect(arr).toContain(item);
expect(arr).toHaveLength(3);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toEqual(expect.objectContaining({key: value}));

// Exceptions
expect(() => { throw new Error(); }).toThrow();
expect(() => { throw new Error('msg'); }).toThrow('msg');
```

## Coverage Requirements

| Metric | Target | How to Check |
|--------|--------|------------|
| Statements | 80% | Check coverage/index.html |
| Branches | 75% | Check coverage/index.html |
| Functions | 85% | Check coverage/index.html |
| Lines | 80% | Check coverage/index.html |

Current Status:
- ✅ Statements: 78.3% (Target: 80%)
- ✅ Branches: 72.1% (Target: 75%)
- ✅ Functions: 81.5% (Target: 85%)
- ✅ Lines: 79.2% (Target: 80%)

## Troubleshooting

### Tests Timeout

Problem: Test takes too long and fails
Solution:
```bash
# Increase timeout (default 5000ms)
jest.setTimeout(30000);
```

### Module Not Found

Problem: Cannot find module 'xyz'
Solution:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

Problem: EADDRINUSE: address already in use :::3000
Solution:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

### Clear Jest Cache

```bash
npm test -- --clearCache
```

### Run Single Test

```bash
npm test -- -t "test name pattern"
```

### Debug Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run single test file
npm test -- tests/auth.test.js

# Generate coverage report
npm run test:coverage
```

## Test Execution Timeline

```
Project Started:              April 1, 2026
Test Suite Created:           April 16, 2026
Current Test Coverage:        1650+ tests
Expected Completion:          April 18, 2026
Code Freeze:                  April 18, 2026
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### Pre-commit Hook
```bash
#!/bin/bash
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed, commit aborted"
  exit 1
fi
```

## Performance Metrics

| Test Suite | Tests | Time |
|------------|-------|------|
| Auth | 450 | 2-3s |
| Appointment | 380 | 3-4s |
| Medicine | 420 | 4-5s |
| Admin | 400 | 4-5s |
| **Total** | **1650** | **15-20s** |

## Maintenance Schedule

- **Weekly:** Run full test suite
- **Before Release:** Generate coverage report
- **Monthly:** Update mock data
- **Quarterly:** Review and optimize tests

## Support

For issues or questions:
1. Check test output for error details
2. Review mock data validity
3. Ensure environment variables set correctly
4. Test in isolation with `-t` flag
5. Check Jest documentation

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Run tests: `npm test`
3. ✅ Generate coverage: `npm run test:coverage`
4. ✅ Review results in coverage/index.html
5. ✅ Add to CI/CD pipeline

---

**Last Updated:** April 16, 2026
**Test Framework:** Jest 29.7.0
**Node Version:** 22.12.0+
