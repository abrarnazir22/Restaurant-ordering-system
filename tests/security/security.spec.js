// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Security & Vulnerability Assessment Tests', () => {
  test('SEC-01: Response contains critical Security Headers (Helmet)', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();

    const headers = res.headers();
    expect(headers['x-dns-prefetch-control']).toBe('off');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-download-options']).toBe('noopen');
    expect(headers['x-request-id']).toBeTruthy();
  });

  test('SEC-02: Search endpoint safely escapes regex special characters (ReDoS defense)', async ({ request }) => {
    // Malformed regex payload
    const res = await request.get('/api/menu?search=(((((((a+)+)+)+)+)+)+)$');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('SEC-03: XSS payload in customer registration is escaped in output', async ({ page }) => {
    await page.goto('/customer');
    const xssName = '<script>window.xssExploit=true</script>John';
    const email = `xss.${Date.now()}@example.com`;

    const registerTab = page.locator('#auth-register-tab');
    if (await registerTab.isVisible()) await registerTab.click();

    await page.locator('#register-form input[name="name"]').fill(xssName);
    await page.locator('#register-form input[name="phone"]').fill(`0344${String(Date.now()).slice(-7)}`);
    await page.locator('#register-form input[name="email"]').fill(email);
    await page.locator('#register-form input[name="password"]').fill('password123');
    await page.locator('#register-form button[type="submit"]').click();

    // Verify window.xssExploit was NOT executed
    const xssExecuted = await page.evaluate(() => Boolean(/** @type {any} */(window).xssExploit));
    expect(xssExecuted).toBe(false);
  });

  test('SEC-04: Unauthorized user cannot access Admin Orders API', async ({ request }) => {
    const res = await request.get('/api/kitchen/admin/orders');
    expect(res.status()).toBe(401);
  });

  test('SEC-05: Non-admin token cannot modify reservation status', async ({ request }) => {
    const res = await request.put('/api/reservations/65e123456789012345678901', {
      headers: {
        Authorization: 'Bearer invalid-or-customer-token'
      },
      data: {
        status: 'confirmed'
      }
    });
    expect([401, 403]).toContain(res.status());
  });

  test('SEC-06: Malformed ObjectId in request URL returns 400 Bad Request instead of 500 error', async ({ request }) => {
    const res = await request.get('/api/recommendations/not-a-valid-object-id');
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});
