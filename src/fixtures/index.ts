import { randomUUID } from 'node:crypto';
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { DemoblazeApi } from '../api/DemoblazeApi';
import { config } from '../config';
import { buildUser, type UserCredentials } from '../data/factories';
import { CartPage, HomePage, ProductPage } from '../pages';

export interface TestUser extends UserCredentials {
  token: string;
}

interface TestFixtures {
  api: DemoblazeApi;
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  authenticatedPage: Page;
}

interface WorkerFixtures {
  testUser: TestUser;
}

export async function seedGuestIdentity(context: BrowserContext): Promise<void> {
  await context.addCookies([{ name: 'user', value: randomUUID(), url: config.baseURL }]);
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  testUser: [
    async ({ playwright }, use, workerInfo) => {
      const request = await playwright.request.newContext();
      const api = new DemoblazeApi(request);

      let user: UserCredentials;
      if (config.credentials.username && config.credentials.password) {
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

  context: async ({ context }, use) => {
    await seedGuestIdentity(context);
    await use(context);
  },

  api: async ({ request }, use) => {
    await use(new DemoblazeApi(request));
  },

  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),

  authenticatedPage: async ({ page, context, api, testUser }, use) => {
    const token = await api.loginOrFail(testUser.username, testUser.password);
    testUser.token = token;
    await api.clearCart(token);
    await context.addCookies([{ name: 'tokenp_', value: token, url: config.baseURL }]);
    await use(page);
    await api.clearCart(testUser.token).catch(() => undefined);
  },
});

export { expect };
