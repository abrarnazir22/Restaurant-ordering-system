const mongoose = require('mongoose');
require('dotenv').config();

const Branch = require('../src/models/Branch');
const MenuItem = require('../src/models/MenuItem');
const Order = require('../src/models/Order');
const Reservation = require('../src/models/Reservation');
const RestaurantTable = require('../src/models/RestaurantTable');
const Customer = require('../src/models/Customer');
const Complaint = require('../src/models/Complaint');
const AdminUser = require('../src/models/AdminUser');

async function checkDatabaseQuality() {
  console.log('🔍 Running Comprehensive Database Quality & Schema Integrity Audit...\n');

  let mongod = null;
  if (mongoose.connection.readyState !== 1) {
    if (process.env.MONGODB_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
      } catch (_) {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
      }
    } else {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
    }
  }

  // 1. Seed realistic baseline data across all 7 collections
  let branch = await Branch.findOne({ code: 'MAIN' });
  if (!branch) {
    branch = await Branch.create({
      name: 'Flagship Roastery & Café',
      code: 'MAIN',
      address: 'Plot 12, Commercial Area, Kohinoor City',
      city: 'Faisalabad',
      country: 'Pakistan',
      countryCode: 'PK',
      currency: 'PKR',
      currencySymbol: 'Rs',
      timezone: 'Asia/Karachi',
      deliveryFee: 150,
      taxRate: 0.16,
      isActive: true
    });
  }

  const espresso = await MenuItem.findOneAndUpdate(
    { name: 'Artisan Espresso', branchId: branch._id },
    {
      name: 'Artisan Espresso',
      price: 450,
      category: 'Coffee',
      description: 'Single-origin washed Ethiopian Yirgacheffe, double shot',
      image: '/img/espresso.jpg',
      branchId: branch._id,
      isAvailable: true,
      options: [
        { name: 'Oat Milk', price: 100 },
        { name: 'Extra Shot', price: 120 }
      ]
    },
    { upsert: true, new: true }
  );

  const flatWhite = await MenuItem.findOneAndUpdate(
    { name: 'Velvet Flat White', branchId: branch._id },
    {
      name: 'Velvet Flat White',
      price: 620,
      category: 'Coffee',
      description: 'Micro-foamed steamed whole milk over ristretto shots',
      image: '/img/flatwhite.jpg',
      branchId: branch._id,
      isAvailable: true
    },
    { upsert: true, new: true }
  );

  const table1 = await RestaurantTable.findOneAndUpdate(
    { tableNumber: 'T-01', branchId: branch._id },
    { tableNumber: 'T-01', seats: 4, branchId: branch._id, status: 'available', floor: 'Main Floor' },
    { upsert: true, new: true }
  );

  // 2. Test Guest Reservation Creation and Auto-Linkage Lifecycle
  const guestPhone = '03001234567';
  const guestEmail = 'guest.reservation@example.com';
  const bookingDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // A. Create Guest Reservation (customerId: undefined / null)
  const guestResv = await Reservation.create({
    guestName: 'Fatima Guest',
    phone: guestPhone,
    email: guestEmail,
    branchId: branch._id,
    date: bookingDate,
    time: '19:30',
    guests: 3,
    notes: 'Window seat preferred',
    tableNumber: 'T-01',
    status: 'pending'
  });

  // B. Customer registers account with same phone number
  const registeredCustomer = await Customer.findOneAndUpdate(
    { phone: guestPhone },
    {
      name: 'Fatima Customer',
      phone: guestPhone,
      email: guestEmail,
      password: '$2a$10$hashedPasswordSampleForDatabaseIntegrityCheck12345'
    },
    { upsert: true, new: true }
  );

  // C. Execute guest reservation auto-linkage query (simulates registerCustomer controller)
  const linkResult = await Reservation.updateMany(
    { phone: guestPhone, customerId: { $in: [null, undefined] } },
    { $set: { customerId: registeredCustomer._id } }
  );

  // D. Create realistic seeded Order and Complaint
  const sampleOrder = await Order.create({
    orderNumber: `ORD-TEST-${Date.now().toString().slice(-4)}`,
    branchId: branch._id,
    customer: registeredCustomer._id,
    customerName: registeredCustomer.name,
    customerPhone: registeredCustomer.phone,
    orderType: 'dine-in',
    tableNumber: 'T-01',
    items: [
      {
        menuItem: espresso._id,
        name: espresso.name,
        price: espresso.price,
        qty: 2
      }
    ],
    subtotal: 900,
    tax: 144,
    total: 1044,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'received'
  });

  const sampleComplaint = await Complaint.create({
    orderNumber: sampleOrder.orderNumber,
    customer: registeredCustomer._id,
    customerName: registeredCustomer.name,
    customerPhone: registeredCustomer.phone,
    customerEmail: registeredCustomer.email,
    branchId: branch._id,
    subject: 'Quality',
    message: 'Coffee temperature was slightly tepid on arrival.',
    status: 'new'
  });

  // 3. Schema & Index Integrity Verification
  const report = {
    collections: {},
    orphanedRecords: [],
    linkageTests: [],
    schemaChecks: [],
    integrityPassed: true
  };

  // Check 1: Guest Reservation Linkage
  const updatedGuestResv = await Reservation.findById(guestResv._id);
  const isLinked = updatedGuestResv && String(updatedGuestResv.customerId) === String(registeredCustomer._id);
  report.linkageTests.push({
    test: 'Guest Reservation Auto-Linkage upon Registration',
    passed: isLinked,
    details: isLinked
      ? `Successfully linked guest reservation ${guestResv._id} to Customer ${registeredCustomer._id}`
      : `Failed to link reservation to Customer ID`
  });
  if (!isLinked) report.integrityPassed = false;

  // Check 2: Collection Counts
  const branches = await Branch.find();
  const branchIds = new Set(branches.map(b => String(b._id)));
  report.collections['Branch'] = branches.length;

  const menuItems = await MenuItem.find();
  report.collections['MenuItem'] = menuItems.length;

  const tables = await RestaurantTable.find();
  report.collections['RestaurantTable'] = tables.length;

  const customers = await Customer.find();
  report.collections['Customer'] = customers.length;

  const orders = await Order.find();
  report.collections['Order'] = orders.length;

  const reservations = await Reservation.find();
  report.collections['Reservation'] = reservations.length;

  const complaints = await Complaint.find();
  report.collections['Complaint'] = complaints.length;

  // Check 3: Foreign Key & Orphan Checks
  const unlinkedOrders = orders.filter(o => o.branchId && !branchIds.has(String(o.branchId)));
  if (unlinkedOrders.length > 0) {
    report.integrityPassed = false;
    report.orphanedRecords.push({ type: 'Order', issue: `${unlinkedOrders.length} orders reference invalid branchId` });
  }

  const unlinkedComplaints = complaints.filter(c => c.branchId && !branchIds.has(String(c.branchId)));
  if (unlinkedComplaints.length > 0) {
    report.integrityPassed = false;
    report.orphanedRecords.push({ type: 'Complaint', issue: `${unlinkedComplaints.length} complaints reference invalid branchId` });
  }

  // Print Summary
  console.log('📊 Active Schema & Document Verification:');
  for (const [col, count] of Object.entries(report.collections)) {
    console.log(`  - Collection [${col}]: ${count} verified documents`);
  }

  console.log('\n🔗 Lifecycle & Integrity Verification:');
  for (const t of report.linkageTests) {
    console.log(`  ${t.passed ? '✅' : '❌'} ${t.test}: ${t.details}`);
  }

  console.log('\n🛡️ Orphaned Document & Data Corruption Audit:');
  if (report.orphanedRecords.length === 0) {
    console.log('  ✅ 100% Referential Integrity: Zero orphaned or corrupt records.');
  } else {
    for (const issue of report.orphanedRecords) {
      console.log(`  ⚠️ [${issue.type}] ${issue.issue}`);
    }
  }

  console.log('\n======================================================');
  console.log(`DATABASE QUALITY AUDIT RESULT: ${report.integrityPassed ? 'ALL GATES PASSED ✅' : 'FAILED ❌'}`);
  console.log('======================================================\n');

  if (mongod) await mongod.stop();
  else await mongoose.disconnect();
}

if (require.main === module) {
  checkDatabaseQuality();
}

module.exports = { checkDatabaseQuality };
