import { test, expect } from '../../src/fixtures';
import { Messages, Products } from '../../src/data/catalog';
import { buildOrder } from '../../src/data/factories';
import { CartPage, ProductPage } from '../../src/pages';

/**
 * Place Order (checkout) — UI.
 * TC-ORDER-001 is the requested demo: log in with valid credentials,
 * add to cart, then place an order — validated end to end.
 */
test.describe('Checkout', { tag: '@checkout' }, () => {
  test(
    '[TC-ORDER-001] logged-in user adds a product to the cart and places an order',
    { tag: ['@smoke', '@regression', '@e2e'] },
    async ({ page, api, testUser, homePage, productPage, cartPage }) => {
      const product = Products.samsungGalaxyS6;
      const order = buildOrder();

      await test.step('Precondition: user starts with an empty cart', async () => {
        await api.clearCart(await api.loginOrFail(testUser.username, testUser.password));
      });

      await test.step('Log in with valid credentials', async () => {
        await homePage.open();
        await homePage.login(testUser.username, testUser.password);
      });

      const price = await test.step('Add product to cart', async () => {
        await homePage.openProduct(product.name);
        await expect(productPage.name).toHaveText(product.name);
        const p = await productPage.getPrice();
        expect(await productPage.addToCart()).toMatch(Messages.cart.productAdded);
        return p;
      });

      await test.step('Verify the cart', async () => {
        await productPage.nav.goToCart();
        await cartPage.expectLineCount(1);
        expect(await cartPage.getLines()).toEqual([{ title: product.name, price }]);
        expect(await cartPage.expectTotalMatchesLines()).toBe(price);
      });

      const receipt = await test.step('Place the order', async () => {
        await cartPage.openPlaceOrder();
        expect(await cartPage.orderModal.getDisplayedTotal()).toBe(price);
        const confirmation = await cartPage.orderModal.purchase(order);
        return confirmation.getReceipt();
      });

      await test.step('Verify the receipt', async () => {
        const today = await page.evaluate(() => {
          const d = new Date();
          return { day: d.getDate(), year: d.getFullYear() };
        });
        expect(receipt.id).toMatch(/^\d+$/);
        expect(receipt.amount).toBe(price);
        expect(receipt.name).toBe(order.name);
        // Last 4 digits must match (passes whether or not the number is masked — see TC-ORDER-014).
        expect(receipt.cardNumber.endsWith(order.card.slice(-4))).toBe(true);
        const [day, , year] = receipt.date.split('/').map(Number);
        expect({ day, year }).toEqual(today);
      });

      await test.step('Confirm and verify the cart was emptied', async () => {
        await cartPage.orderModal.confirmation.confirm();
        await homePage.waitUntilReady();
        // The cart is cleared by an async request fired on purchase: re-check until it settles.
        await expect(async () => {
          await cartPage.open();
          await cartPage.expectLineCount(0);
        }).toPass({ timeout: 20_000 });
      });
    },
  );

  test(
    '[TC-ORDER-002] guest can order several products and is charged the cart total',
    { tag: '@regression' },
    async ({ page, cartPage }) => {
      const productPage = new ProductPage(page);
      let expected = 0;
      for (const p of [Products.nexus6, Products.appleMonitor24]) {
        await productPage.openById(p.id);
        expected += await productPage.getPrice();
        expect(await productPage.addToCart()).toMatch(Messages.cart.productAdded);
      }

      await cartPage.open();
      await cartPage.expectLineCount(2);
      expect(await cartPage.expectTotalMatchesLines()).toBe(expected);
      await cartPage.openPlaceOrder();
      const receipt = await (await cartPage.orderModal.purchase(buildOrder())).getReceipt();

      expect(receipt.amount).toBe(expected);
    },
  );

  test(
    '[TC-ORDER-003] order succeeds with only the mandatory fields (name, card)',
    { tag: '@regression' },
    async ({ authenticatedPage, api, testUser }) => {
      await api.addToCart(testUser.token, Products.nokiaLumia1520.id);
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.openPlaceOrder();

      const order = buildOrder({ country: '', city: '', month: '', year: '' });
      const receipt = await (await cart.orderModal.purchase(order)).getReceipt();

      expect(receipt.name).toBe(order.name);
    },
  );

  // Data-driven negative paths for the mandatory-field validation.
  const invalidOrders = [
    { id: 'TC-ORDER-004', title: 'name is empty', overrides: { name: '' } },
    { id: 'TC-ORDER-005', title: 'credit card is empty', overrides: { card: '' } },
    {
      id: 'TC-ORDER-006',
      title: 'all fields are empty',
      overrides: { name: '', country: '', city: '', card: '', month: '', year: '' },
    },
  ];
  for (const c of invalidOrders) {
    test(
      `[${c.id}] order is blocked when ${c.title}`,
      { tag: '@regression' },
      async ({ authenticatedPage, api, testUser }) => {
        await api.addToCart(testUser.token, Products.nexus6.id);
        const cart = new CartPage(authenticatedPage);
        await cart.open();
        await cart.expectLineCount(1);
        await cart.openPlaceOrder();

        const confirmed = await cart.orderModal.submitAndCheckConfirmed(buildOrder(c.overrides));

        expect(confirmed, 'no order confirmation should be shown').toBe(false);
        await cart.open();
        await cart.expectLineCount(1); // nothing was purchased, cart untouched
      },
    );
  }

  test(
    '[TC-ORDER-008] validation message names the mandatory fields',
    { tag: '@regression' },
    async ({ authenticatedPage, api, testUser }) => {
      await api.addToCart(testUser.token, Products.nexus6.id);
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.openPlaceOrder();

      expect(await cart.orderModal.purchaseExpectingAlert({ name: '', card: '' })).toBe(Messages.order.missingFields);
    },
  );

  test(
    '[TC-ORDER-009] closing the order form keeps the cart intact',
    { tag: '@regression' },
    async ({ authenticatedPage, api, testUser }) => {
      await api.addToCart(testUser.token, Products.appleMonitor24.id);
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.openPlaceOrder();
      await cart.orderModal.fill(buildOrder());
      await cart.orderModal.close();

      await cart.open();
      await cart.expectLineCount(1);
    },
  );

  test(
    '[TC-ORDER-010] unicode and special characters in the name are echoed safely',
    { tag: '@regression' },
    async ({ authenticatedPage, api, testUser }) => {
      await api.addToCart(testUser.token, Products.samsungGalaxyS6.id);
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.openPlaceOrder();

      const order = buildOrder({ name: `Nguyễn Văn Ánh <b>&"'` });
      const receipt = await (await cart.orderModal.purchase(order)).getReceipt();

      expect(receipt.name).toBe(order.name);
    },
  );

  // ---------------------------------------------------------------------------
  // Known defects. Marked with test.fail(): they PASS while the bug exists and
  // turn red ("expected to fail but passed") the day it is fixed, so the team
  // is prompted to promote them to regular regression tests.
  // ---------------------------------------------------------------------------
  test.describe('Known defects', { tag: '@known-bug' }, () => {
    test('[TC-ORDER-011] receipt date shows the current month', async ({ authenticatedPage, api, testUser }) => {
      test.fail(true, 'BUG-01: receipt month is zero-based (JS getMonth()) — October renders as 9');
      await api.addToCart(testUser.token, Products.nexus6.id);
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.openPlaceOrder();
      const receipt = await (await cart.orderModal.purchase(buildOrder())).getReceipt();

      const month = await authenticatedPage.evaluate(() => new Date().getMonth() + 1);
      expect(Number(receipt.date.split('/')[1])).toBe(month);
    });

    test('[TC-ORDER-012] an order cannot be placed with an empty cart', async ({ authenticatedPage }) => {
      test.fail(true, 'BUG-02: purchase succeeds with an empty cart (Amount: 0)');
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(0);
      await cart.openPlaceOrder();

      expect(await cart.orderModal.submitAndCheckConfirmed(buildOrder())).toBe(false);
    });

    test('[TC-ORDER-007] order is blocked when name is whitespace only', async ({
      authenticatedPage,
      api,
      testUser,
    }) => {
      test.fail(true, 'BUG-04: a whitespace-only name passes the mandatory-field check');
      await api.addToCart(testUser.token, Products.nexus6.id);
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.openPlaceOrder();

      expect(await cart.orderModal.submitAndCheckConfirmed(buildOrder({ name: '   ' }))).toBe(false);
    });

    test('[TC-ORDER-013] credit card number must be numeric', async ({ authenticatedPage, api, testUser }) => {
      test.fail(true, 'BUG-03: card field accepts any text, no format validation');
      await api.addToCart(testUser.token, Products.nexus6.id);
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.openPlaceOrder();

      expect(await cart.orderModal.submitAndCheckConfirmed(buildOrder({ card: 'not-a-card' }))).toBe(false);
    });

    test('[TC-ORDER-014] receipt masks the credit card number', async ({ authenticatedPage, api, testUser }) => {
      test.fail(true, 'BUG-05: the full card number is echoed back on the receipt');
      await api.addToCart(testUser.token, Products.nexus6.id);
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(1);
      await cart.openPlaceOrder();
      const order = buildOrder();
      const receipt = await (await cart.orderModal.purchase(order)).getReceipt();

      expect(receipt.cardNumber).not.toContain(order.card);
    });
  });
});
