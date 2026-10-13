import { expect, type Locator, type Page } from '@playwright/test';
import { captureAlert } from '../../utils/dialog';

export class SignUpModal {
  readonly root: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#signInModal');
    this.usernameInput = this.root.locator('#sign-username');
    this.passwordInput = this.root.locator('#sign-password');
    this.submitButton = this.root.getByRole('button', { name: 'Sign up' });
  }

  /** Every sign-up outcome (success or failure) is reported via an alert. */
  async signUp(username: string, password: string): Promise<string> {
    await expect(this.root).toBeVisible();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    return captureAlert(this.page, () => this.submitButton.click());
  }
}
