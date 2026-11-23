/**
 * Phone numbers are the GymFo sign-in identity, so they are stored in ONE format:
 * the 10-digit Indian national number (e.g. 9876543210).
 * Accepts: 9876543210, +91 98765 43210, 098765-43210, 91 9876543210 ...
 */
export function normalizePhone(input?: string | null): string {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}
export const isValidPhone = (input?: string | null) => /^[6-9]\d{9}$/.test(normalizePhone(input));
