/** Turns any Firebase / network / unknown error into a short, user-facing sentence. */
export function friendlyError(e: any): string {
  const code: string = e?.code || '';
  if (code === 'permission-denied') return "You don't have permission to do that.";
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'Network problem. Please check your connection and try again.';
  if (code === 'failed-precondition') return 'This view needs a database index that is not set up yet.';
  if (code === 'not-found') return 'That record no longer exists.';
  if (code === 'unauthenticated') return 'Your session has expired. Please sign in again.';
  return e?.message || 'An unexpected error occurred.';
}

import { toast } from 'sonner';

/** For fire-and-forget writes: show a toast and report failure instead of crashing the app. */
export function reportError(e: any): false {
  console.error(e);
  toast.error(friendlyError(e));
  return false;
}

/** Message for the codes returned by the createAdminUser server action. */
export function authCreateMessage(code?: string): string {
  switch (code) {
    case 'EMAIL_EXISTS': return 'The email address is already in use by another account.';
    case 'WEAK_PASSWORD': return 'Password must be at least 6 characters long.';
    case 'INVALID_EMAIL': return 'That email address is not valid.';
    case 'FORBIDDEN': return "You don't have permission to create users.";
    case 'UNAUTHENTICATED': return 'Your session has expired. Please sign in again.';
    case 'TOO_MANY_ATTEMPTS_TRY_LATER': return 'Too many attempts. Please try again later.';
    default: return 'Could not create the sign-in account. Please try again.';
  }
}
