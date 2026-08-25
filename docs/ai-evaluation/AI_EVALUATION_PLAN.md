# Ember & Brew — AI Model Evaluation & Benchmarking Plan

**Objective:** Define a standardized, reproducible, and rigorous testing framework for comparing LLM-assisted quality engineering capabilities across multiple frontier models (Google Gemini, Anthropic Claude, OpenAI GPT-4o, GitHub Copilot).

---

## 1. Evaluation Dimensions & Rubric

Models are evaluated across 5 core QE engineering dimensions on a 10-point scale:

| Dimension | Weight | Scoring Criteria (1–10) |
|:---|:---:|:---|
| **1. Bug Discovery & Detection** | 25% | **10:** Identifies root defect, edge conditions, and security implications without hallucinations.<br>**5:** Identifies symptom but misses root cause.<br>**1:** Hallucinates non-existent bugs or misses defect entirely. |
| **2. False Positive Resistance** | 15% | **10:** 0% false positives on correct code.<br>**5:** Flags style preferences as bugs.<br>**1:** Flags correct business logic as broken. |
| **3. Automated Test Generation** | 20% | **10:** Generates syntactically correct, idiomatic Playwright/Supertest code with valid locators, proper async/await, and strong assertions.<br>**5:** Test code requires manual selector fixing.<br>**1:** Unrunnable test code. |
| **4. Root Cause Analysis (5-Why)** | 20% | **10:** Deep multi-level causal chain identifying systemic/architectural root cause.<br>**5:** Superficial description of the failing line.<br>**1:** Incorrect explanation. |
| **5. Remediation Correctness** | 20% | **10:** Drop-in fix that passes all existing and new regression tests without side effects.<br>**5:** Fix works but introduces minor regressions or code smells.<br>**1:** Non-working fix. |

---

## 2. Standardized Evaluation Task Suite

### Task 1: ReDoS & Regex Injection in Search Query
- **Target File:** `src/Routes/menu.js`
- **Defect Description:** Unsanitized user search input passed directly to `new RegExp(search, 'i')`.
- **Standardized Prompt:**
  ```text
  Audit the following Express route handler for security, stability, and performance vulnerabilities.
  Identify any potential exploits, explain the root cause, write an automated test to reproduce it,
  and provide a hardened drop-in code fix.
  
  [CODE: src/Routes/menu.js]
  ```

### Task 2: Async Lifecycle & DOM Race Condition in Customer Dashboard
- **Target File:** `ember-and-brew/public/index.html` (or `customer.js`)
- **Defect Description:** Customer profile data rendering called before authentication state resolution.
- **Standardized Prompt:**
  ```text
  The customer portal occasionally renders empty profile summary cards when navigated to directly via URL.
  Analyze the frontend initialization flow, pinpoint the race condition, and provide the correct async lifecycle pattern.
  
  [CODE: customer navigation and rendering scripts]
  ```

### Task 3: Referential Integrity & Guest Reservation Migration
- **Target File:** `src/controllers/customerAuthController.js`
- **Defect Description:** Guest reservations with `customerId = null` orphaned when customer registers.
- **Standardized Prompt:**
  ```text
  When a guest customer registers an account, their previous table reservations booked via phone number
  remain unlinked. Provide a database migration logic during customer registration to claim guest records safely.
  ```

### Task 4: Phone Number Validation for Domestic & International Prefixes
- **Target File:** `src/utils/validation.js`
- **Defect Description:** Strict regex rejecting standard Pakistani domestic mobile numbers (`03001234567`).
- **Standardized Prompt:**
  ```text
  The restaurant's phone validation regex rejects local domestic numbers formatted with a leading zero.
  Design a unified regex and validation helper supporting domestic 11-digit numbers and international E.164 formats.
  ```

### Task 5: Database Aggregation Memory Optimization
- **Target File:** `src/Routes/complaints.js`
- **Defect Description:** Loading entire complaints collection into Node memory for stats calculation instead of MongoDB `$group`.
- **Standardized Prompt:**
  ```text
  The manager's complaints summary endpoint performs Array.filter() and Array.reduce() in Node.js memory.
  Refactor the query into a high-performance MongoDB aggregation pipeline.
  ```

---

## 3. Protocol for Reproducible Multi-LLM Benchmarking

1. **Environment Isolation:** Ensure each model is evaluated in a clean session with zero prior conversational memory.
2. **Temperature Setting:** Pinned to `0.0` or lowest deterministic setting.
3. **Execution Verification:** All generated code and tests MUST be executed against the test runner (`npx playwright test`, `npm run test:api`) inside the sandbox.
4. **Scoring Compilation:** Calculate the weighted composite score according to Section 1 rubric.
