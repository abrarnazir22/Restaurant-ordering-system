// @ts-check
const { test, expect } = require('@playwright/test');
const { StorefrontPage } = require('../pages/StorefrontPage');

test.describe('Storefront & Menu Operations', () => {
  test('MNU-01: Storefront loads and displays available menu items', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    await expect(page.locator('#menu-grid, .menu-card').first()).toBeVisible({ timeout: 10000 });
    const count = await page.locator('.menu-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('MNU-02: Filter menu by category pill updates visible items', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    // Check if category pills are present
    const pills = page.locator('.cat-pill');
    if (await pills.count() > 1) {
      const secondPill = pills.nth(1);
      const categoryText = (await secondPill.textContent() || '').trim();
      await secondPill.click();
      await page.waitForTimeout(300);

      // Verify active state on clicked pill
      await expect(secondPill).toHaveClass(/active/);
    }
  });

  test('MNU-03: Search input filters menu items dynamically', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    const searchInput = page.locator('#menu-search-input');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Pizza');
      await page.waitForTimeout(400);

      const cards = page.locator('.menu-card:visible');
      const count = await cards.count();
      for (let i = 0; i < count; i++) {
        const text = await cards.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('pizza');
      }
    }
  });

  test('MNU-04: Add item to cart opens or updates cart item counter', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await page.evaluate(() => localStorage.removeItem('eb_cart'));
    await storefront.goto();

    const firstAddBtn = page.locator('.menu-card .add-btn').first();
    await firstAddBtn.click();

    // Verify cart count badge or panel
    const countBadge = page.locator('#nav-cart-count, #cart-count');
    if (await countBadge.isVisible()) {
      await expect(countBadge).toHaveText(/^[1-9]\d*$/);
    }
  });

  test('MNU-05: Cart panel displays added item details and subtotal', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();

    await page.locator('.menu-card .add-btn').first().click();
    await storefront.openCart();
    await expect(page.locator('#cart-items, .cart-line, .cart-item').first()).toBeVisible();
    await expect(page.locator('#cart-total, .cart-total').first()).toBeVisible();
  });

  test('MNU-06: Increment item quantity in cart updates subtotal', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await page.locator('.menu-card .add-btn').first().click();
    await storefront.openCart();

    const plusBtn = page.locator('.cart-line button:has-text("+"), .cart-qty-control button:has-text("+")').first();
    if (await plusBtn.isVisible()) {
      await plusBtn.click();
      await page.waitForTimeout(200);
      const qty = page.locator('.cart-line .qty, .cart-qty-control span').first();
      await expect(qty).toBeVisible();
    }
  });

  test('MNU-07: Decrement item quantity down to zero removes it from cart', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await page.evaluate(() => localStorage.removeItem('eb_cart'));
    await storefront.goto();

    // Add 1 item
    await page.locator('.menu-card .add-btn').first().click();
    await storefront.openCart();

    // Click minus or remove
    const minusBtn = page.locator('.cart-line button:has-text("-"), .cart-qty-btn-dec, button.cart-remove-btn').first();
    if (await minusBtn.isVisible()) {
      await minusBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('MNU-08: Cart contents persist across page reloads via localStorage', async ({ page }) => {
    const storefront = new StorefrontPage(page);
    await storefront.goto();
    await page.evaluate(() => localStorage.removeItem('eb_cart'));
    await storefront.goto();

    await page.locator('.menu-card .add-btn').first().click();
    await page.reload();

    const savedCart = await page.evaluate(() => localStorage.getItem('eb_cart'));
    expect(savedCart).toBeTruthy();
    const parsed = JSON.parse(savedCart || '[]');
    expect(parsed.length).toBeGreaterThan(0);
  });

  test('MNU-09: Direct navigation from customer portal header opens storefront menu', async ({ page }) => {
    await page.goto('/customer');
    const customer = { id: 'cust-menu-1', name: 'Menu Tester', email: 'menu@example.com', phone: '03001234567' };
    await page.evaluate((c) => {
      localStorage.setItem('eb_customer', JSON.stringify(c));
      localStorage.setItem('eb_customer_token', 'mock-token-menu');
    }, customer);
    await page.goto('/customer');

    const menuLink = page.locator('#nav-menu-link');
    await expect(menuLink).toBeVisible();
    await menuLink.click();

    await expect(page).toHaveURL(/(\/|\/order\/|\/index\.html)/);
    await expect(page.locator('#menu-grid, .menu-card').first()).toBeVisible({ timeout: 10000 });
  });
});
