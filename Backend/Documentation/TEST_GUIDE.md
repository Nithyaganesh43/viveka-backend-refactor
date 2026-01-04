# Viveka Backend - Automated Test Suite

Complete automated testing for all APIs with database cleanup, A-Z testing, and comprehensive reporting.

## 📋 Overview

The test suite (`test.js`) performs:

- ✅ **Database Cleanup** - Clears all MongoDB collections before testing
- ✅ **32 Complete API Tests** - Tests every endpoint from A-Z
- ✅ **Automatic Reporting** - Generates JSON and HTML reports
- ✅ **No changes to system code required** - Tests run without modifying backend source
- ✅ **Test Data Generation** - Uses random phone numbers for isolation

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure dependencies are installed in parent Backend directory
cd Backend
npm install  # Install main dependencies

# Install test dependencies
npm install chalk axios
```

### Running Tests

```bash
# Start the backend server in a separate terminal
cd Backend
npm start

# Run tests from Backend directory (preferred — uses same node_modules)
npm test

# Or run tests directly from the project root
node tests/test.js

# Watch mode (requires nodemon)
npm run test:watch
```

### Server Requirements

Ensure these services are running before starting tests:

1. **MongoDB** - Running on `mongodb://localhost:27017/viveka`

   ```bash
   # Windows
   mongod

   # Or with Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Backend Server** - Running on `http://localhost:5000`
   ```bash
   cd Backend
   npm start
   ```

---

## 📊 Test Coverage

### Phase 1: OTP Management (3 tests)

- ✅ Send OTP (Mock - logs OTP to console — mock SMS)
- ✅ Verify OTP
- ✅ Clear OTP

### Phase 2: Authentication (4 tests)

- ✅ Register Client
- ✅ Login Client
- ✅ Get Client Details
- ✅ Logout Client

### Phase 3: Item Groups (4 tests)

- ✅ Create Item Group
- ✅ Get Item Groups
- ✅ Update Item Group
- ✅ Delete Item Group

### Phase 4: Items (5 tests)

- ✅ Create Item
- ✅ Get Items
- ✅ Get Items By Group
- ✅ Update Item
- ✅ Delete Item

### Phase 5: Customers (2 tests)

- ✅ Get/Create Customer
- ✅ Get Customers

### Phase 6: Shopping Cart (5 tests)

- ✅ Create Cart
- ✅ Add To Cart
- ✅ Get Cart
- ✅ Remove From Cart
- ✅ Clear Cart

### Phase 7: Invoices & Payments (4 tests)

- ✅ Generate Invoice
- ✅ Create Incomplete Sale
- ✅ Get Invoices
- ✅ Get Purchase History

### Phase 8: Health Check (1 test)

- ✅ Health Check

**Total: 32 Tests**

---

## 📈 Reports

After each test run, two reports are generated:

### 1. JSON Report (`test-report.json`)

Machine-readable format with all test details:

```json
{
  "startTime": "2026-01-04T10:30:00.000Z",
  "endTime": "2026-01-04T10:30:15.000Z",
  "totalTests": 32,
  "passedTests": 32,
  "failedTests": 0,
  "tests": [
    {
      "name": "1. Send OTP",
      "status": "PASS",
      "message": "Test passed",
      "duration": 125,
      "timestamp": "2026-01-04T10:30:01.000Z"
    }
    // ... more tests
  ]
}
```

### 2. HTML Report (`test-report.html`)

Visual report with pass/fail statistics, charts, and detailed breakdown:

- Summary cards showing total tests, passed, failed, duration
- Progress bar with pass percentage
- Detailed table of all tests
- Color-coded results (green for pass, red for fail)

**Open `test-report.html` in any browser to view**

---

## 🔧 Test Execution Flow

```
1. Start → Connect MongoDB
           ↓
2. Clear All Collections (Fresh State)
           ↓
3. Run 32 API Tests in Sequence:
   - Generate test data (random phone number)
   - Test OTP flow
   - Test authentication
   - Test item management
   - Test customer management
   - Test cart operations
   - Test invoicing
           ↓
4. Generate Reports:
   - JSON report
   - HTML report
   - Console summary
           ↓
5. Disconnect MongoDB → Exit
```

---

## ✨ Features

