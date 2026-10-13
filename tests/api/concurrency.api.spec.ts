import { randomUUID } from 'node:crypto';
import { test, expect } from '../../src/fixtures';
import { Products } from '../../src/data/catalog';

const PARALLEL = 10;

test.describe('Concurrency & idempotency API', { tag: ['@api', '@cart', '@concurrency'] }, () => {
  test(
    '[TC-CONC-001] parallel add-to-cart requests are all persisted, none lost',
    { tag: '@regression' },
    async ({ api, shopper }) => {
      const lineIds = Array.from({ length: PARALLEL }, () => randomUUID());

      const responses = await Promise.all(lineIds.map((id) => api.addToCart(shopper.token, Products.nexus6.id, id)));

      expect(responses.every((r) => r.ok())).toBe(true);
      const lines = await api.viewCart(shopper.token);
      expect(lines).toHaveLength(PARALLEL);
      expect(new Set(lines.map((l) => l.id))).toEqual(new Set(lineIds));
    },
  );

  test(
    '[TC-CONC-002] replaying the same request in parallel creates exactly one line',
    { tag: ['@smoke', '@regression', '@idempotency'] },
    async ({ api, shopper }) => {
      const lineId = randomUUID();

      const responses = await Promise.all(
        Array.from({ length: PARALLEL }, () => api.addToCart(shopper.token, Products.nexus6.id, lineId)),
      );

      expect(responses.every((r) => r.ok())).toBe(true);
      const lines = await api.viewCart(shopper.token);
      expect(lines).toEqual([expect.objectContaining({ id: lineId, prod_id: Products.nexus6.id })]);
    },
  );

  test(
    '[TC-CONC-003] parallel deletes of the same line are safe and leave the cart empty',
    { tag: ['@regression', '@idempotency'] },
    async ({ api, shopper }) => {
      const lineId = randomUUID();
      await api.addToCart(shopper.token, Products.nexus6.id, lineId);

      const responses = await Promise.all(Array.from({ length: 5 }, () => api.deleteItem(lineId)));

      expect(responses.every((r) => r.ok())).toBe(true);
      expect(await api.viewCart(shopper.token)).toHaveLength(0);
    },
  );

  test(
    '[TC-CONC-004] placing the order twice in parallel empties the cart once without errors',
    { tag: ['@regression', '@idempotency'] },
    async ({ api, shopper }) => {
      await api.addToCart(shopper.token, Products.nexus6.id);
      await api.addToCart(shopper.token, Products.sonyVaioI5.id);

      const responses = await Promise.all([api.placeOrder(shopper.username), api.placeOrder(shopper.username)]);

      expect(responses.every((r) => r.ok())).toBe(true);
      await expect.poll(() => api.viewCart(shopper.token).then((l) => l.length), { timeout: 10_000 }).toBe(0);
    },
  );

  test.describe('Known defects', { tag: '@known-bug' }, () => {
    test('[TC-CONC-005] a reused idempotency key with a different payload is rejected', async ({ api, shopper }) => {
      test.fail(true, 'BUG-07: /addtocart silently overwrites an existing line when the same id is reused');
      const lineId = randomUUID();
      await api.addToCart(shopper.token, Products.samsungGalaxyS6.id, lineId);

      await api.addToCart(shopper.token, Products.appleMonitor24.id, lineId);

      const lines = await api.viewCart(shopper.token);
      expect(lines).toEqual([expect.objectContaining({ id: lineId, prod_id: Products.samsungGalaxyS6.id })]);
    });
  });
});
