# Ember & Brew — Performance & Load Testing Verification Report

**Audit Date:** August 25, 2026  
**Load Test Framework:** [k6](https://k6.io/) `v2.2.0` (commit/devel, darwin/arm64)  
**Execution Script:** `performance/k6/load-test.js`  
**Target Environment:** Local Test Harness (`http://localhost:3100`), Node.js `v26.5.0`, Single-process Express + Mongoose + Socket.IO  

---

## 1. Executive Summary & Benchmark Matrix

Empirical performance evaluations were conducted across **50, 100, and 500 concurrent virtual users (VUs)** simulating realistic customer workflows (health probe, menu catalog browsing, regex-safe search, item recommendations, and authenticated order placement).

| Concurrency Tier | Total Requests | Throughput (req/s) | Avg Latency (ms) | p(50) (ms) | p(90) (ms) | p(95) (ms) | Max Latency (ms) | Error Rate | SLA Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **50 VUs** | 5,832 | 368.1 req/s | 10.08 ms | 3.03 ms | 25.08 ms | 42.20 ms | 217.43 ms | **0.00%** | ✅ **PASSED** (p95 < 300ms) |
| **100 VUs** | 10,857 | 686.8 req/s | 19.80 ms | 6.85 ms | 52.65 ms | 94.51 ms | 368.42 ms | **0.00%** | ✅ **PASSED** (p95 < 300ms) |
| **500 VUs** | 24,837 | 1,557.0 req/s | 189.65 ms | 132.73 ms | 466.61 ms | 563.38 ms | 1,337.98 ms | **0.00%** | ⚠️ **DEGRADED** (p95 > 300ms) |

---

## 2. Workload Profile & Tested Endpoints

Each virtual user traversed the following end-to-end API scenario per iteration:
1. `GET /api/health` — Microservice liveness and resource health check.
2. `GET /api/menu` — Full menu catalog retrieval with category tags.
3. `GET /api/menu?search=Pizza` — Dynamic menu query filtering.
4. `GET /api/recommendations/:itemId` — Collaborative item recommendation query.
5. `POST /api/orders` — Dine-in order creation, table verification, server-side price validation, and database transaction.

---

## 3. Tier-by-Tier Empirical Analysis

### 3.1 Tier 1: 50 Concurrent Users (Normal Production Load)
- **Artifact:** `performance/reports/50-users/summary.json`
- **Completed Order Transactions:** 1,166 orders placed in 15.8 seconds.
- **Latency Distribution:**
  - 50th percentile (median): **3.03 ms**
  - 95th percentile: **42.20 ms** (Well below the 300ms SLA target)
- **Error Rate:** 0.00% (0 errors across 5,832 requests).
- **Assessment:** Excellent responsiveness. Single Node.js process handles normal operational volume with sub-50ms latency.

---

### 3.2 Tier 2: 100 Concurrent Users (Peak Hour Rush)
- **Artifact:** `performance/reports/100-users/summary.json`
- **Completed Order Transactions:** 2,171 orders placed in 15.8 seconds.
- **Throughput:** Scaled linearly to **686.8 reqs/sec**.
- **Latency Distribution:**
  - 50th percentile: **6.85 ms**
  - 95th percentile: **94.51 ms**
- **Error Rate:** 0.00% (0 errors across 10,857 requests).
- **Assessment:** Rock solid stability during 2x load spike. Sub-100ms p95 latency guarantees instantaneous UI feedback during peak ordering hours.

---

### 3.3 Tier 3: 500 Concurrent Users (Stress & Saturation Limit)
- **Artifact:** `performance/reports/500-users/summary.json`
- **Completed Order Transactions:** 4,967 orders placed in 16.0 seconds.
- **Throughput Peak:** **1,557.0 reqs/sec**.
- **Latency Distribution:**
  - 50th percentile: **132.73 ms**
  - 90th percentile: **466.61 ms**
  - 95th percentile: **563.38 ms**
  - Max Latency: **1,337.98 ms**
- **Error Rate:** **0.00%** (Zero connection drops or 500 Internal Server Errors).
- **Root Cause of Degradation:**
  - Under 500 simultaneous persistent HTTP clients, the single-threaded Node.js event loop CPU becomes saturated by JSON serialization, crypto order number generation, and schema validation.
  - While zero requests failed, queue wait time increased p95 latency from 94.5ms to 563.4ms.

---

## 4. Bottleneck Identification & Production Recommendations

1. **Node.js Process Clustering:**
   - Single Node process cannot utilize multi-core server CPUs.
   - *Recommendation:* Deploy via PM2 cluster mode or Kubernetes replicas (`replicas: 4`) with round-robin load balancing.
2. **In-Memory Caching for High-Volume Reads:**
   - `/api/menu` and `/api/recommendations` were queried repeatedly on every iteration.
   - *Recommendation:* Introduce Redis or local LRU cache with 60-second TTL for menu catalog data to eliminate repeated database roundtrips.
3. **Database Connection Pool Tuning:**
   - Ensure MongoDB `maxPoolSize` is configured to `Math.max(50, VUs)` in production to prevent connection starvation under sudden traffic bursts.
4. **Rate Limiter Configuration:**
   - Production IP rate limiting was tuned to distinguish between single-user clients (`max: 1500`) and stress-test synthetic harness runners (`RATE_LIMIT_MAX` env override).
