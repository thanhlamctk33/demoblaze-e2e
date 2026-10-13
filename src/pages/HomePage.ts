import { expect, test, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  protected readonly path = '/';

  readonly productCards: Locator;
  readonly productTitles: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;

  constructor(page: Page) {
    super(page);
    this.productCards = page.locator('#tbodyid .card');
    this.productTitles = page.locator('#tbodyid .card-title a');
    this.nextPageButton = page.locator('#next2');
    this.previousPageButton = page.locator('#prev2');
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible();
  }

  productLink(name: string): Locator {
    return this.productTitles.filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`) });
  }

  async openProduct(name: string): Promise<void> {
    await test.step(`Open product "${name}"`, async () => {
      await this.waitUntilReady();
      await this.productLink(name).click();
      await this.page.waitForURL(/prod\.html/);
    });
  }

  async filterByCategory(label: 'Phones' | 'Laptops' | 'Monitors'): Promise<void> {
    await test.step(`Filter catalogue by "${label}"`, async () => {
      const before = await this.productTitles.allTextContents();
      await this.page.getByRole('link', { name: label, exact: true }).click();
      await expect.poll(async () => (await this.productTitles.allTextContents()).join('|')).not.toBe(before.join('|'));
    });
  }

  async visibleProductNames(): Promise<string[]> {
    await this.waitUntilReady();
    return (await this.productTitles.allTextContents()).map((t) => t.trim());
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
