# Post-Release Verification & Monitoring Checklist

**Release:** Ember & Brew v1.0.0-rc1  
**Monitoring Window:** 48 Hours Post-Launch  

---

## 1. Immediate Post-Deployment Checks (0–2 Hours)
- [x] Run synthetic monitor (`node scripts/synthetic-monitor.js`).
- [x] Place live end-to-end test order across storefront, kitchen, and delivery.
- [x] Confirm real-time WebSocket connection count is stable.
- [x] Verify no error alerts on `/api/health` probes.

## 2. 24-Hour Operational Review
- [ ] Monitor p95 API response times in production APM (target < 200ms).
- [ ] Review customer registration funnel and domestic phone conversion rate.
- [ ] Verify table reservation cancellation and confirmation rates.
- [ ] Inspect MongoDB connection pool utilization (target < 60%).

## 3. 48-Hour Sign-Off
- [ ] Review customer support complaint tickets for unexpected regressions.
- [ ] Verify automated database backup execution.
- [ ] Finalize sprint retrospective.
