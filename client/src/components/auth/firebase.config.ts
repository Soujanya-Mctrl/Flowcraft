// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};


// Initialize Firebase
let auth: Auth;
let db: Firestore;

try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("XXX")) {
    console.warn("Firebase API key is missing or invalid. Firebase features will be limited.");
  }
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
  // Provide mock objects to prevent crashes
  auth = {
    onAuthStateChanged: () => () => {},
    currentUser: null,
  } as unknown as Auth;
  db = {} as unknown as Firestore;
}

export { auth, db };


