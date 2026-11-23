import { Page, expect } from '@playwright/test';

/** "Now" for every test: 21 Nov 2026, 12:00 IST. */
export const NOW = new Date('2026-11-21T12:00:00+05:30');
const ms = (iso: string) => new Date(iso).getTime();

export type Seed = Record<string, any>;
export type Role = 'admin' | 'trainer' | 'superadmin';

export const USERS = {
  'admin@gym.test': { uid: 'a1', password: 'secret1' },
  'trainer@gym.test': { uid: 't1', password: 'secret1' },
  'super@gym.test': { uid: 's1', password: 'secret1' },
};
export const UID: Record<Role, string> = { admin: 'a1', trainer: 't1', superadmin: 's1' };

export const SCHEMES = {
  sc1: { name: 'Monthly', price: 1000, durationValue: 1, durationType: 'months' },
  sc2: { name: 'Quarterly', price: 2500, durationValue: 3, durationType: 'months' },
};

export interface MemberOpts {
  name?: string; phone?: string; plan?: string;
  start?: string; end?: string; paid?: number; balance?: number; discount?: number;
  status?: 'Paid' | 'Partially Paid' | 'Not Paid'; createdAt?: string;
  /** omit the members_log doc (simulates an orphaned member) */
  noLog?: boolean;
}

/** Adds a member + its active log to a seed. */
export function addMember(seed: Seed, id: string, o: MemberOpts = {}, gym = 'g1') {
  const logId = `L-${id}`;
  seed[`gyms/${gym}/members/${id}`] = { activeLogId: logId, allLogId: [logId], createdAt: { __ts: ms(o.createdAt ?? '2026-10-01T10:00:00+05:30') } };
  if (o.noLog) return;
  seed[`gyms/${gym}/members_log/${logId}`] = {
    id: logId, memberId: id, name: o.name ?? `Member ${id}`, phone: o.phone ?? '9876543210',
    membershipType: o.plan ?? 'Monthly', startDate: o.start ?? '2026-11-01', endDate: o.end ?? '2026-12-01',
    amountPaid: o.paid ?? 1000, balanceAmount: o.balance ?? 0, discount: o.discount ?? 0,
    paymentStatus: o.status ?? 'Paid', isDeleted: false,
    createdAt: { __ts: ms(o.createdAt ?? '2026-10-01T10:00:00+05:30') },
  };
}

export function baseSeed(): Seed {
  const s: Seed = {
    'gyms/g1': { id: 'g1', name: 'Iron Works', active: true, adminId: 'a1', createdAt: { __ts: ms('2026-09-01T10:00:00+05:30') } },
    'admins/a1': { uid: 'a1', role: 'admin', email: 'admin@gym.test', firstname: 'Asha', lastname: 'Admin', assignedGymId: 'g1' },
    'trainers/t1': { uid: 't1', role: 'trainer', email: 'trainer@gym.test', firstname: 'Tarun', lastname: 'Trainer', phone: '9000000001', address: 'Coimbatore', assignedGymId: 'g1' },
    'superadmins/s1': { uid: 's1', role: 'superadmin', email: 'super@gym.test', firstname: 'Sam', lastname: 'Super', assignedGymId: null },
  };
  for (const [id, sc] of Object.entries(SCHEMES)) s[`gyms/g1/schemes/${id}`] = sc;
  return s;
}

export interface BootOpts {
  seed?: Seed;
  /** start already signed in as this role */
  as?: Role;
  opts?: { latency?: { path: string; ms: number }[]; fail?: { op: 'listen' | 'write'; path: string; code?: string }[] };
  viewport?: { width: number; height: number };
}

/** Installs the fake backend + clock before the app boots. Call BEFORE page.goto(). */
export async function boot(page: Page, b: BootOpts = {}) {
  const seed = b.seed ?? baseSeed();
  if (b.viewport) await page.setViewportSize(b.viewport);
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(
    ({ seed, users, as, opts }) => {
      (window as any).__E2E_SEED__ = seed;
      (window as any).__E2E_USERS__ = users;
      (window as any).__E2E_AUTH__ = as;
      (window as any).__E2E_OPTS__ = opts;
    },
    { seed, users: USERS, as: b.as ? UID[b.as] : null, opts: b.opts ?? {} },
  );
}

export const dump = (page: Page): Promise<Seed> => page.evaluate(() => (window as any).__fbDump());
export const writes = (page: Page): Promise<{ op: string; path: string; data: any }[]> =>
  page.evaluate(() => JSON.parse(JSON.stringify((window as any).__fbWrites)));

/** Signs in through the real login form. */
export async function loginViaForm(page: Page, email: string, password = 'secret1') {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

/** Text of a dashboard stat card, found by its title. */
export const statCard = (page: Page, title: string) => page.getByText(title, { exact: true }).locator('xpath=..');

export async function waitForMembersTable(page: Page) {
  await expect(page.locator('tbody tr').first()).toBeVisible();
}

export const modal = (page: Page) => page.locator('div.fixed.inset-0').last();
