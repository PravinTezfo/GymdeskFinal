/**
 * In-memory stand-in for `firebase/auth` (E2E builds only).
 *   window.__E2E_USERS__ = { "admin@gym.test": { uid: "a1", password: "secret1" } }
 *   window.__E2E_AUTH__  = "a1"   // optional: start already signed in as this uid
 * The session survives reloads via sessionStorage, like the real SDK's persistence.
 */
const g = typeof window !== 'undefined' ? window : globalThis;
export class Auth {}
export const User = undefined;

const st = (g.__fbAuth = g.__fbAuth || { listeners: new Set(), current: null, init: false });
const users = () => (g.__E2E_USERS__ = g.__E2E_USERS__ || {});
const byUid = (uid) => Object.entries(users()).find(([, u]) => u.uid === uid);
function mkUser(email, uid) {
  return { uid, email, getIdToken: async () => 'e2e-token-' + uid, displayName: null, emailVerified: true, phoneNumber: null, providerData: [{ providerId: 'password', uid: email }], tenantId: null };
}
if (!st.init) {
  st.init = true;
  const uid = (g.__E2E_AUTH__ || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('e2e-auth-uid')) || null);
  if (uid) { const hit = byUid(uid); st.current = mkUser(hit ? hit[0] : `${uid}@gym.test`, uid); }
}
function setCurrent(u) {
  st.current = u;
  try { u ? sessionStorage.setItem('e2e-auth-uid', u.uid) : sessionStorage.removeItem('e2e-auth-uid'); } catch {}
  st.listeners.forEach((l) => setTimeout(() => l(st.current), 0));
}
export function getAuth() { return { get currentUser() { return st.current; } }; }
export function onAuthStateChanged(_auth, next) {
  st.listeners.add(next);
  setTimeout(() => { if (st.listeners.has(next)) next(st.current); }, 0);
  return () => st.listeners.delete(next);
}
const authErr = (code) => Object.assign(new Error(`Firebase: Error (${code}).`), { code });
export async function signInWithEmailAndPassword(_a, email, password) {
  await new Promise((r) => setTimeout(r, 30));
  const u = users()[email];
  if (!u || u.password !== password) throw authErr('auth/invalid-credential');
  setCurrent(mkUser(email, u.uid));
  return { user: st.current };
}
export async function createUserWithEmailAndPassword(_a, email, password) {
  await new Promise((r) => setTimeout(r, 30));
  if (users()[email]) throw authErr('auth/email-already-in-use');
  const uid = `uid_${Object.keys(users()).length + 1}`;
  users()[email] = { uid, password };
  setCurrent(mkUser(email, uid));
  return { user: st.current };
}
export async function signInAnonymously() { setCurrent(mkUser('', 'anon')); }
export async function signOut() { setCurrent(null); }
