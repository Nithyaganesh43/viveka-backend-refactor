import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const MONGO_URL =
  'mongodb+srv://isaiiaiproj:qQSDkBsx3hHt5prZ@isaiidb.knox7vn.mongodb.net/';
const TIMEOUT = 5000;

// Test data storage
let testData = {
  phoneNumber: `989${Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0')}`,
  password: 'TestPassword123!',
  ownerName: 'Test Owner',
  businessName: 'Test Business',
  otp: null,
  clientId: null,
  token: null,
  deviceSessionId: null,
  deviceId: `test-device-${Date.now()}`,
  itemGroupId: null,
  itemId: null,
  customerId: null,
  cartId: null,
  cartItemId: null,
  invoiceId: null,
};

// Report data
let report = {
  startTime: null,
  endTime: null,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  tests: [],
};

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const log = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  switch (type) {
    case 'success':
      console.log(chalk.green(`✅ [${timestamp}] ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`❌ [${timestamp}] ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`⚠️  [${timestamp}] ${message}`));
      break;
    case 'info':
      console.log(chalk.blue(`ℹ️  [${timestamp}] ${message}`));
      break;
    case 'test':
      console.log(chalk.cyan(`🧪 [${timestamp}] ${message}`));
      break;
    case 'section':
      console.log(
        chalk.magenta(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      );
      console.log(chalk.magenta(`${message}`));
      console.log(
        chalk.magenta(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
      );
      break;
  }
};

const recordTest = (name, status, message, duration) => {
  report.totalTests++;
  report.tests.push({
    name,
    status,
    message,
    duration,
    timestamp: new Date().toISOString(),
  });

  if (status === 'PASS') {
    report.passedTests++;
  } else {
    report.failedTests++;
  }
};

const test = async (name, fn) => {
  const startTime = Date.now();

  try {
    log(`Testing: ${name}`, 'test');
    await fn();
    const duration = Date.now() - startTime;
    log(`✓ ${name} (${duration}ms)`, 'success');
    recordTest(name, 'PASS', 'Test passed', duration);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`✗ ${name}: ${error.message}`, 'error');
    recordTest(name, 'FAIL', error.message, duration);
    return false;
  }
};

