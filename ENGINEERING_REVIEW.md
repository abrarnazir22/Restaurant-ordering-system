# Ember & Brew — Comprehensive Engineering Audit & Technical Review

**System:** Ember & Brew Restaurant Ordering & Lifecycle Platform  
**Version Audited:** 1.0.0-rc1  
**Audit Scope:** Backend Architecture, Frontend UX/A11y, API Security, Performance, Database Integrity, Observability  
**Audited By:** Lead Quality Engineer & Systems Architect  

---

## 1. Executive Summary

A comprehensive architectural and quality engineering review of the **Ember & Brew** restaurant management and ordering platform was conducted. The platform encompasses a customer-facing storefront, an authenticated customer portal, a multi-table QR ordering engine, a chef kitchen display system (KDS), a delivery driver dispatch module, an administrative back-office, and real-time Socket.IO synchronization.

The audit discovered **32 distinct defects and architectural risks** spanning P0 (Critical/Blocker), P1 (High), P2 (Medium), and P3 (Low) severity levels. All critical vulnerabilities and blocking UX/API issues have been remediated, verified by automated end-to-end and integration suites, and subjected to rigorous load benchmarking.

---

## 2. Issues Audit Matrix (32 Deficiencies Identified & Remediated)

| ID | Module / Component | Severity | Description & Impact | Root Cause | Remediated Fix | Effort |
|:---|:---|:---:|:---|:---|:---|:---:|
| **ENG-01** | `Routes/customerAuth.js` | **P0** | Rigid phone regex rejects valid Pakistani/UK phone formats starting with `0` (e.g. `03001234567`). | Hardcoded `^\+[1-9]\d{6,14}$` regex that strictly required country codes. | Updated validation to `/^(\+?[1-9]\d{6,14}\|0\d{9,11})$/` supporting domestic & international numbers. | 0.5d |
| **ENG-02** | `models/Customer.js` | **P0** | Mongoose schema validation rejected valid customer numbers on save/update. | Schema regex was out of sync with route validator. | Synced schema regex to normalize domestic 11-digit numbers. | 0.5d |
| **ENG-03** | `Routes/reservations.js` | **P0** | Users could reserve tables in the past (e.g., yesterday or 2 hours ago). | Server-side handler accepted raw client timestamps without checking `Date.now()`. | Implemented `validateFutureDateTime(date, time)` with minimum 15-minute advance buffer. | 1.0d |
| **ENG-04** | `Routes/customerAuth.js` | **P0** | Guest reservations orphaned (`customerId: null`) upon user registration. | Registration handler did not associate existing guest reservations matching the user's phone. | Added `claimGuestReservations(customer._id, customer.phone)` on register & login. | 1.0d |
| **ENG-05** | `Routes/menu.js` | **P0** | Search query vulnerable to ReDoS (Regular Expression Denial of Service) and regex injection. | Raw unescaped user string passed directly into `new RegExp(search, 'i')`. | Created `escapeRegex()` utility to sanitize all user-supplied regex meta-characters. | 0.5d |
| **ENG-06** | `Routes/recommendations.js`| **P1** | Recommendations endpoint crashed with `500 Internal Server Error` due to Map iteration bug. | Code called `.entries()` on a plain JavaScript object returned from cache/query. | Added polymorphic support for both Mongoose Map and standard Object dictionary. | 0.5d |
| **ENG-07** | `Routes/delivery.js` | **P1** | Driver real-time location update (`PUT /location`) did not broadcast live socket coordinates. | Missing Socket.IO event trigger on driver GPS coordinate update. | Added `req.app.get('io').emit('rider:location', { ... })` broadcast. | 0.5d |
| **ENG-08** | `Routes/complaints.js` | **P1** | `GET /stats/summary` loaded entire complaints collection into Node memory for `.filter()` counting. | Unindexed, in-memory collection scan scaling poorly with high ticket volume. | Refactored to native MongoDB `$group` aggregation pipeline with index utilization. | 1.0d |
| **ENG-09** | `server.js` | **P1** | Missing HTTP Security Headers (X-Frame-Options, CSP, HSTS, X-Content-Type-Options). | Express server initialized without security middleware headers. | Integrated `helmet()` middleware with robust Content Security Policy directives. | 0.5d |
| **ENG-10** | `server.js` | **P1** | No rate limiting on authentication and API endpoints vulnerable to brute force. | Missing request throttle middleware on `/api/` and auth routes. | Implemented `express-rate-limit` (100 req/15min on API, 10 req/15min on auth). | 0.5d |
| **ENG-11** | `server.js` | **P1** | Missing liveness / readiness probes for Kubernetes/container health monitoring. | No dedicated `/api/health` endpoint reporting uptime and MongoDB connection state. | Created `/api/health` returning system memory, uptime, and database connectivity. | 0.5d |
| **ENG-12** | `middleware/observability.js`| **P1** | Lack of distributed request tracing (`X-Request-Id`) across logs and responses. | Asynchronous requests lacked correlation IDs for debugging. | Built `requestTracingMiddleware` generating UUIDv4 correlation IDs and structured JSON logs. | 1.0d |
| **ENG-13** | `Routes/kitchen.js` | **P2** | Kitchen status update routes crashed if passed invalid MongoDB ObjectIds. | Missing ObjectId validation before running Mongoose queries. | Added `isValidObjectId` middleware check returning clean 400 Bad Request. | 0.5d |
| **ENG-14** | `Routes/orders.js` | **P2** | Order status mutations did not validate transition state machines. | Orders could transition from 'cancelled' directly to 'delivered'. | Added state transition validator enforcing monotonic lifecycle progression. | 1.0d |
| **ENG-15** | `customer.css` | **P1** | Customer email overflowed dashboard summary card on long email addresses. | Missing CSS text wrapping (`word-break` / `overflow-wrap`) on card values. | Applied `word-break: break-all; overflow-wrap: anywhere;` and responsive typography. | 0.5d |
| **ENG-16** | `customer.css` | **P2** | Inconsistent typography across customer portal vs storefront (mixed fonts). | Separate font imports and mismatched font-family cascade rules. | Unified font stack to DM Sans with consistent typography hierarchy. | 0.5d |
| **ENG-17** | `customer.html` | **P2** | No direct navigation link to storefront menu from customer portal header. | Customer portal header lacked menu action when logged in. | Added prominent "Browse Menu" button in header linking directly to storefront menu. | 0.5d |
| **ENG-18** | `customer.js` | **P2** | Customer dashboard input fields randomly blanked out while typing. | Delayed `setTimeout` handler asynchronously cleared input value properties. | Removed rogue setTimeout blanking logic; preserved user inputs in state. | 0.5d |
| **ENG-19** | `customer.js` | **P2** | Race condition when rendering customer portal tabs before API data resolution. | Function did not await `renderPortal()` and `loadCustomerData()`. | Refactored async lifecycle to await data before DOM painting. | 0.5d |
| **ENG-20** | `index.html` | **P1** | Guest cart discarded or reset when logging in or registering mid-checkout. | Cart state was stored in ephemeral memory rather than persistent browser storage. | Synchronized cart items with `localStorage` and merged cart upon authentication. | 1.0d |
| **ENG-21** | `index.html` | **P2** | Missing ARIA labels and landmark roles on interactive modals and drawers. | Dialog overlays lacked `role="dialog"`, `aria-modal="true"`, and accessible titles. | Added comprehensive ARIA attributes and focus traps for keyboard accessibility. | 1.0d |
| **ENG-22** | `models/Reservation.js` | **P2** | Missing compound database index on `{ branchId: 1, date: 1, time: 1 }`. | Slow reservation lookup queries as reservation volume grew. | Added compound index on branch, date, time for constant-time slot lookups. | 0.5d |
| **ENG-23** | `models/Order.js` | **P2** | Missing index on `customerId` and `createdAt` for customer order history queries. | Customer portal history performed unindexed collection scans. | Added compound index `{ customerId: 1, createdAt: -1 }`. | 0.5d |
| **ENG-24** | `models/Complaint.js` | **P2** | Missing index on `status` and `branchId` for manager complaint dashboards. | Filtering complaints by status required full document table scan. | Created index `{ branchId: 1, status: 1, createdAt: -1 }`. | 0.5d |
| **ENG-25** | `package.json` | **P1** | Production dependencies included outdated or vulnerable transitive packages. | Lack of automated vulnerability audit and lockfile enforcement. | Executed `npm audit fix`, pinned secure versions, and created Dependabot workflow. | 1.0d |
| **ENG-26** | `server.js` | **P2** | Global error handler leaked internal stack traces to clients in production. | `res.status(500).json({ error: err.stack })` returned raw traces. | Sanitized global error handler to return safe error messages while logging traces internally. | 0.5d |
| **ENG-27** | `openapi.yaml` | **P2** | Missing formal API documentation and interactive contract explorer. | No OpenAPI / Swagger definition existed for developer onboarding. | Created complete OpenAPI 3.0 specification served at `/api-docs`. | 1.5d |
| **ENG-28** | `scripts/db-quality-check.js` | **P2** | No automated data integrity validation for orphaned tables/orders/reservations. | Manual inspection required to detect broken references or corrupted records. | Built automated MongoDB integrity script checking schemas, references, and indexes. | 1.0d |
| **ENG-29** | `scripts/synthetic-monitor.js`| **P2** | No automated synthetic probe monitoring core user transaction flows. | External monitoring relied only on passive uptime checks. | Created synthetic monitoring script probing `/api/health`, `/api/menu`, and portals. | 1.0d |
| **ENG-30** | `.github/workflows/ci.yml`| **P1** | Missing automated Continuous Integration pipeline for linting, security, and tests. | Code changes merged without automated regression verification. | Configured GitHub Actions CI running API tests, security scans, and Playwright E2E. | 1.0d |
| **ENG-31** | `Dockerfile` | **P2** | Missing multi-stage container build and non-root security isolation. | Single-stage default Dockerfile ran as root user with unnecessary build artifacts. | Implemented multi-stage Node 20 Alpine Dockerfile running as non-privileged `node` user. | 1.0d |
| **ENG-32** | `docker-compose.yml` | **P2** | No reproducible multi-container orchestration for local staging/testing. | Required manual MongoDB installation and environment configuration. | Built docker-compose stack running Ember & Brew server + MongoDB replica set with health checks. | 0.5d |

---

## 3. Architecture & Reliability Assessment

### 3.1 Backend Architecture
The backend follows a modular Express.js REST API with Mongoose ODM models. The integration of request tracing, structured logging, centralized validation utilities, and rate limiting provides enterprise-grade robustness.

### 3.2 Real-Time Communication
Socket.IO handles real-time bidirectional events between the KDS, delivery riders, and customer tracking views. Room-based scoping isolates branch-level events to prevent data leakage across restaurant branches.

### 3.3 Data Layer & Integrity
MongoDB collections are protected with strict Mongoose schema validation, future date validators, unique indexes on identifiers, and compound indexes on operational query fields.
