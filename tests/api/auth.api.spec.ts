import { test, expect } from '../../src/fixtures';
import { Messages } from '../../src/data/catalog';
import { buildUser } from '../../src/data/factories';

test.describe('Auth API', { tag: ['@api', '@login'] }, () => {
  test(
    '[TC-API-001] sign up then log in returns an auth token',
    { tag: ['@smoke', '@regression'] },
    async ({ api }) => {
      const user = buildUser();

      const signup = await api.signup(user.username, user.password);
      expect(signup.ok, `signup error: ${signup.error}`).toBe(true);

      const login = await api.login(user.username, user.password);
      expect(login.ok).toBe(true);
      expect(login.ok && login.token).toMatch(/^\S{10,}$/);
    },
  );

  test('[TC-API-002] duplicate sign-up is rejected', { tag: '@regression' }, async ({ api, testUser }) => {
    const signup = await api.signup(testUser.username, 'another-password');

    expect(signup.ok).toBe(false);
    expect(signup.error).toBe(Messages.signup.userExists);
  });

  test('[TC-API-003] login with wrong password is rejected', { tag: '@regression' }, async ({ api, testUser }) => {
    const login = await api.login(testUser.username, 'definitely-wrong');

    expect(login).toMatchObject({ ok: false, error: Messages.login.wrongPassword });
  });

  test('[TC-API-004] login with unknown user is rejected', { tag: '@regression' }, async ({ api }) => {
    const { username, password } = buildUser();
    const login = await api.login(username, password);

    expect(login).toMatchObject({ ok: false, error: Messages.login.userNotFound });
  });
});
