import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Site-wide top navigation. On narrow (mobile) viewports Bootstrap collapses
 * the links behind a hamburger toggle, which `ensureExpanded()` handles so the
 * same page objects work on desktop and mobile projects.
 */
export class NavBar {
  readonly toggler: Locator;
  readonly homeLink: Locator;
  readonly cartLink: Locator;
  readonly loginLink: Locator;
  readonly signUpLink: Locator;
  readonly logoutLink: Locator;
  readonly welcomeUser: Locator;

  constructor(private readonly page: Page) {
    this.toggler = page.locator('.navbar-toggler');
    this.homeLink = page.locator('.navbar-nav').getByRole('link', { name: /^Home/ });
    this.cartLink = page.locator('#cartur');
    this.loginLink = page.locator('#login2');
    this.signUpLink = page.locator('#signin2');
    this.logoutLink = page.locator('#logout2');
    this.welcomeUser = page.locator('#nameofuser');
  }

  async ensureExpanded(): Promise<void> {
    if ((await this.toggler.isVisible()) && !(await this.cartLink.isVisible())) {
      await this.toggler.click();
      await expect(this.cartLink).toBeVisible();
    }
  }

  async openLogin(): Promise<void> {
    await this.ensureExpanded();
    await this.loginLink.click();
  }

  async openSignUp(): Promise<void> {
    await this.ensureExpanded();
    await this.signUpLink.click();
  }

  async goToCart(): Promise<void> {
    await this.ensureExpanded();
    await this.cartLink.click();
    await this.page.waitForURL(/cart\.html/);
  }

  async logout(): Promise<void> {
    await this.ensureExpanded();
    await this.logoutLink.click();
  }

  async expectLoggedInAs(username: string): Promise<void> {
    await this.ensureExpanded();
    await expect(this.welcomeUser).toHaveText(`Welcome ${username}`);
    await expect(this.logoutLink).toBeVisible();
    await expect(this.loginLink).toBeHidden();
  }

  async expectLoggedOut(): Promise<void> {
    await this.ensureExpanded();
    await expect(this.loginLink).toBeVisible();
    await expect(this.signUpLink).toBeVisible();
    await expect(this.logoutLink).toBeHidden();
    await expect(this.welcomeUser).toBeHidden();
  }
}
