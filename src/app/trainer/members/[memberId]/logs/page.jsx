// Trainers get the same read-only payment-history page as admins (the admin copy lives under /admin,
// which non-admins are redirected away from).
export { default } from '@/app/admin/members/[memberId]/logs/page';
