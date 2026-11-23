import { test, expect } from '@playwright/test';
import { boot, baseSeed, addMember, dump, writes, waitForMembersTable, modal } from './helpers';

const openAdd = async (page) => { await page.getByRole('button', { name: 'Add Member' }).click(); await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible(); };
const rowFor = (page, id: string) => page.locator('tbody tr', { hasText: id });

test.describe('members: list, status & filters', () => {
  test('control: pagination (10/page), search and payment filter work', async ({ page }) => {
    const seed = baseSeed();
    for (let i = 1; i <= 12; i++) addMember(seed, `M${String(i).padStart(3, '0')}`, { name: `Member ${i}`, status: i % 2 ? 'Paid' : 'Not Paid', paid: i % 2 ? 1000 : 0, balance: i % 2 ? 0 : 1000, phone: `90000000${String(i).padStart(2, '0')}` });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(page.getByText('Page 1 of 2').first()).toBeVisible();
    await page.getByPlaceholder('Search...').fill('9000000005');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByPlaceholder('Search...').fill('');
    await page.getByRole('button', { name: /Payment:/ }).click();
    await page.getByRole('button', { name: 'Not Paid', exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });

  test('BUG-M1 a membership ending TODAY is still Active today', async ({ page }) => {
    // isBefore(parseISO('2026-11-21'), now) is true from 00:00 on the last day.
    const seed = baseSeed();
    addMember(seed, 'M001', { start: '2026-10-21', end: '2026-11-21' }); // ends today
    addMember(seed, 'M002', { start: '2026-10-01', end: '2026-11-20' }); // ended yesterday
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await expect(rowFor(page, 'M002').getByText('Expired')).toBeVisible();           // control
    await expect(rowFor(page, 'M001').getByText('Active', { exact: true })).toBeVisible();
  });

  test('BUG-M2 members whose active log is missing are not silently hidden', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001');
    addMember(seed, 'M003', { noLog: true }); // e.g. partially failed write / deleted log
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await page.waitForTimeout(2000);
    await expect(page.getByRole('cell', { name: 'M003' })).toBeVisible();
  });

  test('BUG-M3 "Deleted" filter shows members that were deleted', async ({ page }) => {
    // deleteMember() hard-deletes members/{id}; nothing ever sets log.isDeleted = true,
    // so the Deleted filter can never show anything (and the logs are orphaned).
    const seed = baseSeed();
    addMember(seed, 'M001', { name: 'Ravi Kumar' });
    addMember(seed, 'M002', { name: 'Priya S' });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await rowFor(page, 'M001').getByRole('button').first().click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.locator('div.z-\\[70\\]').getByRole('button', { name: 'Delete' }).click();
    await expect(rowFor(page, 'M001')).toHaveCount(0);
    await page.getByRole('button', { name: /Status:/ }).click();
    await page.getByRole('button', { name: 'Deleted', exact: true }).click();
    await expect(rowFor(page, 'M001')).toHaveCount(1);
  });

  test('BUG-M4 deleting a member does not leave orphaned payment logs behind', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001');
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await rowFor(page, 'M001').getByRole('button').first().click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.locator('div.z-\\[70\\]').getByRole('button', { name: 'Delete' }).click();
    await expect.poll(async () => (await dump(page))['gyms/g1/members_log/L-M001']?.isDeleted).toBe(true);
    const db = await dump(page);
    const logs = Object.keys(db).filter((k) => k.startsWith('gyms/g1/members_log/'));
    expect(logs.every((k) => db[k].isDeleted === true)).toBe(true); // soft-deleted, history preserved
  });
});

test.describe('members: add form', () => {
  test('control: add member writes member + first log atomically', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/members');
    await openAdd(page);
    await page.getByLabel('Name', { exact: true }).fill('Asha N');
    await page.getByLabel('Member ID').fill('M100');
    await page.getByLabel('Membership Type').selectOption({ label: 'Monthly (₹1000)' });
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect.poll(async () => (await writes(page)).length).toBeGreaterThan(0);
    const db = await dump(page);
    expect(db['gyms/g1/members/M100'].allLogId).toHaveLength(1);
    const log = Object.values<any>(db).find((d) => d.memberId === 'M100');
    expect(log).toMatchObject({ name: 'Asha N', membershipType: 'Monthly', startDate: '2026-11-21', endDate: '2026-12-21', paymentStatus: 'Paid', balanceAmount: 0 });
  });

  test('BUG-M5 entering a discount never produces a negative balance', async ({ page }) => {
    // Amount Paid is auto-filled with the FULL price, so any discount makes balance < 0.
    await boot(page, { as: 'admin' });
    await page.goto('/admin/members');
    await openAdd(page);
    await page.getByLabel('Membership Type').selectOption({ label: 'Monthly (₹1000)' });
    await page.getByLabel('Discount').fill('100');
    const balance = await page.getByLabel('Balance Amount').inputValue();
    console.log('Balance shown:', balance);
    expect(balance).not.toContain('-');
  });

  test('BUG-M6 duplicate Member ID is rejected instead of overwriting the existing member', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001', { name: 'Ravi Kumar' });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await openAdd(page);
    await page.getByLabel('Name', { exact: true }).fill('Someone Else');
    await page.getByLabel('Member ID').fill('M001');
    await page.getByLabel('Membership Type').selectOption({ label: 'Monthly (₹1000)' });
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect(page.getByText(/already in use/i)).toBeVisible();   // the user is told, inline
    const db = await dump(page);
    // existing member history must be intact
    expect(db['gyms/g1/members/M001'].allLogId).toContain('L-M001');
    expect(db['gyms/g1/members/M001'].activeLogId).toBe('L-M001');
  });

  test('BUG-M7 typing into a field after a validation error keeps focus', async ({ page }) => {
    // FormInput is declared INSIDE the component → new component type every render → input remounts.
    await boot(page, { as: 'admin' });
    await page.goto('/admin/members');
    await openAdd(page);
    await page.getByRole('button', { name: 'Save Member' }).click();     // trigger validation errors
    await expect(page.getByText('Name is required')).toBeVisible();
    await page.locator('#name').click();
    await page.locator('#name').pressSequentially('Asha', { delay: 40 });
    await expect(page.locator('#name')).toHaveValue('Asha');
  });

  test('BUG-M8 changing the start date does not wipe a hand-entered Amount Paid', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/members');
    await openAdd(page);
    await page.getByLabel('Membership Type').selectOption({ label: 'Monthly (₹1000)' });
    await page.getByLabel('Amount Paid').fill('400');                    // partial payment
    await page.getByLabel('Start Date').fill('2026-11-25');
    await expect(page.getByLabel('Amount Paid')).toHaveValue('400');
  });
});

