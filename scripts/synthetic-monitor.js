const http = require('http');

const ENDPOINTS = [
  { name: 'Health Check', path: '/api/health', expectedStatus: 200 },
  { name: 'Menu Listing', path: '/api/menu', expectedStatus: 200 },
  { name: 'Storefront Page', path: '/', expectedStatus: 200 },
  { name: 'Customer Portal', path: '/customer', expectedStatus: 200 },
  { name: 'Admin Login', path: '/admin/login', expectedStatus: 200 }
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function pingEndpoint(endpoint, baseUrl = BASE_URL) {
  const url = new URL(endpoint.path, baseUrl);
  const start = Date.now();

  return new Promise((resolve) => {
    http.get(url.toString(), (res) => {
      const durationMs = Date.now() - start;
      const pass = res.statusCode === endpoint.expectedStatus;
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: res.statusCode,
        expectedStatus: endpoint.expectedStatus,
        durationMs,
        pass
      });
    }).on('error', (err) => {
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: 0,
        expectedStatus: endpoint.expectedStatus,
        durationMs: Date.now() - start,
        pass: false,
        error: err.message
      });
    });
  });
}

async function runSyntheticMonitor() {
  let targetUrl = BASE_URL;
  let startedLocally = false;

  // Check if server is running; if not, spin up local test server
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(BASE_URL + '/api/health', (res) => resolve(res));
      req.on('error', reject);
      req.setTimeout(1000, () => req.destroy(new Error('timeout')));
    });
  } catch (_) {
    const { startTestServer } = require('../tests/helpers/test-server');
    const testInfo = await startTestServer();
    targetUrl = `http://localhost:${testInfo.port}`;
    startedLocally = true;
  }

  console.log(`🌐 Running Synthetic Monitor against ${targetUrl}...\n`);
  let allPass = true;

  try {
    for (const ep of ENDPOINTS) {
      const result = await pingEndpoint(ep, targetUrl);
      if (result.pass) {
        console.log(`  ✅ [${result.durationMs}ms] ${result.name} (${result.path}) -> HTTP ${result.status}`);
      } else {
        allPass = false;
        console.error(`  ❌ [${result.durationMs}ms] ${result.name} (${result.path}) -> HTTP ${result.status} (Expected ${result.expectedStatus}) ${result.error || ''}`);
      }
    }

    console.log(`\n========================================`);
    console.log(`SYNTHETIC MONITOR: ${allPass ? 'ALL HEALTHY ✅' : 'DEGRADED / DOWN ❌'}`);
    console.log(`========================================\n`);

    return allPass;
  } finally {
    if (startedLocally) {
      const { stopTestServer } = require('../tests/helpers/test-server');
      await stopTestServer();
    }
  }
}

if (require.main === module) {
  runSyntheticMonitor().then(pass => {
    if (!pass && process.env.EXIT_ON_FAILURE) {
      process.exit(1);
    }
  });
}

module.exports = { runSyntheticMonitor };
