import { type FirebaseApp, type FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

function requiredEnv(name: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Create frontend/.env from frontend/.env.example and restart the dev server.`,
    );
  }
  if (/^(your_|change_me|todo)/i.test(value)) {
    throw new Error(
      `Invalid ${name} (${value}). Update frontend/.env with your Firebase Web App config and restart the dev server.`,
    );
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return value || undefined;
}

const apiKey = requiredEnv("VITE_FIREBASE_API_KEY");
const authDomain = requiredEnv("VITE_FIREBASE_AUTH_DOMAIN");
const projectId = requiredEnv("VITE_FIREBASE_PROJECT_ID");
const appId = requiredEnv("VITE_FIREBASE_APP_ID");
const storageBucket = optionalEnv("VITE_FIREBASE_STORAGE_BUCKET");
const messagingSenderId = optionalEnv("VITE_FIREBASE_MESSAGING_SENDER_ID");
const measurementId = optionalEnv("VITE_FIREBASE_MEASUREMENT_ID");

const firebaseConfig: FirebaseOptions = {
  apiKey,
  authDomain,
  projectId,
  appId,
  ...(storageBucket ? { storageBucket } : {}),
  ...(messagingSenderId ? { messagingSenderId } : {}),
  ...(measurementId ? { measurementId } : {}),
};

function initFirebase(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

const app = initFirebase();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
