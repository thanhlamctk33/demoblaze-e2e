import { expect, test, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { PlaceOrderModal } from './components/PlaceOrderModal';
import { parsePrice, sum } from '../utils/format';

export interface CartLine {
  title: string;
  price: number;
}

export class CartPage extends BasePage {
  protected readonly path = '/cart.html';

  readonly rows: Locator;
  readonly total: Locator;
  readonly placeOrderButton: Locator;
  readonly orderModal: PlaceOrderModal;

  constructor(page: Page) {
    super(page);
    this.rows = page.locator('#tbodyid tr');
    this.total = page.locator('#totalp');
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order' });
    this.orderModal = new PlaceOrderModal(page);
  }

  private serverLineCount: Promise<number> | undefined;

  private trackCartLoad(): void {
    this.serverLineCount = this.page
      .waitForResponse((r) => r.url().endsWith('/viewcart') && r.request().method() === 'POST')
      .then(async (r) => ((await r.json()) as { Items?: unknown[] }).Items?.length ?? 0);
    this.serverLineCount.catch(() => undefined);
  }

  override async open(): Promise<void> {
    this.trackCartLoad();
    await super.open();
  }

  async waitUntilReady(): Promise<void> {
    await expect(this.placeOrderButton).toBeVisible();
    if (this.serverLineCount) await this.serverLineCount;
  }

  async expectLineCount(count: number): Promise<void> {
    if (this.serverLineCount) {
      expect(await this.serverLineCount, `backend cart should contain ${count} line(s)`).toBe(count);
    }
    await expect(this.rows, `cart should render ${count} line(s)`).toHaveCount(count, { timeout: 15_000 });
  }

  async getLines(): Promise<CartLine[]> {
    const lines: CartLine[] = [];
    for (const row of await this.rows.all()) {
      const cells = row.locator('td');
      lines.push({
        title: (await cells.nth(1).innerText()).trim(),
        price: parsePrice(await cells.nth(2).innerText()),
      });
    }
    return lines;
  }

  async getTotal(): Promise<number | null> {
    const text = (await this.total.innerText()).trim();
    return text === '' ? null : parsePrice(text);
  }

  async expectTotalMatchesLines(): Promise<number> {
    const expected = sum((await this.getLines()).map((l) => l.price));
    await expect
      .poll(() => this.getTotal(), { message: 'cart total should equal the sum of line prices' })
      .toBe(expected);
    return expected;
  }

  lineByTitle(title: string): Locator {
    return this.rows.filter({ has: this.page.locator('td', { hasText: title }) });
  }

  async deleteLine(title: string, expectedRemaining: number): Promise<void> {
    await test.step(`Delete "${title}" from cart`, async () => {
      this.trackCartLoad();
      await this.lineByTitle(title).first().getByRole('link', { name: 'Delete' }).click();
      await this.expectLineCount(expectedRemaining);
    });
  }

  async openPlaceOrder(): Promise<void> {
    await this.placeOrderButton.click();
    await this.orderModal.expectOpen();
  }
}
