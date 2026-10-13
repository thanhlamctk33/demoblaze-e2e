import { expect, type Locator, type Page } from '@playwright/test';
import { captureAlert } from '../../utils/dialog';

export class LoginModal {
  readonly root: Locator;
  readonly title: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;
  readonly dismissIcon: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#logInModal');
    this.title = this.root.locator('.modal-title');
    this.usernameInput = this.root.locator('#loginusername');
    this.passwordInput = this.root.locator('#loginpassword');
    this.submitButton = this.root.getByRole('button', { name: 'Log in' });
    // Header "×" and footer "Close" share the accessible name "Close", so scope each.
    this.closeButton = this.root.locator('.modal-footer').getByRole('button', { name: 'Close' });
    this.dismissIcon = this.root.locator('.modal-header button.close');
  }

  async expectOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.title).toHaveText('Log in');
  }

  async fill(username: string, password: string): Promise<void> {
    await this.expectOpen();
    // fill('') still clears the field, which is what negative tests need.
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  /** Successful login: no alert; the site stores the token and reloads. */
  async loginSuccessfully(username: string, password: string): Promise<void> {
    await this.fill(username, password);
    await this.submitButton.click();
    await expect(this.root).toBeHidden();
  }

  /** Failed login: returns the alert text so the test can assert on it. */
  async loginExpectingAlert(username: string, password: string): Promise<string> {
    await this.fill(username, password);
    return captureAlert(this.page, () => this.submitButton.click());
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }
}
