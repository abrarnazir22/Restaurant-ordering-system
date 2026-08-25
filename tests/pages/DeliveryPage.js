// @ts-check
const { expect } = require('@playwright/test');

class DeliveryPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.ordersContainer = page.locator('#delivery-orders, .delivery-card, #assigned-orders');
  }

  async goto() {
    await this.page.goto('/delivery');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async completeDeliveryWithOtp(orderNumber, otp) {
    const card = this.page.locator(`.delivery-card:has-text("${orderNumber}")`);
    await expect(card).toBeVisible();
    const otpInput = card.locator('input[placeholder*="OTP"], input[name="otp"]').first();
    await otpInput.fill(otp);
    const deliverBtn = card.locator('button:has-text("Mark as Delivered"), button:has-text("Confirm Delivery")').first();
    await deliverBtn.click();
  }
}

module.exports = { DeliveryPage };
