import { test, expect } from '../../src/fixtures';
import { Messages } from '../../src/data/catalog';
import { buildUser } from '../../src/data/factories';

/**
 * Login feature — UI.
 * Test IDs map 1:1 to the "Login" sheet of test-cases/DemoBlaze_TestCases.xlsx.
 */
test.describe('Login', { tag: '@login' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test(
    '[TC-LOGIN-001] user can log in with valid credentials',
    { tag: ['@smoke', '@regression'] },
    async ({ homePage, testUser }) => {
      await homePage.nav.openLogin();
      await homePage.loginModal.loginSuccessfully(testUser.username, testUser.password);

      await homePage.nav.expectLoggedInAs(testUser.username);
    },
  );

  test('[TC-LOGIN-002] wrong password is rejected', { tag: '@regression' }, async ({ homePage, testUser }) => {
    await homePage.nav.openLogin();
    const alert = await homePage.loginModal.loginExpectingAlert(testUser.username, `${testUser.password}-wrong`);

    expect(alert).toBe(Messages.login.wrongPassword);
    await homePage.nav.expectLoggedOut();
  });

  test('[TC-LOGIN-003] unregistered username is rejected', { tag: '@regression' }, async ({ homePage }) => {
    const unknown = buildUser();
    await homePage.nav.openLogin();
    const alert = await homePage.loginModal.loginExpectingAlert(unknown.username, unknown.password);

    expect(alert).toBe(Messages.login.userNotFound);
    await homePage.nav.expectLoggedOut();
  });

  // Data-driven: every combination of missing mandatory fields.
  const missingFieldCases = [
    { id: 'TC-LOGIN-004', title: 'both fields empty', username: '', password: '' },
    { id: 'TC-LOGIN-005', title: 'username empty', username: '', password: 'anyPassword1' },
    { id: 'TC-LOGIN-006', title: 'password empty', username: 'anyUser', password: '' },
  ];
  for (const c of missingFieldCases) {
    test(`[${c.id}] validation when ${c.title}`, { tag: '@regression' }, async ({ homePage }) => {
      await homePage.nav.openLogin();
      const alert = await homePage.loginModal.loginExpectingAlert(c.username, c.password);

      expect(alert).toBe(Messages.login.emptyFields);
      await homePage.nav.expectLoggedOut();
    });
  }

  test('[TC-LOGIN-007] password input is masked', { tag: '@regression' }, async ({ homePage }) => {
    await homePage.nav.openLogin();
    await homePage.loginModal.expectOpen();

    await expect(homePage.loginModal.passwordInput).toHaveAttribute('type', 'password');
  });

  test(
    '[TC-LOGIN-008] session survives a page reload',
    { tag: '@regression' },
    async ({ page, homePage, testUser }) => {
      await homePage.login(testUser.username, testUser.password);
      await page.reload();

      await homePage.nav.expectLoggedInAs(testUser.username);
    },
  );

  test('[TC-LOGIN-009] user can log out', { tag: ['@smoke', '@regression'] }, async ({ homePage, testUser }) => {
    await homePage.login(testUser.username, testUser.password);
    await homePage.nav.logout();

    await homePage.nav.expectLoggedOut();
  });

  test(
    '[TC-LOGIN-010] closing the modal does not log the user in',
    { tag: '@regression' },
    async ({ homePage, testUser }) => {
      await homePage.nav.openLogin();
      await homePage.loginModal.fill(testUser.username, testUser.password);
      await homePage.loginModal.close();

      await homePage.nav.expectLoggedOut();
    },
  );

  test(
    '[TC-LOGIN-011] injection-style input is treated as plain text',
    { tag: ['@regression', '@security'] },
    async ({ homePage }) => {
      await homePage.nav.openLogin();
      const alert = await homePage.loginModal.loginExpectingAlert(`' OR '1'='1' --`, `' OR '1'='1`);

      expect(alert).toBe(Messages.login.userNotFound);
      await homePage.nav.expectLoggedOut();
    },
  );

  test('[TC-LOGIN-012] a newly signed-up user can log in', { tag: '@regression' }, async ({ homePage }) => {
    const user = buildUser();
    await homePage.nav.openSignUp();
    expect(await homePage.signUpModal.signUp(user.username, user.password)).toBe(Messages.signup.success);

    await homePage.login(user.username, user.password);
  });

  test(
    '[TC-LOGIN-013] signing up with an existing username is rejected',
    { tag: '@regression' },
    async ({ homePage, testUser }) => {
      await homePage.nav.openSignUp();
      const alert = await homePage.signUpModal.signUp(testUser.username, 'whatever123');

      expect(alert).toBe(Messages.signup.userExists);
    },
  );
});