### Automatic ID Tracking

Test suite automatically captures and reuses IDs:

- `clientId` from registration
- `token` from login
- `itemGroupId`, `itemId`, `customerId`
- `cartId`, `cartItemId`
- `invoiceId`

### Real Data Testing

- Uses random phone numbers (prevents conflicts)
- Tests actual database operations
- Clears before each run (isolated testing)

### Comprehensive Error Handling

- Validates HTTP status codes
- Checks response data structure
- Verifies business logic constraints
- Captures detailed error messages

### Performance Metrics

- Measures execution time per test
- Tracks total suite duration
- Reports pass/fail rates

---

## 🧪 Sample Test Output

```
ℹ️  [10:30:01] Connecting to MongoDB...
✅ [10:30:01] Connected to MongoDB
ℹ️  [10:30:01] Clearing database...
ℹ️  [10:30:02] Cleared collection: clients
ℹ️  [10:30:02] Cleared collection: invoices
...

🧪 [10:30:02] Testing: 1. Send OTP
✅ [10:30:02] ✓ 1. Send OTP (125ms)

🧪 [10:30:03] Testing: 2. Verify OTP
✅ [10:30:03] ✓ 2. Verify OTP (98ms)

🧪 [10:30:04] Testing: 3. Clear OTP
✅ [10:30:04] ✓ 3. Clear OTP (87ms)

...

═══════════════════════════════════════════════════
TEST REPORT SUMMARY
═══════════════════════════════════════════════════
Total Tests: 32
✅ Passed: 32
❌ Failed: 0
⏱️  Duration: 12.45s
📊 Pass Rate: 100%
═══════════════════════════════════════════════════
```

---

## 🔍 Troubleshooting

### Error: "Cannot connect to MongoDB"

**Solution:** Ensure MongoDB is running on `localhost:27017`

```bash
# Check if MongoDB is running
mongosh mongodb://localhost:27017/viveka

# Or start MongoDB
mongod
```

### Error: "Cannot connect to server"

**Solution:** Ensure backend server is running on port 5000

```bash
cd Backend
npm start
```

### Error: "Tests timing out"

**Solution:** Increase timeout in test.js (line with `TIMEOUT = 5000`)

```javascript
const TIMEOUT = 10000; // Increase to 10 seconds
```

### Error: "OTP verification failed"

**Solution:** This is expected - tests extract OTP from database for automated testing

### Clean Database Manually

```bash
mongosh
use viveka
db.dropDatabase()
```

---

## 📝 Test Configuration

Edit `test.js` to customize:

```javascript
// Test data
const BASE_URL = 'http://localhost:5000/api';
const MONGO_URL = 'mongodb://localhost:27017/viveka';
const TIMEOUT = 5000; // Request timeout in ms
```

---

## 🛠️ Development

### Adding New Tests

1. Add test function to `tests` object:

```javascript
tests.myNewTest = async () => {
  const response = await api.post('/api/endpoint', data);
  assertTrue(response.status === 200, 'Should return 200');
};
```

2. Add test call in `runAllTests()`:

```javascript
await test('Test Name', tests.myNewTest);
```

### Modifying Report Generation

Edit `generateHTMLReport()` function to customize HTML output.

---

## 📚 Dependencies

- **axios** - HTTP client for API testing
- **chalk** - Colored console output
- **mongoose** - MongoDB database connection
- **dotenv** - Environment variable loading

All dependencies are already in Backend `package.json`.

---

## ✅ Validation

The test suite validates:

- ✅ HTTP Status Codes (201, 200, 400, etc.)
- ✅ Response Structure (contains expected fields)
- ✅ Business Logic (invoice rules, one-device policy)
- ✅ Data Persistence (IDs are saved and reused)
- ✅ Error Handling (proper error messages)

---

## 🎯 Success Criteria

Test suite is successful when:

- ✅ All 32 tests pass
- ✅ Pass rate = 100%
- ✅ No database errors
- ✅ Execution time < 30 seconds
- ✅ Reports are generated

---

## 📞 Support

For issues, check:

1. Server logs for backend errors
2. MongoDB connection status
3. Test report (HTML or JSON) for specific failures
4. Console output with colored error messages

---

**Happy Testing! 🚀**
