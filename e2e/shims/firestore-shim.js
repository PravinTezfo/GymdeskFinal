/**
 * In-memory stand-in for `firebase/firestore`, used ONLY when the app is built with
 * E2E_FAKE_FIREBASE=1 (see next.config.ts). It implements just the surface GymDesk uses.
 *
 * Fidelity choices that matter for finding real bugs:
 *  - `undefined` field values are rejected (the real SDK throws unless ignoreUndefinedProperties)
 *  - orderBy(field) EXCLUDES docs that lack that field (real Firestore behaviour)
 *  - collection()/doc() throw on empty/undefined path segments
 *  - updateDoc / batch.update on a missing doc rejects with `not-found`
 *  - snapshots are delivered asynchronously
 *
 * Test hooks (set from Playwright via addInitScript, read by the shim):
 *   window.__E2E_SEED__  { "gyms/g1": {...}, ... }  values may contain {__ts: epochMs}
 *   window.__E2E_OPTS__  { latency: [{path, ms}], fail: [{op:'listen'|'write', path, code}] }
 *   window.__fbDump()    -> plain-object copy of the DB
 *   window.__fbWrites    -> array of every write performed, in order
 */
const g = typeof window !== 'undefined' ? window : globalThis;

export class Timestamp {
  constructor(seconds, nanoseconds) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  static now() { return Timestamp.fromMillis(Date.now()); }
  static fromMillis(ms) { return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
  static fromDate(d) { return Timestamp.fromMillis(d.getTime()); }
  toMillis() { return this.seconds * 1000 + this.nanoseconds / 1e6; }
  toDate() { return new Date(this.toMillis()); }
}

// Placeholders so `import { X }` of type-only names never breaks the bundle.
export class Firestore {}
export class CollectionReference {}
export class DocumentReference {}
export class Query {}
export class FirestoreError extends Error {}
export class QuerySnapshot {}
export class DocumentSnapshot {}
export const DocumentData = undefined;
export const SetOptions = undefined;

const store = (g.__fb = g.__fb || { docs: {}, listeners: new Set(), writes: [], seeded: false });
g.__fbWrites = store.writes;
g.__fbDump = () => JSON.parse(JSON.stringify(store.docs));

function revive(v) {
  if (v && typeof v === 'object') {
    if (typeof v.__ts === 'number') return Timestamp.fromMillis(v.__ts);
    if (Array.isArray(v)) return v.map(revive);
    const o = {};
    for (const k of Object.keys(v)) o[k] = revive(v[k]);
    return o;
  }
  return v;
}
function clone(v) {
  if (v instanceof Timestamp) return new Timestamp(v.seconds, v.nanoseconds);
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = clone(v[k]); return o; }
  return v;
}
if (!store.seeded) {
  store.seeded = true;
  const seed = g.__E2E_SEED__ || {};
  for (const p of Object.keys(seed)) store.docs[p] = revive(seed[p]);
}
const opts = () => g.__E2E_OPTS__ || {};

