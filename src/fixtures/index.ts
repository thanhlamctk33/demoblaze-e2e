import { test as base, expect, type Page } from '@playwright/test';
import { DemoblazeApi } from '../api/DemoblazeApi';
import { config } from '../config';
import { buildUser, type UserCredentials } from '../data/factories';
import { CartPage, HomePage, ProductPage } from '../pages';

/** A registered user plus a valid API token for fast setup/cleanup. */
export interface TestUser extends UserCredentials {
  token: string;
}

interface TestFixtures {
  api: DemoblazeApi;
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  /** Page already authenticated as `testUser` (token injected, UI login skipped) with an empty cart. */
  authenticatedPage: Page;
}

interface WorkerFixtures {
  /** One fresh account per worker: isolated carts, safe for parallel runs. */
  testUser: TestUser;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // ----------------------------------------------------------- worker scope

  testUser: [
    async ({ playwright }, use, workerInfo) => {
      const request = await playwright.request.newContext();
      const api = new DemoblazeApi(request);

      let user: UserCredentials;
      if (config.credentials.username && config.credentials.password) {
        // Pre-provisioned account (e.g. from CI secrets). Note: shared accounts
        // share a cart, so prefer the generated users for parallel runs.
        user = { username: config.credentials.username, password: config.credentials.password };
      } else {
        user = buildUser({ username: `qa_auto_w${workerInfo.workerIndex}_${Date.now()}` });
        const signup = await api.signup(user.username, user.password);
        if (!signup.ok) throw new Error(`Could not provision test user: ${signup.error ?? signup.status}`);
      }

      const token = await api.loginOrFail(user.username, user.password);
      await use({ ...user, token });
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  // ------------------------------------------------------------- test scope

  api: async ({ request }, use) => {
    await use(new DemoblazeApi(request));
  },

  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),

  authenticatedPage: async ({ page, context, api, testUser }, use) => {
    // A fresh token per test: an earlier UI login in the same worker may have rotated it.
    const token = await api.loginOrFail(testUser.username, testUser.password);
    testUser.token = token;
    // Start every test from an empty cart, regardless of earlier tests in this worker.
    await api.clearCart(token);
    // Reuse the session the way the site does: it reads the `tokenp_` cookie.
    await context.addCookies([{ name: 'tokenp_', value: token, url: config.baseURL }]);
    await use(page);
    await api.clearCart(testUser.token).catch(() => undefined);
  },
});

export { expect };
