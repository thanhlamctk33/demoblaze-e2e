import { test, expect } from '../../src/fixtures';
import { Messages, Products } from '../../src/data/catalog';
import { CartPage, HomePage, ProductPage } from '../../src/pages';
import { config } from '../../src/config';
import type { Page } from '@playwright/test';

/**
 * Cart feature — UI.
 * Test IDs map 1:1 to the "Cart" sheet of test-cases/DemoBlaze_TestCases.xlsx.
 */

/** Adds a product through the UI and returns the price shown on its page. */
async function addProductViaUi(page: Page, productId: number): Promise<number> {
  const productPage = new ProductPage(page);
  await productPage.openById(productId);
  const price = await productPage.getPrice();
  expect(await productPage.addToCart()).toMatch(Messages.cart.productAdded);
  return price;
}

test.describe('Cart — guest user', { tag: '@cart' }, () => {
  test(
    '[TC-CART-001] guest can add a product from the catalogue to the cart',
    { tag: ['@smoke', '@regression'] },
    async ({ homePage, productPage, cartPage }) => {
      const product = Products.samsungGalaxyS6;
      await homePage.open();
      await homePage.openProduct(product.name);
      const price = await productPage.getPrice();

      expect(await productPage.addToCart()).toMatch(Messages.cart.productAdded);

      await productPage.nav.goToCart();
      await cartPage.expectLineCount(1);
      expect(await cartPage.getLines()).toEqual([{ title: product.name, price }]);
      expect(await cartPage.expectTotalMatchesLines()).toBe(price);
    },
  );

  test('[TC-CART-002] empty cart shows no lines and no total', { tag: '@regression' }, async ({ cartPage }) => {
    await cartPage.open();

    await cartPage.expectLineCount(0);
    expect(await cartPage.getTotal()).toBeNull();
  });

  test(
    '[TC-CART-003] cart of one guest is not visible to another guest',
    { tag: '@regression' },
    async ({ page, browser }) => {
      await addProductViaUi(page, Products.nexus6.id);

      // A brand-new browser context = a different guest with a different cart cookie.
      const otherContext = await browser.newContext({ baseURL: config.baseURL });
      const otherCart = new CartPage(await otherContext.newPage());
      await otherCart.open();
      await otherCart.expectLineCount(0);
      await otherContext.close();
    },
  );
});

test.describe('Cart — logged-in user', { tag: '@cart' }, () => {
  test(
    '[TC-CART-004] logged-in user can add a product',
    { tag: ['@smoke', '@regression'] },
    async ({ authenticatedPage, testUser }) => {
      const home = new HomePage(authenticatedPage);
      await home.open();
      await home.nav.expectLoggedInAs(testUser.username);

      const price = await addProductViaUi(authenticatedPage, Products.nokiaLumia1520.id);

      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      expect(await cart.getLines()).toEqual([{ title: Products.nokiaLumia1520.name, price }]);
    },
  );

  test(
    '[TC-CART-005] total equals the sum of multiple different products',
    { tag: '@regression' },
    async ({ authenticatedPage }) => {
      const items = [Products.samsungGalaxyS6, Products.sonyVaioI5, Products.appleMonitor24];
      const prices: number[] = [];
      for (const item of items) prices.push(await addProductViaUi(authenticatedPage, item.id));

      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(items.length);
      const titles = (await cart.getLines()).map((l) => l.title).sort();
      expect(titles).toEqual(items.map((i) => i.name).sort());
      expect(await cart.expectTotalMatchesLines()).toBe(prices.reduce((a, b) => a + b, 0));
    },
  );

  test(
    '[TC-CART-006] adding the same product twice creates two lines',
    { tag: '@regression' },
    async ({ authenticatedPage }) => {
      const price = await addProductViaUi(authenticatedPage, Products.nexus6.id);
      await addProductViaUi(authenticatedPage, Products.nexus6.id);

      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(2);
      expect(await cart.expectTotalMatchesLines()).toBe(price * 2);
    },
  );

  test(
    '[TC-CART-007] deleting a line removes it and updates the total',
    { tag: '@regression' },
    async ({ authenticatedPage, api, testUser }) => {
      // Seed through the API: faster and keeps this test focused on deletion.
      await api.addToCart(testUser.token, Products.samsungGalaxyS6.id);
      await api.addToCart(testUser.token, Products.appleMonitor24.id);
      const keptPrice = (await api.view(Products.appleMonitor24.id)).price;

      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(2);
      await cart.deleteLine(Products.samsungGalaxyS6.name, 1);

      expect((await cart.getLines()).map((l) => l.title)).toEqual([Products.appleMonitor24.name]);
      expect(await cart.expectTotalMatchesLines()).toBe(keptPrice);
    },
  );

  test(
    '[TC-CART-008] deleting the last line leaves an empty cart',
    { tag: '@regression' },
    async ({ authenticatedPage, api, testUser }) => {
      await api.addToCart(testUser.token, Products.nexus6.id);

      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.deleteLine(Products.nexus6.name, 0);

      expect(await cart.getTotal()).toBeNull();
    },
  );

  test(
    '[TC-CART-009] cart persists across logout and login',
    { tag: '@regression' },
    async ({ authenticatedPage, testUser }) => {
      await addProductViaUi(authenticatedPage, Products.sonyVaioI5.id);
      const home = new HomePage(authenticatedPage);
      await home.open();
      await home.nav.logout();
      await home.nav.expectLoggedOut();

      await home.open();
      await home.login(testUser.username, testUser.password);

      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      expect((await cart.getLines())[0].title).toBe(Products.sonyVaioI5.name);
    },
  );

  test(
    '[TC-CART-010] items added via API are rendered in the UI cart',
    { tag: ['@regression', '@hybrid'] },
    async ({ authenticatedPage, api, testUser }) => {
      const ids = [Products.samsungGalaxyS6.id, Products.nokiaLumia1520.id];
      for (const id of ids) expect((await api.addToCart(testUser.token, id)).ok()).toBeTruthy();
      const expectedTotal = (await Promise.all(ids.map((id) => api.view(id)))).reduce((acc, p) => acc + p.price, 0);

      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(ids.length);
      expect(await cart.expectTotalMatchesLines()).toBe(expectedTotal);
    },
  );
});
