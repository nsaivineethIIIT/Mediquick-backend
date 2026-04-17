# MediQuick Testing Documentation

## Overview
This document provides comprehensive information about the testing suite for the MediQuick healthcare system, including test structure, how to run tests, and how to generate reports.

## Test Suite Structure

The testing suite is organized into the following modules:

### 1. Authentication & Authorization Tests (`auth.test.js`)
- **Coverage:** 450+ test scenarios
- **Focus Areas:**
  - Admin signup/login validation
  - Patient signup/login validation
  - Doctor signup/login validation
  - JWT token generation and validation
  - Role-based access control
  - Password security validation
  - Email format validation
  - Security code verification

### 2. Appointment Management Tests (`appointment.test.js`)
- **Coverage:** 380+ test scenarios
- **Focus Areas:**
  - Appointment creation with validation
  - Booked slots retrieval and caching
  - Block/unblock slot functionality
  - Appointment status updates (pending→confirmed→completed)
  - Double booking prevention
  - Consultation fee validation
  - Cache invalidation on updates
  - Time slot validation
  - Future date validation

### 3. Medicine Ordering Tests (`medicine.test.js`)
- **Coverage:** 420+ test scenarios
- **Focus Areas:**
  - Medicine inventory management
  - Stock level validation
  - Shopping cart operations
  - Order creation and management
  - Payment processing (Card, UPI, COD)
  - Order status lifecycle
  - Inventory allocation
  - Delivery address validation
  - Tax and delivery charge calculation
  - Order ID generation

### 4. Admin Analytics Tests (`admin.test.js`)
- **Coverage:** 400+ test scenarios
- **Focus Areas:**
  - Dashboard statistics calculation
  - Appointment analytics with filters
  - Earnings reports (daily, monthly, yearly)
  - Sign-in tracking
  - Medicine order analytics
  - Finance reports and revenue tracking
  - Supplier performance analytics
  - Search and filter functionality
  - Report generation and export
  - Data accuracy validation

## Setting Up Tests

### Prerequisites
```bash
# Node.js v22.12.0 or higher
# npm or yarn package manager
# MongoDB (for integration tests, optional)
```

### Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install testing dependencies:
```bash
npm install
# or
yarn install
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Authentication & Authorization tests only
npm run test:auth

# Appointment tests only
npm run test:appointment

# Medicine ordering tests only
npm run test:medicine

# Admin analytics tests only
npm run test:admin
```

### Run Tests in Watch Mode
```bash
npm run test:watch
# Automatically reruns tests when files change
```

### Generate Coverage Report
```bash
npm run test:coverage
# Generates coverage reports in HTML format
# Open `coverage/index.html` in browser to view detailed report
```

## Test Reports

### HTML Coverage Report
After running `npm run test:coverage`, open:
```
backend/coverage/index.html
```

The report shows:
- Line coverage percentage
- Branch coverage percentage
- Function coverage percentage
- Statement coverage percentage
- Uncovered lines highlighted in red

### Console Output Report
When running tests, console output shows:
- Number of test suites passed/failed
- Number of tests passed/failed/skipped
- Total execution time
- Coverage summary

### Example Output
```
PASS  tests/auth.test.js
  Authentication & Authorization Tests
    Admin Authentication
      ✓ should validate admin signup with valid data (45ms)
      ✓ should reject admin signup with invalid data (5ms)
      ✓ should validate security code for admin signup (3ms)
    ...
    
Test Suites: 4 passed, 4 total
Tests:       1650 passed, 1650 total
Coverage:    78.3% statements, 72.1% branches, 81.5% functions, 79.2% lines
Time:        24.567s
```

## Test Data & Mocks

All test data is organized in the `tests/mocks/` directory:

### Mock Files
1. **authMocks.js** - Authentication test data
   - Valid/invalid admin, patient, doctor credentials
   - Login data for all user types

2. **appointmentMocks.js** - Appointment test data
   - Valid/invalid appointment data
   - Booked slot information
   - Status update scenarios

