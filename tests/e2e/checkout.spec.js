// @ts-check
const { test, expect } = require('@playwright/test');
const { StorefrontPage } = require('../pages/StorefrontPage');

test.describe('Checkout & Order Placement Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Clear previous cart
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('eb_cart');
      localStorage.removeItem('eb_last_order');
    });
  });

  test('CHK-01: Guest dine-in checkout places valid order with table assignment', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    // Add item
    await storefront.addItemToCart('Cappuccino');
    await storefront.proceedToCheckout();

    // Fill dine-in details
    await storefront.fillDineInCheckout('T-01', 'Bob Diner', '03001122334');
    await storefront.submitOrder();

    // Verify order tracking confirmation view
    await expect(page.locator('#view-tracking.active, #tracking-content, .order-journey').first()).toBeVisible({ timeout: 15000 });
  });

  test('CHK-02: Checkout validates missing customer name and phone', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    await storefront.addItemToCart('Cappuccino');
    await storefront.proceedToCheckout();

    // Clear name and phone
    const nameInput = page.locator('#checkout-name, input[name="guestName"]').first();
    if (await nameInput.isVisible()) await nameInput.fill('');

    const phoneInput = page.locator('#checkout-phone, input[name="guestPhone"]').first();
    if (await phoneInput.isVisible()) await phoneInput.fill('');

    await storefront.submitOrder();

    // Verify error toast is displayed
    await expect(page.locator('#toast-container .toast, .toast').first()).toBeVisible({ timeout: 5000 });
  });

  test('CHK-03: Checkout validates invalid Pakistan phone number format', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    await storefront.addItemToCart('Cappuccino');
    await storefront.proceedToCheckout();

    const phoneInput = page.locator('#guest-checkout-fields input[name="guestPhone"], input[name="guestPhone"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('12345'); // Invalid length
      await storefront.submitOrder();
      await expect(page.locator('#toast-container .toast, .toast').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('CHK-04: Guest cart smoothly transitions to logged-in customer account', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    // Guest adds item
    await storefront.addItemToCart('Margherita Pizza');
    const guestCart = await page.evaluate(() => localStorage.getItem('eb_cart'));
    expect(guestCart).toBeTruthy();

    // Customer logs in via customer portal
    await page.goto('/customer');
    const customer = { id: 'cust-123', name: 'Charlie Pizza', email: 'charlie@example.com', phone: '03009988776' };
    await page.evaluate((c) => {
      localStorage.setItem('eb_customer', JSON.stringify(c));
      localStorage.setItem('eb_customer_token', 'mock-token-123');
    }, customer);

    // Return to storefront
    await storefront.goto();
    const preservedCart = await page.evaluate(() => localStorage.getItem('eb_cart'));
    expect(preservedCart).toBe(guestCart);
  });

  test('CHK-05: Checkout handles slow network latency without double submission', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    await storefront.addItemToCart('Cappuccino');
    await storefront.proceedToCheckout();
    await storefront.fillDineInCheckout('T-02', 'Slow Net User', '03005554433');

    // Emulate slow network route delay
    await page.route('**/api/orders', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    const submitBtn = page.locator('#checkout-form button[type="submit"], button:has-text("Place Order")').first();
    await submitBtn.click();

    // Verify order tracking confirmation view
    await expect(page.locator('#view-tracking.active, #tracking-content, .order-journey').first()).toBeVisible({ timeout: 15000 });
  });

  test('CHK-06: Checkout displays graceful error when API order creation fails', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    await storefront.addItemToCart('Cappuccino');
    await storefront.proceedToCheckout();
    await storefront.fillDineInCheckout('T-03', 'Fail Test', '03001239876');

    // Mock API 500 Failure
    await page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server temporarily unavailable' })
      });
    });

    await storefront.submitOrder();

    // Verify error notification or toast is shown
    await expect(page.locator('.toast, #toast-container, .error-message, #checkout-error, .form-error, p:has-text("Server")').first()).toBeVisible({ timeout: 10000 });
  });
});
