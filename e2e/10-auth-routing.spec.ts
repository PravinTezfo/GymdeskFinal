import { test, expect } from '@playwright/test';
import { boot, baseSeed, addMember } from './helpers';

test.describe('auth, routing & resilience', () => {
  test('trainer cannot open /admin (bounced to trainer area)', async ({ page }) => {
    await boot(page, { as: 'trainer' });
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/trainer/);
  });

  test('admin cannot open /superadmin', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/superadmin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('BUG-A1 deep link survives a slow role lookup (>1.5s, e.g. mobile network)', async ({ page }) => {
    // The role listener gives up after a hard-coded 1500 ms (useRole.tsx), the admin layout then
    // redirects to "/", and the original deep link is lost.
    await boot(page, { as: 'admin', opts: { latency: [{ path: 'admins/', ms: 2500 }] } });
    await page.goto('/admin/expenses');
    await page.waitForTimeout(5500);
    await expect(page).toHaveURL(/\/admin\/expenses/);
  });

  test('BUG-A2 login screen must not depend on a privileged read', async ({ page }) => {
    // Login/useRole run `list superadmins` while logged out (for the logo + setup check).
    // firestore.rules only allows that to superadmins, so a denial here is expected in prod.
    await boot(page, { opts: { fail: [{ op: 'listen', path: 'superadmins', code: 'permission-denied' }, { op: 'listen', path: 'public', code: 'permission-denied' }] } });
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });

  test('BUG-A3 one failing Firestore listener must not white-screen the whole app', async ({ page }) => {
    // FirebaseErrorListener re-throws every listener error during render and the app has no
    // error.jsx / global-error.jsx, so e.g. a missing index on one page kills the entire UI.
    const seed = baseSeed();
    await boot(page, { seed, as: 'admin', opts: { fail: [{ op: 'listen', path: 'gyms/g1/expenses', code: 'failed-precondition' }] } });
    await page.goto('/admin/expenses');
    await page.waitForTimeout(2500); // let the failing listener fire before asserting
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /members/i }).first()).toBeVisible(); // sidebar still alive
    await expect(page.getByText(/database index/i).first()).toBeVisible();              // ...and the user is told why
  });

  test('BUG-A4 no history churn: filters/URL sync must settle (no replace-loop)', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001');
    await page.addInitScript(() => {
      (window as any).__replaceCount = 0;
      const orig = history.replaceState.bind(history);
      history.replaceState = (...a: any[]) => { (window as any).__replaceCount++; return (orig as any)(...a); };
    });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await page.waitForTimeout(3000);
    const n = await page.evaluate(() => (window as any).__replaceCount);
    console.log(`history.replaceState calls in 3s idle: ${n}`);
    expect(n).toBeLessThanOrEqual(4);
  });
});
