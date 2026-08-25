# Ember & Brew — k6 Performance & Concurrency Load Testing

This directory contains the official **k6** load testing suite for the Ember & Brew restaurant ordering platform.

---

## 🎯 Test Objectives & Workload Profile

The k6 test suite simulates realistic concurrent user sessions traversing the full customer journey:
1. `GET /api/health` — Microservice liveness & memory monitoring probe.
2. `GET /api/menu` — High-volume menu catalog listing.
3. `GET /api/menu?search=Pizza` — Category and query text search.
4. `GET /api/recommendations/:itemId` — Collaborative recommendation engine query.
5. `POST /api/orders` — Dine-in order placement and table assignment transaction.

---

## 🚀 Execution Commands

Ensure the application server is running locally (`npm start` or `node tests/helpers/test-server.js` on port `3100`).

```bash
# 1. Run 50 Concurrent Users (Moderate Load — 30 seconds)
k6 run --vus 50 --duration 30s performance/k6/load-test.js --summary-export performance/reports/50-users/summary.json

# 2. Run 100 Concurrent Users (Peak Hour Spike — 30 seconds)
k6 run --vus 100 --duration 30s performance/k6/load-test.js --summary-export performance/reports/100-users/summary.json

# 3. Run 500 Concurrent Users (Extreme Concurrency / Stress — 30 seconds)
k6 run --vus 500 --duration 30s performance/k6/load-test.js --summary-export performance/reports/500-users/summary.json
```

---

## 📊 Performance Thresholds & SLAs

- **HTTP Failure Rate (`http_req_failed`):** `< 5.0%`
- **95th Percentile Latency (`p95`):** `< 300ms`
- **99th Percentile Latency (`p99`):** `< 600ms`
- **Business Transaction Error Rate:** `< 5.0%`
