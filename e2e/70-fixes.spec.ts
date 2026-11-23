import { test, expect } from '@playwright/test';
import { boot, baseSeed, addMember, dump, waitForMembersTable } from './helpers';

test.describe('guarantees added by the fixes', () => {
  test('member IDs with spaces or slashes are rejected', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/members');
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByLabel('Name', { exact: true }).fill('Asha');
    await page.getByLabel('Member ID').fill('bad id/1');
    await page.getByLabel('Membership Type').selectOption({ label: 'Monthly (₹1000)' });
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect(page.getByText(/Use only letters, numbers/)).toBeVisible();
  });

  test('phone numbers are stored in one 10-digit format and invalid ones are rejected', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/members');
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByLabel('Name', { exact: true }).fill('Asha');
    await page.getByLabel('Member ID').fill('M200');
    await page.getByLabel('Phone Number (Optional)').fill('12345');
    await page.getByLabel('Membership Type').selectOption({ label: 'Monthly (₹1000)' });
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect(page.getByText('Enter a valid 10-digit mobile number')).toBeVisible();
    await page.getByLabel('Phone Number (Optional)').fill('+91 98765-43210');
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect.poll(async () => Object.values<any>(await dump(page)).find((d) => d.memberId === 'M200')?.phone).toBe('9876543210');
  });

  test('first membership log stores the plan id (schemeId) so renaming a plan cannot orphan members', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/members');
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.getByLabel('Name', { exact: true }).fill('Asha');
    await page.getByLabel('Member ID').fill('M201');
    await page.getByLabel('Membership Type').selectOption({ label: 'Monthly (₹1000)' });
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect.poll(async () => Object.values<any>(await dump(page)).find((d) => d.memberId === 'M201')?.schemeId).toBe('sc1');
  });

  test('renewing an EXPIRED member creates a new log and appends to allLogId (no overwrite)', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001', { plan: 'Monthly', start: '2026-09-01', end: '2026-10-01' });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await page.locator('tbody tr', { hasText: 'M001' }).getByRole('button', { name: 'Renew' }).click();
    await page.getByLabel('Start Date').fill('2026-11-21');
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect.poll(async () => (await dump(page))['gyms/g1/members/M001'].allLogId.length).toBe(2);
    const m = (await dump(page))['gyms/g1/members/M001'];
    expect(m.allLogId).toContain('L-M001');
    expect(m.activeLogId).not.toBe('L-M001');
  });

  test('a deactivated gym cannot use the trainer app either', async ({ page }) => {
    const seed = baseSeed();
    seed['gyms/g1'].active = false;
    await boot(page, { seed, as: 'trainer' });
    await page.goto('/trainer');
    await expect(page.getByText(/currently deactivated/i)).toBeVisible();
  });

  test('Escape closes the delete confirmation dialog', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001');
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await page.locator('tbody tr', { hasText: 'M001' }).getByRole('button', { name: 'Row actions' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('div.z-\\[70\\]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('div.z-\\[70\\]')).toHaveCount(0);
  });
});
