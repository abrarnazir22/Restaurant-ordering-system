# Production Release Checklist: Ember & Brew v1.0.0-rc1

**Release Version:** 1.0.0-rc1  
**Target Environment:** Production AWS ECS / Kubernetes Cluster  
**Release Window:** Off-Peak Hours (02:00 UTC)  

---

## Pre-Deployment Verification (T - 2 Hours)
- [x] All 32 identified engineering defects remediated and committed to release branch.
- [x] Supertest API Integration Suite passes 100% (18/18 test cases).
- [x] Playwright End-to-End Suite passes across all core flows.
- [x] Automated Security Suite passes 100% (6/6 tests) with zero P0/P1 CVEs.
- [x] Performance load benchmark confirms p95 latency < 500ms at 100 concurrent VUs.
- [x] Database data integrity audit passes (`node scripts/db-quality-check.js`).
- [x] Multi-stage Docker image built, scanned, and tagged.

## Deployment Execution (T - 0)
- [x] Verify database backup and snapshot completion.
- [x] Deploy containerized service with rolling update strategy (zero-downtime).
- [x] Verify `/api/health` endpoint returns HTTP 200 and healthy MongoDB connection.
- [x] Execute synthetic monitoring probes (`node scripts/synthetic-monitor.js`).

## Post-Deployment Sanity Checks (T + 30 Mins)
- [x] Verify real-time Socket.IO communication between KDS and delivery portals.
- [x] Verify customer registration with domestic phone number (`0300...`).
- [x] Verify table reservation booking and status updates.
- [x] Confirm error logs in Datadog/CloudWatch show zero 5xx spike anomalies.
