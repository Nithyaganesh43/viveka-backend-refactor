import axios from 'axios';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_BASE_URL = 'http://localhost:10000/api';
const CLOUD_BASE_URL = 'https://viveha-backend.onrender.com/api';
const modeArg = (process.argv[2] || '').toLowerCase();
const IS_LOCAL = modeArg === 'local';
const BASE_URL = IS_LOCAL ? LOCAL_BASE_URL : CLOUD_BASE_URL;
const MONGO_URL = process.env.MONGO_URL || process.env.TEST_MONGO_URL;
const ENABLE_DB_CLEANUP = Boolean(MONGO_URL);
const TIMEOUT = 12000;
const FIXED_REGISTER_OTP = '1234';
const FIXED_LOGIN_OTP = '1234';

const testData = {
  phoneNumber: `989${Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0')}`,
  secondaryPhone: `979${Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0')}`,
  ownerName: 'Test Owner',
  businessName: 'Test Business',
  shopName: 'Test Auto Spares',
  location: 'Test Street, Test Area',
  city: 'Test City',
  state: 'Test State',
  gstin: '18AADCA1111K1Z5',
  profileUrl: 'https://example.com/profile.jpg',
  registerOtp: null,
  loginOtp: null,
  clientId: null,
  token: null,
  deviceSessionId: null,
  deviceId: `test-device-${Date.now()}`,
  itemGroupId: null,
  deletableItemGroupId: null,
  itemId: null,
  deletableItemId: null,
  dealerId: null,
  dealerOrderId: null,
  dealerPaymentId: null,
  clientCustomerId: null,
  cartId: null,
  cartItemId: null,
  invoiceId: null,
  pendingInvoiceId: null,
  syncDeleteItemId: null,
  syncInvoiceNumber: null,
  customerPhone: '9988776655',
  altCustomerPhone: '9988665544',
  settingsCustomerPhone: '9977553311',
  customerEmail: 'customer@example.com',
  customerGstNo: '22ABCDE1234F1Z5',
};

const created = {
  otpPhones: new Set(),
  deviceSessionIds: [],
  clients: [],
  itemGroups: [],
  items: [],
  clientCustomers: [],
  carts: [],
  cartItems: [],
  invoices: [],
  invoiceItems: [],
  payments: [],
};

const report = {
  startTime: null,
  endTime: null,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  tests: [],
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
});

