import { expect, test, type Locator, type Page } from '@playwright/test';
import type { OrderDetails } from '../../data/factories';
import { captureAlert } from '../../utils/dialog';
import { parsePrice } from '../../utils/format';
import { OrderConfirmation } from './OrderConfirmation';

export class PlaceOrderModal {
  readonly root: Locator;
  readonly totalLabel: Locator;
  readonly name: Locator;
  readonly country: Locator;
  readonly city: Locator;
  readonly card: Locator;
  readonly month: Locator;
  readonly year: Locator;
  readonly purchaseButton: Locator;
  readonly closeButton: Locator;
  readonly confirmation: OrderConfirmation;

  constructor(private readonly page: Page) {
    this.root = page.locator('#orderModal');
    this.totalLabel = this.root.locator('#totalm');
    this.name = this.root.locator('#name');
    this.country = this.root.locator('#country');
    this.city = this.root.locator('#city');
    this.card = this.root.locator('#card');
    this.month = this.root.locator('#month');
    this.year = this.root.locator('#year');
    this.purchaseButton = this.root.getByRole('button', { name: 'Purchase' });
    this.closeButton = this.root.locator('.modal-footer').getByRole('button', { name: 'Close' });
    this.confirmation = new OrderConfirmation(page);
  }

  async expectOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.name).toBeEditable();
  }

  async getDisplayedTotal(): Promise<number | null> {
    const text = (await this.totalLabel.innerText()).trim();
    return /\d/.test(text) ? parsePrice(text) : null;
  }

  async fill(details: Partial<OrderDetails>): Promise<void> {
    await test.step('Fill order form', async () => {
      const fields: [Locator, string | undefined][] = [
        [this.name, details.name],
        [this.country, details.country],
        [this.city, details.city],
        [this.card, details.card],
        [this.month, details.month],
        [this.year, details.year],
      ];
      for (const [field, value] of fields) {
        await field.fill(value ?? '');
      }
    });
  }

  async purchase(details: OrderDetails): Promise<OrderConfirmation> {
    return test.step('Submit order', async () => {
      await this.fill(details);
      await this.purchaseButton.click();
      await this.confirmation.expectVisible();
      return this.confirmation;
    });
  }

  async purchaseExpectingAlert(details: Partial<OrderDetails>): Promise<string> {
    await this.fill(details);
    return captureAlert(this.page, () => this.purchaseButton.click());
  }

  async submitAndCheckConfirmed(details: Partial<OrderDetails>, waitMs = 5_000): Promise<boolean> {
    await this.fill(details);
    const acceptAny = (d: import('@playwright/test').Dialog) => void d.accept().catch(() => undefined);
    this.page.on('dialog', acceptAny);
    try {
      await this.purchaseButton.click();
      return await this.confirmation.root
        .waitFor({ state: 'visible', timeout: waitMs })
        .then(() => true)
        .catch(() => false);
    } finally {
      this.page.off('dialog', acceptAny);
    }
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }
}
