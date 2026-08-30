import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Server-side only. Never import this file from a Client Component.
//
// Initialization is deliberately lazy (only happens the first time
// getAdminAuth() is actually called): Next.js imports every route module
// during its build-time "collect page data" step, and an eager
// `initializeApp()`/`cert()` at module scope would crash the whole build if
// the Firebase env vars are missing or wrong at build time — even though
// they're only ever needed at request time.
let cachedAuth = null;

function buildCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY (see .env.example)."
    );
  }

  return cert({ projectId, clientEmail, privateKey });
}

function getFirebaseAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0];
  return initializeApp({ credential: buildCredential() });
}

export function getAdminAuth() {
  if (!cachedAuth) cachedAuth = getAuth(getFirebaseAdminApp());
  return cachedAuth;
}
