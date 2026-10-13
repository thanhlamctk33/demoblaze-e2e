import { test, expect } from '../../src/fixtures';
import { Messages, Products } from '../../src/data/catalog';
import { buildOrder, type OrderDetails } from '../../src/data/factories';
import { acceptedOrderCases, rejectedOrderCases } from '../../src/data/cases';
import { ProductPage, type ReceiptDetails } from '../../src/pages';
import { sum } from '../../src/utils/format';

function expectReceiptFor(receipt: ReceiptDetails, order: OrderDetails): void {
  expect(receipt.name).toBe(order.name);
  expect(receipt.cardNumber.endsWith(order.card.slice(-4))).toBe(true);
}

test.describe('Checkout', { tag: '@checkout' }, () => {
  test(
    '[TC-ORDER-001] logged-in user adds a product to the cart and places an order',
    { tag: ['@smoke', '@regression', '@e2e'] },
    async ({ page, shopper, homePage, productPage, cartPage }) => {
      const product = Products.samsungGalaxyS6;
      const order = buildOrder();

      await test.step('Log in with valid credentials', async () => {
        await homePage.open();
        await homePage.login(shopper.username, shopper.password);
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
        return cartPage.orderModal.placeOrder(order);
      });

      await test.step('Verify the receipt', async () => {
        const today = await page.evaluate(() => {
          const d = new Date();
          return { day: d.getDate(), year: d.getFullYear() };
        });
        expect(receipt.id).toMatch(/^\d+$/);
        expect(receipt.amount).toBe(price);
        expectReceiptFor(receipt, order);
        const [day, , year] = receipt.date.split('/').map(Number);
        expect({ day, year }).toEqual(today);
      });

      await test.step('Confirm and verify the cart was emptied', async () => {
        await cartPage.orderModal.confirmation.confirm();
        await homePage.waitUntilReady();
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
      const prices: number[] = [];
      for (const product of [Products.nexus6, Products.appleMonitor24]) {
        prices.push(await productPage.addProductToCart(product.id));
      }

      await cartPage.open();
      await cartPage.expectLineCount(prices.length);
      expect(await cartPage.expectTotalMatchesLines()).toBe(sum(prices));
      await cartPage.openPlaceOrder();

      expect((await cartPage.orderModal.placeOrder(buildOrder())).amount).toBe(sum(prices));
    },
  );

  for (const c of acceptedOrderCases()) {
    test(`[${c.id}] order succeeds when ${c.title}`, { tag: '@regression' }, async ({ cartWith }) => {
      const cart = await cartWith(Products[c.product]);
      await cart.openPlaceOrder();

      expectReceiptFor(await cart.orderModal.placeOrder(c.order), c.order);
    });
  }

  for (const c of rejectedOrderCases()) {
    test(`[${c.id}] order is blocked when ${c.title} ${c.knownBug ? '@known-bug' : '@regression'}`, async ({
      cartWith,
    }) => {
      test.fail(!!c.knownBug, c.knownBug);
      const cart = await cartWith(Products.nexus6);
      await cart.openPlaceOrder();

      const confirmed = await cart.orderModal.submitAndCheckConfirmed(c.order);

      expect(confirmed, 'no order confirmation should be shown').toBe(false);
      await cart.open();
      await cart.expectLineCount(1);
    });
  }

  test('[TC-ORDER-008] validation message names the mandatory fields', { tag: '@regression' }, async ({ cartWith }) => {
    const cart = await cartWith(Products.nexus6);
    await cart.openPlaceOrder();

    expect(await cart.orderModal.purchaseExpectingAlert({ name: '', card: '' })).toBe(Messages.order.missingFields);
  });

  test('[TC-ORDER-009] closing the order form keeps the cart intact', { tag: '@regression' }, async ({ cartWith }) => {
    const cart = await cartWith(Products.appleMonitor24);
    await cart.openPlaceOrder();
    await cart.orderModal.fill(buildOrder());
    await cart.orderModal.close();

    await cart.open();
    await cart.expectLineCount(1);
  });

  test.describe('Known defects', { tag: '@known-bug' }, () => {
    test('[TC-ORDER-011] receipt date shows the current month', async ({ authenticatedPage, cartWith }) => {
      test.fail(true, 'BUG-01: receipt month is zero-based (JS getMonth()) — October renders as 9');
      const cart = await cartWith(Products.nexus6);
      await cart.openPlaceOrder();
      const receipt = await cart.orderModal.placeOrder(buildOrder());

      const month = await authenticatedPage.evaluate(() => new Date().getMonth() + 1);
      expect(Number(receipt.date.split('/')[1])).toBe(month);
    });

    test('[TC-ORDER-012] an order cannot be placed with an empty cart', async ({ cartWith }) => {
      test.fail(true, 'BUG-02: purchase succeeds with an empty cart (Amount: 0)');
      const cart = await cartWith();
      await cart.openPlaceOrder();

      expect(await cart.orderModal.submitAndCheckConfirmed(buildOrder())).toBe(false);
    });

    test('[TC-ORDER-014] receipt masks the credit card number', async ({ cartWith }) => {
      test.fail(true, 'BUG-05: the full card number is echoed back on the receipt');
      const cart = await cartWith(Products.nexus6);
      await cart.openPlaceOrder();
      const order = buildOrder();

      expect((await cart.orderModal.placeOrder(order)).cardNumber).not.toContain(order.card);
    });
  });
});
