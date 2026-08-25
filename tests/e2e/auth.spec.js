// @ts-check
const { test, expect } = require('@playwright/test');
const { CustomerPage } = require('../pages/CustomerPage');
const { AdminPage } = require('../pages/AdminPage');

test.describe('Authentication & Role-Based Access Control', () => {
  const uniqueTimestamp = Date.now();
  const testCustomer = {
    name: 'Alice Quality',
    phone: `0300${String(uniqueTimestamp).slice(-7)}`,
    email: `alice.${uniqueTimestamp}@example.com`,
    password: 'password123'
  };

  test('AUT-01: Customer can register a new account successfully', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.goto();

    await customerPage.register(testCustomer.name, testCustomer.phone, testCustomer.email, testCustomer.password);

    // Verify successful dashboard rendering
    await expect(page.locator('.customer-topbar h1, .dashboard-summary').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.summary-card .value').first()).toBeVisible();
  });

  test('AUT-02: Customer registration rejects duplicate email', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.goto();

    await customerPage.register('Duplicate User', `0311${String(Date.now()).slice(-7)}`, testCustomer.email, 'password123');

    // Verify error message displayed
    await expect(page.locator('#error-register')).toContainText(/already exists/i);
  });

  test('AUT-03: Customer registration rejects short password (< 6 chars)', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.goto();

    await customerPage.register('Short Pass', `0322${String(Date.now()).slice(-7)}`, `short.${Date.now()}@example.com`, '12345');

    await expect(page.locator('#error-password')).toContainText(/at least 6 characters|Use at least/i);
  });

  test('AUT-04: Customer can log in with valid credentials', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.goto();

    // Ensure session is clear
    await page.evaluate(() => localStorage.clear());
    await customerPage.goto();

    await customerPage.login(testCustomer.email, testCustomer.password);
    await expect(page.locator('.customer-topbar h1, .dashboard-summary').first()).toBeVisible({ timeout: 10000 });
  });

  test('AUT-05: Customer login rejects invalid password', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.goto();
    await page.evaluate(() => localStorage.clear());
    await customerPage.goto();

    await customerPage.login(testCustomer.email, 'wrongpassword');
    await expect(page.locator('#error-login')).toContainText(/invalid credentials/i);
  });

  test('AUT-06: Admin login authenticates and routes to /admin', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.login('admin', 'ember2024', 'admin');

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('.admin-sidebar, #ordersTable, #pageTitle').first()).toBeVisible({ timeout: 10000 });
  });

  test('AUT-07: Chef login authenticates and routes to /kitchen', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.login('chef', 'chef123', 'chef');

    await expect(page).toHaveURL(/\/kitchen/);
    await expect(page.locator('.kitchen-board, #tickets-grid, .ticket-grid, header').first()).toBeVisible({ timeout: 10000 });
  });

  test('AUT-08: Delivery rider login authenticates and routes to /delivery', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.login('delivery', 'delivery123', 'delivery');

    await expect(page).toHaveURL(/\/delivery/);
    await expect(page.locator('.delivery-container, #delivery-orders, header').first()).toBeVisible({ timeout: 10000 });
  });
});
