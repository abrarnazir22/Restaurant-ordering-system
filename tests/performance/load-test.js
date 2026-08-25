import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Warm-up to 50 concurrent users
    { duration: '1m', target: 100 },   // Peak load: 100 concurrent users
    { duration: '30s', target: 500 },  // Stress spike: 500 concurrent users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate must remain under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('1. Health Check Endpoint', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
    });
  });

  group('2. Menu Listing & Search', () => {
    const res = http.get(`${BASE_URL}/api/menu`);
    check(res, {
      'menu status is 200': (r) => r.status === 200,
      'has menu items': (r) => JSON.parse(r.body).length > 0,
    });

    const searchRes = http.get(`${BASE_URL}/api/menu?search=Pizza`);
    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
    });
  });

  group('3. Recommendations API', () => {
    const recRes = http.get(`${BASE_URL}/api/recommendations/65e123456789012345678901`);
    check(recRes, {
      'recommendations response received': (r) => [200, 404].includes(r.status),
    });
  });

  sleep(1);
}
