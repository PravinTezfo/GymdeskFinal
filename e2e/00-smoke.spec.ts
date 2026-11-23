import { test, expect } from '@playwright/test';
import { boot, baseSeed, addMember, loginViaForm, waitForMembersTable } from './helpers';

test.describe('smoke: harness + happy paths', () => {
  test('login page renders for a logged-out visitor', async ({ page }) => {
    await boot(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('wrong password shows an inline error', async ({ page }) => {
    await boot(page);
    await loginViaForm(page, 'admin@gym.test', 'nope-nope');
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
  });

  for (const [email, path] of [
    ['admin@gym.test', '/admin'],
    ['trainer@gym.test', '/trainer'],
    ['super@gym.test', '/superadmin'],
  ] as const) {
    test(`${email} lands on ${path} after sign-in`, async ({ page }) => {
      await boot(page);
      await loginViaForm(page, email);
      await expect(page).toHaveURL(new RegExp(`${path}(\\?.*)?$`));
    });
  }

  test('admin sees seeded members', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001', { name: 'Ravi Kumar' });
    addMember(seed, 'M002', { name: 'Priya S' });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.getByRole('cell', { name: 'Ravi Kumar' })).toBeVisible();
  });
});
