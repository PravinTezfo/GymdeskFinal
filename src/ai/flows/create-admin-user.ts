'use server';
/**
 * @fileOverview Server action that creates a Firebase Auth user through the Identity Toolkit REST API
 * (no Admin SDK / service account needed) WITHOUT signing the caller out.
 *
 * Security: the caller must send their own Firebase ID token. The server
 *   1. verifies it with accounts:lookup,
 *   2. reads the caller's own role document through the Firestore REST API using that same token
 *      (so Firestore rules apply to the caller, nothing is trusted from the client),
 *   3. only then creates the user.
 * 'gym-admin' accounts may only be created by a superadmin; 'trainer' accounts by an admin or superadmin.
 *
 * It RETURNS a result object instead of throwing: Next.js hides the message of errors thrown from
 * server actions in production builds, so the client could never show "email already in use".
 */

import { firebaseConfig } from '@/firebase/config';
import { z } from 'zod';

const InputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  idToken: z.string().min(10),
  purpose: z.enum(['gym-admin', 'trainer']),
});
export type CreateAdminUserInput = z.infer<typeof InputSchema>;
export type CreateAdminUserOutput = { ok: true; uid: string } | { ok: false; error: string };

const apiKey = firebaseConfig.apiKey;
const projectId = firebaseConfig.projectId;

async function callerRole(idToken: string): Promise<'superadmin' | 'admin' | null> {
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!lookup.ok) return null;
  const uid: string | undefined = (await lookup.json())?.users?.[0]?.localId;
  if (!uid) return null;

  for (const [col, role] of [['superadmins', 'superadmin'], ['admins', 'admin']] as const) {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${col}/${uid}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (res.ok) {
      const doc = await res.json();
      if (doc?.fields?.role?.stringValue === role) return role;
    }
  }
  return null;
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<CreateAdminUserOutput> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const weak = parsed.error.issues.some((i) => i.path[0] === 'password');
    return { ok: false, error: weak ? 'WEAK_PASSWORD' : 'INVALID_INPUT' };
  }
  const { email, password, displayName, idToken, purpose } = parsed.data;

  try {
    const role = await callerRole(idToken);
    if (!role) return { ok: false, error: 'UNAUTHENTICATED' };
    if (purpose === 'gym-admin' && role !== 'superadmin') return { ok: false, error: 'FORBIDDEN' };

    const signup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await signup.json();
    if (!signup.ok) {
      // e.g. EMAIL_EXISTS, WEAK_PASSWORD : Password should be at least 6 characters
      return { ok: false, error: String(data?.error?.message || 'UNKNOWN').split(' ')[0] };
    }

    // Best effort: set the display name.
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: data.idToken, displayName, returnSecureToken: false }),
    }).catch(() => {});

    return { ok: true, uid: data.localId };
  } catch (e) {
    console.error('createAdminUser failed:', e);
    return { ok: false, error: 'UNKNOWN' };
  }
}
