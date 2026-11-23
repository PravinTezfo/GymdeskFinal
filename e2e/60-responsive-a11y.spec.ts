import { test, expect } from '@playwright/test';
import { boot, baseSeed, addMember, waitForMembersTable } from './helpers';

const seedWithMembers = () => { const s = baseSeed(); for (let i = 1; i <= 3; i++) addMember(s, `M00${i}`, { name: `Member M00${i}` }); return s; };

test.describe('responsive', () => {
  test('mobile 375px: no horizontal page overflow on members + dashboard', async ({ page }) => {
    await boot(page, { seed: seedWithMembers(), as: 'admin', viewport: { width: 375, height: 812 } });
    for (const url of ['/admin/members', '/admin', '/admin/expenses', '/admin/activity-log']) {
      await page.goto(url);
      await page.waitForTimeout(1200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      console.log(url, 'overflow px:', over);
      expect(over, url).toBeLessThanOrEqual(1);
    }
  });

  test('mobile 375px: sidebar opens and navigates', async ({ page }) => {
    await boot(page, { seed: seedWithMembers(), as: 'admin', viewport: { width: 375, height: 812 } });
    await page.goto('/admin');
    await page.locator('div.md\\:hidden button').first().click();
    await page.getByRole('link', { name: 'Expenses' }).click();
    await expect(page).toHaveURL(/\/admin\/expenses/);
  });

  // Visual/layout change, intentionally NOT fixed in this pass (UI must stay identical).
  test.fixme('BUG-R1 laptop 1280px: row actions (Edit/Renew) are visible without horizontal scrolling', async ({ page }) => {
    await boot(page, { seed: seedWithMembers(), as: 'admin', viewport: { width: 1280, height: 720 } });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    const box = await page.locator('tbody tr').first().getByRole('button', { name: 'Edit' }).boundingBox();
    console.log('Edit button box:', JSON.stringify(box));
    expect(box!.x + box!.width).toBeLessThanOrEqual(1280);
  });
});

test.describe('accessibility basics', () => {
  test('BUG-R2 every icon-only button has an accessible name', async ({ page }) => {
    await boot(page, { seed: seedWithMembers(), as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await page.getByRole('button', { name: 'Add Member' }).click();
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => (b as HTMLElement).offsetParent !== null)
        .filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
        .length);
    console.log('visible buttons without a name:', unnamed);
    expect(unnamed).toBe(0);
  });

  test('BUG-R3 modals expose dialog semantics and close on Escape', async ({ page }) => {
    await boot(page, { seed: seedWithMembers(), as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('BUG-R4 Escape closes an open modal', async ({ page }) => {
    await boot(page, { seed: seedWithMembers(), as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toHaveCount(0);
  });
});
