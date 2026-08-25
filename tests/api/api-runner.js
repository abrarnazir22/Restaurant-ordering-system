const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const Branch = require('../../src/models/Branch');
const AdminUser = require('../../src/models/AdminUser');
const MenuItem = require('../../src/models/MenuItem');
const Customer = require('../../src/models/Customer');

async function runApiTests() {
  console.log('🚀 Starting Automated API Test Suite...\n');
  let mongod = null;
  try {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  } catch (err) {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  }

  const branch = await Branch.createDefaultBranch();
  await AdminUser.createDefaultAdmin();
  await AdminUser.createDefaultChef();
  await AdminUser.createDefaultDelivery();

  const menuItem = await MenuItem.create({
    name: 'Espresso Single',
    description: 'Fresh pulled espresso shot',
    price: 3.50,
    category: 'Hot Coffee',
    image: '/images/Cappuccino.jpeg',
    available: true,
    branchId: branch._id
  });

  const results = { passed: 0, failed: 0, tests: [] };

  function record(name, passed, detail = '') {
    if (passed) {
      results.passed += 1;
      console.log(`  ✅ PASS: ${name}`);
    } else {
      results.failed += 1;
      console.error(`  ❌ FAIL: ${name} — ${detail}`);
    }
    results.tests.push({ name, passed, detail });
  }

  let adminToken = '';
  let customerToken = '';
  let customerId = '';

  try {
    // 1. Positive: Health endpoint
    const resHealth = await request(app).get('/api/health');
    record('GET /api/health returns 200 with status info', resHealth.status === 200 && resHealth.body.status === 'healthy');

    // 2. Positive: Admin Login
    const resAdminLogin = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'ember2024',
      role: 'admin'
    });
    adminToken = resAdminLogin.body.token;
    record('POST /api/auth/login succeeds with valid credentials', resAdminLogin.status === 200 && Boolean(adminToken));

    // 3. Negative: Admin Login with incorrect password
    const resBadAdmin = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'wrongpassword',
      role: 'admin'
    });
    record('POST /api/auth/login returns 401 on invalid password', resBadAdmin.status === 401);

    // 4. Positive: Customer Register
    const uniqueEmail = `api.test.${Date.now()}@example.com`;
    const resCustReg = await request(app).post('/api/customer-auth/register').send({
      name: 'API Tester',
      phone: '03001234567',
      email: uniqueEmail,
      password: 'password123'
    });
    customerToken = resCustReg.body.token;
    customerId = resCustReg.body.customer?.id;
    record('POST /api/customer-auth/register returns 201 with token', resCustReg.status === 201 && Boolean(customerToken));

    // 5. Duplicate: Register same email again
    const resDupReg = await request(app).post('/api/customer-auth/register').send({
      name: 'API Tester Dup',
      phone: '03009999999',
      email: uniqueEmail,
      password: 'password123'
    });
    record('POST /api/customer-auth/register returns 409 on duplicate email', resDupReg.status === 409);

    // 6. Boundary: Short password
    const resShortPass = await request(app).post('/api/customer-auth/register').send({
      name: 'Short',
      phone: '03001112223',
      email: `short.${Date.now()}@example.com`,
      password: '123'
    });
    record('POST /api/customer-auth/register returns 400 on password < 6 chars', resShortPass.status === 400);

    // 7. Positive: Customer Login
    const resCustLogin = await request(app).post('/api/customer-auth/login').send({
      identifier: uniqueEmail,
      password: 'password123'
    });
    record('POST /api/customer-auth/login returns 200 with token', resCustLogin.status === 200 && Boolean(resCustLogin.body.token));

    // 8. Unauthorized: Access /api/customer-auth/me without token
    const resNoToken = await request(app).get('/api/customer-auth/me');
    record('GET /api/customer-auth/me returns 401 without Bearer token', resNoToken.status === 401);

    // 9. Expired/Invalid: Access with malformed token
    const resBadToken = await request(app).get('/api/customer-auth/me').set('Authorization', 'Bearer invalid-token-string');
    record('GET /api/customer-auth/me returns 401 on malformed token', resBadToken.status === 401);

    // 10. Positive: Menu List
    const resMenu = await request(app).get('/api/menu');
    record('GET /api/menu returns 200 with available items', resMenu.status === 200 && Array.isArray(resMenu.body) && resMenu.body.length > 0);

    // 11. Malformed / Boundary: Regex ReDoS injection in search
    const resReDoS = await request(app).get('/api/menu?search=(((((((a+)+)+)+)+)+)+)$');
    record('GET /api/menu?search=... handles special regex characters safely', resReDoS.status === 200);

    // 12. Positive: Place Order (Guest Dine-In)
    const resOrder = await request(app).post('/api/orders').send({
      items: [{ menuItemId: String(menuItem._id), qty: 2 }],
      orderType: 'dine-in',
      tableNumber: 'T-01',
      guestName: 'Guest John',
      guestPhone: '03001234567'
    });
    record('POST /api/orders creates dine-in order and returns 201', resOrder.status === 201 && Boolean(resOrder.body.orderNumber));

    // 13. Invalid: Place Order with empty items
    const resEmptyOrder = await request(app).post('/api/orders').send({
      items: [],
      orderType: 'dine-in',
      guestName: 'Guest',
      guestPhone: '03001234567'
    });
    record('POST /api/orders returns 400 on empty items', resEmptyOrder.status === 400);

    // 14. Positive: Create Table Reservation (Future date/time)
    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const resResv = await request(app).post('/api/reservations').send({
      guestName: 'Reservation Test',
      email: 'resv@example.com',
      phone: '03001234567',
      date: futureDate,
      time: '18:30',
      guests: 4,
      notes: 'Anniversary'
    });
    record('POST /api/reservations creates future reservation with 201', resResv.status === 201 && resResv.body.status === 'pending');

    // 15. Invalid / Negative: Reservation with past date
    const pastDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const resPastResv = await request(app).post('/api/reservations').send({
      guestName: 'Past Test',
      email: 'past@example.com',
      phone: '03001234567',
      date: pastDate,
      time: '12:00',
      guests: 2
    });
    record('POST /api/reservations rejects past date with 400', resPastResv.status === 400);

    // 16. Invalid: Malformed ObjectId in URL parameter
    const resBadId = await request(app).get('/api/recommendations/invalid-id-format');
    record('GET /api/recommendations/:itemId returns 400 on malformed ObjectId', resBadId.status === 400);

    // 17. RBAC / Authorization: Non-admin calling admin endpoint
    const resAdminOnly = await request(app).get('/api/kitchen/admin/orders').set('Authorization', `Bearer ${customerToken}`);
    record('GET /api/kitchen/admin/orders rejects customer token with 403', [401, 403].includes(resAdminOnly.status));

    // 18. Large Payload: Order with oversized notes
    const largeNote = 'A'.repeat(5000);
    const resLarge = await request(app).post('/api/orders').send({
      items: [{ menuItemId: String(menuItem._id), qty: 1 }],
      orderType: 'takeaway',
      guestName: 'Large Note',
      guestPhone: '03001234567',
      notes: largeNote
    });
    record('POST /api/orders processes large payload without crashing', [201, 400].includes(resLarge.status));

  } catch (err) {
    console.error('API Test Suite Runtime Exception:', err);
    record('Suite execution without uncaught errors', false, err.message);
  } finally {
    if (mongod) await mongod.stop();
    await mongoose.disconnect();
  }

  console.log(`\n========================================`);
  console.log(`API TEST RESULTS: ${results.passed} Passed, ${results.failed} Failed`);
  console.log(`========================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runApiTests();
}

module.exports = { runApiTests };
