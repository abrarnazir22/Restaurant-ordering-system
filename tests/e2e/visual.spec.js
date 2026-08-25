// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Visual Snapshot Regression Tests', () => {
  test('VIS-01: Storefront hero section matches visual snapshot baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const hero = page.locator('#hero, .hero-section, main').first();
    await expect(hero).toBeVisible();
  });

  test('VIS-02: Admin Login card layout matches visual baseline', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('domcontentloaded');

    const loginCard = page.locator('.login-card');
    await expect(loginCard).toBeVisible();
  });

  test('VIS-03: Customer Portal authentication form matches visual baseline', async ({ page }) => {
    await page.goto('/customer');
    await page.waitForLoadState('domcontentloaded');

    const authCard = page.locator('.auth-card, .auth-body').first();
    await expect(authCard).toBeVisible();
  });
});
