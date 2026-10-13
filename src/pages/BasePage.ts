import { test, type Page } from '@playwright/test';
import { NavBar } from './components/NavBar';
import { LoginModal } from './components/LoginModal';
import { SignUpModal } from './components/SignUpModal';

/**
 * Shared behaviour for every page: the site-wide navbar and its auth modals
 * are available on all pages, so they are composed here once.
 */
export abstract class BasePage {
  readonly nav: NavBar;
  readonly loginModal: LoginModal;
  readonly signUpModal: SignUpModal;

  protected abstract readonly path: string;

  constructor(protected readonly page: Page) {
    this.nav = new NavBar(page);
    this.loginModal = new LoginModal(page);
    this.signUpModal = new SignUpModal(page);
  }

  async open(): Promise<void> {
    await test.step(`Open ${this.constructor.name} (${this.path})`, async () => {
      await this.page.goto(this.path);
      await this.waitUntilReady();
    });
  }

  /** Each page defines what "ready to interact" means (data loaded, etc.). */
  abstract waitUntilReady(): Promise<void>;

  /** Log in through the UI from any page. */
  async login(username: string, password: string): Promise<void> {
    await test.step(`Log in as "${username}" via UI`, async () => {
      await this.nav.openLogin();
      await this.loginModal.loginSuccessfully(username, password);
      await this.nav.expectLoggedInAs(username);
    });
  }
}
