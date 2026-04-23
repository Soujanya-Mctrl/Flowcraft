import * as admin from "firebase-admin";
import dotenv from "dotenv";
import { Firestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";

dotenv.config();

export async function connectToDB() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || "flowcraft-95bf4";
    
    // 1. Check if we have the full JSON string in environment (Standard for Cloud Deployment)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    // 2. Check if we have a service account key path in .env (Standard for Local Development)
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (admin.apps.length === 0) {
      if (serviceAccountJson) {
        try {
          const serviceAccount = JSON.parse(serviceAccountJson);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId
          });
          console.log("[server/src/db/index.ts]: Initialized using FIREBASE_SERVICE_ACCOUNT_JSON env var.");
        } catch (err: any) {
          console.error(`[server/src/db/index.ts]: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${err.message}`);
        }
      } else if (serviceAccountPath) {
        try {
          const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
          const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId
          });
          console.log(`[server/src/db/index.ts]: Initialized using file: ${serviceAccountPath}`);
        } catch (err: any) {
          console.warn(`[server/src/db/index.ts]: Could not load service account from ${serviceAccountPath}: ${err.message}.`);
        }
      }

      // Final check: if still not initialized, use application default
      if (admin.apps.length === 0) {
        console.log("[server/src/db/index.ts]: Using applicationDefault() credentials.");
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

