import { expect, test, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { Messages } from '../data/catalog';
import { captureAlert } from '../utils/dialog';
import { parsePrice } from '../utils/format';

export class ProductPage extends BasePage {
  protected readonly path = '/prod.html';

  readonly name: Locator;
  readonly price: Locator;
  readonly description: Locator;
  readonly addToCartButton: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.locator('#tbodyid .name');
    this.price = page.locator('#tbodyid .price-container');
    this.description = page.locator('#more-information');
    this.addToCartButton = page.getByRole('link', { name: 'Add to cart' });
  }

  async openById(productId: number): Promise<void> {
    await test.step(`Open product page id=${productId}`, async () => {
      await this.page.goto(`${this.path}?idp_=${productId}`);
      await this.waitUntilReady();
    });
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.name).not.toBeEmpty();
    await expect(this.price).toContainText('$');
  }

  async getName(): Promise<string> {
    return (await this.name.innerText()).trim();
  }

  async getPrice(): Promise<number> {
    return parsePrice(await this.price.innerText());
  }

  async addToCart(): Promise<string> {
    return test.step('Add product to cart', async () => {
      await this.waitUntilReady();
      return captureAlert(this.page, () => this.addToCartButton.click());
    });
  }

  async addProductToCart(productId: number): Promise<number> {
    await this.openById(productId);
    const price = await this.getPrice();
    expect(await this.addToCart()).toMatch(Messages.cart.productAdded);
    return price;
  }
}
