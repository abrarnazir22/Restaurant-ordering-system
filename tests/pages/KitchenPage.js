// @ts-check
const { expect } = require('@playwright/test');

class KitchenPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.ticketsContainer = page.locator('#tickets-grid, .ticket-grid, #kitchen-orders');
  }

  async goto() {
    await this.page.goto('/kitchen');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async acceptOrder(orderNumber) {
    const ticket = this.page.locator(`.order-ticket:has-text("${orderNumber}"), .ticket-card:has-text("${orderNumber}")`);
    await expect(ticket).toBeVisible();
    const acceptBtn = ticket.locator('button:has-text("Start Preparing"), button:has-text("Accept")').first();
    await acceptBtn.click();
  }

  async markOrderReady(orderNumber) {
    const ticket = this.page.locator(`.order-ticket:has-text("${orderNumber}"), .ticket-card:has-text("${orderNumber}")`);
    await expect(ticket).toBeVisible();
    const readyBtn = ticket.locator('button:has-text("Ready For Service"), button:has-text("Mark Ready"), button:has-text("BUMP")').first();
    await readyBtn.click();
  }
}

module.exports = { KitchenPage };
