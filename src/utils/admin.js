import { ADMIN_EMAIL } from '../firebase';

const ADMIN = (ADMIN_EMAIL || 'yogeshchapagain733@gmail.com').trim().toLowerCase();

export function isAdminEmail(email) {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN;
}