const assertEqual = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message}: Expected ${expected}, got ${actual}`);
  }
};

const assertTrue = (value, message) => {
  if (!value) {
    throw new Error(message);
  }
};

// ============================================================================
// DATABASE SETUP & CLEANUP
// ============================================================================

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    log('Connected to MongoDB', 'success');
  } catch (error) {
    log(`MongoDB connection error: ${error.message}`, 'error');
    throw error;
  }
};

const clearDatabase = async () => {
  try {
    log('Clearing all database collections...', 'info');

    const collections = [
      'clients',
      'otpsessions',
      'devicesessions',
      'customers',
      'itemgroups',
      'items',
      'carts',
      'cartitems',
      'incompletesales',
      'invoices',
      'invoiceitems',
      'purchasehistories',
    ];

    for (const collection of collections) {
      await mongoose.connection.collection(collection).deleteMany({});
      log(`Cleared collection: ${collection}`, 'info');
    }

    log('All collections cleared successfully', 'success');
  } catch (error) {
    log(`Database cleanup error: ${error.message}`, 'error');
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    log('Disconnected from MongoDB', 'success');
  } catch (error) {
    log(`Disconnect error: ${error.message}`, 'error');
  }
};

// ============================================================================
// API TEST FUNCTIONS (A-Z)
// ============================================================================

const tests = {
  // ========== OTP TESTS ==========
  sendOTP: async () => {
    const response = await api.post('/otp/send', {
      phoneNumber: testData.phoneNumber,
    });
    assertTrue(response.status === 200, 'Send OTP should return 200');
    assertTrue(response.data.success === true, 'Response should be successful');
    log(`Generated OTP for ${testData.phoneNumber}`, 'info');
  },

  verifyOTP: async () => {
    // Get the OTP from MongoDB for testing
    const OtpSession = mongoose.model(
      'OtpSession',
      new mongoose.Schema({
        phoneNumber: String,
        otpHash: String,
        expiresAt: Date,
        isVerified: Boolean,
        attempts: Number,
      })
    );

    const otpDoc = await OtpSession.findOne({
      phoneNumber: testData.phoneNumber,
    });
    assertTrue(otpDoc, 'OTP session should exist');
    testData.otp = otpDoc.otpHash;

    const response = await api.post('/otp/verify', {
      phoneNumber: testData.phoneNumber,
      otp: testData.otp,
    });
    assertTrue(response.status === 200, 'Verify OTP should return 200');
    assertTrue(
      response.data.success === true,
      'OTP verification should succeed'
    );
  },

  clearOTP: async () => {
    const response = await api.post('/otp/clear', {
      phoneNumber: testData.phoneNumber,
    });
    assertTrue(response.status === 200, 'Clear OTP should return 200');
    assertTrue(response.data.success === true, 'OTP clear should succeed');
  },

  // ========== AUTH TESTS ==========
  registerClient: async () => {
    const response = await api.post('/auth/register', {
      phoneNumber: testData.phoneNumber,
      password: testData.password,
      ownerName: testData.ownerName,
      businessName: testData.businessName,
    });
    assertTrue(response.status === 201, 'Register should return 201');
    assertTrue(response.data.success === true, 'Registration should succeed');
    assertTrue(response.data.clientId, 'Response should contain clientId');
    testData.clientId = response.data.clientId;
  },

  loginClient: async () => {
    const response = await api.post('/auth/login', {
      phoneNumber: testData.phoneNumber,
      password: testData.password,
      deviceId: testData.deviceId,
      deviceName: 'Test Device',
    });
    assertTrue(response.status === 200, 'Login should return 200');
    assertTrue(response.data.success === true, 'Login should succeed');
    assertTrue(response.data.token, 'Response should contain token');
    assertTrue(
      response.data.deviceSessionId,
      'Response should contain deviceSessionId'
    );
    testData.token = response.data.token;
    testData.deviceSessionId = response.data.deviceSessionId;
  },

  getClientDetails: async () => {
    const response = await api.get(`/auth/client/${testData.clientId}`);
    assertTrue(response.status === 200, 'Get client should return 200');
    assertTrue(response.data.success === true, 'Get client should succeed');
    assertTrue(response.data.client, 'Response should contain client data');
    assertEqual(
      response.data.client._id,
      testData.clientId,
      'Client ID should match'
    );
  },

  logoutClient: async () => {
    const response = await api.post('/auth/logout', {
      clientId: testData.clientId,
      deviceSessionId: testData.deviceSessionId,
    });
    assertTrue(response.status === 200, 'Logout should return 200');
    assertTrue(response.data.success === true, 'Logout should succeed');
  },

  // ========== ITEM GROUP TESTS ==========
  createItemGroup: async () => {
    const response = await api.post('/business/item-groups', {
      clientId: testData.clientId,
      name: 'Test Item Group',
      description: 'Test group description',
    });
    assertTrue(response.status === 201, 'Create group should return 201');
    assertTrue(response.data.success === true, 'Create group should succeed');
    assertTrue(response.data.itemGroup._id, 'Response should contain group ID');
    testData.itemGroupId = response.data.itemGroup._id;
  },

  getItemGroups: async () => {
    const response = await api.get(
      `/business/item-groups/${testData.clientId}`
    );
    assertTrue(response.status === 200, 'Get groups should return 200');
    assertTrue(response.data.success === true, 'Get groups should succeed');
    assertTrue(
      Array.isArray(response.data.itemGroups),
      'Response should contain array'
    );
  },

  updateItemGroup: async () => {
    const response = await api.put(
      `/business/item-groups/${testData.clientId}/${testData.itemGroupId}`,
      {
        name: 'Updated Item Group',
        description: 'Updated description',
      }
    );
    assertTrue(response.status === 200, 'Update group should return 200');
    assertTrue(response.data.success === true, 'Update group should succeed');
    assertEqual(
      response.data.itemGroup.name,
      'Updated Item Group',
      'Name should be updated'
    );
  },

  deleteItemGroup: async () => {
    const response = await api.delete(
      `/business/item-groups/${testData.clientId}/${testData.itemGroupId}`
    );
    assertTrue(response.status === 200, 'Delete group should return 200');
    assertTrue(response.data.success === true, 'Delete group should succeed');
  },

  // ========== ITEM TESTS ==========
  createItemGroup2: async () => {
    // Create another group for items
    const response = await api.post('/business/item-groups', {
      clientId: testData.clientId,
      name: 'Items Group',
      description: 'Group for items',
    });
    testData.itemGroupId = response.data.itemGroup._id;
  },

  createItem: async () => {
    const response = await api.post('/business/items', {
      clientId: testData.clientId,
      name: 'Test Item',
      price: 1000,
      unit: 'nos',
      groupId: testData.itemGroupId,
      description: 'Test item description',
    });
    assertTrue(response.status === 201, 'Create item should return 201');
    assertTrue(response.data.success === true, 'Create item should succeed');
    assertTrue(response.data.item._id, 'Response should contain item ID');
    testData.itemId = response.data.item._id;
  },

  getItems: async () => {
    const response = await api.get(`/business/items/${testData.clientId}`);
    assertTrue(response.status === 200, 'Get items should return 200');
    assertTrue(response.data.success === true, 'Get items should succeed');
    assertTrue(
      Array.isArray(response.data.items),
      'Response should contain array'
    );
  },

  getItemsByGroup: async () => {
    const response = await api.get(
      `/business/items/${testData.clientId}?groupId=${testData.itemGroupId}`
    );
    assertTrue(response.status === 200, 'Get items by group should return 200');
    assertTrue(
      response.data.success === true,
      'Get items by group should succeed'
    );
  },

  updateItem: async () => {
    const response = await api.put(
      `/business/items/${testData.clientId}/${testData.itemId}`,
      {
        name: 'Updated Item',
        price: 1500,
      }
    );
    assertTrue(response.status === 200, 'Update item should return 200');
    assertTrue(response.data.success === true, 'Update item should succeed');
    assertEqual(
      response.data.item.name,
      'Updated Item',
      'Name should be updated'
    );
  },

  deleteItem: async () => {
    const response = await api.delete(
      `/business/items/${testData.clientId}/${testData.itemId}`
    );
    assertTrue(response.status === 200, 'Delete item should return 200');
    assertTrue(response.data.success === true, 'Delete item should succeed');
  },

  // ========== CUSTOMER TESTS ==========
  createItem2: async () => {
    // Create another item for cart testing
    const response = await api.post('/business/items', {
      clientId: testData.clientId,
      name: 'Cart Test Item',
      price: 500,
      unit: 'nos',
      groupId: testData.itemGroupId,
    });
    testData.itemId = response.data.item._id;
  },

  getOrCreateCustomer: async () => {
    const response = await api.post('/business/customers', {
      clientId: testData.clientId,
      phoneNumber: '9988776655',
    });
    assertTrue(
      response.status === 200,
      'Get/Create customer should return 200'
    );
    assertTrue(
      response.data.success === true,
      'Get/Create customer should succeed'
    );
    assertTrue(
      response.data.customer._id,
      'Response should contain customer ID'
    );
    testData.customerId = response.data.customer._id;
  },

  getCustomers: async () => {
    const response = await api.get(`/business/customers/${testData.clientId}`);
    assertTrue(response.status === 200, 'Get customers should return 200');
    assertTrue(response.data.success === true, 'Get customers should succeed');
    assertTrue(
      Array.isArray(response.data.customers),
      'Response should contain array'
    );
  },

  // ========== CART TESTS ==========
  createCart: async () => {
    const response = await api.post('/business/carts', {
      clientId: testData.clientId,
      customerPhone: '9988776655',
    });
    assertTrue(response.status === 201, 'Create cart should return 201');
    assertTrue(response.data.success === true, 'Create cart should succeed');
    assertTrue(response.data.cart._id, 'Response should contain cart ID');
    testData.cartId = response.data.cart._id;
  },

  addToCart: async () => {
    const response = await api.post('/business/carts/add-item', {
      cartId: testData.cartId,
      itemId: testData.itemId,
      itemName: 'Cart Test Item',
      unitPrice: 500,
      quantity: 2,
    });
    assertTrue(response.status === 200, 'Add to cart should return 200');
    assertTrue(response.data.success === true, 'Add to cart should succeed');
    assertTrue(
      response.data.cartItem._id,
      'Response should contain cartItem ID'
    );
    testData.cartItemId = response.data.cartItem._id;
  },

  getCart: async () => {
    const response = await api.get(`/business/carts/${testData.cartId}`);
    assertTrue(response.status === 200, 'Get cart should return 200');
    assertTrue(response.data.success === true, 'Get cart should succeed');
    assertTrue(response.data.cart, 'Response should contain cart');
    assertTrue(
      Array.isArray(response.data.cartItems),
      'Response should contain items array'
    );
  },

  removeFromCart: async () => {
    const response = await api.post('/business/carts/remove-item', {
      cartId: testData.cartId,
      cartItemId: testData.cartItemId,
    });
    assertTrue(response.status === 200, 'Remove from cart should return 200');
    assertTrue(
      response.data.success === true,
      'Remove from cart should succeed'
    );
  },

  clearCart: async () => {
    // Add item back first
    const addResponse = await api.post('/business/carts/add-item', {
      cartId: testData.cartId,
      itemId: testData.itemId,
      itemName: 'Cart Test Item',
      unitPrice: 500,
      quantity: 1,
    });
    assertTrue(addResponse.status === 200, 'Re-add to cart should succeed');

    const response = await api.post('/business/carts/clear', {
      cartId: testData.cartId,
    });
    assertTrue(response.status === 200, 'Clear cart should return 200');
    assertTrue(response.data.success === true, 'Clear cart should succeed');
  },

  // ========== INVOICE TESTS ==========
  createCartForInvoice: async () => {
    const response = await api.post('/business/carts', {
      clientId: testData.clientId,
      customerPhone: '9988776655',
    });
    testData.cartId = response.data.cart._id;

    // Add item
    await api.post('/business/carts/add-item', {
      cartId: testData.cartId,
      itemId: testData.itemId,
      itemName: 'Invoice Test Item',
      unitPrice: 1000,
      quantity: 2,
    });
  },

  generateInvoice: async () => {
    // Create invoice with full payment (system requires full payment at creation)
    const response = await api.post('/business/invoices/generate', {
      clientId: testData.clientId,
      customerId: testData.customerId,
      cartId: testData.cartId,
      totalAmount: 2000,
      paidAmount: 2000,
      notes: 'Test invoice (full payment)',
    });
    assertTrue(response.status === 201, 'Generate invoice should return 201');
    assertTrue(
      response.data.success === true,
      'Generate invoice should succeed'
    );
    assertTrue(response.data.invoice._id, 'Response should contain invoice ID');
    testData.invoiceId = response.data.invoice._id;

    // Verify invoice is finalized and paidAmount equals total
    const invoicesResp = await api.get(
      `/business/invoices/${testData.clientId}`
    );
    const inv = invoicesResp.data.invoices.find(
      (i) => i._id === testData.invoiceId
    );
    assertTrue(inv, 'Invoice should be present in list');
    assertTrue(
      inv.paidAmount === inv.totalAmount,
      'Invoice should be fully paid'
    );
    assertTrue(inv.isFinalized === true, 'Invoice should be finalized');
  },

  createIncompleteSale: async () => {
    // Create new cart for incomplete sale
    const cartResponse = await api.post('/business/carts', {
      clientId: testData.clientId,
      customerPhone: '9988776655',
    });
    const cartId = cartResponse.data.cart._id;

    // Add item
    await api.post('/business/carts/add-item', {
      cartId,
      itemId: testData.itemId,
      itemName: 'Incomplete Sale Item',
      unitPrice: 1000,
      quantity: 2,
    });

    const response = await api.post('/business/invoices/incomplete-sale', {
      clientId: testData.clientId,
      customerPhone: '9988776655',
      cartId,
      totalAmount: 2000,
      paidAmount: 1000,
      notes: 'Incomplete sale',
    });
    assertTrue(
      response.status === 201,
      'Create incomplete sale should return 201'
    );
    assertTrue(
      response.data.success === true,
      'Create incomplete sale should succeed'
    );
  },

  getInvoices: async () => {
    const response = await api.get(`/business/invoices/${testData.clientId}`);
    assertTrue(response.status === 200, 'Get invoices should return 200');
    assertTrue(response.data.success === true, 'Get invoices should succeed');
    assertTrue(
      Array.isArray(response.data.invoices),
      'Response should contain array'
    );
  },

  getPurchaseHistory: async () => {
    const response = await api.get(
      `/business/purchase-history/${testData.clientId}`
    );
    assertTrue(
      response.status === 200,
      'Get purchase history should return 200'
    );
    assertTrue(
      response.data.success === true,
      'Get purchase history should succeed'
    );
    assertTrue(
      Array.isArray(response.data.purchaseHistory),
      'Response should contain array'
    );
  },

  getPurchaseHistoryByCustomer: async () => {
    const response = await api.get(
      `/business/purchase-history/${testData.clientId}?customerId=${testData.customerId}`
    );
    assertTrue(
      response.status === 200,
      'Get purchase history by customer should return 200'
    );
    assertTrue(
      response.data.success === true,
      'Get purchase history should succeed'
    );
  },

  // ========== HEALTH CHECK ==========
  healthCheck: async () => {
    const response = await api.get('/health');
    assertTrue(response.status === 200, 'Health check should return 200');
    assertTrue(response.data.success === true, 'Health check should succeed');
  },
};

// ============================================================================
// TEST EXECUTION
// ============================================================================

const runAllTests = async () => {
  report.startTime = new Date();

  log('Starting Viveka Backend API Test Suite', 'section');
  log(`Base URL: ${BASE_URL}`, 'info');
  log(`Test Phone: ${testData.phoneNumber}`, 'info');

  try {
    // Connect to database
    log('Connecting to MongoDB...', 'info');
    await connectDB();

    // Clear database
    log('Clearing database...', 'info');
    await clearDatabase();

    // Reset API axios instance for new session
    api.defaults.headers.common['Authorization'] = '';

    // Run tests in specific order
    log('Running API Tests', 'section');

    await test('1. Send OTP', tests.sendOTP);
    await test('2. Verify OTP', tests.verifyOTP);
    await test('3. Clear OTP', tests.clearOTP);
    await test('4. Register Client', tests.registerClient);
    await test('5. Login Client', tests.loginClient);
    await test('6. Get Client Details', tests.getClientDetails);
    await test('7. Logout Client', tests.logoutClient);
    await test('8. Create Item Group', tests.createItemGroup);
    await test('9. Get Item Groups', tests.getItemGroups);
    await test('10. Update Item Group', tests.updateItemGroup);
    await test('11. Delete Item Group', tests.deleteItemGroup);
    await test('12. Create Item Group (2)', tests.createItemGroup2);
    await test('13. Create Item', tests.createItem);
    await test('14. Get Items', tests.getItems);
    await test('15. Get Items By Group', tests.getItemsByGroup);
    await test('16. Update Item', tests.updateItem);
    await test('17. Delete Item', tests.deleteItem);
    await test('18. Create Item (2)', tests.createItem2);
    await test('19. Get/Create Customer', tests.getOrCreateCustomer);
    await test('20. Get Customers', tests.getCustomers);
    await test('21. Create Cart', tests.createCart);
    await test('22. Add To Cart', tests.addToCart);
    await test('23. Get Cart', tests.getCart);
    await test('24. Remove From Cart', tests.removeFromCart);
    await test('25. Clear Cart', tests.clearCart);
    await test('26. Create Cart For Invoice', tests.createCartForInvoice);
    await test('27. Generate Invoice', tests.generateInvoice);
    await test('28. Create Incomplete Sale', tests.createIncompleteSale);
    await test('29. Get Invoices', tests.getInvoices);
    await test('30. Get Purchase History', tests.getPurchaseHistory);
    await test(
      '31. Get Purchase History By Customer',
      tests.getPurchaseHistoryByCustomer
    );
    await test('32. Health Check', tests.healthCheck);

    // Generate report
    report.endTime = new Date();
    const duration = (report.endTime - report.startTime) / 1000;

    log('Test Suite Completed', 'section');
    log(`Total Tests: ${report.totalTests}`, 'info');
    log(`Passed: ${report.passedTests}`, 'success');
    log(
      `Failed: ${report.failedTests}`,
      report.failedTests > 0 ? 'error' : 'success'
    );
    log(`Duration: ${duration.toFixed(2)}s`, 'info');

    // Disconnect from database
    await disconnectDB();

    // Save report
    saveReport();

    // Exit
    process.exit(report.failedTests > 0 ? 1 : 0);
  } catch (error) {
    log(`Fatal Error: ${error.message}`, 'error');
    await disconnectDB();
    process.exit(1);
  }
};

// ============================================================================
// REPORT GENERATION
// ============================================================================

const saveReport = () => {
  const reportPath = path.join(__dirname, 'test-report.json');
  const htmlReportPath = path.join(__dirname, 'test-report.html');

  // Save JSON report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Report saved to: ${reportPath}`, 'success');

  // Generate HTML report
  const html = generateHTMLReport();
  fs.writeFileSync(htmlReportPath, html);
  log(`HTML report saved to: ${htmlReportPath}`, 'success');

  // Print summary
  printReportSummary();
};

