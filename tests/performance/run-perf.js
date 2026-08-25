const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server');
const Branch = require('../../src/models/Branch');
const MenuItem = require('../../src/models/MenuItem');

async function runPerformanceBench() {
  console.log('⚡ Running Automated Performance & Load Benchmark...\n');
  let mongod = null;
  let server = null;
  const PORT = 3200;

  try {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  } catch (err) {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  }

  const branch = await Branch.createDefaultBranch();
  await MenuItem.create([
    { name: 'Perf Item 1', description: 'Freshly brewed performance coffee', image: '/images/Cappuccino.jpeg', price: 10, category: 'Hot Coffee', available: true, branchId: branch._id },
    { name: 'Perf Item 2', description: 'Crispy wood-fired performance pizza', image: '/images/Margherita Pizza.jpeg', price: 15, category: 'Pizza', available: true, branchId: branch._id }
  ]);

  server = http.createServer(app).listen(PORT);

  const testCases = [
    { name: 'GET /api/health', path: '/api/health', concurrency: 50, totalRequests: 200 },
    { name: 'GET /api/menu', path: '/api/menu', concurrency: 50, totalRequests: 200 },
    { name: 'GET /api/menu?search=Perf', path: '/api/menu?search=Perf', concurrency: 50, totalRequests: 200 }
  ];

  function makeRequest(path) {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      const req = http.get(`http://localhost:${PORT}${path}`, (res) => {
        res.resume();
        res.on('end', () => {
          const end = process.hrtime.bigint();
          const durationMs = Number(end - start) / 1e6;
          resolve({ status: res.statusCode, durationMs });
        });
      });
      req.on('error', (err) => {
        resolve({ status: 500, durationMs: 0, error: err.message });
      });
    });
  }

  for (const tc of testCases) {
    console.log(`⏱️ Benchmarking ${tc.name} (${tc.totalRequests} reqs @ ${tc.concurrency} concurrent)...`);
    const latencies = [];
    const pool = [];

    const startTime = Date.now();
    for (let i = 0; i < tc.totalRequests; i++) {
      pool.push(makeRequest(tc.path).then((r) => latencies.push(r.durationMs)));
      if (pool.length >= tc.concurrency) {
        await Promise.all(pool);
        pool.length = 0;
      }
    }
    if (pool.length > 0) {
      await Promise.all(pool);
    }
    const totalTimeMs = Date.now() - startTime;

    latencies.sort((a, b) => a - b);
    const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
    const p50 = latencies[Math.floor(latencies.length * 0.5)].toFixed(2);
    const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
    const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);
    const rps = ((tc.totalRequests / totalTimeMs) * 1000).toFixed(1);

    console.log(`  -> Throughput: ${rps} req/sec`);
    console.log(`  -> Avg: ${avg}ms | p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms\n`);
  }

  if (server) server.close();
  if (mongod) await mongod.stop();
  await mongoose.disconnect();
  console.log('✅ Performance benchmark completed successfully.');
}

if (require.main === module) {
  runPerformanceBench();
}

module.exports = { runPerformanceBench };
