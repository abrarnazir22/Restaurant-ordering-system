// @ts-check
const { test, expect } = require('@playwright/test');
const { CustomerPage } = require('../pages/CustomerPage');

test.describe('Reservations Flow & Time Validation', () => {
  function getFutureDate(daysAhead = 1) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  }

  function getPastDate(daysBehind = 1) {
    const d = new Date();
    d.setDate(d.getDate() - daysBehind);
    return d.toISOString().slice(0, 10);
  }

  test.beforeEach(async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.goto();
    await page.evaluate(() => localStorage.clear());
    await customerPage.goto();

    const timestamp = Date.now();
    await customerPage.register(
      'Diana Table',
      `0300${String(timestamp).slice(-7)}`,
      `diana.${timestamp}@example.com`,
      'password123'
    );
    await expect(page.locator('.customer-topbar h1, .dashboard-summary').first()).toBeVisible({ timeout: 10000 });
  });

  test('RES-01: Submit table reservation with valid future date and time succeeds', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.submitReservation({
      guestName: 'Diana Table',
      phone: '03001234567',
      date: getFutureDate(2),
      time: '19:00',
      guests: 4,
      notes: 'Window seat please'
    });

    // Verify toast or list item appearance
    await expect(page.locator('.toast, #toast-container, #reservation-list, .order-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('RES-02: Submitting reservation with past date is rejected with error', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.submitReservation({
      guestName: 'Past User',
      phone: '03009876543',
      date: getPastDate(2),
      time: '10:00',
      guests: 2,
      notes: 'Past request'
    });

    // Verify error is displayed
    await expect(page.locator('#error-reservation, .field-error, .toast-error, .toast').first()).toContainText(/future reservation date|passed|future|Cannot book/i);
  });

  test('RES-03: Submitting reservation with past time on today\'s date is rejected', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    const todayStr = new Date().toISOString().slice(0, 10);
    await customerPage.submitReservation({
      guestName: 'Today Past',
      phone: '03009876543',
      date: todayStr,
      time: '00:01', // midnight past time
      guests: 2,
      notes: 'Passed time request'
    });

    await expect(page.locator('#error-reservation, .field-error, .toast-error, .toast').first()).toContainText(/already passed|future|Cannot book/i);
  });

  test('RES-04: Customer reservation history displays status badge', async ({ page }) => {
    const customerPage = new CustomerPage(page);
    await customerPage.selectTab('reservations');
    await expect(page.locator('#reservation-list, .reservation-list, .order-card').first()).toBeVisible({ timeout: 10000 });
  });
});