/* ---------- refs ---------- */
function joinPath(base, segs) {
  for (const s of segs) {
    if (typeof s !== 'string' || s.length === 0) throw new Error(`Invalid path segment: ${String(s)}`);
  }
  return [base, ...segs].filter(Boolean).join('/');
}
const pathObj = (p) => ({ canonicalString: () => p, toString: () => p });
export function getFirestore() { return { type: 'firestore', __path: '' }; }
export function collection(parent, ...segs) {
  const p = joinPath(parent.__path, segs);
  if (p.split('/').length % 2 === 0) throw new Error('collection() needs an odd number of segments');
  return { type: 'collection', __path: p, path: p, id: p.split('/').pop(), _query: { path: pathObj(p) } };
}
function autoId() { return Array.from({ length: 20 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join(''); }
export function doc(parent, ...segs) {
  let p;
  if (parent.type === 'collection' && segs.length === 0) p = `${parent.__path}/${autoId()}`;
  else p = joinPath(parent.__path, segs);
  if (p.split('/').length % 2 === 1) throw new Error('doc() needs an even number of segments');
  return { type: 'document', __path: p, path: p, id: p.split('/').pop() };
}
export const where = (field, op, value) => ({ kind: 'where', field, op, value });
export const orderBy = (field, dir = 'asc') => ({ kind: 'orderBy', field, dir });
export const limit = (n) => ({ kind: 'limit', n });
export function query(col, ...constraints) {
  return { type: 'query', __path: col.__path, _constraints: constraints, _query: { path: pathObj(col.__path) } };
}
export const serverTimestamp = () => ({ __sentinel: 'serverTimestamp' });

/* ---------- evaluation ---------- */
const valueOf = (v) => (v instanceof Timestamp ? v.toMillis() : v);
function colDocs(path) {
  const prefix = path + '/';
  return Object.keys(store.docs)
    .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
    .map((p) => ({ id: p.slice(prefix.length), path: p, data: store.docs[p] }));
}
function runQuery(q) {
  let rows = colDocs(q.__path);
  const cs = q._constraints || [];
  for (const c of cs) {
    if (c.kind === 'where') {
      rows = rows.filter((r) => {
        const a = valueOf(r.data[c.field]); const b = valueOf(c.value);
        if (c.op === '==') return a === b;
        if (c.op === 'in') return c.value.includes(r.data[c.field]);
        if (c.op === '>=') return a >= b;
        if (c.op === '<=') return a <= b;
        return false;
      });
    }
  }
  const ob = cs.filter((c) => c.kind === 'orderBy');
  for (const o of ob) if (o.field !== '__name__') rows = rows.filter((r) => r.data[o.field] !== undefined && r.data[o.field] !== null);
  if (ob.length) {
    rows = [...rows].sort((x, y) => {
      for (const o of ob) {
        const a = o.field === '__name__' ? x.id : valueOf(x.data[o.field]);
        const b = o.field === '__name__' ? y.id : valueOf(y.data[o.field]);
        if (a === b) continue;
        const r = a < b ? -1 : 1;
        return o.dir === 'desc' ? -r : r;
      }
      return 0;
    });
  }
  const lim = cs.find((c) => c.kind === 'limit');
  if (lim) rows = rows.slice(0, lim.n);
  return rows;
}
const mkDocSnap = (id, path, data) => ({
  id, ref: { type: 'document', path, id, __path: path },
  exists: () => data !== undefined, data: () => (data === undefined ? undefined : clone(data)),
});
function snapshotFor(target) {
  if (target.type === 'document') return mkDocSnap(target.id, target.path, store.docs[target.path]);
  const rows = target.type === 'collection' ? colDocs(target.__path) : runQuery(target);
  const docs = rows.map((r) => mkDocSnap(r.id, r.path, r.data));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (f) => docs.forEach(f) };
}
const sig = (snap) => JSON.stringify(snap.docs ? snap.docs.map((d) => [d.id, d.data()]) : [snap.exists(), snap.exists() ? snap.data() : null]);

/* ---------- listeners ---------- */
function failFor(op, path) {
  return (opts().fail || []).find((f) => f.op === op && path.startsWith(f.path));
}
function emit(entry) {
  const f = failFor('listen', entry.target.__path);
  if (f) {
    if (!entry.failed) { entry.failed = true; entry.error && entry.error({ code: f.code || 'permission-denied', message: 'Missing or insufficient permissions.' }); }
    return;
  }
  const snap = snapshotFor(entry.target);
  const s = sig(snap);
  if (entry.last === s) return;
  entry.last = s;
  entry.next(snap);
}
export function onSnapshot(target, next, error) {
  const entry = { target, next, error, last: null, failed: false };
  const lat = (opts().latency || []).find((l) => entry.target.__path.startsWith(l.path));
  const t = setTimeout(() => { if (store.listeners.has(entry)) emit(entry); }, lat ? lat.ms : 0);
  store.listeners.add(entry);
  return () => { store.listeners.delete(entry); clearTimeout(t); };
}
export async function getDocs(q) { return snapshotFor(q); }
export async function getDoc(ref) {
  const f = failFor('listen', ref.path);
  if (f) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: f.code || 'permission-denied' });
  return snapshotFor(ref);
}
export const arrayUnion = (...items) => ({ __arrayUnion: items });
const notify = () => setTimeout(() => store.listeners.forEach((e) => { if (e.last !== null || e.failed) emit(e); }), 0);

