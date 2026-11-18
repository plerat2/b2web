import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export const ADMIN_EMAILS = [
  'josepantonipeiro@cepallevant.eu',
  'ximznr@gmail.com'
];

export function isAdmin(email) {
  const e = String(email || '').toLowerCase().trim();
  return ADMIN_EMAILS.map(x => x.toLowerCase().trim()).includes(e);
}

export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location = 'login.html';
        return;
      }
      resolve(user);
    });
  });
}

export async function doLogout() {
  await signOut(auth);
  window.location = 'login.html';
}