import * as admin from "firebase-admin";
import dotenv from "dotenv";
import { Firestore } from "firebase-admin/firestore";

dotenv.config();

export async function connectToDB() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || "flowcraft-95bf4";
    
    // Check if we have a service account key path in .env
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (admin.apps.length === 0) {
      if (serviceAccountPath) {
        // Use a dynamic import or fs.readFileSync for JSON if require is being problematic
        try {
          // @ts-ignore - dynamic require
          const serviceAccount = require(serviceAccountPath);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId
          });
        } catch (err) {
          console.warn(`[server/src/db/index.ts]: Could not load service account from ${serviceAccountPath}. Using default credentials.`);
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: projectId
          });
        }
      } else {
        // Fallback to default credentials or environment-based auth
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: projectId
        });
      }
    }

    console.log(`[server/src/db/index.ts]: Initialized Firebase Admin (Project: ${projectId})`);
  } catch (e: any) {
    console.error("[server/src/db/index.ts]: Failed to initialize Firebase:", e.message);
    console.log("[server/src/db/index.ts]: Tip: Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to point to your service account JSON.");
  }
}

export const getDb = (): Firestore => {
  if (admin.apps.length === 0) {
    throw new Error("Firebase Admin not initialized. Call connectToDB() first.");
  }
  return admin.firestore();
};

