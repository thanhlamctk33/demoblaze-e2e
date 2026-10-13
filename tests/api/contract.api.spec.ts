import { randomUUID } from 'node:crypto';
import { test, expect } from '../../src/fixtures';
import { Messages, Products } from '../../src/data/catalog';
import { buildUser } from '../../src/data/factories';
import { b64EncodeUnicode } from '../../src/utils/format';
import { expectJsonResponse, expectSchema } from '../../src/api/contract';
import { errorSchema, loginSuccessSchema, viewCartSchema } from '../../src/api/schemas';

test.describe('API contract', { tag: ['@api', '@contract'] }, () => {
  test.describe('/login', { tag: '@login' }, () => {
    test(
      '[TC-CTR-001] successful login returns an Auth_token string',
      { tag: ['@smoke', '@regression'] },
      async ({ request, testUser }) => {
        const res = await request.post('/login', {
          data: { username: testUser.username, password: b64EncodeUnicode(testUser.password) },
        });

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
        async ({ request, testUser }) => {
          const res = await request.post('/login', {
            data: { username: f.user(testUser.username), password: b64EncodeUnicode(f.pass) },
          });

          const body = await expectJsonResponse(res);
          expectSchema(body, errorSchema);
          expect(body.errorMessage).toBe(f.message);
        },
      );
    }
  });

  test.describe('/addtocart and /viewcart', { tag: '@cart' }, () => {
    test.beforeEach(async ({ api, testUser }) => {
      testUser.token = await api.loginOrFail(testUser.username, testUser.password);
      await api.clearCart(testUser.token);
    });

    test.afterEach(async ({ api, testUser }) => {
      await api.clearCart(testUser.token).catch(() => undefined);
    });

    test(
      '[TC-CTR-003] /addtocart succeeds with an empty 200 body and /viewcart returns the typed line',
      { tag: ['@smoke', '@regression'] },
      async ({ request, testUser }) => {
        const lineId = randomUUID();

        const add = await request.post('/addtocart', {
          data: { id: lineId, cookie: testUser.token, prod_id: Products.nexus6.id, flag: true },
        });
        expect(add.status()).toBe(200);
        expect(await add.text()).toBe('');

        const view = await request.post('/viewcart', { data: { cookie: testUser.token, flag: true } });
        expect(view.status()).toBe(200);
        const body = await expectJsonResponse(view);
        expectSchema(body, viewCartSchema);
        expect(body.Items).toEqual([{ id: lineId, prod_id: Products.nexus6.id, cookie: testUser.username }]);
      },
    );

    test(
      '[TC-CTR-004] /viewcart of an empty cart returns an empty Items array',
      { tag: '@regression' },
      async ({ request, testUser }) => {
        const res = await request.post('/viewcart', { data: { cookie: testUser.token, flag: true } });

        const body = await expectJsonResponse(res);
        expectSchema(body, viewCartSchema);
        expect(body.Items).toEqual([]);
      },
    );

    for (const endpoint of ['/addtocart', '/viewcart']) {
      test(
        `[TC-CTR-005] ${endpoint} with a malformed token returns the error contract`,
        { tag: '@regression' },
        async ({ request }) => {
          const res = await request.post(endpoint, {
            data: { id: randomUUID(), cookie: 'not-a-token', prod_id: Products.nexus6.id, flag: true },
          });

          const body = await expectJsonResponse(res);
          expectSchema(body, errorSchema);
          expect(body.errorMessage).toBe(Messages.api.tokenMalformed);
        },
      );
    }

    test.describe('Known defects', { tag: '@known-bug' }, () => {
      test('[TC-CTR-006] errors are reported with a 4xx status code', async ({ request }) => {
        test.fail(true, 'BUG-10: the API reports every error as HTTP 200 with an errorMessage body');
        const res = await request.post('/login', {
          data: { username: buildUser().username, password: b64EncodeUnicode('x') },
        });

        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
      });

      test('[TC-CTR-007] /addtocart rejects a product id that does not exist', async ({ request, api, testUser }) => {
        test.fail(true, 'BUG-11: /addtocart accepts any prod_id, e.g. 999999, and stores the line');
        await request.post('/addtocart', {
          data: { id: randomUUID(), cookie: testUser.token, prod_id: 999_999, flag: true },
        });

        expect(await api.viewCart(testUser.token)).toEqual([]);
      });
    });
  });
});
