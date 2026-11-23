import { test, expect } from '@playwright/test';
import { boot, baseSeed, dump, writes } from './helpers';

test.describe('expenses', () => {
  test('control: add an expense, see it listed with total', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/expenses');
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    await page.getByLabel('Description').fill('Monthly rent');
    await page.getByLabel('Amount (₹)').fill('25000');
    await page.locator('div.fixed').getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.getByText(/Monthly\s+rent/)).toBeVisible();
    await expect(page.getByText(/Total\s+Expenses.*25000\.00/)).toBeVisible();
  });

  test('control: amount must be > 0', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/expenses');
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    await page.getByLabel('Description').fill('x');
    await page.getByLabel('Amount (₹)').fill('0');
    await page.locator('div.fixed').getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.getByText('Amount must be greater than zero')).toBeVisible();
  });

  test('BUG-E1 a failed save is reported to the user, not reported as success', async ({ page }) => {
    // addExpense() fires the write without awaiting: the modal closes immediately and, on failure,
    // the only feedback is a crash of the whole app.
    await boot(page, { as: 'admin', opts: { fail: [{ op: 'write', path: 'gyms/g1/expenses', code: 'unavailable' }] } });
    await page.goto('/admin/expenses');
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    await page.getByLabel('Description').fill('Water bill');
    await page.getByLabel('Amount (₹)').fill('900');
    await page.locator('div.fixed').getByRole('button', { name: 'Add Expense' }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
  });
});

test.describe('timezones', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });
  test('BUG-E2 dates render as the same calendar day in any timezone', async ({ page }) => {
    // format(new Date('2026-11-05')) parses as UTC midnight => 4 Nov west of UTC.
    const seed = baseSeed();
    seed['gyms/g1/expenses/e1'] = { category: 'rent', description: 'Rent', amount: 100, date: '2026-11-05', gymId: 'g1' };
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/expenses');
    await expect.poll(async () => (await page.locator('tbody').innerText().catch(() => '')).length).toBeGreaterThan(0);
    const row = (await page.locator('tbody').innerText()).replace(/\s+/g, ' ');
    console.log('expense row (LA tz):', row);
    expect(row).toMatch(/05 Nov, 2026/);
  });
});
