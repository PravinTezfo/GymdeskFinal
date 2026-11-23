# GymDesk CRM: fixes applied (UI and theme unchanged)

No change to layout, colours, theme, fonts or copy, except these five text changes that were required for correctness:
trainer phone label (no "(Optional)"), trainer delete dialog (no longer claims the login is deleted),
a "gym is deactivated" message, and the toasts that replace the old app-wide crash.

## Before you deploy
1. firestore.rules: MERGE with GymFo's rules first (accounts/{uid}, assigned_workouts, workout_logs and
   the member/trainer read access). Deploying this file alone removes GymFo's access.
   Run `firebase deploy --only firestore:rules --dry-run` (I could not compile it here).
2. Logo on the login screen now comes from the public document `public/branding`. Open Superadmin → Settings
   and press Save once; that writes it. Until then the default brand shows.
3. Existing trainers need a phone number (it is the GymFo sign-in). Existing members: optional, but needed for GymFo.
4. Members created before this change have no `schemeId`; they are matched by plan name as before.
5. Server action now needs the caller's ID token (sent automatically). It reads the caller's role through the
   Firestore REST API as that user, so the rules for superadmins/{uid} and admins/{uid} must allow the owner to read.

## What changed (by file)
Security / server
- firestore.rules: roles can no longer be self-granted; trainers are read-only; gym admins can only edit name/theme;
  superadmin can create admins; public/branding is world-readable.
- src/ai/flows/create-admin-user.ts: verifies caller (superadmin for gym admins, admin/superadmin for trainers)
  and RETURNS {ok, uid | error} (thrown messages are hidden by Next in production).
Resilience
- FirebaseErrorListener.jsx: toast instead of throwing (no more white screen); use-collection/use-doc keep the real error code.
- src/lib/errors.ts (new): friendly messages. All write helpers (firebase/firestore/*.ts) return true/false and toast on failure.
- useRole.tsx: event-driven (no 1.5 s give-up), no logged-out read of superadmins. login-form.jsx reads public/branding.
Data integrity
- members.ts: duplicate Member ID rejected, ID format enforced, soft delete (isDeleted), arrayUnion for allLogId.
- add/edit-member-form: balance never negative, Amount Paid follows price - discount until edited, no reset on date change,
  plan matched by schemeId, members on a renamed/deleted plan can be edited, form initialised once per log,
  new payment log only for a real renewal (new plan, or new start date on an expired membership).
- gym-member-list.jsx: members without a readable log stay visible; stable per-member subscriptions.
Logic
- gym-analytics.jsx: excludes deleted/orphan members, new members = first membership only, no rupee-as-percent, NaN-safe,
  O(n) lookups. src/lib/membership.ts: end date is inclusive (valid through the end date). dashboard.jsx: month labels.
- Dates parsed as local dates (expenses etc.).
UX plumbing (invisible)
- FormInput hoisted out of components (focus no longer lost); dialog role + Escape; aria-labels on icon buttons.
- /trainer/members/[memberId]/logs (new route) so trainers' "View Logs" works; "Edit Gym" on the gym page opens the edit modal;
  gym `active=false` now blocks admins and trainers (GymActiveGate.jsx).
- src/lib/phone.ts: phones stored as 10 digits; trainer phone required.

## Not changed on purpose
- Table width at 1280 px (Actions column off-screen): a visual change. Test is marked fixme.
- Deleting a trainer cannot delete their Auth account without the Admin SDK; add a Cloud Function if you need re-hiring with the same e-mail.
- Per-member Firestore listeners / full-collection dashboard reads: larger refactor (denormalise or aggregate).

## Tests
`npm i`, `npx playwright install chromium`, `npm run e2e`  (builds with E2E_FAKE_FIREBASE=1 into .next-e2e; real Firebase is not touched).
Result: 55 passed, 1 skipped (layout). The fake Firebase cannot test security rules; use the Firebase emulator for that.