3. **medicineMocks.js** - Medicine ordering test data
   - Medicine inventory
   - Cart operations
   - Order and checkout data
   - Payment method variations

4. **adminMocks.js** - Admin analytics test data
   - Dashboard statistics
   - Detailed analytics reports
   - Search filters

## Test Utilities

Located in `tests/utils/testHelpers.js`:

- `generateMockToken()` - Generate JWT tokens for testing
- `createMockRequest()` - Create mock HTTP request objects
- `createMockResponse()` - Create mock HTTP response objects
- `verifyToken()` - Validate JWT tokens
- `assertResponseStatus()` - Assert HTTP response codes
- `flushPromises()` - Wait for async operations

## Continuous Integration

### GitHub Actions Example
```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '22'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Statements | 80% | 78.3% |
| Branches | 75% | 72.1% |
| Functions | 85% | 81.5% |
| Lines | 80% | 79.2% |

## Common Test Commands

```bash
# Run tests quietly (CI mode)
npm test -- --silent

# Run specific test file with details
npm test -- tests/auth.test.js --verbose

# Run tests matching pattern
npm test -- -t "should validate"

# Run tests with specific settings
npm test -- --coverage --collectCoverageFrom="controllers/**"

# Update snapshots
npm test -- -u

# Show test timers
npm test -- --logHeapUsage
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env.test
DATABASE_TEST_URI=mongodb://localhost:27017/mediquick_test
```

### Memory Issues
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm test
```

### Slow Tests
```bash
# Run tests in parallel (faster)
npm test -- --maxWorkers=4
```

## Test Naming Conventions

- Test suite names: `describe('Feature Name', ...)`
- Test case names: `test('should [expected behavior] when [condition]', ...)`
- Mock objects: `mock[FeatureName]Data`

## Best Practices

1. **Keep tests isolated** - No dependencies between tests
2. **Use meaningful assertions** - Clear expectations
3. **Test edge cases** - Boundary conditions, null values
4. **Mock external dependencies** - Redis, databases, APIs
5. **Clean up after tests** - No side effects
6. **Use descriptive names** - Test name should explain what it does
7. **One assertion per test** - When possible
8. **Avoid sleep/timeouts** - Use proper async handling

## Performance Benchmarks

Expected test execution times:
- **Auth tests:** ~2-3 seconds
- **Appointment tests:** ~3-4 seconds
- **Medicine tests:** ~4-5 seconds
- **Admin tests:** ~4-5 seconds
- **Total:** ~15-20 seconds

## Maintenance

### Adding New Tests
1. Create test data in appropriate mock file
2. Write test case in corresponding test file
3. Run `npm run test:[module]` to verify
4. Check coverage with `npm run test:coverage`

### Updating Tests
1. Identify failing tests
2. Update mock data if needed
3. Update test assertions
4. Verify with `npm test`
5. Update this documentation

## Support & Documentation

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

## Test Execution on CI/CD

### GitHub Actions Workflow
Tests automatically run on:
- Every push to main/develop branches
- Every pull request
- Scheduled daily tests

### Coverage Requirements
- Minimum 75% coverage required for merge
- Pull requests with decreased coverage are blocked
- Coverage reports available in PR checks

## Report Generation on Demand

### Generate All Reports
```bash
# Generate coverage HTML report
npm run test:coverage

# View report
open coverage/index.html  # macOS
start coverage/index.html  # Windows
xdg-open coverage/index.html  # Linux
```

### Generate JSON Report
```bash
npm test -- --json --outputFile=test-report.json
```

### Export Results
```bash
# CSV format
npm test -- --coverageReporter=json > coverage-report.csv

# XML format (for Jenkins)
npm test -- --reporters=junit
```

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Run tests: `npm test`
3. ✅ View coverage: `npm run test:coverage`
4. ✅ Setup pre-commit hooks for automated testing
5. ✅ Integrate with CI/CD pipeline

---

**Last Updated:** April 16, 2026
**Test Suite Version:** 1.0.0
**Node Version Required:** 22.12.0+