const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    test: '🧪',
    section: '',
  };

  const colors = {
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    test: chalk.cyan,
    section: chalk.magenta,
  };

  const color = colors[type] || chalk.white;
  const icon = icons[type] || '';

  if (type === 'section') {
    console.log(color('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(color(message));
    console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  } else {
    console.log(color(`${icon} [${timestamp}] ${message}`));
  }
};

const recordTest = (name, status, message, duration) => {
  report.totalTests += 1;
  report.tests.push({
    name,
    status,
    message,
    duration,
    timestamp: new Date().toISOString(),
  });
  if (status === 'PASS') {
    report.passedTests += 1;
  } else {
    report.failedTests += 1;
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
    let errorMessage = error.message;
    if (error.response) {
      errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(
        error.response.data,
      )}`;
    } else if (error.code) {
      errorMessage = `${error.code}: ${error.message}`;
    }
    log(`✗ ${name}: ${errorMessage}`, 'error');
    recordTest(name, 'FAIL', errorMessage, duration);
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

const waitForHealth = async () => {
  const healthUrl = `${BASE_URL.replace(/\/api$/, '')}/api/health`;
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      await axios.get(healthUrl, { timeout: 2000 });
      log('API is healthy and reachable', 'success');
      return;
    } catch (err) {
      if (attempt % 5 === 0) {
        log(`Waiting for API... (attempt ${attempt}/40)`, 'info');
      }
      if (attempt === 40) {
        throw new Error('Server health check failed after 40 attempts');
      }
      await sleep(500);
    }
  }
};

let serverProcess = null;

const killPort = async (port) => {
  try {
    log(`Killing any process on port ${port}`, 'warning');
    const findCmd = `netstat -ano | findstr :${port}`;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(findCmd);
      const lines = stdout
        .split('\n')
        .filter((line) => line.includes('LISTENING'));
      const pids = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          pids.add(pid);
        }
      }

      for (const pid of pids) {
        try {
          await execAsync(`taskkill /F /PID ${pid} /T`);
          log(`Killed process ${pid} on port ${port}`, 'success');
        } catch (err) {
          // Process might already be dead
        }
      }

      await sleep(1000);
    } catch (err) {
      // No process found on port, which is fine
    }
  } catch (error) {
    log(`Error killing port ${port}: ${error.message}`, 'warning');
  }
};

const startLocalServer = async () => {
  const backendRoot = path.join(__dirname, '..');

  // Kill any existing process on port 10000
  await killPort(10000);

  log('Starting local server for tests', 'warning');
  serverProcess = spawn('npm', ['run', 'start'], {
    cwd: backendRoot,
    shell: true,
    stdio: 'inherit',
  });
  await sleep(500);
};

const stopLocalServer = async () => {
  if (serverProcess) {
    log('Stopping local server process', 'warning');
    try {
      // On Windows, we need to kill the entire process tree
      if (serverProcess.pid) {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        try {
          await execAsync(`taskkill /F /PID ${serverProcess.pid} /T`);
        } catch (err) {
          // Process might already be dead
        }
      }
    } catch (error) {
      log(`Error stopping server: ${error.message}`, 'warning');
    }
    serverProcess = null;
  }

  // Force kill port 10000 to ensure it's freed
  await killPort(10000);
  log('Local server stopped and port freed', 'success');
};

const toObjectIds = (list) =>
  list
    .filter(Boolean)
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

const cleanupCreatedData = async () => {
  if (!ENABLE_DB_CLEANUP) {
    log('Skipping DB cleanup (MONGO_URL not set)', 'warning');
    return;
  }
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URL);
    }
    const clientIds = toObjectIds([testData.clientId, ...created.clients]);
    const itemGroupIds = toObjectIds([...created.itemGroups]);
    const itemIds = toObjectIds([...created.items]);
    const customerIds = toObjectIds([...created.clientCustomers]);
    const cartIds = toObjectIds([...created.carts]);
    const invoiceIds = toObjectIds([...created.invoices]);
    const phoneNumbers = Array.from(created.otpPhones);
    const deviceSessionIds = toObjectIds([...created.deviceSessionIds]);

    const tasks = [];
    if (phoneNumbers.length) {
      tasks.push(
        mongoose.connection
          .collection('otpsessions')
          .deleteMany({ phoneNumber: { $in: phoneNumbers } }),
      );
    }
    if (deviceSessionIds.length) {
      tasks.push(
        mongoose.connection
          .collection('devicesessions')
          .deleteMany({ _id: { $in: deviceSessionIds } }),
      );
    }
    if (clientIds.length) {
      tasks.push(
        mongoose.connection
          .collection('clients')
          .deleteMany({ _id: { $in: clientIds } }),
      );
    }
    if (customerIds.length) {
      tasks.push(
        mongoose.connection
          .collection('clientcustomers')
          .deleteMany({ _id: { $in: customerIds } }),
      );
    }
    if (itemGroupIds.length) {
      tasks.push(
        mongoose.connection
          .collection('itemgroups')
          .deleteMany({ _id: { $in: itemGroupIds } }),
      );
    }
    if (itemIds.length) {
      tasks.push(
        mongoose.connection
          .collection('items')
          .deleteMany({ _id: { $in: itemIds } }),
      );
    }
    if (cartIds.length) {
      tasks.push(
        mongoose.connection
          .collection('cartitems')
          .deleteMany({ cartId: { $in: cartIds } }),
      );
      tasks.push(
        mongoose.connection
          .collection('carts')
          .deleteMany({ _id: { $in: cartIds } }),
      );
    }
    if (invoiceIds.length) {
      tasks.push(
        mongoose.connection
          .collection('invoiceitems')
          .deleteMany({ invoiceId: { $in: invoiceIds } }),
      );
      tasks.push(
        mongoose.connection
          .collection('purchasehistories')
          .deleteMany({ invoiceId: { $in: invoiceIds } }),
      );
      tasks.push(
        mongoose.connection
          .collection('payments')
          .deleteMany({ invoiceId: { $in: invoiceIds } }),
      );
      tasks.push(
        mongoose.connection
          .collection('invoices')
          .deleteMany({ _id: { $in: invoiceIds } }),
      );
    }

    await Promise.all(tasks);
    await mongoose.disconnect();
    log('Cleaned up created test data', 'success');
  } catch (error) {
    log(`Cleanup error: ${error.message}`, 'error');
  }
};

const tests = {
  sendOTPForRegister: async () => {
    const response = await api.post('/mockotp/send', {
      phoneNumber: testData.phoneNumber,
      purpose: 'register',
    });
    assertTrue(response.status === 200, 'Send OTP should return 200');
    assertTrue(response.data.success === true, 'Response should be successful');
    assertEqual(
      response.data.phoneNumber,
      testData.phoneNumber,
      'Phone number should match',
    );
    assertTrue(
      typeof response.data.expiresInSeconds === 'number',
      'Should include expiresInSeconds',
    );
    testData.registerOtp = FIXED_REGISTER_OTP;
    created.otpPhones.add(testData.phoneNumber);
  },

  registerClient: async () => {
    assertTrue(testData.registerOtp, 'OTP must be set before registration');
    const response = await api.post('/auth/register', {
      phoneNumber: testData.phoneNumber,
      otp: testData.registerOtp,
      ownerName: testData.ownerName,
      businessName: testData.businessName,
      shopName: testData.shopName,
      location: testData.location,
      city: testData.city,
      state: testData.state,
      gstin: testData.gstin,
      profileUrl: testData.profileUrl,
    });
    assertTrue(response.status === 201, 'Register should return 201');
    assertTrue(response.data.success === true, 'Registration should succeed');
    assertTrue(response.data.clientId, 'Response should contain clientId');
    testData.clientId = response.data.clientId;
    created.clients.push(testData.clientId);
    testData.registerOtp = null;
  },

  sendOTPForLogin: async () => {
    const response = await api.post('/mockotp/send', {
      phoneNumber: testData.phoneNumber,
      purpose: 'login',
    });
    assertTrue(response.status === 200, 'Send OTP for login should return 200');
    assertTrue(response.data.success === true, 'Response should be successful');
    testData.loginOtp = FIXED_LOGIN_OTP;
    created.otpPhones.add(testData.phoneNumber);
  },

  loginClient: async () => {
    assertTrue(testData.loginOtp, 'OTP must be set before login');
    const response = await api.post('/auth/login', {
      phoneNumber: testData.phoneNumber,
      otp: testData.loginOtp,
    });
    assertTrue(response.status === 200, 'Login should return 200');
    assertTrue(response.data.success === true, 'Login should succeed');
    assertTrue(response.data.token, 'Response should contain token');
    assertTrue(
      response.data.deviceSessionId,
      'Response should contain deviceSessionId',
    );
    testData.token = response.data.token;
    testData.deviceSessionId = response.data.deviceSessionId;
    created.deviceSessionIds.push(testData.deviceSessionId);
    setAuthToken(testData.token);
    testData.loginOtp = null;
  },

  updateClientInfo: async () => {
    const response = await api.put(`/auth/client/${testData.clientId}`, {
      ownerName: 'Updated Test Owner',
      shopName: 'Updated Test Shop',
      city: 'Updated City',
    });
    assertTrue(response.status === 200, 'Update client should return 200');
    assertTrue(response.data.success === true, 'Update client should succeed');
    assertTrue(response.data.client, 'Response should contain client data');
    assertEqual(
      response.data.client.ownerName,
      'Updated Test Owner',
      'Owner name should be updated',
    );
    assertEqual(
      response.data.client.shopName,
      'Updated Test Shop',
      'Shop name should be updated',
    );
    testData.ownerName = 'Updated Test Owner';
    testData.shopName = 'Updated Test Shop';
    testData.city = 'Updated City';
  },

  getClientDetails: async () => {
    const response = await api.get(`/auth/client/${testData.clientId}`);
    assertTrue(response.status === 200, 'Get client should return 200');
    assertTrue(response.data.success === true, 'Get client should succeed');
    assertTrue(response.data.client, 'Response should contain client data');
    assertEqual(
      response.data.client._id,
      testData.clientId,
      'Client ID should match',
    );
    assertTrue(
      response.data.client.shopName === testData.shopName,
      'Shop name should match',
    );
  },

  updateClientCustomerFieldSettings: async () => {
    const response = await api.put(`/auth/client/${testData.clientId}`, {
      clientSettings: {
        customerFields: {
          address: true,
          gstNo: true,
          emailId: true,
        },
      },
    });
    assertTrue(
      response.status === 200,
      'Update client settings should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Update client settings should succeed',
    );
    assertTrue(
      response.data.client?.clientSettings?.customerFields,
      'Client settings should be present',
    );
    assertEqual(
      response.data.client.clientSettings.customerFields.address,
      true,
      'Address field should be enabled',
    );
    assertEqual(
      response.data.client.clientSettings.customerFields.gstNo,
      true,
      'GST field should be enabled',
    );
    assertEqual(
      response.data.client.clientSettings.customerFields.emailId,
      true,
      'Email field should be enabled',
    );
  },

  createClientCustomerMissingEnabledFields: async () => {
    let addressError = false;
    try {
      await api.post('/business/client-customers', {
        clientId: testData.clientId,
        phone: testData.settingsCustomerPhone,
        name: 'Test Customer',
        emailId: testData.customerEmail,
        gstNo: testData.customerGstNo,
      });
    } catch (error) {
      addressError = error.response?.status === 400;
    }
    assertTrue(addressError, 'Missing address should fail');

    let emailError = false;
    try {
      await api.post('/business/client-customers', {
        clientId: testData.clientId,
        phone: testData.settingsCustomerPhone,
        name: 'Test Customer',
        address: 'Test Address',
        gstNo: testData.customerGstNo,
      });
    } catch (error) {
      emailError = error.response?.status === 400;
    }
    assertTrue(emailError, 'Missing email should fail');

    let gstError = false;
    try {
      await api.post('/business/client-customers', {
        clientId: testData.clientId,
        phone: testData.settingsCustomerPhone,
        name: 'Test Customer',
        address: 'Test Address',
        emailId: testData.customerEmail,
      });
    } catch (error) {
      gstError = error.response?.status === 400;
    }
    assertTrue(gstError, 'Missing GST should fail');
  },

  createClientCustomerWithEnabledFields: async () => {
    const response = await api.post('/business/client-customers', {
      clientId: testData.clientId,
      phone: testData.settingsCustomerPhone,
      name: 'Test Customer',
      address: 'Test Address',
      emailId: testData.customerEmail,
      gstNo: testData.customerGstNo,
    });
    assertTrue(
      response.status === 201,
      'Create client customer with enabled fields should return 201',
    );
    assertTrue(
      response.data.success === true,
      'Create client customer with enabled fields should succeed',
    );
    assertEqual(
      response.data.clientCustomer.emailId,
      testData.customerEmail,
      'Email ID should be stored',
    );
    assertEqual(
      response.data.clientCustomer.gstNo,
      testData.customerGstNo,
      'GST number should be stored',
    );
    testData.clientCustomerId = response.data.clientCustomer._id;
    created.clientCustomers.push(testData.clientCustomerId);
  },

  resetClientCustomerFieldSettings: async () => {
    const response = await api.put(`/auth/client/${testData.clientId}`, {
      clientSettings: {
        customerFields: {
          address: false,
          gstNo: false,
          emailId: false,
        },
      },
    });
    assertTrue(
      response.status === 200,
      'Reset client settings should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Reset client settings should succeed',
    );
    assertEqual(
      response.data.client.clientSettings.customerFields.address,
      false,
      'Address field should be disabled',
    );
    assertEqual(
      response.data.client.clientSettings.customerFields.gstNo,
      false,
      'GST field should be disabled',
    );
    assertEqual(
      response.data.client.clientSettings.customerFields.emailId,
      false,
      'Email field should be disabled',
    );
  },

  createClientCustomerWithEmptyDisabledFields: async () => {
    // BUG FIX TEST: This test would have caught the original bug
    // When customer fields are disabled (false), API should accept empty strings
    // Original bug: validation rejected empty strings with "address: Address must be at least 1 characters"
    const response = await api.post('/business/client-customers', {
      clientId: testData.clientId,
      phone: '9876543210',
      name: 'Customer With Empty Fields',
      address: '', // Empty string for disabled field - should be accepted
      emailId: '', // Empty string for disabled field - should be accepted
      gstNo: '', // Empty string for disabled field - should be accepted
    });
    assertTrue(
      response.status === 201,
      'Create customer with empty disabled fields should return 201',
    );
    assertTrue(
      response.data.success === true,
      'Create customer with empty disabled fields should succeed',
    );
    assertEqual(
      response.data.clientCustomer.name,
      'Customer With Empty Fields',
      'Customer name should be stored',
    );
    // Clean up
    created.clientCustomers.push(response.data.clientCustomer._id);
  },

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
    created.itemGroups.push(testData.itemGroupId);
  },

  updateItemGroup: async () => {
    const response = await api.put(
      `/business/item-groups/${testData.clientId}/${testData.itemGroupId}`,
      {
        name: 'Updated Item Group',
        description: 'Updated description',
      },
    );
    assertTrue(response.status === 200, 'Update group should return 200');
    assertTrue(response.data.success === true, 'Update group should succeed');
    assertEqual(response.data.itemGroup.name, 'Updated Item Group', 'Name set');
  },

  createItemGroupToDelete: async () => {
    const response = await api.post('/business/item-groups', {
      clientId: testData.clientId,
      name: 'Temp Item Group',
      description: 'Temp description',
    });
    assertTrue(response.status === 201, 'Create group should return 201');
    testData.deletableItemGroupId = response.data.itemGroup._id;
    created.itemGroups.push(testData.deletableItemGroupId);
  },

  deleteItemGroup: async () => {
    const response = await api.delete(
      `/business/item-groups/${testData.clientId}/${testData.deletableItemGroupId}`,
    );
    assertTrue(response.status === 200, 'Delete group should return 200');
    assertTrue(response.data.success === true, 'Delete group should succeed');
  },

  getItemGroups: async () => {
    const response = await api.get(
      `/business/item-groups/${testData.clientId}`,
    );
    assertTrue(response.status === 200, 'Get item groups should return 200');
    assertTrue(
      response.data.success === true,
      'Get item groups should succeed',
    );
    assertTrue(
      Array.isArray(response.data.itemGroups),
      'Response should contain itemGroups array',
    );
    assertTrue(
      response.data.itemGroups.length >= 1,
      'Should have at least one item group',
    );
    // Verify the created item group exists
    const group = response.data.itemGroups.find(
      (g) => g._id === testData.itemGroupId,
    );
    assertTrue(group, 'Created item group should be in the list');
    assertEqual(group.name, 'Updated Item Group', 'Group name should match');
  },

  createItem: async () => {
    // Ensure we have a dealer to map the item to
    if (!testData.dealerId) {
      const dealerResponse = await api.post('/dealer', {
        clientId: testData.clientId,
        name: 'Test Dealer',
        contactPerson: 'Dealer Owner',
        phoneNumber: '9876500000',
        email: 'dealer@example.com',
        address: 'Dealer Street',
      });
      assertTrue(
        dealerResponse.status === 201,
        'Create dealer for item should return 201',
      );
      assertTrue(
        dealerResponse.data.success === true,
        'Create dealer for item should succeed',
      );
      testData.dealerId = dealerResponse.data.dealer._id;
    }

    const response = await api.post('/business/items', {
      clientId: testData.clientId,
      name: 'Test Item',
      price: 100,
      dealerIds: [testData.dealerId],
      stock: 10,
      lowStockQuantity: 5,
      unit: 'nos',
      groupId: testData.itemGroupId,
      description: 'Test item description',
    });
    assertTrue(response.status === 201, 'Create item should return 201');
    assertTrue(response.data.success === true, 'Create item should succeed');
    assertTrue(response.data.item._id, 'Response should contain item ID');
    testData.itemId = response.data.item._id;
    created.items.push(testData.itemId);
  },

  createItemWithoutDealers: async () => {
    // Items can now be created without dealers (dealerIds is optional)
    const response = await api.post('/business/items', {
      clientId: testData.clientId,
      name: 'Item Without Dealer',
      price: 100,
      unit: 'nos',
    });
    assertTrue(
      response.status === 201,
      'Create item without dealers should return 201',
    );
    assertTrue(
      response.data.success === true,
      'Create item without dealers should succeed',
    );
    assertTrue(
      !response.data.item.dealerIds ||
        response.data.item.dealerIds.length === 0,
      'Item should have empty dealerIds array',
    );
    // Clean up
    if (response.data.item._id) {
      created.items.push(response.data.item._id);
    }
  },

  createItemWithEmptyDealerArray: async () => {
    // Items can be created with explicitly empty dealerIds array
    const response = await api.post('/business/items', {
      clientId: testData.clientId,
      name: 'Item With Empty Dealer Array',
      price: 150,
      dealerIds: [],
      unit: 'nos',
    });
    assertTrue(
      response.status === 201,
      'Create item with empty dealer array should return 201',
    );
    assertTrue(
      response.data.success === true,
      'Create item with empty dealer array should succeed',
    );
    assertTrue(
      Array.isArray(response.data.item.dealerIds) &&
        response.data.item.dealerIds.length === 0,
      'Item should have empty dealerIds array',
    );
    // Clean up
    if (response.data.item._id) {
      created.items.push(response.data.item._id);
    }
  },

  createItemWithInvalidDealer: async () => {
    // Create item with invalid dealerId should fail
    let errorOccurred = false;
    try {
      await api.post('/business/items', {
        clientId: testData.clientId,
        name: 'Item With Invalid Dealer',
        price: 150,
        dealerIds: ['507f1f77bcf86cd799439011'], // Valid ObjectId format but non-existent
        unit: 'nos',
      });
    } catch (error) {
      errorOccurred = true;
      // Should get validation or not found error
      assertTrue(
        error.response?.status === 400 || error.response?.status === 404,
        'Invalid dealer should return 400 or 404',
      );
    }
    assertTrue(errorOccurred, 'Creating item with invalid dealer should fail');
  },

  createItemWithMultipleDealers: async () => {
    // Create a second dealer for multi-dealer item test
    const dealer2Response = await api.post('/dealer', {
      clientId: testData.clientId,
      name: 'Second Test Dealer',
      contactPerson: 'Dealer 2 Owner',
      phoneNumber: '9876500001',
    });
    const dealer2Id = dealer2Response.data.dealer._id;

    // Create item with multiple dealers
    const response = await api.post('/business/items', {
      clientId: testData.clientId,
      name: 'Multi Dealer Item',
      price: 200,
      dealerIds: [testData.dealerId, dealer2Id],
      stock: 20,
      lowStockQuantity: 10,
      unit: 'nos',
    });
    assertTrue(
      response.status === 201,
      'Create item with multiple dealers should return 201',
    );
    assertTrue(
      response.data.success === true,
      'Create item with multiple dealers should succeed',
    );
    // Clean up
    if (response.data.item._id) {
      created.items.push(response.data.item._id);
    }
  },

  updateItem: async () => {
    const response = await api.put(
      `/business/items/${testData.clientId}/${testData.itemId}`,
      {
        price: 120,
        description: 'Updated price and description',
      },
    );
    assertTrue(response.status === 200, 'Update item should return 200');
    assertTrue(response.data.success === true, 'Update item should succeed');
    assertEqual(response.data.item.price, 120, 'Price should be updated');
  },

  getItems: async () => {
    const response = await api.get(`/business/items/${testData.clientId}`);
    assertTrue(response.status === 200, 'Get items should return 200');
    assertTrue(response.data.success === true, 'Get items should succeed');
    assertTrue(
      Array.isArray(response.data.items) && response.data.items.length >= 1,
      'Response should contain items',
    );
  },

  getItemsByGroup: async () => {
    const response = await api.get(`/business/items/${testData.clientId}`, {
      params: { groupId: testData.itemGroupId },
    });
    assertTrue(response.status === 200, 'Get items by group should return 200');
    assertTrue(
      response.data.success === true,
      'Get items by group should succeed',
    );
    assertTrue(
      response.data.items.every(
        (item) => item.groupId === testData.itemGroupId,
      ),
      'All items should belong to the group',
    );
  },

  createItemToDelete: async () => {
    const response = await api.post('/business/items', {
      clientId: testData.clientId,
      name: 'Temp Item',
      price: 50,
      dealerIds: [testData.dealerId],
      unit: 'nos',
      description: 'To be deleted',
    });
    assertTrue(response.status === 201, 'Create temp item should return 201');
    testData.deletableItemId = response.data.item._id;
    created.items.push(testData.deletableItemId);
  },

  deleteItem: async () => {
    const response = await api.delete(
      `/business/items/${testData.clientId}/${testData.deletableItemId}`,
    );
    assertTrue(response.status === 200, 'Delete item should return 200');
    assertTrue(response.data.success === true, 'Delete item should succeed');
  },
getOrCreateCustomer: async () => {
  const response = await api.post('/business/client-customers', {
    clientId: testData.clientId,
    phone: testData.customerPhone,
    name: 'Test Customer',
  });
  assertTrue(response.status===201,'Create client customer should return 201');
  assertTrue(response.data.success===true,'Create client customer should succeed');
  assertTrue(response.data.clientCustomer._id,'Response should contain client customer ID');
  assertEqual(
    response.data.clientCustomer.address||'',
    '',
    'Address should be empty when field is disabled'
  );
  testData.clientCustomerId=response.data.clientCustomer._id;
  created.clientCustomers.push(testData.clientCustomerId);
},

updateCustomerAddress: async () => {
  const response=await api.post('/business/client-customers',{
    clientId:testData.clientId,
    phone:testData.customerPhone,
    name:'Test Customer',
    address:'Updated Address Lane'
  });
  assertTrue(response.status===201,'Update client customer should return 201');
  assertTrue(response.data.success===true,'Update client customer should succeed');
  assertEqual(
    response.data.clientCustomer.address||'',
    '',
    'Address should NOT update when field is disabled'
  );
},

getCustomers: async () => {
  const response=await api.get(`/business/client-customers/${testData.clientId}`);
  assertTrue(response.status===200,'Get client customers should return 200');
  assertTrue(response.data.success===true,'Get client customers should succeed');
  assertTrue(Array.isArray(response.data.clientCustomers),'Response should contain array');
},

createClientCustomerToDelete: async () => {
  const response=await api.post('/business/client-customers',{
    clientId:testData.clientId,
    phone:'9999888877',
    name:'Temp Customer To Delete'
  });
  assertTrue(response.status===201,'Create temp customer should return 201');
  testData.deletableClientCustomerId=response.data.clientCustomer._id;
  created.clientCustomers.push(testData.deletableClientCustomerId);
},

updateClientCustomer: async () => {
  const response=await api.put(
    `/business/client-customers/${testData.clientId}/${testData.deletableClientCustomerId}`,
    {
      name:'Updated Customer Name',
      address:'New Customer Address'
    }
  );
  assertTrue(response.status===200,'Update client customer should return 200');
  assertTrue(response.data.success===true,'Update client customer should succeed');
  assertEqual(
    response.data.clientCustomer.name,
    'Updated Customer Name',
    'Name should be updated'
  );
  assertEqual(
    response.data.clientCustomer.address||'',
    '',
    'Address should NOT update when field is disabled'
  );
},


deleteClientCustomer: async () => {
  const response=await api.delete(
    `/business/client-customers/${testData.clientId}/${testData.deletableClientCustomerId}`
  );
  assertTrue(response.status===200,'Delete client customer should return 200');
  assertTrue(response.data.success===true,'Delete client customer should succeed');
},

  createCart: async () => {
    const response = await api.post('/business/carts', {
      clientId: testData.clientId,
      customerPhone: testData.customerPhone,
    });
    assertTrue(response.status === 201, 'Create cart should return 201');
    assertTrue(response.data.success === true, 'Create cart should succeed');
    assertTrue(response.data.cart._id, 'Response should contain cart ID');
    testData.cartId = response.data.cart._id;
    created.carts.push(testData.cartId);
  },

  addToCart: async () => {
    const response = await api.post('/business/carts/add-item', {
      cartId: testData.cartId,
      itemId: testData.itemId,
      itemName: 'Test Item',
      unitPrice: 120,
      quantity: 5,
    });
    assertTrue(response.status === 200, 'Add to cart should return 200');
    assertTrue(response.data.success === true, 'Add to cart should succeed');
    testData.cartItemId = response.data.cartItem._id;
    created.cartItems.push(testData.cartItemId);
  },

  getCart: async () => {
    const response = await api.get(`/business/carts/${testData.cartId}`);
    assertTrue(response.status === 200, 'Get cart should return 200');
    assertTrue(response.data.success === true, 'Get cart should succeed');
    assertTrue(response.data.cart, 'Response should contain cart data');
    assertTrue(Array.isArray(response.data.cartItems), 'Should contain items');
  },

  removeFromCart: async () => {
    const response = await api.post('/business/carts/remove-item', {
      cartId: testData.cartId,
      cartItemId: testData.cartItemId,
    });
    assertTrue(response.status === 200, 'Remove from cart should return 200');
    assertTrue(
      response.data.success === true,
      'Remove from cart should succeed',
    );
  },

  clearCart: async () => {
    const response = await api.post('/business/carts/clear', {
      cartId: testData.cartId,
    });
    assertTrue(response.status === 200, 'Clear cart should return 200');
    assertTrue(response.data.success === true, 'Clear cart should succeed');
  },

  createCartForInvoice: async () => {
    const response = await api.post('/business/carts', {
      clientId: testData.clientId,
      customerPhone: testData.customerPhone,
    });
    assertTrue(response.status === 201, 'Create cart should return 201');
    testData.cartId = response.data.cart._id;
    created.carts.push(testData.cartId);
    const addResponse = await api.post('/business/carts/add-item', {
      cartId: testData.cartId,
      itemId: testData.itemId,
      itemName: 'Test Item',
      unitPrice: 120,
      quantity: 10,
    });
    created.cartItems.push(addResponse.data.cartItem._id);
  },

  generateInvoice: async () => {
    const response = await api.post('/business/invoices/generate', {
      clientId: testData.clientId,
      clientCustomerId: testData.clientCustomerId,
      cartId: testData.cartId,
      totalAmount: 1200,
      notes: 'Test invoice with no upfront payment',
    });
    assertTrue(response.status === 201, 'Generate invoice should return 201');
    assertTrue(
      response.data.success === true,
      'Generate invoice should succeed',
    );
    assertTrue(response.data.invoice._id, 'Response should contain invoice ID');
    assertTrue(
      response.data.invoice.isFinalized === false,
      'Invoice should not be finalized when unpaid',
    );
    assertEqual(
      response.data.invoice.paidAmount,
      0,
      'Unpaid invoice should start with paidAmount = 0',
    );
    testData.invoiceId = response.data.invoice._id;
    created.invoices.push(testData.invoiceId);
    if (Array.isArray(response.data.invoiceItems)) {
      created.invoiceItems.push(
        ...response.data.invoiceItems.map((item) => item._id).filter(Boolean),
      );
    }
  },

  generateInvoiceWithProducts: async () => {
    const data =  {
      clientId: testData.clientId,
      clientCustomerId: testData.clientCustomerId,
      products: [
        {
          productId: testData.itemId,
          itemName: 'Test Item',
          costPerUnit: 500,
          quantity: 2,
        },
      ],
      totalAmount: 1000,
      paidAmount: 1000,
      notes: 'Test invoice with direct products',
    }
    const response = await api.post('/business/invoices/generatewithproducts', 
     data
    );
    assertTrue(
      response.status === 201,
      'Generate invoice with products should return 201',
    );
    assertTrue(
      response.data.success === true,
      'Generate invoice with products should succeed',
    );
    assertTrue(response.data.invoice._id, 'Response should contain invoice ID');
    assertTrue(
      response.data.invoice.isFinalized === true,
      'Invoice should be finalized when fully paid',
    );
    assertEqual(
      response.data.invoice.paidAmount,
      1000,
      'Paid amount should match',
    );
    created.invoices.push(response.data.invoice._id);
    if (Array.isArray(response.data.invoiceItems)) {
      created.invoiceItems.push(
        ...response.data.invoiceItems.map((item) => item._id).filter(Boolean),
      );
    }
  },

  recordPayment1: async () => {
    const response = await api.post('/business/invoices/pay', {
      clientId: testData.clientId,
      invoiceId: testData.invoiceId,
      amount: 400,
      method: 'cash',
      note: 'First partial payment',
    });
    assertTrue(response.status === 200, 'Record payment should return 200');
    assertTrue(response.data.success === true, 'Record payment should succeed');
    assertTrue(response.data.invoice, 'Response should contain invoice');
    assertEqual(
      response.data.invoice.paidAmount,
      400,
      'Paid amount should be 400',
    );
    assertEqual(
      response.data.invoice.totalAmount,
      1200,
      'Invoice total should remain 1200',
    );
    if (response.data.payment?._id) {
      created.payments.push(response.data.payment._id);
    }
  },

  recordPayment2: async () => {
    const response = await api.post('/business/invoices/pay', {
      clientId: testData.clientId,
      invoiceId: testData.invoiceId,
      amount: 800,
      method: 'cash',
      note: 'Second partial payment - complete',
    });
    assertTrue(response.status === 200, 'Record payment should return 200');
    assertTrue(response.data.success === true, 'Record payment should succeed');
    assertTrue(
      response.data.invoice.isFinalized === true,
      'Invoice should be finalized after full payment',
    );
    assertEqual(
      response.data.invoice.paidAmount,
      1200,
      'Paid amount should be 1200',
    );
    assertEqual(
      response.data.invoice.totalAmount,
      1200,
      'Invoice total should remain unchanged',
    );
    if (response.data.payment?._id) {
      created.payments.push(response.data.payment._id);
    }
  },

  getPaymentsForInvoice: async () => {
    const response = await api.get(
      `/business/invoices/${testData.invoiceId}/payments?clientId=${testData.clientId}`,
    );
    assertTrue(response.status === 200, 'Get payments should return 200');
    assertTrue(response.data.success === true, 'Get payments should succeed');
    assertTrue(
      Array.isArray(response.data.payments),
      'Payments should be array',
    );
    assertTrue(response.data.payments.length >= 2, 'Should have two payments');
  },

  createPendingInvoice: async () => {
    const cartResponse = await api.post('/business/carts', {
      clientId: testData.clientId,
      customerPhone: testData.altCustomerPhone,
    });
    const cart2Id = cartResponse.data.cart._id;
    created.carts.push(cart2Id);
    const addResponse = await api.post('/business/carts/add-item', {
      cartId: cart2Id,
      itemId: testData.itemId,
      itemName: 'Test Item',
      unitPrice: 120,
      quantity: 5,
    });
    created.cartItems.push(addResponse.data.cartItem._id);
    const invoiceResponse = await api.post('/business/invoices/generate', {
      clientId: testData.clientId,
      clientCustomerId: testData.clientCustomerId,
      cartId: cart2Id,
      totalAmount: 600,
      paidAmount: 120,
      notes: 'Pending invoice for testing',
    });
    assertTrue(
      invoiceResponse.status === 201,
      'Pending invoice should return 201',
    );
    assertTrue(
      invoiceResponse.data.success === true,
      'Pending invoice should succeed',
    );
    testData.pendingInvoiceId = invoiceResponse.data.invoice._id;
    created.invoices.push(testData.pendingInvoiceId);
  },

  getPendingInvoices: async () => {
    const response = await api.get(
      `/business/pending-invoices/${testData.clientId}`,
    );
    assertTrue(response.status === 200, 'Get pending should return 200');
    assertTrue(response.data.success === true, 'Get pending should succeed');
    assertTrue(
      Array.isArray(response.data.pendingInvoices),
      'Response should contain array',
    );
    const pending = response.data.pendingInvoices.find(
      (inv) => inv._id === testData.pendingInvoiceId,
    );
    assertTrue(Boolean(pending), 'Pending invoice should be present');
    assertEqual(pending.pendingAmount, 480, 'Pending amount should match');
  },

  getPendingInvoicesByClientCustomer: async () => {
    const response = await api.get(
      `/business/pending-invoices/${testData.clientId}/${testData.clientCustomerId}`,
    );
    assertTrue(
      response.status === 200,
      'Get pending by customer should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get pending by customer should succeed',
    );
    assertTrue(
      Array.isArray(response.data.pendingInvoices),
      'Response should contain array',
    );
    const pending = response.data.pendingInvoices.find(
      (inv) => inv._id === testData.pendingInvoiceId,
    );
    assertTrue(
      Boolean(pending),
      'Pending invoice should be present for customer',
    );
  },

  getPaidInvoicesByClientCustomer: async () => {
    const response = await api.get(
      `/business/paid-invoices/${testData.clientId}/${testData.clientCustomerId}`,
    );
    assertTrue(
      response.status === 200,
      'Get paid by customer should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get paid by customer should succeed',
    );
    assertTrue(
      Array.isArray(response.data.invoices),
      'Response should contain invoices array',
    );
    assertTrue(
      response.data.invoices.length >= 1,
      'Should include paid invoices',
    );
  },

  getPaymentReport: async () => {
    const response = await api.get(
      `/business/payment-report/${testData.clientId}`,
    );
    assertTrue(response.status === 200, 'Get report should return 200');
    assertTrue(response.data.success === true, 'Get report should succeed');
    assertTrue(response.data.report, 'Response should contain report');
    assertTrue(response.data.summary, 'Response should contain summary');
    assertTrue(
      response.data.summary.totalPending >= 0,
      'Summary should have totalPending',
    );
  },

  getPurchaseHistory: async () => {
    const response = await api.get(
      `/business/purchase-history/${testData.clientId}?clientCustomerId=${testData.clientCustomerId}`,
    );
    assertTrue(
      response.status === 200,
      'Get purchase history should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get purchase history should succeed',
    );
    assertTrue(
      Array.isArray(response.data.purchaseHistory),
      'Response should contain array',
    );
  },

  getPurchaseHistoryByPhone: async () => {
    const response = await api.get(
      `/business/purchase-history/${testData.clientId}?clientCustomerPhone=${testData.customerPhone}`,
    );
    assertTrue(
      response.status === 200,
      'Get purchase history by phone should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get purchase history should succeed',
    );
  },

  getInvoices: async () => {
    const response = await api.get(`/business/invoices/${testData.clientId}`);
    assertTrue(response.status === 200, 'Get invoices should return 200');
    assertTrue(response.data.success === true, 'Get invoices should succeed');
    assertTrue(
      Array.isArray(response.data.invoices) &&
        response.data.invoices.length >= 2,
      'Response should contain multiple invoices',
    );
  },

  getInvoiceHistoryPerCustomer: async () => {
    const response = await api.get(
      `/business/invoice-history/${testData.clientId}/${testData.clientCustomerId}`,
    );
    assertTrue(
      response.status === 200,
      'Get invoice history per customer should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get invoice history per customer should succeed',
    );
    assertTrue(
      response.data.data.clientCustomer,
      'Response should contain clientCustomer',
    );
    assertTrue(
      Array.isArray(response.data.data.invoices),
      'Response should contain invoices array',
    );
    assertTrue(
      response.data.data.analytics,
      'Response should contain analytics',
    );
    assertTrue(
      response.data.data.analytics.summary,
      'Analytics should contain summary',
    );
    assertTrue(
      response.data.data.analytics.paymentBehavior,
      'Analytics should contain paymentBehavior',
    );
    assertTrue(
      response.data.data.analytics.purchasePatterns,
      'Analytics should contain purchasePatterns',
    );
    assertTrue(
      response.data.data.analytics.timeline,
      'Analytics should contain timeline',
    );
    assertTrue(
      response.data.data.analytics.trends,
      'Analytics should contain trends',
    );
    assertTrue(
      response.data.data.pagination,
      'Response should contain pagination',
    );
  },

  getInvoiceHistoryPerCustomerWithFilters: async () => {
    const startDate = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const endDate = new Date().toISOString();
    const response = await api.get(
      `/business/invoice-history/${testData.clientId}/${testData.clientCustomerId}`,
      {
        params: {
          startDate,
          endDate,
          status: 'all',
          limit: 10,
          offset: 0,
        },
      },
    );
    assertTrue(
      response.status === 200,
      'Get invoice history with filters should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get invoice history with filters should succeed',
    );
    assertEqual(
      response.data.data.pagination.limit,
      10,
      'Pagination limit should match',
    );
  },

  getAllInvoiceHistory: async () => {
    const response = await api.get(
      `/business/invoice-history/${testData.clientId}`,
    );
    assertTrue(
      response.status === 200,
      'Get all invoice history should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get all invoice history should succeed',
    );
    assertTrue(
      Array.isArray(response.data.data.invoices),
      'Response should contain invoices array',
    );
    assertTrue(
      response.data.data.analytics,
      'Response should contain analytics',
    );
    assertTrue(
      response.data.data.analytics.summary,
      'Analytics should contain summary',
    );
    assertTrue(
      typeof response.data.data.analytics.summary.totalBusinessValue ===
        'number',
      'Summary should contain totalBusinessValue',
    );
    assertTrue(
      response.data.data.analytics.paymentBehavior,
      'Analytics should contain paymentBehavior',
    );
    assertTrue(
      response.data.data.analytics.purchasePatterns,
      'Analytics should contain purchasePatterns',
    );
    assertTrue(
      Array.isArray(
        response.data.data.analytics.purchasePatterns.frequentlyPurchasedItems,
      ),
      'Purchase patterns should contain frequentlyPurchasedItems',
    );
    assertTrue(
      response.data.data.analytics.timeline,
      'Analytics should contain timeline',
    );
    assertTrue(
      response.data.data.analytics.trends,
      'Analytics should contain trends',
    );
    assertTrue(
      Array.isArray(response.data.data.analytics.trends.monthlyRevenue),
      'Trends should contain monthlyRevenue array',
    );
    assertTrue(
      response.data.data.pagination,
      'Response should contain pagination',
    );
  },

  getAllInvoiceHistoryWithFilters: async () => {
    const response = await api.get(
      `/business/invoice-history/${testData.clientId}`,
      {
        params: {
          status: 'finalized',
          limit: 20,
          offset: 0,
        },
      },
    );
    assertTrue(
      response.status === 200,
      'Get all invoice history with filters should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get all invoice history with filters should succeed',
    );
    assertEqual(
      response.data.data.pagination.limit,
      20,
      'Pagination limit should match',
    );
  },

  getPaymentHistoryPerInvoice: async () => {
    const response = await api.get(
      `/business/payment-history/${testData.clientId}/${testData.invoiceId}`,
    );
    assertTrue(
      response.status === 200,
      'Get payment history per invoice should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get payment history per invoice should succeed',
    );
    assertTrue(response.data.data.invoice, 'Response should contain invoice');
    assertTrue(
      Array.isArray(response.data.data.payments),
      'Response should contain payments array',
    );
    assertTrue(
      response.data.data.analytics,
      'Response should contain analytics',
    );
    assertTrue(
      response.data.data.analytics.paymentSummary,
      'Analytics should contain paymentSummary',
    );
    assertTrue(
      response.data.data.analytics.paymentTimeline,
      'Analytics should contain paymentTimeline',
    );
    assertTrue(
      response.data.data.analytics.paymentMethodBreakdown,
      'Analytics should contain paymentMethodBreakdown',
    );
    assertTrue(
      response.data.data.analytics.paymentPattern,
      'Analytics should contain paymentPattern',
    );
    assertTrue(
      Array.isArray(response.data.data.analytics.milestones),
      'Analytics should contain milestones array',
    );
    assertTrue(
      response.data.data.analytics.insights,
      'Analytics should contain insights',
    );
    assertTrue(
      Array.isArray(response.data.data.analytics.insights.recommendations),
      'Insights should contain recommendations array',
    );
  },

  getAllPaymentHistory: async () => {
    const response = await api.get(
      `/business/payment-history/${testData.clientId}`,
    );
    assertTrue(
      response.status === 200,
      'Get all payment history should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get all payment history should succeed',
    );
    assertTrue(
      Array.isArray(response.data.data.payments),
      'Response should contain payments array',
    );
    assertTrue(
      response.data.data.analytics,
      'Response should contain analytics',
    );
    assertTrue(
      response.data.data.analytics.paymentSummary,
      'Analytics should contain paymentSummary',
    );
    assertTrue(
      typeof response.data.data.analytics.paymentSummary.totalPayments ===
        'number',
      'Payment summary should contain totalPayments',
    );
    assertTrue(
      typeof response.data.data.analytics.paymentSummary.totalAmountPaid ===
        'number',
      'Payment summary should contain totalAmountPaid',
    );
    assertTrue(
      typeof response.data.data.analytics.paymentSummary.fullyPaidInvoices ===
        'number',
      'Payment summary should contain fullyPaidInvoices',
    );
    assertTrue(
      response.data.data.analytics.paymentTimeline,
      'Analytics should contain paymentTimeline',
    );
    assertTrue(
      response.data.data.analytics.paymentMethodBreakdown,
      'Analytics should contain paymentMethodBreakdown',
    );
    assertTrue(
      response.data.data.analytics.trends,
      'Analytics should contain trends',
    );
    assertTrue(
      Array.isArray(response.data.data.analytics.trends.monthlyPayments),
      'Trends should contain monthlyPayments array',
    );
    assertTrue(
      response.data.data.analytics.insights,
      'Analytics should contain insights',
    );
    assertTrue(
      Array.isArray(response.data.data.analytics.insights.recommendations),
      'Insights should contain recommendations array',
    );
  },

  getDashboardSummary: async () => {
    const response = await api.get('/dashboard/summary');
    assertTrue(response.status === 200, 'Dashboard summary should return 200');
    assertTrue(
      typeof response.data.totalSales === 'number',
      'Summary should include totalSales',
    );
    assertTrue(
      typeof response.data.pendingAmount === 'number',
      'Summary should include pendingAmount',
    );
    assertTrue(
      typeof response.data.pendingInvoices === 'number',
      'Summary should include pendingInvoices',
    );
  },

  getDashboardSalesTrends: async () => {
    const response = await api.get('/dashboard/sales-trends?months=6');
    assertTrue(
      response.status === 200,
      'Dashboard sales trends should return 200',
    );
    assertTrue(
      Array.isArray(response.data),
      'Sales trends should return an array',
    );
    assertEqual(response.data.length, 6, 'Sales trends should have 6 months');
    response.data.forEach((entry) => {
      assertTrue(
        typeof entry.month === 'string',
        'Trend month should be string',
      );
      assertTrue(
        typeof entry.amount === 'number',
        'Trend amount should be number',
      );
    });
  },

  getDashboardTopItems: async () => {
    const response = await api.get('/dashboard/top-items?limit=5');
    assertTrue(
      response.status === 200,
      'Dashboard top items should return 200',
    );
    assertTrue(
      Array.isArray(response.data),
      'Top items should return an array',
    );
    assertTrue(response.data.length >= 1, 'Top items should not be empty');
    response.data.forEach((item) => {
      assertTrue(
        typeof item.itemName === 'string',
        'Item name should be string',
      );
      assertTrue(
        typeof item.quantity === 'number',
        'Item quantity should be number',
      );
      assertTrue(
        typeof item.amount === 'number',
        'Item amount should be number',
      );
    });
  },

  getFullDashboard: async () => {
    const response = await api.get('/dashboard');
    assertTrue(response.status === 200, 'Full dashboard should return 200');
    assertTrue(response.data.summary, 'Full dashboard should include summary');
    assertTrue(
      Array.isArray(response.data.salesTrends),
      'Full dashboard should include salesTrends array',
    );
    assertTrue(
      Array.isArray(response.data.topItems),
      'Full dashboard should include topItems array',
    );
  },

  readyToSync: async () => {
    const response = await api.post('/readytosync');
    assertTrue(response.status === 200, 'Ready-to-sync should return 200');
    assertTrue(response.data.success === true, 'Ready-to-sync should succeed');
    assertEqual(
      response.data.clientId,
      testData.clientId,
      'Ready-to-sync clientId should match',
    );
  },

  createSyncDeleteItem: async () => {
    // Reuse existing dealer (created during item tests) or create a fresh one
    if (!testData.dealerId) {
      const dealerResponse = await api.post('/dealer', {
        clientId: testData.clientId,
        name: 'Sync Dealer',
        contactPerson: 'Sync Dealer Owner',
        phoneNumber: '9876511111',
        email: 'sync-dealer@example.com',
        address: 'Sync Dealer Street',
      });
      assertTrue(
        dealerResponse.status === 201,
        'Create dealer for sync delete item should return 201',
      );
      assertTrue(
        dealerResponse.data.success === true,
        'Create dealer for sync delete item should succeed',
      );
      testData.dealerId = dealerResponse.data.dealer._id;
    }

    const response = await api.post('/business/items', {
      clientId: testData.clientId,
      name: 'Sync Delete Item',
      price: 75,
      dealerIds: [testData.dealerId],
      unit: 'nos',
      description: 'Item to delete via sync',
    });
    assertTrue(
      response.status === 201,
      'Create sync delete item should return 201',
    );
    testData.syncDeleteItemId = response.data.item._id;
    created.items.push(testData.syncDeleteItemId);
  },

  syncOfflineData: async () => {
    testData.syncInvoiceNumber = `SYNC-${Date.now()}`;
    const syncPayload = {
      item: {
        create: [
          {
            name: 'Sync Created Item',
            price: 210,
            dealerIds: [testData.dealerId],
            stock: 15,
            unit: 'nos',
            description: 'Created via sync',
          },
        ],
        update: [
          {
            _id: testData.itemId,
            price: 130,
            stock: 25,
          },
        ],
        delete: [testData.syncDeleteItemId],
      },
      invoice: {
        create: [
          {
            invoiceNumber: testData.syncInvoiceNumber,
            clientCustomerId: testData.clientCustomerId,
            clientCustomerName: 'Sync Customer',
            clientCustomerPhone: testData.customerPhone,
            products: [
              {
                productId: testData.itemId,
                itemName: 'Test Item',
                quantity: 2,
                costPerUnit: 130,
                itemGroup: 'Synced Group',
              },
            ],
            subtotal: 260,
            totalAmount: 260,
            paidAmount: 0,
            notes: 'Offline sync invoice',
          },
        ],
      },
      payment: {
        create: [
          {
            invoiceId: testData.pendingInvoiceId,
            amount: 50,
            method: 'cash',
            note: 'Offline payment',
            paidAt: new Date().toISOString(),
          },
        ],
      },
    };

    const response = await api.post('/sync', syncPayload);
    assertTrue(response.status === 200, 'Sync should return 200');
    assertTrue(response.data.success === true, 'Sync should succeed');
    assertEqual(
      response.data.message,
      'Sync completed successfully',
      'Sync response message should match',
    );
    assertTrue(response.data.summary, 'Sync response should include summary');
    assertTrue(response.data.synced, 'Sync response should include synced');
    assertTrue(response.data.data, 'Sync response should include data');
    assertTrue(
      Array.isArray(response.data.data.itemGroups),
      'Sync response should include itemGroups array',
    );
    assertTrue(
      Array.isArray(response.data.data.items),
      'Sync response should include items array',
    );
    assertTrue(
      Array.isArray(response.data.data.clientCustomers),
      'Sync response should include clientCustomers array',
    );
    assertTrue(
      Array.isArray(response.data.data.invoices),
      'Sync response should include invoices array',
    );
    assertTrue(
      Array.isArray(response.data.data.payments),
      'Sync response should include payments array',
    );
    assertTrue(
      Array.isArray(response.data.data.purchaseHistory),
      'Sync response should include purchaseHistory array',
    );
    assertTrue(
      Array.isArray(response.data.synced.itemsCreated),
      'Synced itemsCreated should be array',
    );
    assertTrue(
      Array.isArray(response.data.synced.itemsUpdated),
      'Synced itemsUpdated should be array',
    );
    assertTrue(
      Array.isArray(response.data.synced.itemsDeleted),
      'Synced itemsDeleted should be array',
    );
    assertTrue(
      Array.isArray(response.data.synced.invoicesCreated),
      'Synced invoicesCreated should be array',
    );
    assertTrue(
      Array.isArray(response.data.synced.paymentsCreated),
      'Synced paymentsCreated should be array',
    );
    assertEqual(
      response.data.synced.itemsCreated.length,
      response.data.summary.itemsCreated,
      'Synced itemsCreated count should match summary',
    );
    assertEqual(
      response.data.synced.itemsUpdated.length,
      response.data.summary.itemsUpdated,
      'Synced itemsUpdated count should match summary',
    );
    assertEqual(
      response.data.synced.itemsDeleted.length,
      response.data.summary.itemsDeleted,
      'Synced itemsDeleted count should match summary',
    );
    assertEqual(
      response.data.synced.invoicesCreated.length,
      response.data.summary.invoicesCreated,
      'Synced invoicesCreated count should match summary',
    );
    assertEqual(
      response.data.synced.paymentsCreated.length,
      response.data.summary.paymentsCreated,
      'Synced paymentsCreated count should match summary',
    );

    const deletedItem = response.data.data.items.find(
      (item) =>
        item._id === testData.syncDeleteItemId ||
        item.productId === testData.syncDeleteItemId,
    );
    assertTrue(Boolean(deletedItem), 'Deleted item should be in sync data');
    assertTrue(
      deletedItem?.isActive === false,
      'Deleted item should be inactive in sync data',
    );

    const syncedItem = response.data.data.items.find(
      (item) => item.name === 'Sync Created Item',
    );
    if (syncedItem?._id) {
      created.items.push(syncedItem._id);
    }
    const syncedInvoice = response.data.data.invoices.find(
      (invoice) => invoice.invoiceNumber === testData.syncInvoiceNumber,
    );
    if (syncedInvoice?._id) {
      created.invoices.push(syncedInvoice._id);
    }
  },

  // ============================================================================
  // DEALER MODULE TESTS (Internal supplier)
  // ============================================================================
  getDealers: async () => {
    const response = await api.get(`/dealer/${testData.clientId}`);
    assertTrue(response.status === 200, 'Get dealers should return 200');
    assertTrue(response.data.success === true, 'Get dealers should succeed');
    assertTrue(
      Array.isArray(response.data.dealers),
      'Get dealers should return array',
    );
  },

  createDealerToDelete: async () => {
    const response = await api.post('/dealer', {
      clientId: testData.clientId,
      name: 'Temp Dealer To Delete',
      contactPerson: 'Temp Owner',
      phoneNumber: '9876511111',
      email: 'tempdealer@example.com',
      address: 'Temp Dealer Street',
    });
    assertTrue(response.status === 201, 'Create temp dealer should return 201');
    testData.deletableDealerId = response.data.dealer._id;
  },

  updateDealer: async () => {
    const response = await api.put(
      `/dealer/${testData.clientId}/${testData.deletableDealerId}`,
      {
        name: 'Updated Dealer Name',
        contactPerson: 'Updated Owner',
        address: 'Updated Dealer Address',
      },
    );
    assertTrue(response.status === 200, 'Update dealer should return 200');
    assertTrue(response.data.success === true, 'Update dealer should succeed');
    assertEqual(
      response.data.dealer.name,
      'Updated Dealer Name',
      'Dealer name should be updated',
    );
    assertEqual(
      response.data.dealer.address,
      'Updated Dealer Address',
      'Dealer address should be updated',
    );
  },

  deleteDealer: async () => {
    const response = await api.delete(
      `/dealer/${testData.clientId}/${testData.deletableDealerId}`,
    );
    assertTrue(response.status === 200, 'Delete dealer should return 200');
    assertTrue(response.data.success === true, 'Delete dealer should succeed');
  },

  getDealerItems: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/items`,
    );
    assertTrue(response.status === 200, 'Get dealer items should return 200');
    assertTrue(
      response.data.success === true,
      'Get dealer items should succeed',
    );
    assertTrue(
      Array.isArray(response.data.items),
      'Get dealer items should return array',
    );
  },

  getDealerLowStockItems: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/items/low-stock`,
    );
    assertTrue(
      response.status === 200,
      'Get dealer low stock items should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get dealer low stock items should succeed',
    );
    assertTrue(
      Array.isArray(response.data.items),
      'Get dealer low stock items should return array',
    );
  },

  getDealerOrderRecommendations: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/orders/recommendations`,
    );
    assertTrue(
      response.status === 200,
      'Get dealer recommendations should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get dealer recommendations should succeed',
    );
    assertTrue(
      Array.isArray(response.data.recommendations),
      'Recommendations should be array',
    );
  },

  createDealerOrderMissingItems: async () => {
    let failed = false;
    try {
      await api.post('/dealer/orders', {
        clientId: testData.clientId,
        dealerId: testData.dealerId,
        items: [],
      });
    } catch (error) {
      failed = Boolean(error.response && error.response.status >= 400);
    }
    assertTrue(
      failed,
      'Create dealer order without items should fail with validation error',
    );
  },

  createDealerOrder: async () => {
    const response = await api.post('/dealer/orders', {
      clientId: testData.clientId,
      dealerId: testData.dealerId,
      items: [
        {
          itemId: testData.itemId,
          quantity: 10,
        },
      ],
      isUrgent: true,
      deliveryInstructions: 'Back gate, before 5 PM',
      notes: 'Test dealer order',
    });
    assertTrue(
      response.status === 201,
      'Create dealer order should return 201',
    );
    assertTrue(
      response.data.success === true,
      'Create dealer order should succeed',
    );
    assertTrue(response.data.order._id, 'Dealer order should have id');
    assertTrue(
      response.data.order.isUrgent === true,
      'Dealer order should be urgent',
    );
    testData.dealerOrderId = response.data.order._id;
  },

  getDealerOrders: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/orders`,
    );
    assertTrue(response.status === 200, 'Get dealer orders should return 200');
    assertTrue(
      response.data.success === true,
      'Get dealer orders should succeed',
    );
    assertTrue(
      Array.isArray(response.data.orders),
      'Get dealer orders should return array',
    );
  },

  getDealerOrderById: async () => {
    const response = await api.get(`/dealer/orders/${testData.dealerOrderId}`, {
      params: { clientId: testData.clientId },
    });
    assertTrue(
      response.status === 200,
      'Get dealer order by id should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get dealer order by id should succeed',
    );
    assertEqual(
      response.data.order._id,
      testData.dealerOrderId,
      'Dealer order id should match',
    );
  },

  markDealerOrderDelivered: async () => {
    const response = await api.post(
      `/dealer/orders/${testData.dealerOrderId}/mark-delivered`,
      {
        clientId: testData.clientId,
        deliveredBy: 'Store Staff',
        deliveryNote: 'All items received',
        totalAmount: 5000,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    );
    assertTrue(
      response.status === 200,
      'Mark dealer order delivered should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Mark dealer order delivered should succeed',
    );
    assertEqual(
      response.data.order.status,
      'delivered',
      'Dealer order status should be delivered',
    );
    assertEqual(
      response.data.order.totalAmount,
      5000,
      'Dealer order totalAmount should be set',
    );
  },

  cancelDeliveredDealerOrderShouldFail: async () => {
    let failed = false;
    try {
      await api.post(`/dealer/orders/${testData.dealerOrderId}/cancel`, {
        clientId: testData.clientId,
      });
    } catch (error) {
      failed = Boolean(error.response && error.response.status >= 400);
    }
    assertTrue(
      failed,
      'Cancelling a delivered dealer order should fail with validation error',
    );
  },

  createDealerOrderToCancel: async () => {
    const response = await api.post('/dealer/orders', {
      clientId: testData.clientId,
      dealerId: testData.dealerId,
      items: [
        {
          itemId: testData.itemId,
          quantity: 5,
        },
      ],
      notes: 'Order to be cancelled',
    });
    assertTrue(
      response.status === 201,
      'Create dealer order to cancel should return 201',
    );
    testData.dealerOrderToCancel = response.data.order._id;
  },

  cancelDealerOrder: async () => {
    const response = await api.post(
      `/dealer/orders/${testData.dealerOrderToCancel}/cancel`,
      {
        clientId: testData.clientId,
        reason: 'Test cancellation reason',
      },
    );
    assertTrue(
      response.status === 200,
      'Cancel dealer order should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Cancel dealer order should succeed',
    );
    assertEqual(
      response.data.order.status,
      'cancelled',
      'Cancelled order status should be cancelled',
    );
  },

  createDealerPaymentInvalidAmount: async () => {
    let failed = false;
    try {
      await api.post('/dealer/payments', {
        clientId: testData.clientId,
        dealerId: testData.dealerId,
        amount: 0,
      });
    } catch (error) {
      failed = Boolean(error.response && error.response.status >= 400);
    }
    assertTrue(
      failed,
      'Create dealer payment with non-positive amount should fail',
    );
  },

  createDealerPayment: async () => {
    // Link payment to the delivered order to create a partial payment (1000 of 5000)
    const response = await api.post('/dealer/payments', {
      clientId: testData.clientId,
      dealerId: testData.dealerId,
      orderId: testData.dealerOrderId, // Link to delivered order
      amount: 1000,
      method: 'bank',
      note: 'Partial payment for order',
      proofUrl: 'https://example.com/payment-proof.jpg',
    });
    assertTrue(
      response.status === 201,
      'Create dealer payment should return 201',
    );
    assertTrue(
      response.data.success === true,
      'Create dealer payment should succeed',
    );
    assertTrue(response.data.payment._id, 'Dealer payment should have id');
    assertEqual(
      response.data.payment.amount,
      1000,
      'Payment amount should match',
    );
    assertEqual(
      response.data.payment.method,
      'bank',
      'Payment method should match',
    );
    assertEqual(
      response.data.payment.note,
      'Partial payment for order',
      'Payment note should match',
    );
    assertEqual(
      response.data.payment.proofUrl,
      'https://example.com/payment-proof.jpg',
      'Payment proofUrl should match',
    );
    assertTrue(
      response.data.payment.paidAt,
      'Payment should have paidAt timestamp',
    );
    testData.dealerPaymentId = response.data.payment._id;
  },

  createDealerPaymentNegativeAmount: async () => {
    let failed = false;
    try {
      await api.post('/dealer/payments', {
        clientId: testData.clientId,
        dealerId: testData.dealerId,
        amount: -500,
      });
    } catch (error) {
      failed = Boolean(error.response && error.response.status >= 400);
    }
    assertTrue(
      failed,
      'Create dealer payment with negative amount should fail',
    );
  },

  createDealerPaymentMissingDealer: async () => {
    let failed = false;
    try {
      await api.post('/dealer/payments', {
        clientId: testData.clientId,
        amount: 500,
      });
    } catch (error) {
      failed = Boolean(error.response && error.response.status >= 400);
    }
    assertTrue(failed, 'Create dealer payment without dealerId should fail');
  },

  getDealerPayments: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/payments`,
    );
    assertTrue(
      response.status === 200,
      'Get dealer payments should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get dealer payments should succeed',
    );
    assertTrue(
      Array.isArray(response.data.payments),
      'Get dealer payments should return array',
    );
    assertTrue(
      response.data.payments.length >= 1,
      'Should have at least one payment',
    );
    // Verify payment structure
    const payment = response.data.payments.find(
      (p) => p._id === testData.dealerPaymentId,
    );
    assertTrue(payment, 'Created payment should be in the list');
    assertEqual(payment.amount, 1000, 'Payment amount should match');
    assertEqual(payment.method, 'bank', 'Payment method should match');
    assertEqual(
      payment.proofUrl,
      'https://example.com/payment-proof.jpg',
      'Payment proofUrl should be returned',
    );
  },

  getDealerSummary: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/summary`,
    );
    assertTrue(response.status === 200, 'Dealer summary should return 200');
    assertTrue(response.data.success === true, 'Dealer summary should succeed');
    assertTrue(
      typeof response.data.totalOrdered === 'number',
      'Dealer summary should include totalOrdered',
    );
    assertTrue(
      typeof response.data.totalPaid === 'number',
      'Dealer summary should include totalPaid',
    );
    assertTrue(
      typeof response.data.payable === 'number',
      'Dealer summary should include payable',
    );
    assertTrue(
      Array.isArray(response.data.timeline),
      'Dealer summary should include timeline array',
    );
    // Verify payable calculation: payable = totalOrdered - totalPaid
    assertEqual(
      response.data.payable,
      Math.max(response.data.totalOrdered - response.data.totalPaid, 0),
      'Payable should equal totalOrdered - totalPaid (min 0)',
    );
    // totalOrdered should include the 5000 from delivered order with totalAmount
    assertTrue(
      response.data.totalOrdered >= 5000,
      'Total ordered should include delivered order totalAmount',
    );
  },

  getDealerTransactions: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/transactions`,
      { params: { limit: 50, skip: 0 } },
    );
    assertTrue(
      response.status === 200,
      'Get dealer transactions should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get dealer transactions should succeed',
    );
    assertTrue(
      response.data.dealer,
      'Get dealer transactions should include dealer info',
    );
    assertTrue(response.data.dealer._id, 'Dealer info should include _id');
    assertTrue(response.data.dealer.name, 'Dealer info should include name');
    assertTrue(
      typeof response.data.totalCount === 'number',
      'Get dealer transactions should include totalCount',
    );
    assertTrue(
      Array.isArray(response.data.transactions),
      'Get dealer transactions should return transactions array',
    );
    assertTrue(
      response.data.transactions.length >= 1,
      'Should have at least 1 transaction',
    );
    // Verify both order and payment transactions exist
    const orders = response.data.transactions.filter((t) => t.type === 'order');
    const payments = response.data.transactions.filter(
      (t) => t.type === 'payment',
    );
    assertTrue(
      orders.length >= 1,
      'Should have at least one order transaction',
    );
    assertTrue(
      payments.length >= 1,
      'Should have at least one payment transaction',
    );
    // Verify order transaction structure
    const orderTx = orders[0];
    assertTrue(orderTx.transactionId, 'Order should have transactionId');
    assertTrue(orderTx.dealerId, 'Order should have dealerId');
    assertTrue(orderTx.dealerName, 'Order should have dealerName');
    assertTrue(orderTx.orderNumber, 'Order should have orderNumber');
    // amount can be null if totalAmount not set on order
    assertTrue(
      orderTx.amount === null || typeof orderTx.amount === 'number',
      'Order amount should be number or null',
    );
    assertTrue(orderTx.status, 'Order should have status');
    assertTrue(orderTx.date, 'Order should have date');
    assertTrue(orderTx.details, 'Order should have details object');
    // Verify payment transaction structure
    const paymentTx = payments[0];
    assertTrue(paymentTx.transactionId, 'Payment should have transactionId');
    assertTrue(paymentTx.dealerId, 'Payment should have dealerId');
    assertTrue(paymentTx.dealerName, 'Payment should have dealerName');
    assertTrue(
      typeof paymentTx.amount === 'number',
      'Payment should have amount',
    );
    assertTrue(paymentTx.method, 'Payment should have method');
    assertTrue(paymentTx.date, 'Payment should have date');
    assertTrue(paymentTx.details, 'Payment should have details object');
    // Verify proofUrl is in payment details
    assertTrue(
      paymentTx.details.proofUrl !== undefined,
      'Payment details should include proofUrl field',
    );
  },

  getDealerTransactionsPagination: async () => {
    // Test pagination with limit=1
    const response = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/transactions`,
      { params: { limit: 1, skip: 0 } },
    );
    assertTrue(
      response.status === 200,
      'Paginated dealer transactions should return 200',
    );
    assertTrue(
      response.data.transactions.length <= 1,
      'Should respect limit parameter',
    );
    assertTrue(
      response.data.totalCount >= 1,
      'Total count should reflect all transactions regardless of limit',
    );
    // Test skip
    const response2 = await api.get(
      `/dealer/${testData.clientId}/${testData.dealerId}/transactions`,
      { params: { limit: 10, skip: 1 } },
    );
    assertTrue(
      response2.status === 200,
      'Skipped dealer transactions should return 200',
    );
  },

  getAllDealerTransactions: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/transactions`,
      { params: { limit: 50, skip: 0 } },
    );
    assertTrue(
      response.status === 200,
      'Get all dealer transactions should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get all dealer transactions should succeed',
    );
    assertTrue(
      response.data.summary,
      'Get all dealer transactions should include summary',
    );
    assertTrue(
      typeof response.data.summary.totalDealers === 'number',
      'Summary should include totalDealers',
    );
    assertTrue(
      response.data.summary.totalDealers >= 1,
      'Should have at least 1 dealer',
    );
    assertTrue(
      typeof response.data.summary.totalOrders === 'number',
      'Summary should include totalOrders (sum of totalAmount from orders)',
    );
    // totalOrders is now sum of totalAmount, should be >= 5000 from our delivered order
    assertTrue(
      response.data.summary.totalOrders >= 5000,
      'Total orders should include delivered order totalAmount',
    );
    assertTrue(
      typeof response.data.summary.totalPayments === 'number',
      'Summary should include totalPayments',
    );
    assertTrue(
      response.data.summary.totalPayments > 0,
      'Total payments should be greater than 0',
    );
    assertTrue(
      typeof response.data.summary.pendingPayable === 'number',
      'Summary should include pendingPayable',
    );
    // Verify pendingPayable calculation
    assertEqual(
      response.data.summary.pendingPayable,
      Math.max(
        response.data.summary.totalOrders - response.data.summary.totalPayments,
        0,
      ),
      'Pending payable should equal totalOrders - totalPayments (min 0)',
    );
    assertTrue(
      typeof response.data.totalCount === 'number',
      'Get all dealer transactions should include totalCount',
    );
    assertTrue(
      response.data.totalCount >= 1,
      'Should have at least 1 transaction total',
    );
    assertTrue(
      Array.isArray(response.data.transactions),
      'Get all dealer transactions should return transactions array',
    );
    // Verify transactions are sorted by date (newest first)
    if (response.data.transactions.length >= 2) {
      const firstDate = new Date(response.data.transactions[0].date);
      const secondDate = new Date(response.data.transactions[1].date);
      assertTrue(
        firstDate >= secondDate,
        'Transactions should be sorted by date descending',
      );
    }
  },

  getAllDealerTransactionsPagination: async () => {
    // Test pagination
    const response = await api.get(
      `/dealer/${testData.clientId}/transactions`,
      { params: { limit: 1, skip: 0 } },
    );
    assertTrue(
      response.status === 200,
      'Paginated all dealer transactions should return 200',
    );
    assertTrue(
      response.data.transactions.length <= 1,
      'Should respect limit parameter',
    );
    assertTrue(
      response.data.totalCount >= 1,
      'Total count should reflect all transactions',
    );
  },

  // ===================== ORDER PAYMENT STATUS QUERIES =====================

  getOrderPaymentsAll: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/order-payments`,
      { params: { status: 'all' } },
    );
    assertTrue(
      response.status === 200,
      'Get order payments (all) should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get order payments (all) should succeed',
    );
    assertTrue(response.data.summary, 'Response should include summary');
    assertTrue(
      typeof response.data.summary.totalOrders === 'number',
      'Summary should include totalOrders',
    );
    assertTrue(
      typeof response.data.summary.pendingOrders === 'number',
      'Summary should include pendingOrders',
    );
    assertTrue(
      typeof response.data.summary.partialOrders === 'number',
      'Summary should include partialOrders',
    );
    assertTrue(
      typeof response.data.summary.paidOrders === 'number',
      'Summary should include paidOrders',
    );
    assertTrue(
      typeof response.data.summary.noBillOrders === 'number',
      'Summary should include noBillOrders',
    );
    assertTrue(
      typeof response.data.summary.totalAmount === 'number',
      'Summary should include totalAmount',
    );
    assertTrue(
      typeof response.data.summary.totalPaid === 'number',
      'Summary should include totalPaid',
    );
    assertTrue(
      typeof response.data.summary.totalRemaining === 'number',
      'Summary should include totalRemaining',
    );
    assertTrue(
      Array.isArray(response.data.orders),
      'Response should include orders array',
    );
    // Verify order structure
    if (response.data.orders.length > 0) {
      const order = response.data.orders[0];
      assertTrue(order._id, 'Order should have _id');
      assertTrue(order.orderNumber, 'Order should have orderNumber');
      assertTrue(order.paymentStatus, 'Order should have paymentStatus');
      assertTrue(
        ['pending', 'partial', 'paid', 'no-bill'].includes(order.paymentStatus),
        'Payment status should be valid',
      );
      assertTrue(
        typeof order.totalPaid === 'number',
        'Order should have totalPaid',
      );
      assertTrue(
        typeof order.remaining === 'number',
        'Order should have remaining',
      );
    }
  },

  getOrderPaymentsPending: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/order-payments`,
      { params: { status: 'pending' } },
    );
    assertTrue(
      response.status === 200,
      'Get order payments (pending) should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get order payments (pending) should succeed',
    );
    // All returned orders should have paymentStatus = 'pending'
    response.data.orders.forEach((order) => {
      assertEqual(
        order.paymentStatus,
        'pending',
        `Order ${order.orderNumber} should be pending`,
      );
    });
  },

  getOrderPaymentsPartial: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/order-payments`,
      { params: { status: 'partial' } },
    );
    assertTrue(
      response.status === 200,
      'Get order payments (partial) should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get order payments (partial) should succeed',
    );
    // All returned orders should have paymentStatus = 'partial'
    response.data.orders.forEach((order) => {
      assertEqual(
        order.paymentStatus,
        'partial',
        `Order ${order.orderNumber} should be partial`,
      );
      assertTrue(order.totalPaid > 0, 'Partial order should have some payment');
      assertTrue(order.remaining > 0, 'Partial order should have remaining');
    });
    // We made a partial payment, so should have at least one partial order
    assertTrue(
      response.data.orders.length >= 1,
      'Should have at least one partial order after payment',
    );
  },

  getOrderPaymentsPaid: async () => {
    const response = await api.get(
      `/dealer/${testData.clientId}/order-payments`,
      { params: { status: 'paid' } },
    );
    assertTrue(
      response.status === 200,
      'Get order payments (paid) should return 200',
    );
    assertTrue(
      response.data.success === true,
      'Get order payments (paid) should succeed',
    );
    // All returned orders should have paymentStatus = 'paid'
    response.data.orders.forEach((order) => {
      assertEqual(
        order.paymentStatus,
        'paid',
        `Order ${order.orderNumber} should be paid`,
      );
      assertEqual(order.remaining, 0, 'Paid order should have zero remaining');
    });
  },

  logoutClient: async () => {
    const response = await api.post('/auth/logout', {
      clientId: testData.clientId,
      deviceSessionId: testData.deviceSessionId,
    });
    assertTrue(response.status === 200, 'Logout should return 200');
    assertTrue(response.data.success === true, 'Logout should succeed');
    setAuthToken(null);
  },
};

const printReportSummary = () => {
  const duration = ((report.endTime - report.startTime) / 1000).toFixed(2);
  const passPercentage = (
    (report.passedTests / report.totalTests) * 100 || 0
  ).toFixed(2);
  console.log(
    '\n' + chalk.cyan('═══════════════════════════════════════════════════'),
  );
  console.log(chalk.cyan('TEST REPORT SUMMARY'));
  console.log(
    chalk.cyan('═══════════════════════════════════════════════════'),
  );
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(chalk.green(`✅ Passed: ${report.passedTests}`));
  console.log(chalk.red(`❌ Failed: ${report.failedTests}`));
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Pass Rate: ${passPercentage}%`);
  console.log(
    chalk.cyan('═══════════════════════════════════════════════════\n'),
  );
};

