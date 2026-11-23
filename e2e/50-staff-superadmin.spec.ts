import { test, expect } from '@playwright/test';
import { boot, baseSeed, dump, writes } from './helpers';

const fillTrainer = async (page, o: { first?: string; last?: string; email: string; phone?: string }) => {
  const m = page.locator('div.fixed').last();
  await m.getByLabel('First Name').fill(o.first ?? 'New');
  await m.getByLabel('Last Name').fill(o.last ?? 'Trainer');
  await m.getByLabel('Email').fill(o.email);
  if (o.phone) await m.getByLabel('Phone Number').fill(o.phone);
  await m.getByLabel('Password', { exact: true }).fill('secret123');
  await m.getByLabel('Confirm Password').fill('secret123');
  await m.getByLabel('Address').fill('12 Gandhi Rd');
};
const submitTrainer = (page) => page.locator('div.fixed').last().getByRole('button', { name: 'Add Trainer' }).click();

test.describe('trainers (admin)', () => {
  test('control: admin adds a trainer', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/trainers');
    await page.getByRole('button', { name: 'Add Trainer' }).first().click();
    await fillTrainer(page, { email: 'new@gym.test', phone: '9811111111' });
    await submitTrainer(page);
    await expect.poll(async () => Object.values<any>(await dump(page)).some((d) => d.email === 'new@gym.test')).toBe(true);
    const t = Object.values<any>(await dump(page)).find((d) => d.email === 'new@gym.test');
    expect(t).toMatchObject({ role: 'trainer', assignedGymId: 'g1', phone: '9811111111' });
  });

  test('BUG-T1 duplicate trainer e-mail gives a readable message (no crash)', async ({ page }) => {
    // The server flow surfaces Identity Toolkit's "EMAIL_EXISTS"; the code looks for
    // "auth/email-already-exists", so it falls into the generic branch that emits a fake
    // permission error, which crashes the app.
    await boot(page, { as: 'admin' });
    await page.goto('/admin/trainers');
    await page.getByRole('button', { name: 'Add Trainer' }).first().click();
    await fillTrainer(page, { email: 'trainer@gym.test', phone: '9811111111' });
    await submitTrainer(page);
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
    await expect(page.getByText(/already in use/i)).toBeVisible();
  });

  test('BUG-T2 phone is mandatory for trainers (phone is their GymFo sign-in identity)', async ({ page }) => {
    await boot(page, { as: 'admin' });
    await page.goto('/admin/trainers');
    await page.getByRole('button', { name: 'Add Trainer' }).first().click();
    await fillTrainer(page, { email: 'nophone@gym.test' });          // no phone
    await submitTrainer(page);
    await expect(page.getByText('Phone number is required')).toBeVisible();
    const created = Object.values<any>(await dump(page)).some((d) => d.email === 'nophone@gym.test');
    expect(created).toBe(false);
  });

  test('BUG-T3 re-adding a deleted trainer with the same e-mail fails with a clear message (not a crash)', async ({ page }) => {
    // deleteTrainer() removes only the Firestore doc (the dialog even claims it deletes login access);
    // the Auth user remains, so the e-mail is "taken" forever.
    await boot(page, { as: 'admin' });
    await page.goto('/admin/trainers');
    await expect(page.locator('tbody tr', { hasText: /Tarun/ })).toHaveCount(1);
    await page.getByRole('button', { name: 'Delete trainer' }).click();
    await expect(page.getByText(/sign-in account itself is not deleted/i)).toBeVisible();   // no false promise
    await page.locator('div.z-\\[70\\]').getByRole('button', { name: 'Delete' }).click();
    await expect.poll(async () => 'trainers/t1' in (await dump(page))).toBe(false);
    await page.getByRole('button', { name: 'Add Trainer' }).first().click();
    await fillTrainer(page, { email: 'trainer@gym.test', phone: '9000000001' });
    await submitTrainer(page);
    await page.waitForTimeout(1500);
    // Re-creating the Auth user needs the Admin SDK (a Cloud Function). Until then the user must get a clear message.
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
    await expect(page.getByText(/already in use/i)).toBeVisible();
  });
});

test.describe('superadmin', () => {
  test('control: superadmin sees gyms list and can add a gym with a new admin', async ({ page }) => {
    await boot(page, { as: 'superadmin' });
    await page.goto('/superadmin/gyms');
    await expect(page.getByText('Iron Works')).toBeVisible();
    await page.getByRole('button', { name: 'Add New Gym' }).click();
    const m = page.locator('div.fixed').last();
    await m.getByLabel('Gym Name').fill('Fit Hub');
    await m.getByLabel('First Name', { exact: true }).fill('Gita');
    await m.getByLabel('Last Name', { exact: true }).fill('Admin');
    await m.getByLabel('Admin Email').fill('gita@fithub.test');
    await m.getByLabel('Admin Password').fill('secret123');
    await m.getByRole('button', { name: 'Save Gym' }).click();
    await expect.poll(async () => Object.values<any>(await dump(page)).some((d) => d.name === 'Fit Hub')).toBe(true);
  });

  test('BUG-S1 duplicate admin e-mail on gym creation shows a readable message (no crash)', async ({ page }) => {
    await boot(page, { as: 'superadmin' });
    await page.goto('/superadmin/gyms');
    await page.getByRole('button', { name: 'Add New Gym' }).click();
    const m = page.locator('div.fixed').last();
    await m.getByLabel('Gym Name').fill('Dup Gym');
    await m.getByLabel('First Name', { exact: true }).fill('Dup');
    await m.getByLabel('Last Name', { exact: true }).fill('Admin');
    await m.getByLabel('Admin Email').fill('admin@gym.test');
    await m.getByLabel('Admin Password').fill('secret123');
    await m.getByRole('button', { name: 'Save Gym' }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Application error/i)).toHaveCount(0);
    await expect(page.getByText(/already in use/i)).toBeVisible();
  });

  test('BUG-S2 gym detail page "Edit Gym" button leads somewhere (no 404)', async ({ page }) => {
    await boot(page, { as: 'superadmin' });
    await page.goto('/superadmin/gyms/g1');
    await page.getByRole('button', { name: 'Edit Gym' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: /Edit.Gym/ })).toBeVisible();
    await expect(page.getByText(/could not be found|404/i)).toHaveCount(0);
  });

  test('BUG-S3 deactivating a gym actually blocks its admin', async ({ page }) => {
    // `active` is displayed and toggled but never enforced anywhere.
    const seed = baseSeed();
    seed['gyms/g1'].active = false;
    await boot(page, { seed, as: 'admin' });
    await page.goto('/admin');
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Dashboard for Iron Works/)).toHaveCount(0);
  });
});