test.describe('members: edit / renew', () => {
  test('control: editing only the phone updates the SAME log (no new payment record)', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001', { name: 'Ravi Kumar', plan: 'Monthly', start: '2026-11-10', end: '2026-12-10' });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await rowFor(page, 'M001').getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Phone Number (Optional)')).toHaveValue('9876543210');
    await page.getByLabel('Phone Number (Optional)').fill('9999999999');
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect.poll(async () => (await writes(page)).length).toBeGreaterThan(0);
    const w = await writes(page);
    expect(w.map((x) => `${x.op} ${x.path}`)).toEqual(['update gyms/g1/members_log/L-M001']);
  });

  test('BUG-M9 phone/name of a member on a renamed or removed plan can still be edited', async ({ page }) => {
    // Edit matches the scheme by NAME. After the plan is renamed/deleted the select is blank,
    // so validation blocks any save until a (new) plan is picked, which then creates a new payment log.
    const seed = baseSeed();
    addMember(seed, 'M001', { name: 'Ravi Kumar', plan: 'Monthly (old name)', start: '2026-11-10', end: '2026-12-10' });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await rowFor(page, 'M001').getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Phone Number (Optional)')).toHaveValue('9876543210');
    await page.getByLabel('Phone Number (Optional)').fill('9999999999');
    await page.getByRole('button', { name: 'Save Member' }).click();
    await page.waitForTimeout(800);
    await expect(page.getByRole('heading', { name: 'Edit Member' })).toHaveCount(0); // modal closed = saved
    const w = await writes(page);
    expect(w.filter((x) => x.op === 'set' && x.path.includes('members_log')).length).toBe(0);
  });

  test('BUG-M10 correcting a typo in Start Date does not create a second payment record', async ({ page }) => {
    // hasStartDateChanged ⇒ new members_log doc + allLogId grows. A typo fix is not a renewal,
    // and it double-counts revenue on the dashboard.
    const seed = baseSeed();
    addMember(seed, 'M001', { plan: 'Monthly', start: '2026-11-10', end: '2026-12-10' });
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin/members');
    await waitForMembersTable(page);
    await rowFor(page, 'M001').getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Start Date')).toHaveValue('2026-11-10');
    await page.getByLabel('Start Date').fill('2026-11-11');
    await page.getByRole('button', { name: 'Save Member' }).click();
    await expect.poll(async () => (await writes(page)).length).toBeGreaterThan(0);
    const db = await dump(page);
    expect(Object.keys(db).filter((k) => k.startsWith('gyms/g1/members_log/')).length).toBe(1);
  });
});

test.describe('members: trainer view', () => {
  test('control: trainer list is read-only (no Add / Edit / Delete)', async ({ page }) => {
    const seed = baseSeed();
    addMember(seed, 'M001');
    await boot(page, { seed, as: 'trainer' });
    await page.goto('/trainer');
    await waitForMembersTable(page);
    await expect(page.getByRole('button', { name: 'Add Member' })).toHaveCount(0);
    await expect(rowFor(page, 'M001').getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await rowFor(page, 'M001').getByRole('button').first().click();
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  });

  test('BUG-M11 trainer "View Logs" opens the logs instead of bouncing back to the list', async ({ page }) => {
    // The link targets /admin/members/{id}/logs; AdminLayout redirects non-admins to "/".
    const seed = baseSeed();
    addMember(seed, 'M001', { name: 'Ravi Kumar' });
    await boot(page, { seed, as: 'trainer' });
    await page.goto('/trainer');
    await waitForMembersTable(page);
    await rowFor(page, 'M001').getByRole('button').first().click();
    await page.getByRole('link', { name: 'View Logs' }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Payment\s+History/)).toBeVisible();
  });
});
