import { test, expect } from '../../src/fixtures';
import { Categories, Products } from '../../src/data/catalog';
import type { ProductEntry } from '../../src/api/DemoblazeApi';

/** Lightweight contract check — keeps the suite dependency-free (no schema lib needed). */
function expectProductContract(p: ProductEntry): void {
  expect(p).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      title: expect.any(String),
      price: expect.any(Number),
      cat: expect.stringMatching(/^(phone|notebook|monitor)$/),
      desc: expect.any(String),
      img: expect.any(String),
    }),
  );
  expect(p.price).toBeGreaterThan(0);
}

test.describe('Catalog API', { tag: ['@api', '@cart'] }, () => {
  test(
    '[TC-API-005] /entries returns a well-formed product list',
    { tag: ['@smoke', '@regression'] },
    async ({ api }) => {
      const { response, items } = await api.entries();

      expect(response.status()).toBe(200);
      expect(items.length).toBeGreaterThan(0);
      items.forEach(expectProductContract);
    },
  );

  test('[TC-API-006] /view returns the requested product', { tag: '@regression' }, async ({ api }) => {
    const product = await api.view(Products.samsungGalaxyS6.id);

    expectProductContract(product);
    expect(product.title).toBe(Products.samsungGalaxyS6.name);
  });

  test('[TC-API-007] /bycat only returns products of that category', { tag: '@regression' }, async ({ api }) => {
    const phones = await api.byCategory(Categories.Phones);

    expect(phones.length).toBeGreaterThan(0);
    expect(new Set(phones.map((p) => p.cat))).toEqual(new Set([Categories.Phones]));
  });
});

test.describe('Cart API', { tag: ['@api', '@cart'] }, () => {
  test.beforeEach(async ({ api, testUser }) => {
    testUser.token = await api.loginOrFail(testUser.username, testUser.password);
    await api.clearCart(testUser.token);
  });

  test(
    '[TC-API-008] add to cart, view and delete a line',
    { tag: ['@smoke', '@regression'] },
    async ({ api, testUser }) => {
      expect((await api.addToCart(testUser.token, Products.nexus6.id)).ok()).toBe(true);

      const lines = await api.viewCart(testUser.token);
      expect(lines.map((l) => l.prod_id)).toEqual([Products.nexus6.id]);

      expect((await api.deleteItem(lines[0].id)).ok()).toBe(true);
      expect(await api.viewCart(testUser.token)).toHaveLength(0);
    },
  );

  test('[TC-API-009] each add creates a separate cart line', { tag: '@regression' }, async ({ api, testUser }) => {
    await api.addToCart(testUser.token, Products.nexus6.id);
    await api.addToCart(testUser.token, Products.nexus6.id);

    const lines = await api.viewCart(testUser.token);
    expect(lines).toHaveLength(2);
    expect(new Set(lines.map((l) => l.id)).size).toBe(2);
  });
});
