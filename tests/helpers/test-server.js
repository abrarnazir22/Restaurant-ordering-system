const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Server } = require('socket.io');
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || "500000";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "50000";

const app = require('../../server');
const Branch = require('../../src/models/Branch');
const AdminUser = require('../../src/models/AdminUser');
const RestaurantTable = require('../../src/models/RestaurantTable');
const MenuItem = require('../../src/models/MenuItem');
const Customer = require('../../src/models/Customer');
const Order = require('../../src/models/Order');
const Reservation = require('../../src/models/Reservation');
const Complaint = require('../../src/models/Complaint');

let mongod = null;
let serverInstance = null;
const TEST_PORT = process.env.TEST_PORT || 3100;

async function startTestServer() {
  let mongoUri = process.env.MONGODB_URI;

  // If running in local test mode or without external connection, use in-memory mongo
  try {
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    process.env.MONGODB_URI = mongoUri;
  } catch (err) {
    console.warn('MongoMemoryServer fallback to configured MONGODB_URI:', err.message);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }

  // Seed default branch, admin, chef, rider, tables, and menu
  const branch = await Branch.createDefaultBranch();
  await AdminUser.createDefaultAdmin();
  await AdminUser.createDefaultChef();
  await AdminUser.createDefaultDelivery();

  const tableCount = await RestaurantTable.countDocuments();
  if (!tableCount) {
    await RestaurantTable.insertMany([
      { branchId: branch._id, tableNumber: 'T-01', seats: 2, area: 'indoor', manualStatus: 'available' },
      { branchId: branch._id, tableNumber: 'T-02', seats: 2, area: 'indoor', manualStatus: 'available' },
      { branchId: branch._id, tableNumber: 'T-03', seats: 4, area: 'indoor', manualStatus: 'available' },
      { branchId: branch._id, tableNumber: 'T-04', seats: 4, area: 'outdoor', manualStatus: 'available' },
      { branchId: branch._id, tableNumber: 'T-05', seats: 6, area: 'outdoor', manualStatus: 'available' }
    ]);
  }

  const menuCount = await MenuItem.countDocuments();
  if (!menuCount) {
    await MenuItem.insertMany([
      {
        name: 'Cappuccino',
        description: 'Rich espresso with steamed milk foam',
        price: 4.50,
        category: 'Hot Coffee',
        image: '/images/Cappuccino.jpeg',
        available: true,
        branchId: branch._id
      },
      {
        name: 'Margherita Pizza',
        description: 'Classic mozzarella, basil and fresh tomato sauce',
        price: 12.00,
        category: 'Pizza',
        image: '/images/Margherita Pizza.jpeg',
        available: true,
        branchId: branch._id
      },
      {
        name: 'Avocado Toast',
        description: 'Artisan sourdough with seasoned smashed avocado',
        price: 8.50,
        category: 'Breakfast',
        image: '/images/Avacado toast.jpeg',
        available: true,
        branchId: branch._id
      },
      {
        name: 'Pepperoni Pizza',
        description: 'Spicy beef pepperoni with melted mozzarella',
        price: 14.00,
        category: 'Pizza',
        image: '/images/Pepperoni Pizza.jpeg',
        available: true,
        branchId: branch._id
      }
    ]);
  }

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  app.locals.io = io;

  return new Promise((resolve) => {
    serverInstance = server.listen(TEST_PORT, () => {
      console.log(`🧪 Test Server running on http://localhost:${TEST_PORT}`);
      resolve({ server, port: TEST_PORT, mongoUri });
    });
  });
}

async function stopTestServer() {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}

if (require.main === module) {
  startTestServer().catch((err) => {
    console.error('Failed to start test server:', err);
    process.exit(1);
  });
}

module.exports = {
  startTestServer,
  stopTestServer,
  TEST_PORT
};
