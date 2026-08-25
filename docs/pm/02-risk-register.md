# Risk Register: Ember & Brew Platform

**Project:** Ember & Brew Restaurant Operations  
**Date:** August 2026  
**Status:** All Critical Risks Mitigated  

---

| Risk ID | Risk Description | Category | Pre-Mitigation Score (LxI) | Mitigation Strategy | Post-Mitigation Score (LxI) | Owner | Status |
|:---:|:---|:---:|:---:|:---|:---:|:---:|:---:|
| **RSK-01** | High peak concurrency causes event loop freezing due to unescaped search regex | Technical / Security | 5 x 5 = 25 (Critical) | Applied `escapeRegex()` and added automated ReDoS security unit tests. | 1 x 5 = 5 (Low) | Backend Lead | **Closed ✅** |
| **RSK-02** | Customers blocked from logging in with standard domestic phone numbers | Business / UX | 5 x 5 = 25 (Critical) | Standardized phone regex to support both domestic and international formats. | 1 x 5 = 5 (Low) | QA Lead | **Closed ✅** |
| **RSK-03** | Past-date table reservations causing ghost bookings and inventory conflicts | Business / Ops | 4 x 4 = 16 (High) | Added server-side future validation enforcing 15-minute advance booking. | 1 x 4 = 4 (Low) | Backend Lead | **Closed ✅** |
| **RSK-04** | Brute force credential stuffing attacks on staff and customer logins | Security | 4 x 4 = 16 (High) | Implemented rate limiting with `express-rate-limit` (10 req/15min on auth). | 1 x 4 = 4 (Low) | Security Lead | **Closed ✅** |
| **RSK-05** | Guest orders lost or unlinked upon registration leading to customer complaints | UX / Data Integrity | 4 x 4 = 16 (High) | Implemented automated `claimGuestReservations` and `localStorage` cart persistence. | 1 x 4 = 4 (Low) | Fullstack Lead | **Closed ✅** |
| **RSK-06** | Lack of automated CI testing leads to regression bugs in production | Quality / DevOps | 4 x 4 = 16 (High) | Built GitHub Actions CI pipeline running API, E2E, and security tests on every PR. | 1 x 4 = 4 (Low) | DevOps Lead | **Closed ✅** |
| **RSK-07** | Database performance degradation under high complaint/order volume | Database / Scale | 3 x 4 = 12 (Medium) | Added compound MongoDB indexes and replaced in-memory filtering with `$group`. | 1 x 3 = 3 (Low) | DB Architect | **Closed ✅** |
| **RSK-08** | Accessibility non-compliance exposing platform to legal or usability barriers | Compliance / A11y | 3 x 3 = 9 (Medium) | Remediated WCAG 2.1 AA violations; Lighthouse score improved to 98/100. | 1 x 3 = 3 (Low) | Frontend Lead | **Closed ✅** |