const generateHTMLReport = () => {
  const passPercentage = (
    (report.passedTests / report.totalTests) *
    100
  ).toFixed(2);

  let testRows = report.tests
    .map(
      (t) => `
      <tr class="${t.status === 'PASS' ? 'pass' : 'fail'}">
        <td>${t.name}</td>
        <td>${t.status}</td>
        <td>${t.message}</td>
        <td>${t.duration}ms</td>
        <td>${t.timestamp}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Viveka Backend API - Test Report</title>
      <style>
        * { font-family: Arial, sans-serif; }
        body { margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .summary-card { padding: 15px; border-radius: 5px; text-align: center; }
        .summary-card h3 { margin: 0; color: white; }
        .summary-card p { margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: white; }
        .total { background: #007bff; }
        .pass { background: #28a745; }
        .fail { background: #dc3545; }
        .duration { background: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #007bff; color: white; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr.pass { background: #d4edda; }
        tr.fail { background: #f8d7da; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 3px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: #28a745; width: ${passPercentage}%; }
        .footer { text-align: center; margin-top: 20px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🧪 Viveka Backend API - Test Report</h1>
        
        <div class="summary">
          <div class="summary-card total">
            <h3>Total Tests</h3>
            <p>${report.totalTests}</p>
          </div>
          <div class="summary-card pass">
            <h3>Passed</h3>
            <p>${report.passedTests}</p>
          </div>
          <div class="summary-card fail">
            <h3>Failed</h3>
            <p>${report.failedTests}</p>
          </div>
          <div class="summary-card duration">
            <h3>Duration</h3>
            <p>${((report.endTime - report.startTime) / 1000).toFixed(2)}s</p>
          </div>
        </div>

        <div>
          <h3>Pass Rate: ${passPercentage}%</h3>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Status</th>
              <th>Message</th>
              <th>Duration</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${testRows}
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Viveka Backend API - Automated Test Suite v1.0</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const printReportSummary = () => {
  console.log('\n');
  console.log(
    chalk.cyan('═══════════════════════════════════════════════════')
  );
  console.log(chalk.cyan('TEST REPORT SUMMARY'));
  console.log(
    chalk.cyan('═══════════════════════════════════════════════════')
  );
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(chalk.green(`✅ Passed: ${report.passedTests}`));
  console.log(chalk.red(`❌ Failed: ${report.failedTests}`));
  const duration = ((report.endTime - report.startTime) / 1000).toFixed(2);
  console.log(`⏱️  Duration: ${duration}s`);
  const passPercentage = (
    (report.passedTests / report.totalTests) *
    100
  ).toFixed(2);
  console.log(`📊 Pass Rate: ${passPercentage}%`);
  console.log(
    chalk.cyan('═══════════════════════════════════════════════════\n')
  );
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

runAllTests().catch((error) => {
  log(`Unhandled error: ${error.message}`, 'error');
  process.exit(1);
});
