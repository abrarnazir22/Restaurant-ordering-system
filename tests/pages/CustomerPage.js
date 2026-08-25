// @ts-check
const { expect } = require('@playwright/test');

class CustomerPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.authBody = page.locator('.auth-body');
    this.loginForm = page.locator('#login-form');
    this.registerForm = page.locator('#register-form');
    this.toggleAuthBtn = page.locator('#toggle-auth, button:has-text("Create an account"), button:has-text("Already have an account")');
    this.dashboardSummary = page.locator('.dashboard-summary');
    this.ordersPane = page.locator('#order-section');
    this.reservationsPane = page.locator('#reservation-list');
    this.complaintsPane = page.locator('#complaint-section');
    this.sidebarItems = page.locator('.customer-sidebar .sidebar-item');
    this.navMenuLink = page.locator('#nav-menu-link');
    this.logoutBtn = page.locator('#nav-logout-button, #logout-button');
  }

  async goto() {
    await this.page.goto('/customer');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async register(name, phone, email, password) {
    const registerTab = this.page.locator('#auth-register-tab');
    if (await registerTab.isVisible()) {
      await registerTab.click();
    }
    await this.page.waitForSelector('#register-form', { state: 'visible' });

    await this.page.locator('#register-form input[name="name"]').fill(name);
    await this.page.locator('#register-form input[name="phone"]').fill(phone);
    if (email) {
      await this.page.locator('#register-form input[name="email"]').fill(email);
    }
    await this.page.locator('#register-form input[name="password"]').fill(password);
    await this.page.locator('#register-form button[type="submit"]').click();
  }

  async login(identifier, password) {
    const loginTab = this.page.locator('#auth-login-tab');
    if (await loginTab.isVisible() && !await this.page.locator('#login-form').isVisible()) {
      await loginTab.click();
    }
    await this.page.waitForSelector('#login-form', { state: 'visible' });

    await this.page.locator('#login-form input[name="identifier"]').fill(identifier);
    await this.page.locator('#login-form input[name="password"]').fill(password);
    await this.page.locator('#login-form button[type="submit"]').click();
  }

  async selectTab(tabName) {
    const tab = this.page.locator(`.customer-sidebar [data-view="${tabName}"]`);
    await tab.click();
  }

  async submitReservation({ guestName, phone, date, time, guests, notes }) {
    await this.selectTab('reservations');
    const form = this.page.locator('#reservation-form');
    await expect(form).toBeVisible();

    if (guestName) await form.locator('input[name="guestName"]').fill(guestName);
    if (phone) await form.locator('input[name="phone"]').fill(phone);
    if (date) await form.locator('input[name="date"]').fill(date);
    if (time) await form.locator('input[name="time"]').fill(time);
    if (guests) await form.locator('select[name="guests"]').selectOption(String(guests));
    if (notes) await form.locator('textarea[name="notes"]').fill(notes);

    await form.locator('button[type="submit"]').click();
  }

  async submitComplaint(subject, message, orderNumber = '') {
    await this.selectTab('complaints');
    const newBtn = this.page.locator('button:has-text("New complaint")').first();
    if (await newBtn.isVisible()) {
      await newBtn.click();
    }
    const form = this.page.locator('#complaint-form');
    if (await form.isVisible()) {
      if (orderNumber) await form.locator('input[name="orderNumber"]').fill(orderNumber);
      if (subject) await form.locator('input[name="subject"], select[name="subject"]').fill(subject);
      await form.locator('textarea[name="message"]').fill(message);
      await form.locator('button[type="submit"]').click();
    }
  }

  async logout() {
    if (await this.logoutBtn.first().isVisible()) {
      await this.logoutBtn.first().click();
    }
  }
}

module.exports = { CustomerPage };
