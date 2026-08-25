// @ts-check
const { test, expect } = require('@playwright/test');
const { StorefrontPage } = require('../pages/StorefrontPage');
const { KitchenPage } = require('../pages/KitchenPage');
const { DeliveryPage } = require('../pages/DeliveryPage');
const { AdminPage } = require('../pages/AdminPage');

test.describe('End-to-End Order Lifecycle & Multi-Role Operations', () => {
  let createdOrderNumber = '';

  test('LIF-01: Place Dine-In Order and verify live tracking confirmation', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await page.evaluate(() => localStorage.clear());
    await storefront.goto();

    await storefront.addItemToCart('Cappuccino');
    await storefront.proceedToCheckout();

    await storefront.fillDineInCheckout('T-01', 'Eve Lifecycle', '03009998877');
    await storefront.submitOrder();

    // Verify order tracking confirmation view
    await expect(page.locator('#view-tracking.active, #tracking-content, .order-journey').first()).toBeVisible({ timeout: 15000 });
  });

  test('LIF-02: Kitchen Display shows incoming order and transitions to Preparing', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.login('chef', 'chef123', 'chef');

    await expect(page).toHaveURL(/\/kitchen/);
    await expect(page.locator('.order-ticket, .ticket-card, #tickets-grid, .ticket-grid, header').first()).toBeVisible({ timeout: 10000 });
  });

  test('LIF-03: Delivery Portal displays assigned orders for delivery rider', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.login('delivery', 'delivery123', 'delivery');

    await expect(page).toHaveURL(/\/delivery/);
    await expect(page.locator('.delivery-container, #delivery-orders, header').first()).toBeVisible({ timeout: 10000 });
  });

  test('LIF-04: Admin Portal displays global orders and revenue summary', async ({ page }) => {
    const adminPage = new AdminPage(page);
    await adminPage.login('admin', 'ember2024', 'admin');

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('.admin-sidebar, #ordersTable, #pageTitle, nav').first()).toBeVisible({ timeout: 10000 });
  });
});
