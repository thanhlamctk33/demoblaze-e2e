import { test, expect } from '../../src/fixtures';
import { Products } from '../../src/data/catalog';
import { buildOrder } from '../../src/data/factories';
import { ProductPage } from '../../src/pages';
import { acceptAllDialogs } from '../../src/utils/dialog';
import { trackRequests } from '../../src/utils/network';

test.describe('Concurrency & double submit — UI', { tag: ['@cart', '@concurrency'] }, () => {
  test(
    '[TC-CONC-006] the same user adding from two tabs at once keeps both items',
    { tag: '@regression' },
    async ({ authenticatedPage, context, api, shopper }) => {
      const tabs = [authenticatedPage, await context.newPage()];
      tabs.forEach(acceptAllDialogs);
      const products = [Products.nexus6, Products.sonyVaioI5];
      const pages = tabs.map((tab) => new ProductPage(tab));
      await Promise.all(pages.map((p, i) => p.openById(products[i].id)));
      const trackers = tabs.map((tab) => trackRequests(tab, '/addtocart'));

      await Promise.all(pages.map((p) => p.addToCartButton.click()));
      await Promise.all(trackers.map((t) => t.settled()));

      const lines = await api.viewCart(shopper.token);
      expect(lines.map((l) => l.prod_id).sort()).toEqual(products.map((p) => p.id).sort());
    },
  );

  test.describe('Known defects', { tag: '@known-bug' }, () => {
    test('[TC-CONC-007] double-clicking "Add to cart" adds the product once', async ({
      authenticatedPage,
      api,
      shopper,
    }) => {
      test.fail(true, 'BUG-08: "Add to cart" has no double-submit protection — each click creates a line');
      acceptAllDialogs(authenticatedPage);
      const productPage = new ProductPage(authenticatedPage);
      await productPage.openById(Products.nexus6.id);
      const tracker = trackRequests(authenticatedPage, '/addtocart');

      await productPage.addToCartButton.dblclick();
      await tracker.settled();

      expect(await api.viewCart(shopper.token)).toHaveLength(1);
    });

    test('[TC-CONC-008] double-clicking "Purchase" submits the order once', async ({ authenticatedPage, cartWith }) => {
      test.fail(true, 'BUG-09: "Purchase" stays enabled after the first click — the order is submitted twice');
      const cart = await cartWith(Products.nexus6);
      await cart.openPlaceOrder();
      await cart.orderModal.fill(buildOrder());
      const tracker = trackRequests(authenticatedPage, '/deletecart');

      await cart.orderModal.purchaseButton.dblclick();
      await cart.orderModal.confirmation.expectVisible();

      expect(await tracker.settled()).toBe(1);
    });
  });
});