/* ---------- writes ---------- */
function assertNoUndefined(v, at = '') {
  if (v === undefined) throw new Error(`Function setDoc()/updateDoc() called with invalid data. Unsupported field value: undefined (found in field ${at})`);
  if (v && typeof v === 'object' && !(v instanceof Timestamp) && !v.__sentinel) for (const k of Object.keys(v)) assertNoUndefined(v[k], at ? `${at}.${k}` : k);
}
function resolveSentinels(v) {
  if (v && v.__sentinel === 'serverTimestamp') return Timestamp.now();
  if (Array.isArray(v)) return v.map(resolveSentinels);
  if (v instanceof Timestamp) return v;
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = resolveSentinels(v[k]); return o; }
  return v;
}
const permErr = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
function applyOp(o) {
  const f = failFor('write', o.path);
  if (f) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: f.code || 'permission-denied' });
  if (o.op !== 'delete') assertNoUndefined(o.data);
  const existing = store.docs[o.path];
  const withUnions = (data, base) => {
    const out = { ...data };
    for (const k of Object.keys(out)) {
      if (out[k] && out[k].__arrayUnion) {
        const cur = Array.isArray((base || {})[k]) ? base[k] : [];
        out[k] = [...cur, ...out[k].__arrayUnion.filter((x) => !cur.includes(x))];
      }
    }
    return out;
  };
  if (o.op === 'set') store.docs[o.path] = o.merge ? { ...(existing || {}), ...resolveSentinels(withUnions(o.data, existing)) } : resolveSentinels(withUnions(o.data, null));
  else if (o.op === 'update') {
    if (existing === undefined) throw Object.assign(new Error('No document to update'), { code: 'not-found' });
    store.docs[o.path] = { ...existing, ...resolveSentinels(withUnions(o.data, existing)) };
  } else if (o.op === 'delete') delete store.docs[o.path];
  store.writes.push({ op: o.op, path: o.path, data: o.data === undefined ? undefined : JSON.parse(JSON.stringify(resolveSentinels(o.data))) });
}
function commitOps(ops) {
  const backup = JSON.stringify(store.docs); const backupW = store.writes.length;
  try { ops.forEach(applyOp); } catch (e) {
    // atomic rollback (timestamps are re-hydrated from the backup via __ts)
    const raw = JSON.parse(backup); store.docs = {}; for (const p of Object.keys(raw)) store.docs[p] = reviveJson(raw[p]);
    store.writes.length = backupW; throw e;
  }
  notify();
}
function reviveJson(v) {
  if (v && typeof v === 'object' && typeof v.seconds === 'number' && typeof v.nanoseconds === 'number') return new Timestamp(v.seconds, v.nanoseconds);
  if (Array.isArray(v)) return v.map(reviveJson);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = reviveJson(v[k]); return o; }
  return v;
}
const later = (fn) => new Promise((res, rej) => setTimeout(() => { try { res(fn()); } catch (e) { rej(e); } }, 0));
export const setDoc = (ref, data, options) => later(() => commitOps([{ op: 'set', path: ref.path, data, merge: !!(options && options.merge) }]));
export const updateDoc = (ref, data) => later(() => commitOps([{ op: 'update', path: ref.path, data }]));
export const deleteDoc = (ref) => later(() => commitOps([{ op: 'delete', path: ref.path }]));
export const addDoc = (col, data) => later(() => { const r = doc(col); commitOps([{ op: 'set', path: r.path, data }]); return r; });
export function writeBatch() {
  const ops = [];
  return {
    set(ref, data, options) { ops.push({ op: 'set', path: ref.path, data, merge: !!(options && options.merge) }); return this; },
    update(ref, data) { ops.push({ op: 'update', path: ref.path, data }); return this; },
    delete(ref) { ops.push({ op: 'delete', path: ref.path }); return this; },
    commit() { return later(() => commitOps(ops)); },
  };
}
