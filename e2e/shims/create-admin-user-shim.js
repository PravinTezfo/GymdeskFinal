/**
 * Replaces the 'use server' action in E2E builds. Mirrors its contract: it RETURNS {ok, uid|error}
 * (never throws) and uses Identity Toolkit's error codes (EMAIL_EXISTS, WEAK_PASSWORD).
 */
const g = typeof window !== 'undefined' ? window : globalThis;
export async function createAdminUser({ email, password, idToken }) {
  await new Promise((r) => setTimeout(r, 30));
  if (!idToken) return { ok: false, error: 'UNAUTHENTICATED' };
  g.__E2E_USERS__ = g.__E2E_USERS__ || {};
  if (g.__E2E_USERS__[email]) return { ok: false, error: 'EMAIL_EXISTS' };
  if (!password || password.length < 6) return { ok: false, error: 'WEAK_PASSWORD' };
  const uid = `uid_${Object.keys(g.__E2E_USERS__).length + 1}`;
  g.__E2E_USERS__[email] = { uid, password };
  return { ok: true, uid };
}
