// @ts-check
const { expect } = require('@playwright/test');

class AdminPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.loginForm = page.locator('#loginForm');
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.roleButtons = page.locator('.role-btn');
    this.loginBtn = page.locator('#loginBtn');
    this.loginError = page.locator('#loginError');
    this.ordersTable = page.locator('#ordersTable, .orders-table, table');
  }

  async gotoLogin() {
    await this.page.goto('/admin/login');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async login(username, password, role = 'admin') {
    await this.gotoLogin();
    const roleBtn = this.page.locator(`.role-btn[data-role="${role}"]`);
    await roleBtn.click();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginBtn.click();
  }

  async gotoDashboard() {
    await this.page.goto('/admin');
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { AdminPage };
