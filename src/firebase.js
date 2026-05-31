import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.error(
    'Firebase API key missing. Locally: check .env. On GitHub Pages: add VITE_* secrets and redeploy.'
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Set persistence immediately and do not await - allows faster auth restoration
setPersistence(auth, browserLocalPersistence).catch(e => console.warn('Persistence setup:', e));

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'yogeshchapagain733@gmail.com';
