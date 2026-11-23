import { endOfDay, parseISO, isValid } from 'date-fns';

/**
 * A membership is valid THROUGH its end date (the whole day), so it expires at the
 * end of that day, not at 00:00 on it. endDate is a 'yyyy-MM-dd' string.
 */
export function isMembershipExpired(endDate?: string | null, now: Date = new Date()): boolean {
  if (!endDate) return true;
  const d = parseISO(endDate);
  if (!isValid(d)) return true;
  return endOfDay(d) < now;
}

/** Member IDs end up in URLs and Firestore document paths. */
export const MEMBER_ID_PATTERN = /^(?!__.*__$)[A-Za-z0-9_-]+$/;
