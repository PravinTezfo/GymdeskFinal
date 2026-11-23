import { test, expect } from '@playwright/test';
import { boot, baseSeed, addMember, statCard } from './helpers';

const stat = async (page, title: string) => (await statCard(page, title).innerText()).replace(/\s+/g, ' ').trim();

test.describe('admin dashboard analytics', () => {
  test('control: totals for a simple gym are correct', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001', { start: '2026-11-05', end: '2026-12-05', paid: 1000, balance: 0 });
    addMember(seed, 'M002', { start: '2026-11-08', end: '2026-12-08', paid: 500, balance: 500, status: 'Partially Paid' });
    addMember(seed, 'M003', { start: '2026-08-01', end: '2026-09-01', paid: 1000, balance: 0 });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin');
    await expect(page.getByText('Total Members', { exact: true })).toBeVisible();
    await expect(statCard(page, 'Total Members')).toContainText('3');
    await expect(statCard(page, 'Active Members')).toContainText('2');
    await expect(statCard(page, 'Inactive Members')).toContainText('1');
    await expect(statCard(page, 'Total Revenue')).toContainText('2,500');
    await expect(statCard(page, 'Total Pending')).toContainText('500');
  });

  test('BUG-D1 percentage change never uses a rupee amount as a percent', async ({ page }) => {
    // calculateChange(): previous === 0 && current >= 100  ->  `+${current}%`  (₹12,000 becomes "+12000%")
    const seed = baseSeed();
    addMember(seed, 'M001', { start: '2026-11-05', end: '2026-12-05', paid: 12000, balance: 0 });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin');
    await expect(page.getByText('Revenue (This Month)', { exact: true })).toBeVisible();
    await page.waitForTimeout(1200);
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    console.log('percent badges:', body.match(/[+-]\d+%/g));
    expect(body).not.toContain('+12000%');
    expect(body).toContain('+100%');
  });

  test('BUG-D2 "New Members (This Month)" does not count renewals of old members', async ({ page }) => {
    const seed = baseSeed();
    // M001 joined in January and renewed this month (2 logs, active = renewal).
    seed['gyms/g1/members/M001'] = { activeLogId: 'L2', allLogId: ['L1', 'L2'], createdAt: { __ts: Date.parse('2026-01-05T10:00:00+05:30') } };
    const log = (id: string, start: string, end: string) => ({ id, memberId: 'M001', name: 'Ravi', phone: '9', membershipType: 'Monthly', startDate: start, endDate: end, amountPaid: 1000, balanceAmount: 0, discount: 0, paymentStatus: 'Paid', isDeleted: false, createdAt: { __ts: Date.parse(`${start}T10:00:00+05:30`) } });
    seed['gyms/g1/members_log/L1'] = log('L1', '2026-01-05', '2026-02-05');
    seed['gyms/g1/members_log/L2'] = log('L2', '2026-11-03', '2026-12-03');
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin');
    await expect(page.getByText('New Members (This Month)', { exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    const text = await stat(page, 'New Members (This Month)');
    console.log('New members card:', text);
    expect(text).toMatch(/New Members \(This Month\) 0\b/);
  });

  test('BUG-D3 a legacy log without amountPaid/balanceAmount does not turn totals into NaN', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001', { start: '2026-11-05', end: '2026-12-05', paid: 1000 });
    addMember(seed, 'M002', { start: '2026-11-06', end: '2026-12-06' });
    delete seed['gyms/g1/members_log/L-M002'].amountPaid;
    delete seed['gyms/g1/members_log/L-M002'].balanceAmount;
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin');
    await expect(page.getByText('Total Revenue', { exact: true })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(statCard(page, 'Total Revenue')).not.toContainText('NaN');
    await expect(statCard(page, 'Total Pending')).not.toContainText('NaN');
  });

  test('BUG-D4 dashboard stats are not computed from logs of members that no longer exist', async ({ page }) => {
    // After hard-deleting a member their logs stay and still feed Total Pending.
    const seed = baseSeed();
    addMember(seed, 'M001', { paid: 1000, balance: 0 });
    seed['gyms/g1/members_log/L-GONE'] = { id: 'L-GONE', memberId: 'GONE', name: 'Deleted Person', startDate: '2026-11-01', endDate: '2026-12-01', amountPaid: 0, balanceAmount: 4000, discount: 0, paymentStatus: 'Not Paid', isDeleted: false, createdAt: { __ts: Date.parse('2026-11-01T10:00:00+05:30') } };
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin');
    await expect(page.getByText('Total Pending', { exact: true })).toBeVisible();
    await page.waitForTimeout(700);
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    console.log('pending text:', body.match(/Total Pending ₹[\d,]+/)?.[0]);
    expect(body).toMatch(/Total Pending ₹0\b/);
  });
});
