// @ts-check
const { expect } = require('@playwright/test');

class StorefrontPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.brandLink = page.locator('#nav-brand, a[href="#hero"], .nav-brand');
    this.menuGrid = page.locator('#menu-grid');
    this.categoryPills = page.locator('.cat-pill');
    this.cartButton = page.locator('#nav-cart-btn, #cart-btn, [onclick*="toggleCart"]');
    this.cartPanel = page.locator('#cart-panel');
    this.cartItems = page.locator('#cart-items');
    this.cartTotal = page.locator('#cart-total');
    this.checkoutButton = page.locator('#cart-footer button, button:has-text("Checkout")').first();
    this.searchInput = page.locator('#menu-search-input, input[placeholder*="Search"]');
    this.dishModal = page.locator('#dish3d-modal');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectCategory(categoryName) {
    const pill = this.page.locator(`.cat-pill:has-text("${categoryName}")`);
    await pill.click();
    await this.page.waitForTimeout(200);
  }

  async searchMenu(keyword) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(keyword);
      await this.page.waitForTimeout(300);
    }
  }

  async addItemToCart(itemName) {
    const card = this.page.locator(`.menu-card:has-text("${itemName}")`).first();
    if (await card.isVisible()) {
      const addBtn = card.locator('.add-btn');
      await addBtn.click();
    } else {
      const firstAddBtn = this.page.locator('.menu-card .add-btn').first();
      await firstAddBtn.click();
    }
  }

  async openCart() {
    if (!await this.cartPanel.evaluate(el => el.classList.contains('open'))) {
      await this.cartButton.first().click();
      await expect(this.cartPanel).toHaveClass(/open/);
    }
  }

  async closeCart() {
    const overlay = this.page.locator('#cart-overlay');
    if (await overlay.isVisible()) {
      await overlay.click();
    }
  }

  async getCartItemCount() {
    return await this.cartItems.locator('.cart-line, .cart-item').count();
  }

  async proceedToCheckout() {
    await this.page.evaluate(() => {
      const upsell = document.getElementById('upsell-modal');
      if (upsell) upsell.classList.remove('active');
      if (typeof goToCheckout === 'function') {
        goToCheckout();
      } else if (typeof navigate === 'function') {
        navigate('checkout');
      }
    });
    await this.page.waitForSelector('#view-checkout.active', { state: 'visible', timeout: 10000 });
  }

  async fillDineInCheckout(tableNumber, name = 'Test Diner', phone = '03001234567') {
    const dineInRadio = this.page.locator('input[value="dine-in"]').first();
    if (await dineInRadio.isVisible()) await dineInRadio.click();

    const nameInput = this.page.locator('#guest-checkout-fields input[name="guestName"], input[name="guestName"]').first();
    if (await nameInput.isVisible()) await nameInput.fill(name);

    const phoneInput = this.page.locator('#guest-checkout-fields input[name="guestPhone"], input[name="guestPhone"]').first();
    if (await phoneInput.isVisible()) await phoneInput.fill(phone);
  }

  async submitOrder() {
    const placeOrderBtn = this.page.locator('#checkout-form button[type="submit"], button:has-text("Place Order")').first();
    await placeOrderBtn.click();
  }
}

module.exports = { StorefrontPage };
