"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Auth only — file uploads go through Cloudinary (lib/cloudinary.js) instead
// of Firebase Storage, which now requires the paid Blaze plan.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase must only actually initialize in the browser: Next.js prerenders
// "use client" pages on the server too (no real browser, no env vars filled
// in yet during early setup), and getAuth() throws immediately on an
// invalid/empty API key — which would otherwise crash the entire build.
const isBrowser = typeof window !== "undefined";

export const firebaseApp = isBrowser ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : undefined;
export const firebaseAuth = isBrowser ? getAuth(firebaseApp) : undefined;
