import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Business & Performance Metrics
export const orderLatency = new Trend('order_placement_duration');
export const menuLatency = new Trend('menu_browse_duration');
export const errorRate = new Rate('custom_error_rate');
export const completedOrders = new Counter('completed_orders_total');

// Configurable options via environment or CLI flags
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.05'], // Max 5% HTTP failure rate
    http_req_duration: ['p(95)<300', 'p(99)<600'], // 95% of requests under 300ms, 99% under 600ms
    custom_error_rate: ['rate<0.05'],
  },
};

// Setup: Pre-seed or authenticate tokens for realistic load simulation
export function setup() {
  const adminLoginPayload = JSON.stringify({
    username: 'admin',
    password: 'ember2024',
    role: 'admin',
  });

  const headers = { 'Content-Type': 'application/json' };
  const adminRes = http.post(`${BASE_URL}/api/auth/login`, adminLoginPayload, { headers });
  
  let adminToken = '';
  if (adminRes.status === 200) {
    const body = adminRes.json();
    adminToken = body.token || '';
  }

  // Fetch a valid menu item for orders/recommendations
  const menuRes = http.get(`${BASE_URL}/api/menu`);
  let sampleItemId = '';
  if (menuRes.status === 200) {
    const items = menuRes.json();
    if (Array.isArray(items) && items.length > 0) {
      sampleItemId = items[0]._id || '';
    }
  }

  return { adminToken, sampleItemId, baseUrl: BASE_URL };
}

// User Scenario: Realistic Customer Journey
export default function (data) {
  const baseUrl = data.baseUrl;
  const headers = { 'Content-Type': 'application/json' };

  // 1. Health Probe
  group('01_Health_Check', () => {
    const res = http.get(`${baseUrl}/api/health`);
    const pass = check(res, {
      'health returns 200': (r) => r.status === 200,
      'health is healthy': (r) => r.json('status') === 'healthy',
    });
    errorRate.add(!pass);
  });

  sleep(0.1);

  // 2. Menu Catalog Browsing
  group('02_Browse_Menu', () => {
    const start = Date.now();
    const res = http.get(`${baseUrl}/api/menu`);
    menuLatency.add(Date.now() - start);

    const pass = check(res, {
      'menu status is 200': (r) => r.status === 200,
      'menu items returned': (r) => Array.isArray(r.json()),
    });
    errorRate.add(!pass);
  });

  sleep(0.1);

  // 3. Search Menu
  group('03_Search_Menu', () => {
    const res = http.get(`${baseUrl}/api/menu?search=Pizza`);
    const pass = check(res, {
      'search status is 200': (r) => r.status === 200,
    });
    errorRate.add(!pass);
  });

  sleep(0.1);

  // 4. Recommendations Lookup
  if (data.sampleItemId) {
    group('04_Get_Recommendations', () => {
      const res = http.get(`${baseUrl}/api/recommendations/${data.sampleItemId}`);
      const pass = check(res, {
        'recommendations status is 200': (r) => r.status === 200,
      });
      errorRate.add(!pass);
    });
  }

  sleep(0.1);

  // 5. Place Dine-In Order
  if (data.sampleItemId) {
    group('05_Place_Order', () => {
      const orderPayload = JSON.stringify({
        orderType: 'dine-in',
        tableNumber: 'T-01',
        guestName: `LoadUser-${__VU}`,
        guestPhone: '03001234567',
        items: [
          {
            menuItemId: data.sampleItemId,
            name: 'Sample Item',
            qty: 1,
          },
        ],
      });

      const start = Date.now();
      const res = http.post(`${baseUrl}/api/orders`, orderPayload, { headers });
      orderLatency.add(Date.now() - start);

      const pass = check(res, {
        'order placed 201': (r) => r.status === 201,
        'order has id': (r) => Boolean(r.json('_id') || r.json('orderId') || r.json('orderNumber')),
      });
      if (pass) completedOrders.add(1);
      errorRate.add(!pass);
    });
  }

  sleep(0.2);
}

// Summary Export Handler
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'performance/reports/summary-latest.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  const httpDur = metrics.http_req_duration ? metrics.http_req_duration.values : {};
  const httpReqs = metrics.http_reqs ? metrics.http_reqs.values : {};
  const failedRate = metrics.http_req_failed ? (metrics.http_req_failed.values.rate * 100).toFixed(2) : '0.00';

  return `
================================================================================
                    EMBER & BREW — k6 LOAD TEST EXECUTION SUMMARY
================================================================================
Total Requests:    ${httpReqs.count || 0}
Throughput:        ${(httpReqs.rate || 0).toFixed(1)} reqs/sec
Failed Requests:   ${failedRate}%
Avg Duration:      ${(httpDur.avg || 0).toFixed(2)} ms
p(50) Latency:     ${(httpDur.med || 0).toFixed(2)} ms
p(90) Latency:     ${(httpDur['p(90)'] || 0).toFixed(2)} ms
p(95) Latency:     ${(httpDur['p(95)'] || 0).toFixed(2)} ms
p(99) Latency:     ${(httpDur['p(99)'] || 0).toFixed(2)} ms
Max Latency:       ${(httpDur.max || 0).toFixed(2)} ms
================================================================================
`;
}
