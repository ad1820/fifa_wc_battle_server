import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin SDK
let app;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // 1. Prioritize reading directly from a JSON string in the environment variable (Best for Cloudflare/Vercel/Render)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
        credential: cert(serviceAccount)
    });
    console.log("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT environment variable.");
  } else if (process.env.FIREBASE_CREDENTIALS_PATH) {
    // 2. Fallback to reading from a local file path (Best for local development)
    const serviceAccountPath = path.resolve(process.env.FIREBASE_CREDENTIALS_PATH);
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        app = initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("Firebase Admin initialized with provided credentials file.");
    } else {
        console.warn(`Firebase credentials file not found at ${serviceAccountPath}. Attempting default initialization.`);
        app = initializeApp();
    }
  } else {
    // Fallback if no specific path is provided (relies on GOOGLE_APPLICATION_CREDENTIALS)
    console.warn("FIREBASE_CREDENTIALS_PATH not set in .env. Attempting default Firebase Admin initialization (requires GOOGLE_APPLICATION_CREDENTIALS).");
    app = initializeApp();
  }
} catch (error) {
  console.error("Firebase Admin initialization error (can be ignored during early dev if unused):", error.message);
}

export const firebaseApp = app;
export const auth = getApps().length > 0 ? getAuth(app) : null;
