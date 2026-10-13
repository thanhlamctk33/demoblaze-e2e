import { randomUUID } from 'node:crypto';
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { DemoblazeApi } from '../api/DemoblazeApi';
import { config } from '../config';
import type { Product } from '../data/catalog';
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
  shopper: TestUser;
  authenticatedPage: Page;
  cartWith: (...products: Product[]) => Promise<CartPage>;
}

interface WorkerFixtures {
  testUser: TestUser;
}

async function setSiteCookie(context: BrowserContext, name: string, value: string): Promise<void> {
  await context.addCookies([{ name, value, url: config.baseURL }]);
}

export async function seedGuestIdentity(context: BrowserContext): Promise<void> {
  await setSiteCookie(context, 'user', randomUUID());
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

  shopper: async ({ api, testUser }, use) => {
    testUser.token = await api.loginOrFail(testUser.username, testUser.password);
    await api.clearCart(testUser.token);
    await use(testUser);
    await api.clearCart(testUser.token).catch(() => undefined);
  },

  authenticatedPage: async ({ page, context, shopper }, use) => {
    await setSiteCookie(context, 'tokenp_', shopper.token);
    await use(page);
  },

  cartWith: async ({ authenticatedPage, api, shopper }, use) => {
    await use(async (...products) => {
      for (const product of products) {
        expect((await api.addToCart(shopper.token, product.id)).ok(), `add ${product.name} via API`).toBe(true);
      }
      const cart = new CartPage(authenticatedPage);
      await cart.open();
      await cart.expectLineCount(products.length);
      return cart;
    });
  },
});

export { expect };
