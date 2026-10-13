import { randomUUID } from 'node:crypto';
import { test, expect } from '../../src/fixtures';
import { Messages, Products } from '../../src/data/catalog';
import { buildUser } from '../../src/data/factories';
import { expectJsonResponse, expectSchema } from '../../src/api/contract';
import { errorSchema, loginSuccessSchema, viewCartSchema } from '../../src/api/schemas';
import type { DemoblazeApi } from '../../src/api/DemoblazeApi';

const MALFORMED_TOKEN = 'not-a-token';
const UNKNOWN_PRODUCT_ID = 999_999;

test.describe('API contract', { tag: ['@api', '@contract'] }, () => {
  test.describe('/login', { tag: '@login' }, () => {
    test(
      '[TC-CTR-001] successful login returns an Auth_token string',
      { tag: ['@smoke', '@regression'] },
      async ({ api, testUser }) => {
        const res = await api.loginRaw(testUser.username, testUser.password);

        expect(res.status()).toBe(200);
        expectSchema(await expectJsonResponse(res), loginSuccessSchema);
      },
    );

    const failures = [
      { name: 'wrong password', message: Messages.login.wrongPassword, user: (u: string) => u, pass: 'wrong-pass' },
      { name: 'unknown user', message: Messages.login.userNotFound, user: () => buildUser().username, pass: 'x' },
    ];
    for (const f of failures) {
      test(
        `[TC-CTR-002] failed login (${f.name}) returns the error contract`,
        { tag: '@regression' },
        async ({ api, testUser }) => {
          const res = await api.loginRaw(f.user(testUser.username), f.pass);

          const body = await expectJsonResponse(res);
          expectSchema(body, errorSchema);
          expect(body.errorMessage).toBe(f.message);
        },
      );
    }
  });

  test.describe('/addtocart and /viewcart', { tag: '@cart' }, () => {
    test(
      '[TC-CTR-003] /addtocart succeeds with an empty 200 body and /viewcart returns the typed line',
      { tag: ['@smoke', '@regression'] },
      async ({ api, shopper }) => {
        const lineId = randomUUID();

        const add = await api.addToCart(shopper.token, Products.nexus6.id, lineId);
        expect(add.status()).toBe(200);
        expect(await add.text()).toBe('');

        const view = await api.viewCartRaw(shopper.token);
        expect(view.status()).toBe(200);
        const body = await expectJsonResponse(view);
        expectSchema(body, viewCartSchema);
        expect(body.Items).toEqual([{ id: lineId, prod_id: Products.nexus6.id, cookie: shopper.username }]);
      },
    );

    test(
      '[TC-CTR-004] /viewcart of an empty cart returns an empty Items array',
      { tag: '@regression' },
      async ({ api, shopper }) => {
        const res = await api.viewCartRaw(shopper.token);

        const body = await expectJsonResponse(res);
        expectSchema(body, viewCartSchema);
        expect(body.Items).toEqual([]);
      },
    );

    const malformedTokenCalls = {
      '/addtocart': (api: DemoblazeApi) => api.addToCart(MALFORMED_TOKEN, Products.nexus6.id),
      '/viewcart': (api: DemoblazeApi) => api.viewCartRaw(MALFORMED_TOKEN),
    };
    for (const [endpoint, call] of Object.entries(malformedTokenCalls)) {
      test(
        `[TC-CTR-005] ${endpoint} with a malformed token returns the error contract`,
        { tag: '@regression' },
        async ({ api }) => {
          const res = await call(api);

          const body = await expectJsonResponse(res);
          expectSchema(body, errorSchema);
          expect(body.errorMessage).toBe(Messages.api.tokenMalformed);
        },
      );
    }

    test.describe('Known defects', { tag: '@known-bug' }, () => {
      test('[TC-CTR-006] errors are reported with a 4xx status code', async ({ api }) => {
        test.fail(true, 'BUG-10: the API reports every error as HTTP 200 with an errorMessage body');
        const res = await api.loginRaw(buildUser().username, 'x');

        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
      });

      test('[TC-CTR-007] /addtocart rejects a product id that does not exist', async ({ api, shopper }) => {
        test.fail(true, 'BUG-11: /addtocart accepts any prod_id, e.g. 999999, and stores the line');
        await api.addToCart(shopper.token, UNKNOWN_PRODUCT_ID);

        expect(await api.viewCart(shopper.token)).toEqual([]);
      });
    });
  });
});
