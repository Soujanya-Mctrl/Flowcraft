import * as admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Load env from the server directory
dotenv.config({ path: "d:/Projects/dmaid.cloud-main/server/.env" });


async function verifyBackend() {
  console.log("🚀 Starting Final Backend Pulse Test...\n");

  // 1. Check Env
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const groqKey = process.env.GROQ_API_KEY;
  console.log(`- Project ID: ${projectId || "❌ MISSING"}`);
  console.log(`- Groq API Key: ${groqKey ? "✅ FOUND" : "❌ MISSING"}\n`);

  if (!projectId) {
    console.error("Critical error: FIREBASE_PROJECT_ID is missing from .env");
    return;
  }

  // 2. Test Firestore Connectivity
  try {
    console.log("📡 Testing Firestore Connection...");
    
    // Check if already initialized (to avoid errors in some environments)
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: projectId,
        credential: admin.credential.applicationDefault()
      });
    }

    const db = admin.firestore();
    const testId = `test-${uuidv4().substring(0, 8)}`;
    const testRef = db.collection("diagrams").doc(testId);

    console.log(`- Writing test document: ${testId}`);
    await testRef.set({
      title: "Pulse Test Diagram",
      content: "test",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      test: true
    });

    console.log("- Reading test document back...");
    const doc = await testRef.get();
    
    if (doc.exists && doc.data()?.title === "Pulse Test Diagram") {
      console.log("✅ Firestore Read/Write Success!\n");
    } else {
      throw new Error("Data mismatch or document not found");
    }

    console.log("- Cleaning up test document...");
    await testRef.delete();
    console.log("✅ Cleaned up successfully.\n");

  } catch (error: any) {
    console.error("❌ Firestore Connection Error:", error.message);
    if (error.message.includes("Could not load the default credentials")) {
      console.log("ℹ️ Note: This script needs GOOGLE_APPLICATION_CREDENTIALS for the Admin SDK locally.");
    }
  }

  console.log("🏁 Backend Pulse Test Complete.");
}

verifyBackend();
