import { expect, type Locator, type Page } from '@playwright/test';

export abstract class Modal {
  readonly closeButton: Locator;

  protected constructor(
    protected readonly page: Page,
    readonly root: Locator,
  ) {
    this.closeButton = root.locator('.modal-footer').getByRole('button', { name: 'Close' });
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }
}