const runAllTests = async () => {
  report.startTime = new Date();
  log('Starting Viveka Backend API Test Suite', 'section');
  log(`Mode: ${IS_LOCAL ? 'LOCAL' : 'CLOUD'}`, 'info');
  log(`Base URL: ${BASE_URL}`, 'info');
  log(`Test Phone: ${testData.phoneNumber}`, 'info');
  log(`DB Cleanup: ${ENABLE_DB_CLEANUP ? 'ENABLED' : 'DISABLED'}`, 'info');
  let fatalError = null;
  try {
    if (IS_LOCAL) {
      await startLocalServer();
    }
    await waitForHealth();
    log('Running API Tests', 'section');
    await test('1. Send OTP (register)', tests.sendOTPForRegister);
    await test('2. Register Client', tests.registerClient);
    await test('3. Send OTP (login)', tests.sendOTPForLogin);
    await test('4. Login Client', tests.loginClient);
    await test('5. Update Client Info', tests.updateClientInfo);
    await test('6. Get Client Details', tests.getClientDetails);
    await test(
      '6a. Update Client Customer Field Settings',
      tests.updateClientCustomerFieldSettings,
    );
    await test(
      '6b. Create Client Customer (Missing Enabled Fields)',
      tests.createClientCustomerMissingEnabledFields,
    );
    await test(
      '6c. Create Client Customer (With Enabled Fields)',
      tests.createClientCustomerWithEnabledFields,
    );
    await test(
      '6d. Reset Client Customer Field Settings',
      tests.resetClientCustomerFieldSettings,
    );
    await test(
      '6e. Create Client Customer With Empty Disabled Fields (Bug Fix Test)',
      tests.createClientCustomerWithEmptyDisabledFields,
    );
    await test('7. Create Item Group', tests.createItemGroup);
    await test('8. Update Item Group', tests.updateItemGroup);
    await test('9. Create Temp Item Group', tests.createItemGroupToDelete);
    await test('10. Delete Temp Item Group', tests.deleteItemGroup);
    await test('11. Get Item Groups', tests.getItemGroups);
    await test('12. Create Item', tests.createItem);
    await test(
      '13. Create Item Without Dealers (optional)',
      tests.createItemWithoutDealers,
    );
    await test(
      '14. Create Item With Empty Dealer Array',
      tests.createItemWithEmptyDealerArray,
    );
    await test(
      '15. Create Item With Invalid Dealer (should fail)',
      tests.createItemWithInvalidDealer,
    );
    await test(
      '16. Create Item With Multiple Dealers',
      tests.createItemWithMultipleDealers,
    );
    await test('17. Update Item', tests.updateItem);
    await test('18. Get Items', tests.getItems);
    await test('19. Get Items By Group', tests.getItemsByGroup);
    await test('20. Create Temp Item', tests.createItemToDelete);
    await test('21. Delete Temp Item', tests.deleteItem);
    await test('22. Create Client Customer', tests.getOrCreateCustomer);
    await test(
      '23. Update Client Customer Address',
      tests.updateCustomerAddress,
    );
    await test('24. Get Client Customers', tests.getCustomers); 
    await test(
      '25. Create Temp Client Customer',
      tests.createClientCustomerToDelete,
    );
    await test('26. Update Client Customer', tests.updateClientCustomer);
    await test('27B. Delete Client Customer', tests.deleteClientCustomer);

    await test('27. Create Cart', tests.createCart);
    await test('28. Add To Cart', tests.addToCart);
    await test('29. Get Cart', tests.getCart);
    await test('30. Remove From Cart', tests.removeFromCart);
    await test('31. Clear Cart', tests.clearCart);
    await test('32. Create Cart For Invoice', tests.createCartForInvoice);
    await test('33. Generate Invoice (unpaid)', tests.generateInvoice);
    await test(
      '34. Generate Invoice With Products',
      tests.generateInvoiceWithProducts,
    );
    await test('35. Record Payment 1', tests.recordPayment1);
    await test('36. Record Payment 2', tests.recordPayment2);
    await test('37. Get Payments For Invoice', tests.getPaymentsForInvoice);
    await test('38. Create Pending Invoice', tests.createPendingInvoice);
    await test('39. Get Pending Invoices', tests.getPendingInvoices);
    await test(
      '40. Get Pending Invoices By Customer',
      tests.getPendingInvoicesByClientCustomer,
    );
    await test(
      '41. Get Paid Invoices By Customer',
      tests.getPaidInvoicesByClientCustomer,
    );
    await test('42. Get Payment Report', tests.getPaymentReport);
    await test('43. Get Purchase History', tests.getPurchaseHistory);
    await test(
      '44. Get Purchase History By Phone',
      tests.getPurchaseHistoryByPhone,
    );
    await test('45. Get All Invoices', tests.getInvoices);
    await test(
      '46. Get Invoice History (Per Customer)',
      tests.getInvoiceHistoryPerCustomer,
    );
    await test(
      '47. Get Invoice History (Per Customer with Filters)',
      tests.getInvoiceHistoryPerCustomerWithFilters,
    );
    await test('48. Get All Invoice History', tests.getAllInvoiceHistory);
    await test(
      '49. Get All Invoice History (with Filters)',
      tests.getAllInvoiceHistoryWithFilters,
    );
    await test(
      '50. Get Payment History (Per Invoice)',
      tests.getPaymentHistoryPerInvoice,
    );
    await test('51. Get All Payment History', tests.getAllPaymentHistory);
    await test('52. Get Dashboard Summary', tests.getDashboardSummary);
    await test('53. Get Dashboard Sales Trends', tests.getDashboardSalesTrends);
    await test('54. Get Dashboard Top Items', tests.getDashboardTopItems);
    await test('55. Get Full Dashboard', tests.getFullDashboard);
    await test('56. Ready To Sync', tests.readyToSync);
    await test('57. Create Sync Delete Item', tests.createSyncDeleteItem);
    await test('58. Sync Offline Data', tests.syncOfflineData);

    // Dealer module tests (internal supplier)
    await test('59. Get Dealers', tests.getDealers);
    await test('60. Create Temp Dealer', tests.createDealerToDelete);
    await test('61. Update Dealer', tests.updateDealer);
    await test('62. Delete Dealer', tests.deleteDealer);
    await test('63. Get Dealer Items', tests.getDealerItems);
    await test('64. Get Dealer Low Stock Items', tests.getDealerLowStockItems);
    await test(
      '65. Get Dealer Order Recommendations',
      tests.getDealerOrderRecommendations,
    );
    await test(
      '66. Create Dealer Order (Missing Items) should fail',
      tests.createDealerOrderMissingItems,
    );
    await test('67. Create Dealer Order', tests.createDealerOrder);
    await test('68. Get Dealer Orders', tests.getDealerOrders);
    await test('69. Get Dealer Order By Id', tests.getDealerOrderById);
    await test(
      '70. Mark Dealer Order Delivered',
      tests.markDealerOrderDelivered,
    );
    await test(
      '71. Cancel Delivered Dealer Order should fail',
      tests.cancelDeliveredDealerOrderShouldFail,
    );
    await test(
      '72. Create Dealer Order To Cancel',
      tests.createDealerOrderToCancel,
    );
    await test('73. Cancel Dealer Order', tests.cancelDealerOrder);
    await test(
      '74. Create Dealer Payment (Invalid Amount) should fail',
      tests.createDealerPaymentInvalidAmount,
    );
    await test('75. Create Dealer Payment', tests.createDealerPayment);
    await test(
      '76. Create Dealer Payment (Negative Amount) should fail',
      tests.createDealerPaymentNegativeAmount,
    );
    await test(
      '77. Create Dealer Payment (Missing Dealer) should fail',
      tests.createDealerPaymentMissingDealer,
    );
    await test('78. Get Dealer Payments', tests.getDealerPayments);
    await test('79. Get Dealer Summary', tests.getDealerSummary);
    await test(
      '80. Get Dealer Transactions (Specific Dealer)',
      tests.getDealerTransactions,
    );
    await test(
      '81. Get Dealer Transactions (Pagination)',
      tests.getDealerTransactionsPagination,
    );
    await test(
      '82. Get All Dealer Transactions',
      tests.getAllDealerTransactions,
    );
    await test(
      '83. Get All Dealer Transactions (Pagination)',
      tests.getAllDealerTransactionsPagination,
    );

    // Order Payment Status Query tests
    await test('84. Get Order Payments (All)', tests.getOrderPaymentsAll);
    await test(
      '85. Get Order Payments (Pending)',
      tests.getOrderPaymentsPending,
    );
    await test(
      '86. Get Order Payments (Partial)',
      tests.getOrderPaymentsPartial,
    );
    await test('87. Get Order Payments (Paid)', tests.getOrderPaymentsPaid);

    await test('88. Logout Client', tests.logoutClient);
  } catch (error) {
    fatalError = error;
    log(`Fatal Error: ${error.message}`, 'error');
  } finally {
    report.endTime = new Date();
    await cleanupCreatedData();
    if (IS_LOCAL) {
      await stopLocalServer();
    }
    printReportSummary();
    if (fatalError) {
      process.exit(1);
    }
    process.exit(report.failedTests > 0 ? 1 : 0);
  }
};

runAllTests().catch((error) => {
  log(`Unhandled error: ${error.message}`, 'error');
  cleanupCreatedData()
    .catch((cleanupError) =>
      log(`Cleanup failure: ${cleanupError.message}`, 'error'),
    )
    .finally(() => process.exit(1));
});
`x`