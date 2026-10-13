import { expect, type Locator, type Page } from '@playwright/test';
import { Messages } from '../../data/catalog';

export interface ReceiptDetails {
  id: string;
  amount: number;
  cardNumber: string;
  name: string;
  date: string;
}

export class OrderConfirmation {
  readonly root: Locator;
  readonly title: Locator;
  readonly body: Locator;
  readonly okButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.sweet-alert');
    this.title = this.root.locator('h2');
    this.body = this.root.locator('p.lead');
    this.okButton = this.root.getByRole('button', { name: 'OK' });
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.title).toHaveText(Messages.order.success);
  }

  async getReceipt(): Promise<ReceiptDetails> {
    const text = await this.body.innerText();
    const field = (label: string): string => {
      const match = text.match(new RegExp(`^${label}:[ \\t]*(.*)$`, 'm'));
      if (!match) throw new Error(`Receipt is missing "${label}". Full text:\n${text}`);
      return match[1].trim();
    };
    return {
      id: field('Id'),
      amount: Number(field('Amount').replace(/[^\d.]/g, '')),
      cardNumber: field('Card Number'),
      name: field('Name'),
      date: field('Date'),
    };
  }

  async confirm(): Promise<void> {
    await expect(this.root).toHaveClass(/\bvisible\b/);
    await this.okButton.click();
    await this.page.waitForURL(/index\.html|\/$/);
  }
}
